import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, SafeAreaView, ScrollView, Alert, Platform, } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from "@react-native-async-storage/async-storage";

const usuariosRegistrados = { // Ejemplos que se reemplazarán por llamada a API
  correos: ['usuario@example.com', 'test@test.com'],
  nicknames: ['user123', 'nick456'],
};

export default function Register({ navigation }) {
  // Estados de los campos
  const [nombreApellidos, setNombreApellidos] = useState('');
  const [correo, setCorreo] = useState('');
  const [nickname, setNickname] = useState('');
  const [contraseña, setContraseña] = useState('');
  const [confirmarContraseña, setConfirmarContraseña] = useState('');
  const [fechaNacimiento, setFechaNacimiento] = useState(new Date());
  const [formValido, setFormValido] = useState(false);
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [confirmPasswordVisible, setConfirmPasswordVisible] = useState(false);
  
  // Estado para el DateTimePicker
  const [showDatePicker, setShowDatePicker] = useState(false);

  useEffect(() => {
    const nombreValido = nombreApellidos.trim().length > 0;
    const correoValido = validarCorreo(correo);
    const nicknameValido = nickname.trim().length > 0;
    const contraseñaValida = contraseña.trim().length > 0;
    const confirmarValida = confirmarContraseña.trim().length > 0 && confirmarContraseña === contraseña;
    const fechaValida = fechaNacimiento !== null;
    
    const correoUnico = !usuariosRegistrados.correos.includes(correo);
    const nicknameUnico = !usuariosRegistrados.nicknames.includes(nickname);

    setFormValido(
      nombreValido &&
      correoValido &&
      nicknameValido &&
      contraseñaValida &&
      confirmarValida &&
      fechaValida &&
      correoUnico &&
      nicknameUnico
    );
    
    navigation.setOptions({ headerShown: false });
  }, [nombreApellidos, correo, nickname, contraseña, confirmarContraseña, fechaNacimiento, navigation]);

  const validarCorreo = (email) => {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email);
  };

  const handleRegister = async () => {
    try {
      const response = await fetch("https://echobeatapi.duckdns.org/users/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          NombreCompleto: nombreApellidos,
          Email: correo,
          Password: contraseña,
          Nick: nickname,
          FechaNacimiento: fechaNacimiento.toISOString(),
        }),
      });
  
      const data = await response.json();
  
      if (!response.ok) {
        throw new Error(data.message || "Error al registrar usuario");
      }
  
      await AsyncStorage.setItem("email", correo);
      Alert.alert("Éxito", "Registro exitoso! Seleccione sus géneros preferidos e inicie sesión.");
      
      //navigation.replace('Welcome');
      navigation.replace('GeneroPreferencesInit');
    } catch (error) {
      Alert.alert("Error", error.message);
    }
  };

  // Formatea la fecha en dd/mm/yyyy
  const formatDate = (date) => {
    const day = date.getDate();
    const month = date.getMonth() + 1;
    const year = date.getFullYear();
    return `${day < 10 ? '0' + day : day}/${month < 10 ? '0' + month : month}/${year}`;
  };

  const onChangeDate = (event, selectedDate) => {
    setShowDatePicker(Platform.OS === 'ios'); // En Android se cierra automáticamente
    if (selectedDate) {
      setFechaNacimiento(selectedDate);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={[styles.scrollContainer, { flexGrow: 1 }]} showsVerticalScrollIndicator={false}>
        <View style={styles.headerInScroll}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#f2ab55" />
          </TouchableOpacity>
        </View>

        <Text style={styles.titulo}>Regístrate en EchoBeat!</Text>

        {/* Nombre y Apellidos */}
        <View style={styles.inputContainer}>
          <Text style={styles.label}>Nombre y Apellidos</Text>
          <TextInput
            style={styles.input}
            placeholder="Introduce tu nombre y apellidos"
            placeholderTextColor="#ffffff"
            value={nombreApellidos}
            onChangeText={setNombreApellidos}
          />
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
            <Text style={styles.error}>Formato de correo inválido.</Text>
          )}
          {usuariosRegistrados.correos.includes(correo) && (
            <Text style={styles.error}>Este correo ya está registrado.</Text>
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
            <Text style={styles.error}>Este nickname ya está registrado.</Text>
          )}
        </View>

        {/* Contraseña */}
        <View style={styles.inputContainer}>
          <Text style={styles.label}>Contraseña</Text>
          <View style={styles.passwordContainer}>
            <TextInput
              style={[styles.input, { flex: 1 }]}
              placeholder="Crea tu contraseña"
              placeholderTextColor="#ffffff"
              value={contraseña}
              onChangeText={setContraseña}
              secureTextEntry={!passwordVisible}
            />
            <TouchableOpacity onPress={() => setPasswordVisible(!passwordVisible)} style={styles.eyeButton}>
              <Ionicons name={passwordVisible ? "eye" : "eye-off"} size={20} color="#ffffff" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Confirmar Contraseña */}
        <View style={styles.inputContainer}>
          <Text style={styles.label}>Confirmar contraseña</Text>
          <View style={styles.passwordContainer}>
            <TextInput
              style={[styles.input, { flex: 1 }]}
              placeholder="Confirma tu contraseña"
              placeholderTextColor="#ffffff"
              value={confirmarContraseña}
              onChangeText={setConfirmarContraseña}
              secureTextEntry={!confirmPasswordVisible}
            />
            <TouchableOpacity onPress={() => setConfirmPasswordVisible(!confirmPasswordVisible)} style={styles.eyeButton}>
              <Ionicons name={confirmPasswordVisible ? "eye" : "eye-off"} size={20} color="#ffffff" />
            </TouchableOpacity>
          </View>
          {confirmarContraseña.length > 0 && confirmarContraseña !== contraseña && (
            <Text style={styles.error}>Las contraseñas no coinciden.</Text>
          )}
        </View>

        {/* Fecha de nacimiento */}
        <View style={styles.inputContainer}>
          <Text style={styles.label}>Fecha de nacimiento</Text>
          <TouchableOpacity onPress={() => setShowDatePicker(true)} style={styles.dateButton}>
            <Text style={styles.dateText}>
              {fechaNacimiento ? formatDate(fechaNacimiento) : "Selecciona tu fecha de nacimiento"}
            </Text>
          </TouchableOpacity>
          {showDatePicker && (
            <DateTimePicker
              value={fechaNacimiento || new Date()}
              mode="date"
              display={Platform.OS === 'ios' ? 'inline' : 'default'}
              onChange={onChangeDate}
              themeVariant="light"
              maximumDate={new Date()}
            />
          )}
        </View>

        {/* Espacio extra para evitar que el contenido quede oculto tras el botón fijo */}
        <View style={{ height: 120 }} />
      </ScrollView>
      
      {/* Botón fijo de REGISTRAR */}
      <View style={styles.fixedButtonContainer}>
        <TouchableOpacity
          style={[styles.boton, !formValido && styles.botonDeshabilitado]}
          disabled={!formValido}
          onPress={handleRegister}
        >
          <Text style={styles.botonTexto}>REGISTRAR</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121111',
  },
  headerInScroll: {
    paddingHorizontal: 20,
  },
  backButton: {
    width: 30,
    height: 20,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  scrollContainer: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 120,
  },
  titulo: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#f2ab55',
    textAlign: 'center',
    marginBottom: 20,
    marginTop: 20,
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
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#f2ab55',
    borderRadius: 8,
  },
  eyeButton: {
    paddingHorizontal: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dateButton: {
    borderWidth: 1,
    borderColor: '#f2ab55',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  dateText: {
    color: '#ffffff',
    fontSize: 16,
  },
  fixedButtonContainer: {
    position: 'absolute',
    bottom: 25,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: '#121111',
  },
  boton: {
    backgroundColor: '#ffb723',
    paddingVertical: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  botonDeshabilitado: {
    backgroundColor: '#b1b1b1',
  },
  botonTexto: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
