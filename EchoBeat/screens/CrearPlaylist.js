import React, { useState, useLayoutEffect } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  StyleSheet, 
  SafeAreaView, 
  Alert,
  Image
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';

export default function CrearPlaylist({ navigation }) {
  const [playlistName, setPlaylistName] = useState('');
  // Valores internos en minúsculas para la API
  const [privacy, setPrivacy] = useState('publico');
  const [description, setDescription] = useState('');
  const [image, setImage] = useState(null); // Se guardará la imagen en formato base64
  const [loading, setLoading] = useState(false);

  useLayoutEffect(() => {
    navigation.setOptions({ headerShown: false });
  }, [navigation]);

  const handleBackPress = () => {
    Alert.alert(
      'Confirmar',
      '¿Desea descartar la creación de la playlist?',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Confirmar', onPress: () => navigation.goBack() }
      ]
    );
  };

  const handleImageUpload = async () => {
    // Solicitar permisos para acceder a la galería
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permiso denegado', 'Se necesita acceso a la galería para seleccionar una imagen.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 1,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      const uri = result.assets[0].uri;
      try {
        // Leer la imagen como base64
        const base64 = await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 });
        // Opcional: puedes agregar el prefijo MIME si lo requiere la API
        const base64Image = `data:image/jpeg;base64,${base64}`;
        setImage(base64Image);
      } catch (error) {
        console.error("Error al leer la imagen:", error);
        Alert.alert("Error", "No se pudo procesar la imagen seleccionada.");
      }
    }
  };

  const handleSubmit = async () => {
    if (!playlistName.trim()) {
      Alert.alert('Error', 'El nombre de la playlist es obligatorio.');
      return;
    }
    if (!privacy) {
      Alert.alert('Error', 'La privacidad es obligatoria.');
      return;
    }
    setLoading(true);
    try {
      const emailUsuario = await AsyncStorage.getItem('email');
      if (!emailUsuario) {
        Alert.alert('Error', 'No se encontró el email del usuario.');
        setLoading(false);
        return;
      }
      // Si no se selecciona imagen, se envía una cadena vacía.
      const file = image ? image : "";

      const response = await fetch('https://echobeatapi.duckdns.org/playlists/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          emailUsuario,
          nombrePlaylist: playlistName,
          descripcionPlaylist: description,
          tipoPrivacidad: privacy,
          file
        })
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || "Error al crear la playlist");
      }
      Alert.alert('Éxito', 'Playlist creada correctamente');
      navigation.goBack();
    } catch (error) {
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header con flecha de retroceso */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBackPress} style={styles.headerButton}>
          <Ionicons name="arrow-back" size={24} color="#f2ab55" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Crear Playlist</Text>
      </View>

      {/* Formulario */}
      <View style={styles.form}>
        {/* Selector de imagen en círculo */}
        <TouchableOpacity style={styles.imagePicker} onPress={handleImageUpload}>
          <Image 
            source={ image ? { uri: image } : require('../assets/default_playlist_portada.jpg') } 
            style={styles.image} 
          />
          <View style={styles.editIconContainer}>
            <Ionicons name="pencil" size={20} color="#fff" />
          </View>
        </TouchableOpacity>

        <Text style={styles.label}>Nombre de la Playlist *</Text>
        <TextInput
          style={styles.input}
          placeholder="Nombre de la Playlist"
          placeholderTextColor="#888"
          value={playlistName}
          onChangeText={setPlaylistName}
        />

        <Text style={styles.label}>Privacidad *</Text>
        <View style={styles.pickerContainer}>
          <Picker
            selectedValue={privacy}
            onValueChange={(itemValue) => setPrivacy(itemValue)}
            style={styles.picker}
          >
            <Picker.Item label="Público" value="publico" />
            <Picker.Item label="Privado" value="privado" />
            <Picker.Item label="Protegido" value="protegido" />
          </Picker>
        </View>

        <Text style={styles.label}>Descripción (opcional, máximo 150 caracteres)</Text>
        <TextInput
          style={[styles.input, styles.multilineInput]}
          placeholder="Descripción de la playlist"
          placeholderTextColor="#888"
          value={description}
          onChangeText={setDescription}
          maxLength={150}
          multiline
        />
      </View>

      {/* Botón de Confirmar */}
      <TouchableOpacity style={styles.submitButton} onPress={handleSubmit} disabled={loading}>
        <Text style={styles.submitButtonText}>{loading ? "Creando..." : "Confirmar"}</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121111',
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  headerButton: {
    marginRight: 10,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#f2ab55',
  },
  form: {
    flex: 1,
  },
  imagePicker: {
    alignSelf: 'center',
    marginBottom: 20,
    position: 'relative',
  },
  image: {
    width: 250,
    height: 250,
    borderRadius: 125, // Círculo perfecto
  },
  editIconContainer: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderRadius: 12,
    padding: 4,
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
    paddingVertical: 10,
    fontSize: 16,
    color: '#ffffff',
    marginBottom: 15,
  },
  multilineInput: {
    height: 100,
    textAlignVertical: 'top',
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#f2ab55',
    borderRadius: 8,
    overflow: 'hidden',
    marginBottom: 15,
  },
  picker: {
    color: '#ffffff',
  },
  submitButton: {
    backgroundColor: '#ffb723',
    paddingVertical: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 20,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
});
