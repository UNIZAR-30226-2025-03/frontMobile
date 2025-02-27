import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, SafeAreaView, Image, Alert } from 'react-native';
import AsyncStorage from "@react-native-async-storage/async-storage";

export default function Login_Register({navigation}) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    try {
      const response = await fetch("http://48.209.24.188:3000/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          Email: email,
          Password: password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Error al iniciar sesión");
      }

      if (data.accessToken) {
        await AsyncStorage.setItem("token", data.accessToken);
        Alert.alert("Éxito", "Inicio de sesión exitoso");
        navigation.navigate("HomeScreen");
      }
    } catch (error) {
      setErrorMessage(error.message);
      Alert.alert("Error", error.message);
    }
  };


  const checkAuth = async () => {
    const token = await AsyncStorage.getItem("token");
    if (token) {
      navigation.navigate("HomeScreen");
    }
  };

  // 🔹 Función para cerrar sesión
  const handleLogout = async () => {
    await AsyncStorage.removeItem("token");
    navigation.navigate("Login_Register");
  };



  return (
    <SafeAreaView style={styles.container}>
      <Image
        source={require('../assets/logo.png')}
        style={styles.logo}
        resizeMode="contain"
      />
      <Text style={styles.titulo}>Bienvenido a GoBeat</Text>

      <View style={styles.inputContainer}>
        <Text style={styles.label}>Correo Electrónico</Text>
        <TextInput
          style={styles.input}
          placeholder="Introduce tu correo"
          placeholderTextColor="#ffffff"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
        />
      </View>

      <View style={styles.inputContainer}>
        <Text style={styles.label}>Contraseña</Text>
        <TextInput
          style={styles.input}
          placeholder="Introduce tu contraseña"
          placeholderTextColor="#ffffff"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />
        <TouchableOpacity onPress={() => navigation.navigate('ForgottenPswd')}>
          <Text style={styles.forgotPasswordText}>He olvidado mi contraseña</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        style={[styles.boton, loading && styles.botonDeshabilitado]}
        onPress={handleLogin}
        disabled={loading}
      >
        <Text style={styles.botonTexto}>{loading ? 'Cargando...' : 'INICIA SESIÓN'}</Text>
      </TouchableOpacity>

      <TouchableOpacity style={[styles.boton, styles.botonSecundario]}
        onPress={() => navigation.navigate('Register')}
      >
        <Text style={styles.botonTexto}>REGÍSTRATE</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
    container: {
      flex: 1,
      justifyContent: 'center',
      paddingHorizontal: 20,
      backgroundColor: '#121111',
    },
    logo: {
      width: 150,
      height: 150,
      alignSelf: 'center',
      marginBottom: 10,
      marginTop: -20,
    },
    titulo: {
      fontSize: 28,
      fontWeight: 'bold',
      marginBottom: 20,
      marginTop: 10,
      textAlign: 'center',
      color: '#f2ab55',
    },
    inputContainer: {
      marginBottom: 20,
    },
    label: {
      fontSize: 16,
      marginBottom: 5,
      paddingLeft: 5,
      color: '#f2ab55',
    },
    input: {
      borderWidth: 1,
      borderColor: '#f2ab55',
      borderRadius: 8,
      paddingHorizontal: 12,
      paddingVertical: 12,
      fontSize: 16,
      color: '#ffffff',
    },
    forgotPasswordText: {
      color: '#f2ab55',
      textAlign: 'right',
      marginTop: 5,
      textDecorationLine: 'underline',
      fontSize: 14,
    },
    boton: {
      backgroundColor: '#ffb723',
      paddingVertical: 15,
      borderRadius: 8,
      alignItems: 'center',
      marginTop: 30,
    },
    botonSecundario: {
      marginTop: 20,
      backgroundColor: '#fd7407',
    },
    botonTexto: {
      color: '#fff',
      fontSize: 16,
      fontWeight: 'bold',
    },
    botonDeshabilitado: {
      backgroundColor: '#b1b1b1',
    },
  });