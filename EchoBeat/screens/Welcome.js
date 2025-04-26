/**
 * @file Welcome.js
 * @description Pantalla de bienvenida que muestra un mensaje de bienvenida
 * y el nombre del usuario recuperado de la API.
 * - Recupera el email del usuario desde AsyncStorage.
 * - Llama a la API para obtener el nombre completo del usuario.
 * - Muestra un mensaje de bienvenida y redirige a la pantalla principal.
 */
import React, { useState, useLayoutEffect, useEffect } from 'react';
import { View, Text, StyleSheet, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Pantalla de bienvenida que muestra un mensaje de bienvenida
 * y el nombre del usuario recuperado de la API.
 * - Recupera el email del usuario desde AsyncStorage.
 * - Llama a la API para obtener el nombre completo del usuario.
 * - Muestra un mensaje de bienvenida y redirige a la pantalla principal.
 * 
 * @param {object} navigation - Prop de navegación de React Navigation.
 */
export default function Welcome({ navigation }) {
  const [userName, setUserName] = useState('user');

  useLayoutEffect(() => {
    navigation.setOptions({ headerShown: false });
  }, [navigation]);

  useEffect(() => {
    /**
     * Función para recuperar el nombre del usuario desde la API.
     * - Obtiene el email del usuario desde AsyncStorage.
     * - Llama a la API para obtener el nombre completo.
     * - Maneja errores y redirige a la pantalla de inicio de sesión si no se encuentra el email.
     * - Almacena el flag 'logged' en AsyncStorage.
     * 
     * @returns {Promise<void>}
     */
    const getUserInfo = async () => {
      try {
        const email = await AsyncStorage.getItem('email');
        if (!email) {
          Alert.alert("Error", "No se pudo recuperar el email del usuario.");
          navigation.replace('Login_Register');
          return;
        }
        const response = await fetch(`https://echobeatapi.duckdns.org/users/get-user?userEmail=${email}`);
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.message || "Error al obtener el nombre del usuario");
        }
        setUserName(data.NombreCompleto || 'Usuario');
      } catch (error) {
        Alert.alert("Error", error.message);
      }
      console.log('Se ha puesto bien el flag logged');
      await AsyncStorage.setItem('logged', '0');
    };
    getUserInfo();
  }, [navigation]);

  useEffect(() => {
    /**
     * Redirige a la pantalla principal después de 2 segundos.
     * - Si el usuario no está autenticado, redirige a la pantalla de inicio de sesión.
     * 
     * @returns {Function} Función de limpieza para cancelar el timeout.
     */
    const timeout = setTimeout(() => {
      navigation.replace('HomeScreen');
    }, 2000);
    return () => clearTimeout(timeout);
  }, [navigation]);

  return (
    <View style={styles.container}>
      <Text style={styles.welcomeText}>
        Bienvenido a <Text style={styles.echoBeatText}>EchoBeat!</Text>{'\n'}{userName}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121111',
    justifyContent: 'center',
    alignItems: 'center',
  },
  welcomeText: {
    fontSize: 24,
    color: '#ffb723',
    textAlign: 'center',
    fontWeight: 'bold',
  },
  echoBeatText: {
    color: '#fd7407',
    fontSize: 32,
    fontWeight: 'bold',
    letterSpacing: 2,
    textShadowColor: '#ffb723',
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 3,
  },
});
