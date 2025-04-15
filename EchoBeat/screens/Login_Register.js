import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, SafeAreaView, Image, Alert, TouchableWithoutFeedback, Keyboard } from 'react-native';
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Google from 'expo-auth-session/providers/google';

export default function Login_Register({ navigation }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const [request, response, promptAsync] = Google.useAuthRequest({
    androidClientId: '251988611522-0klcocrp7913fsk46e9d93rl6crue1r3.apps.googleusercontent.com',
  });

  useEffect(() => {
    const fetchUserInfo = async () => {
      if (response?.type === 'success') {
        const { access_token } = response.authentication;
        
        try {
          const userInfoResponse = await fetch("https://www.googleapis.com/userinfo/v2/me", 
            { headers: { Authorization: `Bearer ${access_token}` }}
          );
          const userInfo = await userInfoResponse.json();
          console.log("Información del usuario: ", userInfo);

        } catch (error) {
          console.error("Error al obtener la información del usuario: ", error);
          Alert.alert("Error", "Error al obtener la información del usuario");
        }
      }
      if (response?.type === 'error') {
        console.error("Error al iniciar sesión con Google: ", response.error);
        Alert.alert("Error", "Error al iniciar sesión con Google");
      }
    }
  }, [response]);

  const handleLogin = async () => {
    try {
      const response = await fetch("https://echobeatapi.duckdns.org/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ Email: email, Password: password }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || "Error al iniciar sesión");
      }
      if (data.accessToken) {
        await AsyncStorage.setItem("token", data.accessToken);
        await AsyncStorage.setItem("email", email);
        navigation.replace("Welcome");
      }
    } catch (error) {
      setErrorMessage(error.message);
      Alert.alert("Error", error.message);
    }
  };

  return (
    <TouchableWithoutFeedback onPress={() => Keyboard.dismiss()}>
      <SafeAreaView style={styles.container}>
        <Image
          source={require('../assets/logo.png')}
          style={styles.logo}
          resizeMode="contain"
        />
        <Text style={styles.titulo}>Bienvenido a EchoBeat</Text>

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

        {/* Botón de INICIA SESIÓN */}
        <TouchableOpacity
          style={[styles.boton, loading && styles.botonDeshabilitado]}
          onPress={handleLogin}
          disabled={loading}
        >
          <Text style={styles.botonTexto}>{loading ? 'Cargando...' : 'INICIAR SESIÓN'}</Text>
        </TouchableOpacity>

        {/* Botón de Iniciar con Google */}
        <TouchableOpacity 
          style={styles.googleButton} 
          onPress={() => promptAsync().catch((e) => {
            console.error("Error al inciar sesión con Google ",e);
          })} //loginWithGoogle
        >
          <Text style={styles.googleButtonText}>INICIAR CON </Text>
          <Image 
            source={require('../assets/logo_google.png')} 
            style={styles.googleLogo} 
            resizeMode="contain" 
          />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.boton, styles.botonSecundario]}
          onPress={() => navigation.navigate('Register')}
        >
          <Text style={styles.botonTexto}>REGÍSTRATE</Text>
        </TouchableOpacity>
      </SafeAreaView>
    </TouchableWithoutFeedback>
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
  googleButton: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    paddingVertical: 15,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
  },
  googleButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000',
  },
  googleLogo: {
    width: 24,
    height: 24,
    marginLeft: 8,
  },
});