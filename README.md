
Starting pushpin
```bash
 docker-compose up --build -d
```

Run the test server
```bash
go run main.go
```

Test Query to publish a message
```bash
curl -X POST \
-H "Content-Type: application/json" \
-H "Authorization: Bearer 1234" \
-d '{"message":"Test Message : '$(shuf -i 1-999 -n 1)' : '$(date +"%Y:%m:%d:%H:%M:%S")'"}' \
'http://localhost:8000/publish'
```

SSE
```bash
curl -H "Authorization: Bearer 1234" -H "X-Channel-Name: test-common" http://127.0.0.1:7999/sse
```

Long-polling
```bash
curl -H "Authorization: Bearer 1234" -H "X-Channel-Name: test-common" http://127.0.0.1:7998/longpoll
```

Websocket
```bash
websocat "ws://127.0.0.1:7998/websocket" -H="Authorization: Bearer 1234" -H="X-Channel-Name: test-common"
```

Serve HTML File
```bash
 http-server go-streaming-protocols/go-pushpin/http -p 8081 --cors
```