/**
 * @file CrearPlaylist.js
 * @description Pantalla para crear una nueva playlist en la aplicación EchoBeat.
 * Permite al usuario definir nombre, privacidad, descripción y portada,
 * bien subiéndola desde el dispositivo o eligiendo una predefinida.
 */
import React, { useState, useLayoutEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, SafeAreaView, Alert, Image, TouchableWithoutFeedback, Keyboard, Modal, FlatList, Dimensions } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { Picker } from '@react-native-picker/picker';
import * as ImagePicker from 'expo-image-picker';

const { width } = Dimensions.get('window');

/**
 * Pantalla para crear una nueva playlist.
 * Permite al usuario definir nombre, privacidad, descripción y portada,
 * bien subiéndola desde el dispositivo o eligiendo una predefinida.
 *
 * @param {object} navigation - Propiedad de navegación de React Navigation.
 */
export default function CrearPlaylist({ navigation }) {
  const [playlistName, setPlaylistName] = useState('');
  const [privacy, setPrivacy] = useState('publico');
  const [description, setDescription] = useState('');
  const [image, setImage] = useState(null); // Se guardará la imagen en formato base64
  const [loading, setLoading] = useState(false);
  const [showImageOptionsModal, setShowImageOptionsModal] = useState(false);
  const [defaultPhotos, setDefaultPhotos] = useState([]);
  const [showDefaultPhotosModal, setShowDefaultPhotosModal] = useState(false);
  const [useDefaultImage, setUseDefaultImage] = useState(false);

  useLayoutEffect(() => {
    navigation.setOptions({ headerShown: false });
  }, [navigation]);

  /**
   * Muestra un diálogo de confirmación antes de descartar la creación
   * de la playlist y regresar a la pantalla anterior.
   * 
   * @returns {void}
   */
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

  /**
   * Solicita permisos de galería y abre el selector de imágenes.
   * Al seleccionar, guarda la URI en estado.
   * 
   * @returns {void}
   */
  const handleImageUpload = async () => {
    setUseDefaultImage(false);
    setShowImageOptionsModal(true);
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

    console.log("Imagen: ", result);

    if (!result.canceled && result.assets && result.assets.length > 0) {
      const uri = result.assets[0].uri;
      try {
        setImage(uri);
      } catch (error) {
        console.error("Error al leer la imagen:", error);
        Alert.alert("Error", "No se pudo procesar la imagen seleccionada.");
      }
    }
  };

  /**
   * Obtiene de la API un listado de fotos predefinidas
   * y muestra el modal de selección.
   * 
   * @returns {void}
   */
  const openDefaultPhotos = async () => {
    try {
      const res = await fetch('https://echobeatapi.duckdns.org/playlists/default-photos');
      const data = await res.json();
      setDefaultPhotos(data);
      setShowImageOptionsModal(false);
      setShowDefaultPhotosModal(true);
    } catch (error) {
      console.error("Error al obtener fotos por defecto:", error);
      Alert.alert("Error", "No se pudo cargar las fotos por defecto.");
    }
  };

  /**
   * Selecciona una foto predefinida para la portada.
   *
   * @param {string} uri - URI de la imagen predefinida elegida.
   * @returns {void}
   */
  const selectDefaultPhoto = (uri) => {
    setUseDefaultImage(true);
    setImage(uri);
    setShowDefaultPhotosModal(false);
  };

  /**
   * Valida los campos del formulario y envía los datos
   * para crear la playlist a la API correspondiente.
   * 
   * @returns {void}
   */
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
      if(useDefaultImage) {
        const res = await fetch('https://echobeatapi.duckdns.org/playlists/create-with-url',{
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            emailUsuario,
            nombrePlaylist: playlistName,
            descripcionPlaylist: description,
            tipoPrivacidad: privacy,
            imageUrl: image,
          }),
        });
        const data = await res.json();
        if(!res.ok) {
          throw new Error(data.message || "Error al crear la playlist");
        }
      } else {
        // Crear el objeto FormData
        let formData = new FormData();
        formData.append('emailUsuario', emailUsuario);
        formData.append('nombrePlaylist', playlistName);
        formData.append('descripcionPlaylist', description);
        formData.append('tipoPrivacidad', privacy);
        
        if (image) {
          const fileExtension = image.split('.').pop();
          const mimeTypes = {
            jpg: 'image/jpeg',
            jpeg: 'image/jpeg',
            png: 'image/png',
            webp: 'image/webp',
          };
          const fileType = mimeTypes[fileExtension.toLowerCase()] || 'image/jpeg';
          formData.append('file', {
            uri: image,
            name: `playlist.${fileExtension}`,
            type: fileType,
          });
        } else {
          formData.append('file', '');
        }
    
        const response = await fetch('https://echobeatapi.duckdns.org/playlists/create', {
          method: 'POST',
          body: formData,
        });
        const data = await response.json();
        console.log("Respuesta:", data);
        if (!response.ok) {
          throw new Error(data.message || "Error al crear la playlist");
        }
      }
      Alert.alert('Éxito', 'Playlist creada correctamente');
      navigation.replace("MyLists");
    } catch (error) {
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  };  

  return (
    <TouchableWithoutFeedback onPress={() => Keyboard.dismiss()}>
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
          <TouchableOpacity style={styles.imagePicker} onPress={() => setShowImageOptionsModal(true)}>
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
          {/* Botón de Confirmar */}
          <TouchableOpacity style={styles.submitButton} onPress={handleSubmit} disabled={loading}>
            <Text style={styles.submitButtonText}>{loading ? "Creando..." : "Confirmar"}</Text>
          </TouchableOpacity>
        </View>
        <Modal 
          transparent visible={showImageOptionsModal} 
          animationType="fade" 
          onRequestClose={() => setShowImageOptionsModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.optionsModal}>
              <TouchableOpacity style={styles.optionButton} onPress={handleImageUpload}>
                <Text style={styles.optionText}>Elegir imagen del dispositivo</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.optionButton} onPress={openDefaultPhotos}>
                <Text style={styles.optionText}>Elegir foto predefinida</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.closeOption} onPress={() => setShowImageOptionsModal(false)}>
                <Ionicons name="close" size={24} color="#fff" />
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        <Modal 
          transparent visible={showDefaultPhotosModal} 
          animationType="slide" 
          onRequestClose={() => setShowDefaultPhotosModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.defaultModal}>
              <TouchableOpacity style={styles.closeDefault} onPress={() => setShowDefaultPhotosModal(false)}>
                <Ionicons name="close" size={24} color="#000" />
              </TouchableOpacity>
              <FlatList
                data={defaultPhotos}
                keyExtractor={(uri) => uri}
                numColumns={2}
                renderItem={({ item }) => (
                  <TouchableOpacity style={styles.defaultImageWrapper} onPress={() => selectDefaultPhoto(item)}>
                    <Image source={{ uri: item }} style={styles.defaultImage} />
                  </TouchableOpacity>
                )}
              />
            </View>
          </View>
        </Modal>
      </SafeAreaView>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  container1: {
    flex: 1,
    backgroundColor: '#121111',
  },
  container: {
    flex: 1,
    backgroundColor: '#121111',
    paddingHorizontal: 20,
    paddingTop: 30,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    paddingTop: 20,
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
    marginHorizontal: 20,
    marginTop: 'auto',
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
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
