import React, { useState, useEffect, useRef } from 'react';
import { View, Text, Alert, StyleSheet, Image, Animated, TouchableOpacity, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Notifications from 'expo-notifications';

const App = () => {
  const [humidity, setHumidity] = useState(0);
  const [progress, setProgress] = useState(new Animated.Value(0));
  const [expoPushToken, setExpoPushToken] = useState('');
  const notificationListener = useRef<Notifications.Subscription | null>(null);
  const responseListener = useRef<Notifications.Subscription | null>(null);

  const API = ''; // Substitua pelo IP da sua máquina onde está a API

  const fetchHumidity = async () => {
    try {
      const response = await fetch(`${API}/humidity`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      setHumidity(data.humidity);
      animateProgress(data.humidity);
    } catch (error) {
      Alert.alert('Erro', `Não foi possível obter a umidade.`);
    }
  };

  const animateProgress = (humidity: number) => {
    Animated.timing(progress, {
      toValue: humidity / 100,
      duration: 1000,
      useNativeDriver: false,
    }).start();
  };

  const registerForPushNotificationsAsync = async () => {
    let token;

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF231F7C',
      });
    }

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      Alert.alert('Falha ao obter permissões para enviar notificações!');
      return;
    }

    try {
      token = (await Notifications.getExpoPushTokenAsync()).data;
      setExpoPushToken(token);
    } catch (error) {
      console.error('Erro ao obter o token:', error);
    }

    return token;
  };

  useEffect(() => {
    (async () => {
      try {
        await registerForPushNotificationsAsync();
        fetchHumidity();
      } catch (error) {
        console.error('Erro na configuração inicial:', error);
      }

      notificationListener.current = Notifications.addNotificationReceivedListener(notification => {
        // @ts-ignore
        Alert.alert('Nova notificação', notification.request.content.body);
      });

      responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
      });

      return () => {
        if (notificationListener.current) {
          Notifications.removeNotificationSubscription(notificationListener.current);
        }
        if (responseListener.current) {
          Notifications.removeNotificationSubscription(responseListener.current);
        }
      };
    })();
  }, []);

  const progressWidth = progress.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  return (
    <View style={styles.container}>
      <Text style={styles.title}>ESP32 Umidade</Text>
      
      <View style={styles.plantContainer}>
        <Image source={require('../assets/images/plant.png')} style={styles.plantImage} />
        <View style={styles.progressBarContainer}>
          <Animated.View style={[styles.progressBar, { width: progressWidth }]} />
        </View>
      </View>

      <TouchableOpacity onPress={fetchHumidity} style={styles.refreshButton}>
        <Ionicons name="refresh" size={32} color="#4caf50" />
      </TouchableOpacity>

      <Text style={styles.humidity}>Umidade: {humidity}%</Text>
    </View>
  );
};

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
    textAlign: 'center',
    marginBottom: 20,
  },
  humidity: {
    fontSize: 18,
    textAlign: 'center',
    marginVertical: 20,
  },
  plantContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  plantImage: {
    width: 150,
    height: 150,
    resizeMode: 'contain',
  },
  progressBarContainer: {
    width: 160,
    height: 10,
    borderColor: '#ccc',
    borderWidth: 1,
    borderRadius: 5,
    marginTop: 10,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#4caf50',
  },
  refreshButton: {
    marginTop: 10,
    alignItems: 'center',
  },
});

export default App;
