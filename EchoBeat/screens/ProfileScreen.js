/**
 * @file ProfileScreen.js
 * @description Pantalla de perfil del usuario.
 * Permite ver y editar información del perfil, incluyendo foto, nickname, nombre completo, fecha de nacimiento y privacidad.
 * Incluye opciones para cambiar la imagen de perfil y cerrar sesión.
 */
import React, { useState, useEffect, useLayoutEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, SafeAreaView, Alert, Image, ScrollView, Dimensions, Modal, FlatList } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import * as ImagePicker from 'expo-image-picker'
import DateTimePicker from '@react-native-community/datetimepicker';
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

/**
 * Componente de pantalla para visualizar y editar el perfil del usuario.
 *
 * @param {object} props.navigation - Objeto de navegación de React Navigation.
 */
export default function ProfileScreen({ navigation }) {
  const [userEmail, setUserEmail] = useState('');
  const [userName, setUserName] = useState('');
  const [profilePic, setProfilePic] = useState(null);
  const [privacidad, setPrivacidad] = useState('');
  const [newNick, setNick] = useState('');
  const [nuevaPrivacidad, setNuevaPrivacidad] = useState('');
  const [fullName, setFullName] = useState('');
  const [newFullName, setNewFullName] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState(null);
  const [showDOBPicker, setShowDOBPicker] = useState(false);
  const [showImageOptionsModal, setShowImageOptionsModal] = useState(false);
  const [defaultPhotos, setDefaultPhotos] = useState([]);
  const [showDefaultPhotosModal, setShowDefaultPhotosModal] = useState(false);

  useLayoutEffect(() => {
      navigation.setOptions({
        headerShown: false,
      });
    }, [navigation]);

  useEffect(() => {
    obtenerDatosUsuario();
    (async () => {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert("Permiso requerido", "Se necesita permiso para acceder a la galería.");
      }
    })();
  }, []);

  const PRIVACIDAD_MAP = {
    publico: "Público",
    privado: "Privado",
    protegido: "Protegido"
  };

  /**
   * Obtiene los datos del perfil actual desde la API y AsyncStorage.
   * 
   * @returns {Promise<void>}
   */
  const obtenerDatosUsuario = async () => {
    try {
      const email = await AsyncStorage.getItem('email');
      if (!email) {
        Alert.alert("Error", "No se pudo recuperar el email del usuario.");
        return;
      }
      setUserEmail(email);

      // 🔹 Llamada a la API para obtener los datos del usuario
      const response = await fetch(`https://echobeatapi.duckdns.org/users/get-user?userEmail=${email}`);
      const data = await response.json();

      console.log("Datos del usuario:", data);

      if (!response.ok) {
        throw new Error(data.message || "Error al obtener el perfil del usuario");
      }

      if(data.FechaNacimiento) {
        const fecha = new Date(data.FechaNacimiento);
        setDateOfBirth(fecha);
      } else {
        setDateOfBirth(null);
      }

      const privacidadTexto = PRIVACIDAD_MAP[data.Privacidad] || "Desconocido";
      setUserName(data.Nick || 'Desconocido');
      setProfilePic(data.LinkFoto);
      setPrivacidad(privacidadTexto);
      setFullName(data.NombreCompleto);
    } catch (error) {
      console.error("Error obteniendo perfil:", error);
      Alert.alert("Error", error.message);
    }
  };

  /**
   * Abre un modal con opciones para cambiar la imagen de perfil.
   * 
   * @returns {void}
   */
  const openImageOptions = () => setShowImageOptionsModal(true);

  /**
   * Obtiene fotos predeterminadas de la API y muestra el selector.
   * 
   * @returns {Promise<void>}
   */
  const openDefaultPhotos = async () => {
    try {
      const response = await fetch('https://echobeatapi.duckdns.org/users/default-photos');
      const data = await response.json();
      setDefaultPhotos(data);
      setShowDefaultPhotosModal(true);
      setShowImageOptionsModal(false);
    } catch (error) {
      console.error("Error al abrir fotos predeterminadas:", error);
      Alert.alert("Error", "No se pudo cargar las fotos predeterminadas.");
    }
  };

  /**
   * Selecciona una foto predeterminada y actualiza el perfil en la API.
   *
   * @param {string} imageUri URI de la imagen seleccionada.
   * @return {Promise<void>}
   */
  const selectDefaultPhoto = async (imageUri) => {
    try {
      console.log("Imagen seleccionada:", imageUri);
      const res = await fetch('https://echobeatapi.duckdns.org/users/update-photo-default', {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userEmail: userEmail, imageUrl: imageUri }),
      });
      console.log("Respuesta del servidor:", res);
      console.log("Imagen elegida: ", imageUri);
      if(!res.ok) {
        throw new Error("Error al seleccionar la foto predeterminada");
      }
      setProfilePic(imageUri);
      Alert.alert("Éxito", "Foto de perfil actualizada correctamente");
      setShowDefaultPhotosModal(false);
    } catch (error) {
      console.error("Error al seleccionar foto predeterminada:", error);
      Alert.alert("Error", "No se pudo seleccionar la foto predeterminada.");
    }
  };

  /**
   * Abre la galería para que el usuario elija una imagen desde su dispositivo.
   * 
   * @returns {Promise<void>}
   */
  const seleccionarImagen = async () => {
    console.log("Botón de cambiar imagen presionado");
  
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      console.log("Estado del permiso:", status);
  
      if (status !== 'granted') {
        Alert.alert('Permiso denegado', 'Se necesita acceso a la galería para seleccionar una imagen.');
        return;
      }
  
      console.log("Abriendo la galería...");
  
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Image,
        allowsEditing: true,
        aspect: [1, 1], // Relación de aspecto cuadrada
        quality: 1,
      });
  
      console.log("Imagen seleccionada:", result);
  
      if (!result.canceled && result.assets.length > 0) {
        setProfilePic(result.assets[0].uri);
        actualizarFotoPerfil(result.assets[0].uri);
      }
    } catch (error) {
      console.error("Error al abrir la galería:", error);
      Alert.alert("Error", "No se pudo abrir la galería.");
    }
  };
  
  /**
   * Actualiza la imagen de perfil en la API.
   * 
   * @param {string} imageUri URI de la imagen seleccionada.
   * @returns {Promise<void>}
   */
  const actualizarFotoPerfil = async (imageUri) => {
    try {
      const fileExtension = imageUri.split('.').pop();
      const mimeTypes = {
        jpg: 'image/jpeg',
        jpeg: 'image/jpeg',
        png: 'image/png',
        webp: 'image/webp',
      };

      const fileType = mimeTypes[fileExtension.toLowerCase()] || 'image/jpeg';

      const formData = new FormData();
      formData.append('Email', userEmail);
      formData.append('file', {
        uri: imageUri,
        name: `profile.${fileExtension}`,
        type: fileType,
      });
      console.log("📸 URI de la imagen seleccionada:", imageUri);

      console.log("📢 Enviando FormData:");
      for (let pair of formData.entries()) {
        console.log(pair[0] + ', ' + JSON.stringify(pair[1]));
      }
      console.log("Enviando imagen al servidor...");
      const response = await fetch(`https://echobeatapi.duckdns.org/users/update-photo`, {
        method: "POST",
        headers: { "Content-Type": "multipart/form-data" },
        body: formData,
      });

      const data = await response.json();
      console.log(data);

      if (!response.ok) {
        throw new Error("No se pudo actualizar la imagen de perfil");
      }

      Alert.alert("Éxito", "Imagen de perfil actualizada correctamente");

    } catch (error) {
      Alert.alert("Error", error.message);
    }
  };

  /**
   * Actualiza el nickname del usuario en la API.
   * 
   * @returns {Promise<void>}
   */
  const actualizarNick = async () => {
    try {
      if (!newNick.trim()) {
        Alert.alert("Error", "El nickname no puede estar vacío.");
        return;
      }

      const response = await fetch(`https://echobeatapi.duckdns.org/users/change-nick?userEmail=${userEmail}&Nick=${newNick}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      if (!response.ok) {
        throw new Error("Error al actualizar el nickname.");
      }

      setUserName(newNick);
      setNick('');
      Alert.alert("Éxito", "Nickname actualizado correctamente.");
    } catch (error) {
      Alert.alert("Error", error.message);
    }
  };

  /**
   * Actualiza la privacidad del usuario en la API.
   * 
   * @returns {Promise<void>}
   */
  const actualizarPrivacidad = async () => {
    try {
      const response = await fetch(`https://echobeatapi.duckdns.org/users/update-privacy`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ Email: userEmail, Privacy: nuevaPrivacidad }),
      });

      if (!response.ok) {
        throw new Error("Error al actualizar la privacidad.");
      }

      setPrivacidad(PRIVACIDAD_MAP[nuevaPrivacidad]);
      Alert.alert("Éxito", "Privacidad actualizada correctamente.");
    } catch (error) {
      Alert.alert("Error", error.message);
    }
  };

  /**
   * Actualiza el nombre completo del usuario en la API.
   * 
   * @returns {Promise<void>}
   */
  const actualizarFullName = async () => {
    if(!newFullName.trim()) return Alert.alert("Error", "El nombre completo no puede estar vacío.");
    try {
      await fetch(`https://echobeatapi.duckdns.org/users/update-fullname`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userEmail: userEmail, nombreReal: newFullName }),
      });
      setFullName(newFullName);
      setNewFullName('');
      Alert.alert("Éxito", "Nombre completo actualizado correctamente.");
    } catch (error) {
      console.error("Error al actualizar el nombre completo:", error);
      Alert.alert("Error", "No se pudo actualizar el nombre completo.");
    }
  };

  /**
   * Muestra el modal para seleccionar la fecha de nacimiento.
   * 
   * @returns {void}
   */
  const showDatePickerModal = () => {
    setShowDOBPicker(true);
  };

  /**
   * Maneja el cambio de fecha en el selector de fecha.
   *
   * @param {object} event - Evento del selector de fecha.
   * @param {Date} selectedDate - Fecha seleccionada.
   * @returns {void}
   */
  const onChangeDOB = (event, selectedDate) => {
    setShowDOBPicker(false);
    if (selectedDate) {
      setDateOfBirth(selectedDate);
      try {
        fetch(`https://echobeatapi.duckdns.org/users/update-birthdate`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userEmail: userEmail, birthdate: selectedDate }),
        });
      } catch (error) {
        console.error("Error al actualizar la fecha de nacimiento:", error);
        Alert.alert("Error", "No se pudo actualizar la fecha de nacimiento.");
      }
    }
  };

  /**
   * Cierra la sesión del usuario.
   * Limpia el AsyncStorage y reinicia la navegación.
   * 
   * @returns {Promise<void>}
   */
  const cerrarSesion = async () => {
    try {
      // Borrar todo el AsyncStorage
      await AsyncStorage.clear();
      // Reiniciar la pila de navegación para que no se pueda volver atrás
      navigation.reset({
        index: 0,
        routes: [{ name: 'Login_Register' }],
      });
    } catch (error) {
      console.error("Error al cerrar sesión:", error);
      Alert.alert("Error", "No se pudo cerrar la sesión correctamente.");
    }
  };
  
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#f2ab55" />
        </TouchableOpacity>

        <Text style={styles.title}>Mi Perfil</Text>

        {/* Tarjeta de Información */}
        <View style={styles.card}>
          <Image source={{ uri: profilePic }} style={styles.avatar} />
          <TouchableOpacity onPress={openImageOptions}>
            <Text style={styles.linkText}>Cambiar imagen</Text>
          </TouchableOpacity>
          <Text style={styles.label}>Nick</Text>
          <Text style={styles.value}>{userName}</Text>
          <Text style={styles.label}>Nombre completo</Text>
          <Text style={styles.value}>{fullName}</Text>
          <Text style={styles.label}>Email</Text>
          <Text style={styles.value}>{userEmail}</Text>
          <Text style={styles.label}>Fecha de nacimiento</Text>
          <Text style={styles.value}>{dateOfBirth 
                                      ? dateOfBirth.toLocaleDateString('es-ES', {day:'2-digit', month:'2-digit', year:'numeric'})
                                      : 'Desconocida' }
          </Text>
          <Text style={styles.label}>Privacidad</Text>
          <Text style={styles.value}>{privacidad}</Text>
        </View>

        {/* Editar Nick */}
        <View style={styles.editRow}>
          <TextInput
            style={styles.input}
            placeholder="Nuevo nickname"
            placeholderTextColor="#888"
            value={newNick}
            onChangeText={setNick}
          />
          <TouchableOpacity style={styles.button} onPress={actualizarNick}>
            <Text style={styles.buttonText}>Aplicar</Text>
          </TouchableOpacity>
        </View>

        {/* Editar Nombre Completo */}
        <View style={styles.editRow}>
          <TextInput
            style={styles.input}
            placeholder="Nuevo nombre completo"
            placeholderTextColor="#888"
            value={newFullName}
            onChangeText={setNewFullName}
          />
          <TouchableOpacity style={styles.button} onPress={actualizarFullName}>
            <Text style={styles.buttonText}>Aplicar</Text>
          </TouchableOpacity>
        </View>

        {/* Editar Fecha de Nacimiento */}
        <View style={styles.dobRow}>
          <TouchableOpacity style={[styles.button, styles.fullButton]} onPress={showDatePickerModal}>
            <Text style={styles.buttonText}>Cambiar Fecha de Nacimiento</Text>
          </TouchableOpacity>
          {showDOBPicker && (
            <DateTimePicker
              value={dateOfBirth || new Date()}
              mode="date"
              display="default"
              onChange={onChangeDOB}
              maximumDate={new Date()}
              minimumDate={new Date(1920, 0, 1)} // Fecha mínima
            />
          )}
        </View>

        {/* Editar Privacidad */}
        <View style={styles.editRow}>
          <View style={styles.pickerWrapper}>
            <Picker
              selectedValue={nuevaPrivacidad}
              style={styles.picker}
              onValueChange={setNuevaPrivacidad}
            >
              <Picker.Item label="Público" value="publico" />
              <Picker.Item label="Privado" value="privado" />
              <Picker.Item label="Protegido" value="protegido" />
            </Picker>
          </View>
          <TouchableOpacity style={styles.button} onPress={actualizarPrivacidad}>
            <Text style={styles.buttonText}>Aplicar</Text>
          </TouchableOpacity>
        </View>

        {/* Navegar a preferencias de género */}
        <TouchableOpacity style={[styles.button, styles.fullButton]} onPress={() => navigation.navigate("GeneroPreferences")}>
          <Text style={styles.buttonText}>Cambiar preferencias de género</Text>
        </TouchableOpacity>

        {/* Cerrar sesión */}
        <TouchableOpacity style={[styles.button, styles.logoutButton]} onPress={cerrarSesion}>
          <Text style={styles.buttonText}>Cerrar sesión</Text>
        </TouchableOpacity>
      </ScrollView>
      <Modal
        transparent
        visible={showImageOptionsModal}
        animationType="fade"
        onRequestClose={() => setShowImageOptionsModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.optionsModal}>
            <TouchableOpacity
              style={styles.optionButton}
              onPress={() => { seleccionarImagen(); setShowImageOptionsModal(false); }}
            >
              <Text style={styles.optionText}>Elegir imagen del dispositivo</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.optionButton}
              onPress={openDefaultPhotos}
            >
              <Text style={styles.optionText}>Elegir foto predefinida</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.closeOption}
              onPress={() => setShowImageOptionsModal(false)}
            >
              <Ionicons name="close" size={24} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal
        transparent
        visible={showDefaultPhotosModal}
        animationType="slide"
        onRequestClose={() => setShowDefaultPhotosModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.defaultModal}>
            <TouchableOpacity
              style={styles.closeDefault}
              onPress={() => setShowDefaultPhotosModal(false)}
            >
              <Ionicons name="close" size={24} color="#000" />
            </TouchableOpacity>
            <FlatList
              data={defaultPhotos}
              keyExtractor={(uri) => uri}
              numColumns={2}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.defaultImageWrapper}
                  onPress={() => selectDefaultPhoto(item)}
                >
                  <Image source={{ uri: item }} style={styles.defaultImage} />
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1, 
    backgroundColor: '#121111',
    paddingHorizontal: 20, 
    paddingTop: 20
  },
  backBtn: {
    marginTop: 20,
    marginBottom: 10, 
    alignSelf: 'flex-start'
  },
  title: {
    fontSize: 28, 
    color:'#f2ab55', 
    fontWeight:'bold',
    textAlign:'center', 
    marginBottom:20
  },
  card: {
    backgroundColor: '#1E1E1E',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  avatar: {
    width: 180, 
    height: 190, 
    borderRadius:90,
    alignSelf:'center', 
    marginBottom:12
  },
  linkText: {
    color: '#f2ab55', 
    textAlign:'center', 
    marginBottom:16
  },
  label: {
    color:'#aaa', 
    fontSize:16, 
    marginTop:8
  },
  value: {
    color:'#fff', 
    fontSize:16, 
    marginTop:2
  },
  dobRow: {
    width:'100%', 
    alignItems:'center', 
    marginBottom:16
  },
  editRow: {
    flexDirection:'row', 
    alignItems:'center', 
    marginBottom:16
  },
  input: {
    flex:1,
    fontSize:16,
    borderWidth:1, 
    borderColor:'#333',
    borderRadius:8,
    paddingHorizontal:12, 
    paddingVertical:8,
    color:'#fff', 
    backgroundColor:'#1E1E1E'
  },
  pickerWrapper: {
    flex:1,
    borderWidth:1, 
    borderColor:'#333',
    borderRadius:8,
    overflow:'hidden',
    backgroundColor:'#1E1E1E'
  },
  picker: {
    color:'#fff'
  },
  button: {
    marginLeft:10,
    backgroundColor:'#ffb723',
    paddingVertical:10,
    paddingHorizontal:16,
    borderRadius:8,
    alignItems:'center',
    justifyContent:'center',
  },
  buttonText: {
    color:'#fff',
    fontWeight:'bold',
    fontSize:15
  },
  fullButton: {
    marginLeft:0,
    width:'100%', 
    marginBottom:16,
    paddingVertical:12,
    alignItems:'center',
    justifyContent:'center',
  },
  logoutButton: {
    marginLeft:0,
    backgroundColor:'#d9534f', 
    marginBottom:40,
    width:'100%',
    paddingVertical:12,
    alignItems:'center',
    justifyContent:'center',
  },
  modalOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  optionsModal: {
    width: '80%',
    backgroundColor: '#2e2e2e',
    borderRadius: 12,
    padding: 20,
    position: 'relative',
  },
  optionButton: {
    backgroundColor: '#ffb723',
    borderRadius: 8,
    paddingVertical: 12,
    marginTop: 18,
  },
  optionText: {
    textAlign: 'center',
    fontWeight: 'bold',
    color: '#000',
  },
  closeOption: {
    position: 'absolute',
    top: 12,
    right: 12,
  },
  defaultModal: {
    width: '90%',
    maxHeight: '80%',
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingTop: 40,
    paddingBottom: 20,
    paddingHorizontal: 10,
  },
  closeDefault: {
    position: 'absolute',
    top: 12,
    right: 12,
    zIndex: 1,
  },
  defaultImageWrapper: {
    flex: 1,
    margin: 5,
    alignItems: 'center',
  },
  defaultImage: {
    width: (width * 0.75) / 2 - 10,
    height: (width * 0.75) / 2 - 10,
    borderRadius: 8,
  },
});
