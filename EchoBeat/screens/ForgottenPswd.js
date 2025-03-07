import React, { useState, useLayoutEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, SafeAreaView, Alert } from 'react-native';

export default function ForgottenPswd({ navigation }) {
  const [correo, setCorreo] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorCorreo, setErrorCorreo] = useState('');
  const [errorApi, setErrorApi] = useState('');

  useLayoutEffect(() => {
    navigation.setOptions({
      headerShown: false,
    });
  }, [navigation]);

  const validarCorreo = (email) => {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email);
  };

  const handlePasswordReset = async () => {
    setErrorCorreo('');
    setErrorApi('');

    if (!validarCorreo(correo)) {
      setErrorCorreo('Por favor, introduce un correo válido.');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("https://echobeatapi.duckdns.org/auth/forgot-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ Email: correo }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Error al solicitar recuperación de contraseña.");
      }

      Alert.alert("Éxito", "Si el correo existe, recibirás un enlace para restablecer la contraseña.");
      navigation.navigate("Login_Register");

    } catch (error) {
      setErrorApi(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.titulo}>Recuperar Contraseña</Text>
      <Text style={styles.descripcion}>
        Introduce tu correo electrónico y te enviaremos instrucciones para recuperar tu contraseña.
      </Text>

      <View style={styles.inputContainer}>
        <Text style={styles.label}>Correo electrónico</Text>
        <TextInput
          style={styles.input}
          placeholder="Introduce tu correo electrónico"
          placeholderTextColor="#ffffff"
          value={correo}
          onChangeText={(text) => {
            setCorreo(text);
            setErrorCorreo('');
          }}
          keyboardType="email-address"
          autoCapitalize="none"
        />
        {errorCorreo ? <Text style={styles.error}>{errorCorreo}</Text> : null}
      </View>

      {errorApi ? <Text style={styles.error}>{errorApi}</Text> : null}

      <TouchableOpacity
        style={[styles.boton, loading && styles.botonDeshabilitado]}
        onPress={handlePasswordReset}
        disabled={loading}
      >
        <Text style={styles.botonTexto}>{loading ? "Enviando..." : "ENVIAR"}</Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={() => navigation.navigate('Login_Register')}>
        <Text style={styles.volver}>← Volver a Inicio de Sesión</Text>
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
  titulo: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#f2ab55',
    textAlign: 'center',
    marginBottom: 10,
  },
  descripcion: {
    fontSize: 16,
    color: '#fff',
    textAlign: 'center',
    marginBottom: 30,
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    color: '#f2ab55',
    marginBottom: 5,
  },
  input: {
    borderWidth: 1,
    borderColor: '#f2ab55',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    color: '#ffffff',
    marginBottom: 5,
  },
  error: {
    color: 'red',
    fontSize: 13,
    marginTop: 5,
  },
  boton: {
    backgroundColor: '#ffb723',
    paddingVertical: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 20,
  },
  botonDeshabilitado: {
    backgroundColor: '#b1b1b1',
  },
  botonTexto: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  volver: {
    color: '#f2ab55',
    fontSize: 16,
    textAlign: 'center',
    marginTop: 10,
    textDecorationLine: 'underline',
  },
});
