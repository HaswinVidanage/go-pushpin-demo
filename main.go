package main

import (
	"fmt"
	"github.com/fanout/go-gripcontrol"
	"github.com/fanout/go-pubcontrol"
	"github.com/gorilla/websocket"
	"io/ioutil"
	"log"
	"net/http"
)

var upgrader = websocket.Upgrader{
	ReadBufferSize:  1024,
	WriteBufferSize: 1024,
	CheckOrigin:     func(r *http.Request) bool { return true },
}

func isAuthorized(r *http.Request) bool {
	authorizationHeader := r.Header.Get("Authorization")
	// this is a dummy method for checking authorization
	return authorizationHeader == "Bearer 1234"
}

func handleWebSocket(writer http.ResponseWriter, request *http.Request) {

	// Fetch the channel name from URL parameters or default to "test-common"
	channelName := request.URL.Query().Get("channel")
	if channelName == "" {
		channelName = "default-channel"
	}

	// Create the WebSocket control message:
	wsControlMessage, err := gripcontrol.WebSocketControlMessage("subscribe",
		map[string]interface{}{"channel": channelName})
	if err != nil {
		panic("Unable to create control message: " + err.Error())
	}

	// Ensure that the GRIP proxy processes control messages by upgrading
	// with the Sec-WebSocket-Extensions header:
	conn, _ := upgrader.Upgrade(writer, request, http.Header{
		"Sec-WebSocket-Extensions": []string{"grip; message-prefix=\"\""}})

	// Subscribe the WebSocket to a channel:
	conn.WriteMessage(1, []byte("c:"+wsControlMessage))

}

func handleRequestSSE(w http.ResponseWriter, r *http.Request) {
	if !isAuthorized(r) {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	// Fetch the channel name from headers or default to "test-sse"
	channelName := r.Header.Get("X-Channel-Name")
	if channelName == "" {
		channelName = "default-channel"
	}

	fmt.Printf("SSE channelName: %s\n", channelName)

	// Set necessary headers for SSE
	w.Header().Set("Grip-Hold", "stream")
	w.Header().Set("Grip-Channel", channelName)
	w.Header().Set("Content-Type", "text/event-stream")

	// Common CORS headers
	setCORSHeaders(w)
}

func handleRequestLongPolling(w http.ResponseWriter, r *http.Request) {
	if !isAuthorized(r) {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	channelName := r.Header.Get("X-Channel-Name")
	if channelName == "" {
		channelName = "default-channel"
	}

	// Set necessary headers for long polling
	w.Header().Set("Grip-Hold", "response")
	w.Header().Set("Grip-Channel", channelName)

	// Common CORS headers
	setCORSHeaders(w)

}

func handlePublish(w http.ResponseWriter, r *http.Request) {
	if !isAuthorized(r) {
		http.Error(w, "Unauthorized", http.StatusUnauthorized)
		return
	}

	// Common CORS headers
	setCORSHeaders(w)

	body, err := ioutil.ReadAll(r.Body)
	defer r.Body.Close()
	if err != nil {
		http.Error(w, "Error reading request body", http.StatusInternalServerError)
		return
	}

	// Initialize GripPubControl for local Pushpin instances, we can use a service discovery mechanism to get the list of Pushpin instances
	pub := gripcontrol.NewGripPubControl([]map[string]interface{}{
		{
			"control_uri": "http://localhost:5561",
		},
		{
			"control_uri": "http://localhost:5560",
		},
	})

	channelName := r.Header.Get("X-Channel-Name")
	if channelName == "" {
		channelName = "default-channel"
	}

	// Format and publish for SSE
	formattedMessageSSE := "data: " + string(body) + "\n\n"
	err = pub.PublishHttpStream(channelName, formattedMessageSSE, "", "")
	if err != nil {
		http.Error(w, "Failed to publish to SSE", http.StatusInternalServerError)
		return
	}

	// Format and publish for long polling
	formattedMessageLongPoll := fmt.Sprintf("HTTP/1.1 200 OK\r\nContent-Type: text/plain\r\nContent-Length: %d\r\n\r\n%s", len(body), body)
	err = pub.PublishHttpResponse(channelName, formattedMessageLongPoll, "", "")
	if err != nil {
		http.Error(w, "Failed to publish to long polling", http.StatusInternalServerError)
		return
	}

	// Format and publish for WebSockets
	format := &gripcontrol.WebSocketMessageFormat{
		Content: body,
	}
	item := pubcontrol.NewItem([]pubcontrol.Formatter{format}, "", "")
	err = pub.Publish(channelName, item)
	if err != nil {
		http.Error(w, "Failed to publish to WebSocket", http.StatusInternalServerError)
		return
	}

	// Respond to the publish POST request
	w.Write([]byte("Message published"))
}

func setCORSHeaders(w http.ResponseWriter) {
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
	w.Header().Set("Access-Control-Allow-Headers", "Origin, Content-Type, Authorization, Cache-Control, X-Requested-With, X-Channel-Name")
}

func handlePreflight(w http.ResponseWriter, r *http.Request) {

	for name, values := range r.Header {
		for _, value := range values {
			fmt.Printf("%s: %s\n", name, value)
		}
	}

	// Handle CORS Preflight
	if r.Method == http.MethodOptions {
		setCORSHeaders(w)
		w.WriteHeader(http.StatusOK)
		return
	}

	switch r.URL.Path {
	case "/sse":
		handleRequestSSE(w, r)
	case "/longpoll":
		handleRequestLongPolling(w, r)
	case "/publish":
		handlePublish(w, r)
	case "/websocket":
		handleWebSocket(w, r)
	}
}

func main() {
	http.HandleFunc("/sse", handlePreflight)       // for SSE
	http.HandleFunc("/longpoll", handlePreflight)  // for long polling
	http.HandleFunc("/websocket", handlePreflight) // for WebSocket
	http.HandleFunc("/publish", handlePreflight)   // for publishing
	log.Println("Server starting on :8000...")
	err := http.ListenAndServe(":8000", nil)
	if err != nil {
		log.Fatalf("Error starting server: %v", err)
	}
}
