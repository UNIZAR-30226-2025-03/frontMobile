import React, { useState, useEffect } from 'react';
import {View,Text,TextInput,TouchableOpacity,StyleSheet,SafeAreaView,ScrollView,Alert,} from 'react-native';
import { Picker } from '@react-native-picker/picker';

const usuariosRegistrados = {       // Ejemplos que reemplazaremos por llamada a API
  correos: ['usuario@example.com', 'test@test.com'],
  nicknames: ['user123', 'nick456'],
};

export default function Register({ navigation }) {
  const [nombre, setNombre] = useState('');
  const [correo, setCorreo] = useState('');
  const [nickname, setNickname] = useState('');
  const [edad, setEdad] = useState(null);
  const [formValido, setFormValido] = useState(false);

  useEffect(() => {
    const correoValido = validarCorreo(correo);
    const nombreValido = nombre.trim().split(' ').length >= 2;
    const nicknameValido = nickname.trim().length > 0;
    const edadValida = edad !== null;
    navigation.setOptions({
        headerShown: false,
    });

    const correoUnico = !usuariosRegistrados.correos.includes(correo);
    const nicknameUnico = !usuariosRegistrados.nicknames.includes(nickname);

    setFormValido(
        correoValido &&
        nombreValido &&
        nicknameValido &&
        edadValida &&
        correoUnico &&
        nicknameUnico
    );
  }, [nombre, correo, nickname, edad, navigation]);

  const validarCorreo = (email) => {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email);
  };

  const handleRegistro = () => {
    Alert.alert('Registro exitoso', `¡Bienvenido, ${nickname}!`);
    navigation.navigate('Login_Register');
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <Text style={styles.titulo}>Rellena los campos para registrarte</Text>

        {/* Nombre y Apellido */}
        <View style={styles.inputContainer}>
          <Text style={styles.label}>Nombre real y apellidos</Text>
          <TextInput
            style={styles.input}
            placeholder="Introduce tu nombre y apellidos"
            placeholderTextColor="#ffffff"
            value={nombre}
            onChangeText={setNombre}
          />
          {nombre.trim().length > 0 &&
            nombre.trim().split(' ').length < 2 && (
              <Text style={styles.error}>
                Debes introducir al menos nombre y apellido.
              </Text>
            )}
        </View>

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
          {usuariosRegistrados.nicknames.includes(nickname) && (
            <Text style={styles.error}>
              Este nickname ya está registrado.
            </Text>
          )}
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.label}>Edad</Text>
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={edad}
              onValueChange={(value) => setEdad(value)}
              dropdownIconColor="#f2ab55"
              style={{ color: '#ffffff' }}
            >
              <Picker.Item label="Selecciona tu edad" value={null} />
              {Array.from({ length: 99 }, (_, i) => i + 1).map((num) => (
                <Picker.Item key={num} label={`${num}`} value={num} />
              ))}
            </Picker>
          </View>
        </View>

        <TouchableOpacity
          style={[styles.boton, !formValido && styles.botonDeshabilitado]}
          disabled={!formValido}
          onPress={handleRegistro}
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
    marginTop: 150,
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
    marginTop: 120,
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
