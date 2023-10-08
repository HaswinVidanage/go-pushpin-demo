import React, { useState, useEffect } from 'react';
import {
  SafeAreaView,
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

  const [messages, setMessages] = useState<string[]>([]);
  const [messageInput, setMessageInput] = useState("");
  const [selectedOption, setSelectedOption] = useState<'SSE' | 'WS' | 'LP' | null>(null);

  const OptionButton = ({ title }) => (
      <Button
          title={title}
          color={selectedOption === title ? 'blue' : 'gray'}
          onPress={() => {
            setMessages([]);
            setSelectedOption(prevOption => prevOption === title ? null : title as any);
          }}
      />
  );

  useEffect(() => {
    let es, ws;

    if (selectedOption === 'SSE') {
      es = new EventSource('http://localhost:7999/sse', {
        headers: {
          'Authorization': 'Bearer 1234',
          'X-Channel-Name': 'test-common',
        }
      });

      es.addEventListener('message', (event) => {
        setMessages((prev) => [...prev, event.data]);
      });

      es.addEventListener('error', (error) => {
        console.error("SSE Error:", error);
      });
    } else if (selectedOption === 'WS') {
      const channelName = "test-common";
      ws = new WebSocket(`ws://localhost:7999/websocket?channel=${channelName}`);
      ws.onmessage = function (event) {
        setMessages((prev) => [...prev, event.data]);
      };
    } else if (selectedOption === 'LP') {
      poll();
    }

    return () => {
      if (es) {
        es.close();
      }
      if (ws) {
        ws.close();
      }
      if (selectedOption === 'LP') {
        setMessages([]);  // Clearing the messages when LP is deactivated
      }
    };
  }, [selectedOption]);


  const poll = () => {
    if (selectedOption == 'LP') {
      fetch('http://localhost:7999/longpoll', {
        headers: {
          'Authorization': 'Bearer 1234',
          'X-Channel-Name': 'test-common',
        },
      })
          .then((response) => response.json())
          .then((data) => {
            const { message, timeStamp } = data;
            console.log(message, timeStamp)
            const formattedMessage = JSON.stringify({ message, timeStamp });
            setMessages((prev) => [...prev, formattedMessage]);
            if (selectedOption === 'LP') {
              setTimeout(poll, 500);
            }

          })
          .catch((error) => {
            if (selectedOption === 'LP') {
              setTimeout(poll, 1000);
            }
          });
    }

  };

  const sendMessage = () => {
    const payload = {
      message: `${messageInput}`,
      timeStamp: `${new Date().toLocaleString()}`,
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
        .then(response => {
          if (!response.ok) {
            return response.text().then(text => {
              throw new Error(`Failed to publish message with status ${response.status}: ${text}`);
            });
          }
          return response.text();
        })
        .then(data => {
          console.log("Message published:", data);
        })
        .catch(error => {
          console.error("Failed to publish message:", error);
        });
  };

  return (
      <SafeAreaView style={[backgroundStyle, styles.flex1]}>
        <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
        <View style={styles.flex1}>
          <FlatList
              style={styles.messageList}
              data={messages}
              renderItem={({ item }) => {
                const parsedItem = JSON.parse(item);
                return (
                    <View style={styles.bubble}>
                      <Text style={styles.messageText}>{parsedItem.message}</Text>
                      <Text style={styles.timestamp}>{parsedItem.timeStamp}</Text>
                    </View>
                );
              }}
              keyExtractor={(item, index) => index.toString()}
          />
          <View style={styles.statusContainer}>
            <Text>Status:</Text>
            <View
                style={[
                  styles.statusIndicator,
                  { backgroundColor: selectedOption ? 'green' : 'red' },
                ]}
            />
          </View>
          <View style={styles.footer}>
            <TextInput
                style={styles.messageInput}
                value={messageInput}
                onChangeText={setMessageInput}
                placeholder="Type your message here..."
            />
            <Button title="Send" onPress={sendMessage} />
          </View>
          <View style={styles.footer}>
            <OptionButton title="SSE" />
            <OptionButton title="WS" />
            <OptionButton title="LP" />
          </View>
        </View>
      </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex1: {
    flex: 1,
  },
  messageList: {
    flex: 1,
    margin: 10,
  },
  bubble: {
    paddingVertical: 10,
    paddingHorizontal: 15,
    marginVertical: 5,
    backgroundColor: '#007BFF',
    borderTopRightRadius: 2,
    borderTopLeftRadius: 18,
    borderBottomLeftRadius: 18,
    borderBottomRightRadius: 22,
    alignSelf: 'flex-end',
    maxWidth: '80%',
    justifyContent: 'space-between'
  },
  timestamp: {
    textAlign: 'right',
    color: 'white',
    fontSize: 12,
    marginTop: 5,
  },
  messageText: {
    color: '#FFF'
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: 10,
  },
  statusIndicator: {
    width: 16,
    height: 16,
    borderRadius: 8,
    marginLeft: 10,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 8,
    borderTopWidth: 1,
    borderColor: '#eee',
  },
  messageInput: {
    flex: 1,
    borderColor: 'gray',
    borderWidth: 1,
    marginRight: 8,
    padding: 8,
  },
});

export default App;
