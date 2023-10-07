/**
 * React Native App with Event Streaming
 */

import React, { useState, useEffect } from 'react';
import {
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  useColorScheme,
  View,
  Button,
  TextInput,
  FlatList,
} from 'react-native';
import EventSource from 'react-native-event-source';
import { Colors } from 'react-native/Libraries/NewAppScreen';

function App(): JSX.Element {
  const isDarkMode = useColorScheme() === 'dark';
  const backgroundStyle = {
    backgroundColor: isDarkMode ? Colors.darker : Colors.lighter,
  };

  const [sseActive, setSseActive] = useState(false);
  const [lpActive, setLpActive] = useState(false);
  const [wsActive, setWsActive] = useState(false);
  const [sseMessages, setSseMessages] = useState<string[]>([]);
  const [lpMessages, setLpMessages] = useState<string[]>([]);
  const [wsMessages, setWsMessages] = useState<string[]>([]);
  const [messageInput, setMessageInput] = useState("");

  useEffect(() => {
    let es;

    if (sseActive) {
      es = new EventSource('http://localhost:7999/sse', {
        headers: {
          'Authorization': 'Bearer 1234',
          'X-Channel-Name': 'test-common',
        }
      });

      es.addEventListener('message', (event) => {
        setSseMessages((prev) => [...prev, event.data]);
      });

      es.addEventListener('error', (error) => {
        console.error("SSE Error:", error);
        if (sseActive) {
          setTimeout(() => {
            // Reconnect logic here
          }, 1000);
        }
      });
    }

    return () => {
      if (es) {
        es.close();
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
      <SafeAreaView style={backgroundStyle}>
        <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
        <ScrollView contentInsetAdjustmentBehavior="automatic" style={backgroundStyle}>
          <View style={styles.container}>
            <View style={styles.streamSection}>
              <Button title="Start SSE" onPress={() => setSseActive(true)} />
              <Button title="Stop SSE" onPress={() => setSseActive(false)} />
              <FlatList
                  data={sseMessages}
                  renderItem={({ item }) => <Text>{item}</Text>}
                  keyExtractor={(item, index) => index.toString()}
              />
              <Text>SSE Status: {sseActive ? 'Active' : 'Inactive'}</Text>
            </View>

            <View style={styles.streamSection}>
              <Button title="Start Long Polling" onPress={() => setLpActive(true)} />
              <Button title="Stop Long Polling" onPress={() => setLpActive(false)} />
              <FlatList
                  data={lpMessages}
                  renderItem={({ item }) => <Text>{item}</Text>}
                  keyExtractor={(item, index) => index.toString()}
              />
              <Text>Long Poll Status: {lpActive ? 'Active' : 'Inactive'}</Text>
            </View>

            <View style={styles.streamSection}>
              <Button title="Start WebSocket" onPress={() => setWsActive(true)} />
              <Button title="Stop WebSocket" onPress={() => setWsActive(false)} />
              <FlatList
                  data={wsMessages}
                  renderItem={({ item }) => <Text>{item}</Text>}
                  keyExtractor={(item, index) => index.toString()}
              />
              <Text>WebSocket Status: {wsActive ? 'Active' : 'Inactive'}</Text>
            </View>

            <TextInput
                style={styles.messageInput}
                value={messageInput}
                onChangeText={setMessageInput}
                placeholder="Type your message here..."
            />
            <Button title="Send" onPress={sendMessage} />
          </View>
        </ScrollView>
      </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16
  },
  streamSection: {
    marginVertical: 8
  },
  messageInput: {
    borderColor: 'gray',
    borderWidth: 1,
    marginVertical: 8,
    padding: 8
  }
});

export default App;
