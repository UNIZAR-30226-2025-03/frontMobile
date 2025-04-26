/**
 * @file Login_Register.js
 * @description Pantalla de inicio de sesión y registro.
 * Permite al usuario iniciar sesión con correo y contraseña,
 * recuperar contraseña, registrarse y autenticarse con Google.
 * Redirige al usuario según su estado (nuevo o existente).
 */
import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, SafeAreaView, Image, Alert, TouchableWithoutFeedback, Keyboard } from 'react-native';
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';

WebBrowser.maybeCompleteAuthSession();

/**
 * Componente de autenticación que permite:
 * - Iniciar sesión con correo y contraseña.
 * - Recuperar contraseña.
 * - Registrar cuenta nueva.
 * - Autenticar vía Google OAuth.
 * Redirige al usuario según su estado (nuevo o existente).
 *
 * @param {object} navigation - Prop de navegación de React Navigation.
 */
export default function Login_Register({ navigation }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const [request, response, promptAsync] = Google.useAuthRequest(
    {
      androidClientId: '262081994570-up3usrguatvnbcpl6f9h4nkt3k9e05mq.apps.googleusercontent.com',
    }
  );
  
  useEffect(() => {
    /**
     * Función que maneja la respuesta de Google después de la autenticación.
     * - Si la autenticación es exitosa, obtiene el token de acceso.
     * - Realiza una llamada a la API para obtener información del usuario.
     * - Almacena el token y el correo en AsyncStorage.
     * - Redirige al usuario a la pantalla de preferencias de género o a la pantalla principal.
     * - Maneja errores en la autenticación o en la llamada a la API.
     * 
     * @returns {void}
     */
    const checkLogin = async () => {
      if(response) {
        if (response.type === 'success') {
          const { accessToken } = response.authentication;
          try {
            const userInfo =  await fetch('https://www.googleapis.com/userinfo/v2/me', {
              headers: { Authorization: `Bearer ${accessToken}` },
            });
            const user = await userInfo.json();

            console.log("User info: ", user);
            
            const resp = await fetch(`https://echobeatapi.duckdns.org/auth/google/mobile?email=${user.email}&fullName=${user.name}`);

            const response = await resp.json();
            if(!response.accessToken) {
              throw new Error(response.message || "Error al iniciar sesión con Google");
            }
            await AsyncStorage.setItem("token", response.accessToken);
            await AsyncStorage.setItem("email", user.email);
            
            console.log("Respuesta de la API: ", response);
            if(response.isNew) {
              navigation.replace("GeneroPreferencesInit");
              return;
            }
            navigation.replace("Welcome");
          } catch (error) {
            console.error("Error al obtener información del usuario: ", error);
          }
        } else {
          console.error('Error en la respuesta de Google:', response);
        }
      }
    }
    checkLogin();
  });

  /**
   * Maneja el inicio de sesión con email y contraseña,
   * almacena el token y redirige a la pantalla principal.
   * 
   * @returns {void}
   */
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