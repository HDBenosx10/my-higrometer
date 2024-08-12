import React, { useState, useEffect } from 'react';
import { View, Text, Alert, StyleSheet, Image, Animated, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons'; // Certifique-se de instalar @expo/vector-icons ou react-native-vector-icons

const App = () => {
  const [humidity, setHumidity] = useState(0);
  const [progress, setProgress] = useState(new Animated.Value(0)); // Inicializa a barra de progresso
  const ESP32_IP = 'http://192.168.1.2'; // Substitua pelo endereço IP do seu ESP32

  // Função para buscar o valor de umidade da API
  const fetchHumidity = async () => {
    try {
      const response = await fetch(`${ESP32_IP}/`);
      const data = await response.json();
      setHumidity(data.humidity);
      animateProgress(data.humidity); // Atualiza a barra de progresso
    } catch (error) {
      Alert.alert('Erro', 'Não foi possível obter a umidade.');
    }
  };

  // Anima a barra de progresso com base na umidade
  const animateProgress = (humidity: number) => {
    Animated.timing(progress, {
      toValue: humidity / 100, // Convertendo a umidade para uma escala de 0 a 1
      duration: 1000,
      useNativeDriver: false,
    }).start();
  };

  useEffect(() => {
    fetchHumidity(); // Busca a umidade ao iniciar o app
  }, []);

  // Largura da barra de progresso baseada na umidade
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
