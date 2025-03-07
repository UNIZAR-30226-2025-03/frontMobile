// Welcome.js
import React, { useState, useLayoutEffect, useEffect } from 'react';
import { View, Text, StyleSheet, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function Welcome({ navigation }) {
  const [userName, setUserName] = useState('');

  useLayoutEffect(() => {
    navigation.setOptions({ headerShown: false });
  }, [navigation]);

  useEffect(() => {
    const getUserInfo = async () => {
      try {
        const email = await AsyncStorage.getItem('email');
        if (!email) {
          Alert.alert("Error", "No se pudo recuperar el email del usuario.");
          navigation.replace('Login_Register');
          return;
        }
        const response = await fetch(`https://echobeatapi.duckdns.org/users/nick?userEmail=${email}`);
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.message || "Error al obtener el nombre del usuario");
        }
        setUserName(data.Nick || 'Usuario');
      } catch (error) {
        Alert.alert("Error", error.message);
      }
    };
    getUserInfo();
  }, [navigation]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      navigation.replace('HomeScreen');
    }, 2000);
    return () => clearTimeout(timeout);
  }, [navigation]);

  return (
    <View style={styles.container}>
      <Text style={styles.welcomeText}>
        Bienvenido a <Text style={styles.goBeatText}>GoBeat</Text>,{'\n'}{userName}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121111', // Fondo negro
    justifyContent: 'center',
    alignItems: 'center',
  },
  welcomeText: {
    fontSize: 24,
    color: '#ffb723',
    textAlign: 'center',
    fontWeight: 'bold',
  },
  goBeatText: {
    color: '#fd7407', // Naranja para resaltar
    fontSize: 32,
    fontWeight: 'bold',
    letterSpacing: 2,
    textShadowColor: '#ffb723', // Sombra amarilla opcional
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 3,
  },
});
