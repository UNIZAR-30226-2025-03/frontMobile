import React, { useState, useEffect, useLayoutEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, SafeAreaView, Alert, Image } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import AsyncStorage from "@react-native-async-storage/async-storage";

export default function ProfileScreen({ navigation }) {
  const [userEmail, setUserEmail] = useState('');
  const [userName, setUserName] = useState('');
  const [profilePic, setProfilePic] = useState(null);
  const [fechaNacimiento, setFechaNacimiento] = useState('');
  const [privacidad, setPrivacidad] = useState('');
  const [newNick, setNick] = useState('');
  const [nuevaPrivacidad, setNuevaPrivacidad] = useState('');

  useLayoutEffect(() => {
      navigation.setOptions({
        headerShown: false,
      });
    }, [navigation]);

  useEffect(() => {
    obtenerDatosUsuario();
  }, []);

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

      if (!response.ok) {
        throw new Error(data.message || "Error al obtener el perfil del usuario");
      }

      // 🔹 Formatear fecha de nacimiento
      let fechaNacimientoFormateada = "Desconocida";
      if (data.FechaNacimiento) {
        const fecha = new Date(data.FechaNacimiento);
        fechaNacimientoFormateada = fecha.toLocaleDateString('es-ES', { year: 'numeric', month: '2-digit', day: '2-digit' });
      }

      // 🔹 Convertir BooleanPrivacidad a texto legible
      const privacidadTexto = data.BooleanPrivacidad === "true" ? "Privado" : "Público";

      setUserName(data.Nick || 'Desconocido');
      setProfilePic(data.LinkFoto || '../assets/logo.png');
      setFechaNacimiento(fechaNacimientoFormateada);
      setPrivacidad(privacidadTexto);
    } catch (error) {
      console.error("Error obteniendo perfil:", error);
      Alert.alert("Error", error.message);
    }
  };


  const seleccionarImagen = async () => {
    // Solicitar permisos de acceso a la galería
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permiso denegado', 'Se necesita acceso a la galería para seleccionar una imagen.');
      return;
    }

    // Abrir la galería
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1], // Relación de aspecto cuadrada
      quality: 1,
    });

    if (!result.canceled) {
      setProfilePic(result.assets[0].uri);
      actualizarFotoPerfil(result.assets[0].uri);
    }
  };

  const actualizarFotoPerfil = async (imageUri) => {
    try {
      const formData = new FormData();
      formData.append('profileImage', {
        uri: imageUri,
        name: 'profile.jpg',
        type: 'image/jpeg',
      });

      const response = await fetch(`https://echobeatapi.duckdns.org/users/update-profile-pic`, {
        method: "POST",
        headers: { "Content-Type": "multipart/form-data" },
        body: formData,
      });

      if (!response.ok) {
        throw new Error("No se pudo actualizar la imagen de perfil");
      }

      Alert.alert("Éxito", "Imagen de perfil actualizada correctamente");

    } catch (error) {
      Alert.alert("Error", error.message);
    }
  };

  const actualizarNick = async () => {
    try {
      if (!newNick.trim()) {
        Alert.alert("Error", "El nickname no puede estar vacío.");
        return;
      }

      const response = await fetch(`https://echobeatapi.duckdns.org/users/change-nick?userEmail=${userEmail}&Nick=${newNick}"`, {
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

      setPrivacidad(nuevaPrivacidad);
      Alert.alert("Éxito", "Privacidad actualizada correctamente.");
    } catch (error) {
      Alert.alert("Error", error.message);
    }
  };

  const cerrarSesion = async () => {
    await AsyncStorage.removeItem("email");
    await AsyncStorage.removeItem("token");
    navigation.navigate("Login_Register");
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Botón para volver al Home */}
      <TouchableOpacity style={styles.backButton} onPress={() => navigation.navigate("HomeScreen")}>
        <Text style={styles.backButtonText}>← Volver</Text>
      </TouchableOpacity>

      <Text style={styles.titulo}>Perfil</Text>

      {/* Datos del usuario */}
      <View style={styles.infoContainer}>
        <Image source={{ uri: profilePic }} style={styles.profileImage} />
        <TouchableOpacity style={styles.backButton} onPress={seleccionarImagen}>
          <Text style={styles.backButtonText}>Cambiar Imagen</Text>
        </TouchableOpacity>
        <Text style={styles.InfoText}>Nick: {userName}</Text>
        <Text style={styles.InfoText}>Fecha de nacimiento: {fechaNacimiento}</Text>
        <Text style={styles.InfoText}>Privacidad: {privacidad}</Text>
      </View>

      {/* Cambiar nickname */}
      <View style={styles.row}>
        <TextInput
          style={styles.input}
          placeholder="Nuevo Nickname"
          placeholderTextColor="#ffffff"
          value={newNick}
          onChangeText={setNick}
        />
        <TouchableOpacity style={styles.boton} onPress={actualizarNick}>
          <Text style={styles.botonTexto}>Aplicar</Text>
        </TouchableOpacity>
      </View>

      {/* Cambiar privacidad */}
      <View style={styles.row}>
        <Picker
          selectedValue={nuevaPrivacidad}
          style={styles.picker}
          onValueChange={(itemValue) => setNuevaPrivacidad(itemValue)}
        >
          <Picker.Item label="Público" value="Público" />
          <Picker.Item label="Privado" value="Privado" />
          <Picker.Item label="Protegido" value="Protegido" />
        </Picker>
        <TouchableOpacity style={styles.boton} onPress={actualizarPrivacidad}>
          <Text style={styles.botonTexto}>Aplicar</Text>
        </TouchableOpacity>
      </View>

      {/* Botón para cambiar preferencias de género */}
      <TouchableOpacity style={styles.generoButton} onPress={() => navigation.navigate("GeneroPreferences")}>
        <Text style={styles.botonTexto}>Cambiar Preferencias de Género</Text>
      </TouchableOpacity>

      {/* Botón de Cerrar Sesión */}
      <TouchableOpacity style={styles.logoutButton} onPress={cerrarSesion}>
        <Text style={styles.botonTexto}>CERRAR SESIÓN</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121111',
    paddingHorizontal: 20,
    paddingTop: 50,
  },
  infoContainer: {
    marginBottom: 20,
  },
  backButton: {
    alignSelf: "flex-start",
    marginBottom: 10,
  },
  backButtonText: {
    color: "#f2ab55",
    fontSize: 16,
    textDecorationLine: "underline",
  },
  InfoText: {
    color: "#f2ab55",
    fontSize: 16,
  },
  titulo: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#f2ab55",
    textAlign: "center",
    marginBottom: 20,
  },
  label: {
    color: "#f2ab55",
    fontSize: 16,
    marginBottom: 5,
  },
  userData: {
    color: "#fff",
    fontSize: 18,
    marginBottom: 15,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 15,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#f2ab55",
    borderRadius: 8,
    paddingHorizontal: 12,
    color: "#ffffff",
    fontSize: 16,
  },
  picker: {
    flex: 1,
    color: "#fff",
  },
  boton: {
    backgroundColor: "#ffb723",
    padding: 10,
    borderRadius: 8,
    marginLeft: 10,
  },
  botonTexto: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  generoButton: {
    backgroundColor: "#fd7407",
    padding: 15,
    borderRadius: 8,
    alignItems: "center",
    marginBottom: 20,
  },
  logoutButton: {
    backgroundColor: "#d9534f",
    padding: 15,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 260,
  },
});
