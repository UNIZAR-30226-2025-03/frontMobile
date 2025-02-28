import React, { useState, useEffect } from 'react';
import {View,Text,TextInput,TouchableOpacity,StyleSheet,SafeAreaView,ScrollView,Alert,} from 'react-native';
import { Picker } from '@react-native-picker/picker';

const usuariosRegistrados = {       // ARREGLAR ESTO PARA QUE LO GESTIONE LA API
  correos: ['usuario@example.com', 'test@test.com'],
  nicknames: ['user123', 'nick456'],
};

export default function Register({ navigation }) {
  const [correo, setCorreo] = useState('');
  const [nickname, setNickname] = useState('');
  const [fechaNacimiento, setFechaNacimiento] = useState(null);
  const [contraseña, setContraseña] = useState('');
  const [formValido, setFormValido] = useState(false);
  const currentYear = new Date().getFullYear();

  useEffect(() => {
    const correoValido = validarCorreo(correo);
    const nicknameValido = nickname.trim().length > 0;
    const fechaValida = fechaNacimiento !== null;
    const contraseñaValida = !!contraseña && contraseña.trim().length > 0;
    navigation.setOptions({
        headerShown: false,
    });

    const correoUnico = !usuariosRegistrados.correos.includes(correo);
    const nicknameUnico = !usuariosRegistrados.nicknames.includes(nickname);

    setFormValido(
        correoValido &&
        nicknameValido &&
        fechaValida &&
        correoUnico &&
        contraseñaValida &&
        nicknameUnico
    );
  }, [correo, nickname, fechaNacimiento, contraseña, navigation]);

  const validarCorreo = (email) => {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email);
  };

  const handleRegister = async () => {
    try {
      const response = await fetch("http://48.209.24.188:3000/users/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          Email: correo, // Usa el estado del correo
          Password: contraseña, // Usa el estado de la contraseña
          Nick: nickname,
          FechaNacimiento: new Date(fechaNacimiento).toISOString(), // Convierte a formato ISO
        }),
      });
  
      const data = await response.json();
  
      if (!response.ok) {
        throw new Error(data.message || "Error al registrar usuario");
      }
  
      Alert.alert("Éxito", "Registro exitoso, ahora inicia sesión.");
      navigation.navigate("Login_Register"); // Redirige al login
    } catch (error) {
      Alert.alert("Error", error.message);
    }
  };
  

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <Text style={styles.titulo}>Rellena los campos para registrarte</Text>

        {/* Correo Electrónico */}
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
          {usuariosRegistrados.correos.includes(correo) && (
            <Text style={styles.error}>
              Este correo ya está registrado.
            </Text>
          )}
        </View>

        {/* Nickname */}
        <View style={styles.inputContainer}>
          <Text style={styles.label}>Nickname</Text>
          <TextInput
            style={styles.input}
            placeholder="Introduce tu nickname"
            placeholderTextColor="#ffffff"
            value={nickname}
            onChangeText={setNickname}
          />
          {usuariosRegistrados.nicknames.includes(nickname) && (    // REVISAR
            <Text style={styles.error}>
              Este nickname ya está registrado.
            </Text>
          )}
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.label}>Contraseña</Text>
          <TextInput
            style={styles.input}
            placeholder="Crea tu contraseña"
            placeholderTextColor="#ffffff"
            value={contraseña}
            onChangeText={setContraseña}
            secureTextEntry
          />
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.label}>Fecha de nacimiento</Text>
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={fechaNacimiento}
              onValueChange={(value) => setFechaNacimiento(value)}
              dropdownIconColor="#f2ab55"
              style={{ color: '#ffffff' }}
            >
              <Picker.Item label="Selecciona tu año de nacimiento" value={null} />
              {Array.from({ length: currentYear - 1899 }, (_, i) => 1900 + i)
                .reverse()
                .map((year) => (
                  <Picker.Item key={year} label={`${year}`} value={year} />
                ))}
            </Picker>
          </View>
        </View>

        <TouchableOpacity
          style={[styles.boton, !formValido && styles.botonDeshabilitado]}
          disabled={!formValido}
          onPress={handleRegister}
        >
          <Text style={styles.botonTexto}>REGISTRAR</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => navigation.navigate('Login_Register')}
          style={styles.botonVolver}
        >
          <Text style={styles.volverTexto}>← Volver a Inicio de Sesión</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121111',
    paddingHorizontal: 20,
    justifyContent: 'center',
  },
  titulo: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#f2ab55',
    textAlign: 'center',
    marginBottom: 20,
    marginTop: 120,
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    color: '#f2ab55',
    fontSize: 16,
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
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#f2ab55',
    borderRadius: 8,
    overflow: 'hidden',
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
    marginTop: 40,
  },
  botonDeshabilitado: {
    backgroundColor: '#b1b1b1',
  },
  botonTexto: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  botonVolver: {
    marginTop: 20,
    alignItems: 'center',
  },
  volverTexto: {
    color: '#f2ab55',
    fontSize: 16,
    textDecorationLine: 'underline',
  },
});
