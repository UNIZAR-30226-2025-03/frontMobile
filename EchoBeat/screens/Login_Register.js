import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, SafeAreaView, Image } from 'react-native';

export default function Login_Register({navigation}) {
  const [correo, setCorreo] = useState('');
  const [contrasena, setContrasena] = useState('');

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
          value={correo}
          onChangeText={setCorreo}
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
          value={contrasena}
          onChangeText={setContrasena}
          secureTextEntry
        />
        <TouchableOpacity onPress={() => navigation.navigate('ForgottenPswd')}>
          <Text style={styles.forgotPasswordText}>He olvidado mi contraseña</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity 
        style={styles.boton}
        onPress={() => navigation.navigate('HomeScreen')}
      >
        <Text style={styles.botonTexto}>INICIA SESIÓN</Text>
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
  });