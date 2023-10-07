import React, { useState, useEffect } from 'react';
import 'bootstrap/dist/css/bootstrap.min.css';
import './App.css';
import { fetchEventSource } from '@microsoft/fetch-event-source';
function App() {
  const [sseActive, setSseActive] = useState(false);
  const [lpActive, setLpActive] = useState(false);
  const [wsActive, setWsActive] = useState(false);
  const [sseMessages, setSseMessages] = useState([]);
  const [lpMessages, setLpMessages] = useState([]);
  const [wsMessages, setWsMessages] = useState([]);

  useEffect(() => {
    let cancel; // To hold the cancel function

    if (sseActive) {
      const options = {
        headers: {
          'Authorization': 'Bearer 1234',
          'X-Channel-Name': 'test-common',
        },
        onmessage(event) {
          setSseMessages((prev) => [...prev, event.data]);
        },
        onerror(error) {
          console.error("SSE Error:", error);
          if (sseActive) {
            setTimeout(() => {
              // You can implement reconnect logic here
            }, 1000);
          }
        }
      };

      fetchEventSource('http://localhost:7999/sse', options)
          .then((_cancel) => {
            cancel = _cancel;
          })
          .catch((error) => {
            console.error("SSE Stream encountered an error:", error);
          });
    }

    return () => {
      if (cancel) {
        cancel();
      }
    };
  }, [sseActive]);

  useEffect(() => {
    let ws;
    if (wsActive) {

      const channelName = "test-common";
      ws = new WebSocket(`ws://localhost:7999/websocket?channel=${channelName}`);
      ws.onmessage = function (event) {
        setWsMessages((prev) => [...prev, event.data]);
      };
      ws.onclose = function () {
        setTimeout(() => {
          ws = new WebSocket(`ws://localhost:7999/websocket?channel=${channelName}`);
        }, 1000);
      };
    }
    return () => {
      if (ws) {
        ws.close();
      }
    };
  }, [wsActive]);

  const poll = () => {
    fetch('http://localhost:7999/longpoll', {
      headers: {
        'Authorization': 'Bearer 1234',
        'X-Channel-Name': 'test-common',
      },
    })
        .then((response) => response.text())
        .then((data) => {
          setLpMessages((prev) => [...prev, data]);
          if (lpActive) {
            setTimeout(poll, 500);
          }
        })
        .catch((error) => {
          if (lpActive) {
            setTimeout(poll, 1000);
          }
        });
  };

  useEffect(() => {
    if (lpActive) {
      poll();
    }
  }, [lpActive]);


  const [messageInput, setMessageInput] = useState("");

  const sendMessage = () => {
    const payload = {
      message: `Test Message: ${messageInput} : ${new Date().toLocaleString()}`
    };

    fetch('http://localhost:8000/publish', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer 1234',
        'X-Channel-Name': 'test-common',
      },
      body: JSON.stringify(payload)
    })
        .then(response => response.json())
        .then(data => {
          console.log("Message published:", data);
        })
        .catch(error => {
          console.error("Failed to publish message:", error);
        });
  };

  return (
      <div className="App container mt-4">
        {/* SSE Section */}
        <div className="row">
          <div className="col-md-4">
            <div className="stream-section">
              <button onClick={() => setSseActive(true)} className="btn btn-primary mb-2 mr-2 action-button">Start SSE</button>
              <button onClick={() => setSseActive(false)} className="btn btn-primary mb-2 mr-2 action-button">Stop SSE</button>
              <div className="messages">
                {sseMessages.map((m, i) => <div key={i}>{m}</div>)}
              </div>
              <div>
                SSE Status: <span className="status-dot" style={{ background: sseActive ? 'green' : 'red' }}></span>
              </div>
            </div>
          </div>
          {/* Long Polling Section */}
          <div className="col-md-4">
            <div className="stream-section">
              <button onClick={() => setLpActive(true)} className="btn btn-primary mb-2 mr-2 action-button">Start Long Polling</button>
              <button onClick={() => setLpActive(false)} className="btn btn-primary mb-2 mr-2 action-button">Stop Long Polling</button>
              <div className="messages">
                {lpMessages.map((m, i) => <div key={i}>{m}</div>)}
              </div>
              <div>
                Long Poll Status: <span className="status-dot" style={{ background: lpActive ? 'green' : 'red' }}></span>
              </div>
            </div>
          </div>
          {/* WebSocket Section */}
          <div className="col-md-4">
            <div className="stream-section">
              <button onClick={() => setWsActive(true)} className="btn btn-primary mb-2 mr-2 action-button">Start WebSocket</button>
              <button onClick={() => setWsActive(false)} className="btn btn-primary mb-2 mr-2 action-button">Stop WebSocket</button>
              <div className="messages">
                {wsMessages.map((m, i) => <div key={i}>{m}</div>)}
              </div>
              <div>
                WebSocket Status: <span className="status-dot" style={{ background: wsActive ? 'green' : 'red' }}></span>
              </div>
            </div>
          </div>
        </div>

        {/* New row for sending messages */}
        <div className="row mt-4">
          <div className="col-md-12">
            <div className="input-group">
              <input type="text" className="form-control" placeholder="Type your message here..."
                     value={messageInput}
                     onChange={(e) => setMessageInput(e.target.value)} />
              <div className="input-group-append">
                <button className="btn btn-primary" type="button" onClick={sendMessage}>
                  Send
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
  );
}

export default App;
