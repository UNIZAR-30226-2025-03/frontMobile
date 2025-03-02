import React, { useState, useEffect, useLayoutEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Image, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';

export default function ProfileScreen({ navigation }) {
  const [userName, setUserName] = useState('');
  const [profileImage, setProfileImage] = useState(null);
  const [userEmail, setUserEmail] = useState('');

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

      // 🔹 Llamada a la API para obtener el nombre e imagen de perfil del usuario
      const response = await fetch(`http://48.209.24.188:3000/users/profile?userEmail=${email}`); // direccion provisional
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Error al obtener el perfil del usuario");
      }

      setUserName(data.Nick || '');
      setProfileImage(data.profileImage || null);
    } catch (error) {
      console.error("Error obteniendo perfil:", error);
      Alert.alert("Error", error.message);
    }
  };

  const handleSaveChanges = async () => {
    try {
      const response = await fetch(`http://48.209.24.188:3000/users/update-profile`, {    // direccion provisional
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userEmail,
          newNick: userName,
          newProfileImage: profileImage,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || "Error al actualizar el perfil.");
      }

      Alert.alert("Éxito", "Perfil actualizado correctamente.");
    } catch (error) {
      console.error("Error actualizando perfil:", error);
      Alert.alert("Error", error.message);
    }
  };

  const handlePickImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaType.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 1,
    });

    if (!result.canceled) {
      setProfileImage(result.uri);
    }
  };

  const handleLogout = async () => {
    await AsyncStorage.removeItem("token");
    await AsyncStorage.removeItem("email");
    navigation.navigate("LoginRegister");
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Perfil de Usuario</Text>

      <TouchableOpacity onPress={handlePickImage}>
        <Image
          source={profileImage ? { uri: profileImage } : require('../assets/favicon.png')}
          style={styles.profileImage}
        />
        <Text style={styles.changeImageText}>Cambiar Imagen</Text>
      </TouchableOpacity>

      <TextInput
        style={styles.input}
        placeholder="Nuevo Nombre de Usuario"
        placeholderTextColor="#cccccc"
        value={userName}
        onChangeText={setUserName}
      />

      <TouchableOpacity style={styles.saveButton} onPress={handleSaveChanges}>
        <Text style={styles.saveButtonText}>Guardar Cambios</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Text style={styles.logoutButtonText}>Cerrar Sesión</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.homeButton} onPress={() => navigation.navigate("HomeScreen")}>
        <Text style={styles.homeButtonText}>← Volver a Inicio</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#121111',
    padding: 15,
  },
  title: {
    fontSize: 25,
    fontWeight: 'bold',
    color: '#f2ab55',
    marginBottom: 20,
    marginTop: -40,
  },
  profileImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#555',
  },
  changeImageText: {
    color: '#f2ab55',
    fontSize: 15,
    marginTop: 20,
    textDecorationLine: 'underline',
  },
  input: {
    width: '90%',
    borderWidth: 1,
    borderColor: '#f2ab55',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#ffffff',
    marginTop: 20,
    marginBotton: 20,
  },
  saveButton: {
    backgroundColor: '#ffb723',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 20,
    width: '90%',
  },
  saveButtonText: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  logoutButton: {
    backgroundColor: '#ff1212',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 20,
    width: '90%',
  },
  logoutButtonText: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  homeButton: {
    marginTop: 30,
  },
  homeButtonText: {
    color: '#f2ab55',
    fontSize: 16,
    textDecorationLine: 'underline',
  },
});
