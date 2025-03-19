import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, SafeAreaView, Image, Alert, TouchableWithoutFeedback, Keyboard } from 'react-native';
import AsyncStorage from "@react-native-async-storage/async-storage";
//import { GoogleSignin, statusCodes } from '@react-native-google-signin/google-signin';

export default function Login_Register({ navigation }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [loading, setLoading] = useState(false);

  /*GoogleSignin.configure({
    webClientId: '726836881808-tho26qmoe5sp996bebnl0vh26f9l9amv.apps.googleusercontent.com',
    offlineAccess: true, // Opcional: para obtener un refreshToken
  });*/

  useEffect(() => {
  }, []);

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

  /*const loginWithGoogle = async () => {
    try {
      console.log("Verificando Google Play Services...");
      await GoogleSignin.hasPlayServices();
      console.log("Google Play Services está disponible. Iniciando sesión...");
      const userInfo = await GoogleSignin.signIn();
  
      const { idToken } = userInfo;
      console.log("idToken:", idToken);

      // Envía el idToken a tu backend
      const backendResponse = await fetch("https://echobeatapi.duckdns.org/auth/google/mobile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ Token: idToken }),
      });
      const backendData = await backendResponse.json();
      console.log("Respuesta del backend:", backendData);
  
      if (!backendResponse.ok) {
        throw new Error(backendData.message || "Error al iniciar sesión con Google");
      }
  
      if (backendData.accessToken) {
        await AsyncStorage.setItem("token", backendData.accessToken);
        await AsyncStorage.setItem("email", backendData.email);
        navigation.replace("Welcome");
      }
    } catch (error) {
      console.log("Error en loginWithGoogle:", error);
      if (error.code === statusCodes.SIGN_IN_CANCELLED) {
        console.log("El usuario canceló el inicio de sesión");
      } else if (error.code === statusCodes.IN_PROGRESS) {
        console.log("Operación en progreso");
      } else if (error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
        console.log("Google Play Services no está disponible o está desactualizado");
      } else {
        console.log("Error desconocido:", error);
      }
    }
  };*/

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
          onPress={() => console.log("Iniciar con Google")} //loginWithGoogle
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