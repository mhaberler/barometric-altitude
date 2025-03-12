import React, { useState, useEffect } from 'react';
import { Text, View, StyleSheet } from 'react-native';
import * as Sensors from 'expo-sensors';
import * as Location from 'expo-location';
import { LineChart, XAxis, YAxis, Grid } from 'react-native-svg-charts';
import * as Svg from 'react-native-svg';
import Paho from 'paho-mqtt'; // Import Paho MQTT

const { Barometer } = Sensors;

export default function App() {
  const [pressure, setPressure] = useState(null);
  const [altitude, setAltitude] = useState(null);
  const [altitudeData, setAltitudeData] = useState([]);
  const [timeData, setTimeData] = useState([]);
  const [mqttClient, setMqttClient] = useState(null);
  const [location, setLocation] = useState(null);
  const [messageValue, setMessageValue] = useState('No message received yet');

  const SEA_LEVEL_PRESSURE = 1013.25;
   // Configuration for MQTT broker (using public test broker)
   const brokerConfig = {
    host: 'picomqtt.local', // Public test MQTT broker
    // host: '192.168.2.4', // picomqtt.local', // Public test MQTT broker
    port: 81,           // WebSocket port
    clientId: `mqtt_${Math.random().toString(16).slice(2)}`,
    topic: 'button/state'
  };
  const MQTT_TOPIC = 'expo/barometer/altitude';
  const startTime = Date.now();

  // Calculate altitude using barometric formula
  const calculateAltitude = (pressure) => {
    if (!pressure) return 0;
    const altitude = 44330 * (1 - Math.pow(pressure / SEA_LEVEL_PRESSURE, 1 / 5.255));
    return altitude;
  };

  // Initialize Paho MQTT client
  useEffect(() => {
    const client = new Paho.Client(
      brokerConfig.host,
      brokerConfig.port,
      brokerConfig.clientId
    );
    client.onConnectionLost = (responseObject) => {
      console.log('Connection lost:', responseObject.errorMessage);
    };

    client.onMessageArrived = (message) => {
      console.log('Message arrived:', message.payloadString);
      setMessageValue(message.payloadString);
    };

    const connectOptions = {
      useSSL: false, // Set to true if wss:// is required
      timeout: 3,
      reconnect: true,
      onSuccess: () => {
        console.log('Connected to MQTT broker');
        setMqttClient(client);
        client.subscribe(brokerConfig.topic);
      },
      onFailure: (err) => {
        console.error('MQTT connection failed:', err.errorMessage);
      },
    };

    client.connect(connectOptions);

    return () => {
      if (client.isConnected()) {
        client.disconnect();
        console.log('Disconnected from MQTT broker');
      }
    };
  }, []);

  // Publish altitude to MQTT in Teleplot-like format
  const publishAltitudeMQTT = (altitude) => {
    if (mqttClient && mqttClient.isConnected()) {
      const timestamp = Date.now();
      const teleplotMessage = `altitude|${timestamp/1000.0}|${altitude.toFixed(2)}`;
      const message = new Paho.Message(teleplotMessage);
      message.destinationName = MQTT_TOPIC;
      try {
        mqttClient.send(message);
        console.log(`Published to ${MQTT_TOPIC}: ${teleplotMessage}`);
      } catch (err) {
        console.error('MQTT publish error:', err);
      }
    } else {
      console.log('MQTT client not connected yet');
    }
  };

  // Barometer data subscription
  useEffect(() => {
    let subscription;

    const startBarometer = async () => {
      const isAvailable = await Barometer.isAvailableAsync();
      if (isAvailable) {
        Barometer.setUpdateInterval(1000);
        subscription = Barometer.addListener((barometerData) => {
          const pressureInHpa = barometerData.pressure;
          const newAltitude = calculateAltitude(pressureInHpa);
          const elapsedTime = Math.floor((Date.now() - startTime) / 1000);

          setPressure(pressureInHpa);
          setAltitude(newAltitude);
          setAltitudeData((prev) => [...prev, newAltitude].slice(-20));
          setTimeData((prev) => [...prev, elapsedTime].slice(-20));

          publishAltitudeMQTT(newAltitude);
        });
      } else {
        setPressure('Barometer not available');
      }
    };

    startBarometer();

    return () => {
      if (subscription) subscription.remove();
    };
  }, [mqttClient]);

  // Location data subscription
  useEffect(() => {
    let locationSubscription;

    const startLocationTracking = async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setLocation({ error: 'Permission to access location was denied' });
        return;
      }

      locationSubscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          timeInterval: 1000,
          distanceInterval: 1,
        },
        (locationData) => {
          setLocation({
            latitude: locationData.coords.latitude,
            longitude: locationData.coords.longitude,
            heading: locationData.coords.heading,
            speed: locationData.coords.speed,
          });
        }
      );
    };

    startLocationTracking();

    return () => {
      if (locationSubscription) locationSubscription.remove();
    };
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Sensor Readings</Text>
      <Text style={styles.message}>MQTT message: {messageValue}</Text>

      {/* Barometer Data */}
      <Text style={styles.text}>
        Pressure: {pressure ? `${pressure.toFixed(2)} hPa` : 'Loading...'}
      </Text>
      <Text style={styles.text}>
        Altitude: {altitude ? `${altitude.toFixed(2)} m` : 'Calculating...'}
      </Text>

      {/* Location Data */}
      <Text style={styles.text}>
        Latitude: {location?.latitude ? `${location.latitude.toFixed(6)}°` : 'Loading...'}
      </Text>
      <Text style={styles.text}>
        Longitude: {location?.longitude ? `${location.longitude.toFixed(6)}°` : 'Loading...'}
      </Text>
      <Text style={styles.text}>
        Heading: {location?.heading >= 0 ? `${location.heading.toFixed(2)}°` : 'N/A'}
      </Text>
      <Text style={styles.text}>
        Speed: {location?.speed >= 0 ? `${(location.speed * 3.6).toFixed(2)} km/h` : 'N/A'}
      </Text>

      {/* Altitude Chart */}
      <View style={styles.chartContainer}>
        <Text style={styles.chartTitle}>Altitude Timeseries</Text>
        {altitudeData.length > 0 ? (
          <View style={styles.chartWrapper}>
            <YAxis
              data={altitudeData}
              contentInset={{ top: 20, bottom: 20 }}
              svg={{ fontSize: 10, fill: 'black' }}
              numberOfTicks={5}
              formatLabel={(value) => `${value.toFixed(2)} m`}
              style={styles.yAxis}
            />
            <View style={styles.chartContent}>
              <LineChart
                style={styles.chart}
                data={altitudeData}
                svg={{ stroke: 'rgb(134, 65, 244)', strokeWidth: 2 }}
                contentInset={{ top: 20, bottom: 20 }}
              >
                <Grid svg={{ stroke: 'rgba(0, 0, 0, 0.1)' }} />
              </LineChart>
              <XAxis
                style={styles.xAxis}
                data={timeData}
                formatLabel={(value) => `${value} s`}
                contentInset={{ left: 20, right: 20 }}
                svg={{ fontSize: 10, fill: 'black' }}
                numberOfTicks={5}
              />
            </View>
          </View>
        ) : (
          <Text>Loading chart...</Text>
        )}
      </View>

      <Text style={styles.note}>
        Note: Publishing altitude to MQTT topic {MQTT_TOPIC}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  text: {
    fontSize: 18,
    marginVertical: 5,
  },
  chartContainer: {
    width: '100%',
    height: 250,
    marginTop: 20,
    borderWidth: 2,
    borderColor: 'black',
    borderRadius: 5,
    padding: 10,
    backgroundColor: '#fff',
  },
  chartTitle: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 10,
  },
  chartWrapper: {
    flexDirection: 'row',
    height: 200,
  },
  yAxis: {
    marginRight: 10,
  },
  chartContent: {
    flex: 1,
  },
  chart: {
    height: 150,
  },
  xAxis: {
    marginTop: 10,
  },
  note: {
    fontSize: 14,
    color: '#666',
    marginTop: 20,
    textAlign: 'center',
  },
});