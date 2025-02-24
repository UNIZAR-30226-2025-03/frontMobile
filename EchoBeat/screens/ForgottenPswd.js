import React, { useState, useLayoutEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, SafeAreaView } from 'react-native';

export default function ForgottenPswd({ navigation }) {
  const [correo, setCorreo] = useState('');
  useLayoutEffect(() => {
      navigation.setOptions({
        headerShown: false,
      });
  }, [navigation]);

  const validarCorreo = (email) => {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email);
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
            onChangeText={setCorreo}
            keyboardType="email-address"
            autoCapitalize="none"
          />
          {correo.length > 0 && !validarCorreo(correo) && (
            <Text style={styles.error}>
              Formato de correo inválido.
            </Text>
          )}
      </View>

      <TouchableOpacity 
        style={styles.boton}
        onPress={() => {
          // Simulación de envío de correo
          alert('Si el correo existe, recibirás instrucciones para restablecer la contraseña.');
        }}
      >
        <Text style={styles.botonTexto}>ENVIAR</Text>
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
  input: {
    borderWidth: 1,
    borderColor: '#f2ab55',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    color: '#ffffff',
    marginBottom: 20,
  },
  boton: {
    backgroundColor: '#ffb723',
    paddingVertical: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 20,
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
