import React, { useState, useEffect } from 'react';
import { Text, View, Button, StyleSheet } from 'react-native';
import Paho from 'paho-mqtt';

export default function App() {
  const [client, setClient] = useState(null);
  const [messageValue, setMessageValue] = useState('No message received yet');
  const [isConnected, setIsConnected] = useState(false);

  // Configuration for MQTT broker (using public test broker)
  const brokerConfig = {
    host: 'picomqtt.local', // Public test MQTT broker
    port: 81,           // WebSocket port
    clientId: `mqtt_${Math.random().toString(16).slice(2)}`,
    topic: 'button/state'
  };

  useEffect(() => {
    // Initialize MQTT client
    const mqttClient = new Paho.Client(
      brokerConfig.host,
      brokerConfig.port,
      brokerConfig.clientId
    );

    // Set callback handlers
    mqttClient.onConnectionLost = (response) => {
      console.log('Connection lost:', response.errorMessage);
      setIsConnected(false);
    };

    mqttClient.onMessageArrived = (message) => {
      console.log('Message received:', message.payloadString);
      setMessageValue(message.payloadString);
    };

    // Connect to broker
    mqttClient.connect({
      onSuccess: () => {
        console.log('Connected to MQTT broker');
        setIsConnected(true);
        // Subscribe to topic
        mqttClient.subscribe(brokerConfig.topic);
      },
      onFailure: (err) => {
        console.log('Connection failed:', err);
        setIsConnected(false);
      },
      useSSL: false
    });

    setClient(mqttClient);

    // Cleanup on unmount
    return () => {
      if (mqttClient.isConnected()) {
        mqttClient.disconnect();
      }
    };
  }, []);

  const publishMessage = () => {
    if (client && client.isConnected()) {
      const message = new Paho.Message(`Hello from Expo at ${new Date().toLocaleTimeString()}`);
      message.destinationName = 'expo/message'; // brokerConfig.topic;
      client.send(message);
      console.log('Message published');
    } else {
      console.log('Not connected to broker');
      setMessageValue('Error: Not connected to broker');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.status}>
        Status: {isConnected ? 'Connected' : 'Disconnected'}
      </Text>
      <Text style={styles.topic}>Topic: {brokerConfig.topic}</Text>
      <Text style={styles.message}>Received: {messageValue}</Text>
      <Button
        title="Publish Message"
        onPress={publishMessage}
        disabled={!isConnected}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#fff',
  },
  status: {
    fontSize: 18,
    marginBottom: 10,
  },
  topic: {
    fontSize: 16,
    marginBottom: 10,
    color: '#666',
  },
  message: {
    fontSize: 16,
    marginBottom: 20,
    textAlign: 'center',
  },
});