import React, { useEffect, useState, useLayoutEffect } from "react";
import {View,Text,StyleSheet,SafeAreaView,TouchableOpacity,Image,Alert,ScrollView,TextInput,Modal} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Picker } from "@react-native-picker/picker";
import * as ImagePicker from "expo-image-picker";
import AsyncStorage from "@react-native-async-storage/async-storage";

export default function EditPlaylistScreen({ route, navigation }) {
  const { playlistEdit: initialEditData, playlistId, songs: initialSongs, onSave } = route.params;
  const [playlistEdit, setPlaylistEdit] = useState(initialEditData);
  const [songs, setSongs] = useState(initialSongs || []);
  const [userEmail, setUserEmail] = useState("");
  const [portadaUri, setPortadaUri] = useState(playlistEdit?.Portada);
  const [nuevaPortada, setNuevaPortada] = useState(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [showImageOptionsModal, setShowImageOptionsModal] = useState(false);
  const [defaultPhotos, setDefaultPhotos] = useState([]);
  const [showDefaultPhotosModal, setShowDefaultPhotosModal] = useState(false);
  const [useDefaultImage, setUseDefaultImage] = useState(false);
  const [subiendoPortada, setSubiendoPortada] = useState(false);

  useLayoutEffect(() => {
    navigation.setOptions({ headerShown: false });
  }, [navigation]);

  useEffect(() => {
    const loadInitialData = async () => {
      const email = await AsyncStorage.getItem("email");
      if (email) setUserEmail(email);
  
      try {
        const [songsRes, infoRes] = await Promise.all([
          fetch(`https://echobeatapi.duckdns.org/playlists/${playlistId}/songs`),
          fetch(`https://echobeatapi.duckdns.org/playlists/lista/${playlistId}`)
        ]);
  
        const songsJson = await songsRes.json();
        const infoJson = await infoRes.json();
  
        setSongs(songsJson.canciones);
        console.log("A editar llega la privacidad:", infoJson.TipoPrivacidad);
        setPlaylistEdit({
          Nombre: infoJson.Nombre || '',
          Descripcion: infoJson.Descripcion || '',
          TipoPrivacidad: infoJson.TipoPrivacidad || 'publico',
        });
  
        // Usa la portada más reciente
        setPortadaUri(infoJson.Portada);
      } catch (err) {
        console.error("Error al cargar datos:", err);
        Alert.alert("Error", "No se pudieron cargar los datos.");
      }
    };
  
    loadInitialData();
  }, []);

  const moverCancion = (cancion, direccion) => {
    const index = songs.findIndex((s) => s.id === cancion.id);
    const nuevoIndex = index + direccion;
    if (nuevoIndex < 0 || nuevoIndex >= songs.length) return;

    const nuevaLista = [...songs];
    const [movida] = nuevaLista.splice(index, 1);
    nuevaLista.splice(nuevoIndex, 0, movida);
    setSongs(nuevaLista);
    console.log("[DEBUG] Lista de canciones reordenada:", nuevaLista.map((s) => s.nombre));
  };

  const handleImagePick = () => {
    setShowImageOptionsModal(true);
  };

  const pickImageFromDevice = async () => {
    setUseDefaultImage(false);
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permissionResult.granted) {
      Alert.alert("Permiso denegado", "Se necesita acceso a la galería.");
      return;
    }
  
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });
  
    if (!result.canceled && result.assets.length > 0) {
      const image = result.assets[0];
      setPortadaUri(image.uri);
      setNuevaPortada(image.uri);
      setShowImageOptionsModal(false);
    }
  };
  
  const openDefaultPhotos = async () => {
    try {
      const res = await fetch('https://echobeatapi.duckdns.org/playlists/default-photos');
      const data = await res.json();
      setDefaultPhotos(data);
      setShowImageOptionsModal(false);
      setShowDefaultPhotosModal(true);
    } catch (error) {
      Alert.alert("Error", "No se pudieron cargar las imágenes predefinidas.");
    }
  };
  
  const selectDefaultPhoto = (uri) => {
    setUseDefaultImage(true);
    setNuevaPortada(null); // eliminamos si había una portada anterior del dispositivo
    setPortadaUri(uri);
    setShowDefaultPhotosModal(false);
  };

  const guardarCambios = async () => {
    if (subiendoPortada) return; // prevenir doble clic
      setSubiendoPortada(true);
    try {
      const baseUrl = `https://echobeatapi.duckdns.org/playlists`;

      // Subir portada default
      if (useDefaultImage && portadaUri) {
        const resDefault = await fetch(`https://echobeatapi.duckdns.org/playlists/update-cover`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            userEmail: userEmail,
            playlistId: playlistId,
            imageUrl: portadaUri,
          }),
        });
      
        if (!resDefault.ok) {
          const msg = await resDefault.text();
          throw new Error(`Portada por URL: ${msg}`);
        }
      }

      // Subir portada si se cambió
      if (nuevaPortada) {
        const formData = new FormData();
        formData.append("userEmail", userEmail);
        formData.append("file", {
          uri: nuevaPortada,
          name: "playlist.jpg",
          type: "image/jpeg",
        });

        await new Promise((resolve) => setTimeout(resolve, 700));

        const resPortada = await fetch(`${baseUrl}/update-photo/${playlistId}`, {
          method: "POST",
          body: formData,
        });
        
        if (resPortada.status != 200 && resPortada.status != 201) {
          const msg = await resPortada.text();
          throw new Error(`Portada: ${msg}`);
        }
      }

      // Nombre
      const resNombre = await fetch(`${baseUrl}/update-nombre`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userEmail,
          idPlaylist: playlistId,
          nuevoNombre: playlistEdit.Nombre,
        }),
      });
      if (resNombre.status != 200 && resNombre.status != 201) {
        const msg = await resNombre.text();
        throw new Error(`Nombre: ${msg}`);
      }

      // Descripción
      const resDesc = await fetch(`${baseUrl}/update-descripcion`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userEmail,
          idPlaylist: playlistId,
          nuevaDescripcion: playlistEdit.Descripcion,
        }),
      });
      if (resDesc.status != 200 && resDesc.status != 201) {
        const msg = await resDesc.text();
        throw new Error(`Descripción: ${msg}`);
      }

      // Privacidad
      const resPriv = await fetch(`${baseUrl}/update-privacidad`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userEmail,
          idPlaylist: playlistId,
          nuevoTipoPrivacidad: playlistEdit.TipoPrivacidad,
        }),
      });
      if (resPriv.status != 200 && resPriv.status != 201) {
        const msg = await resPriv.text();
        throw new Error(`Privacidad: ${msg}`);
      }

      // Reordenar canciones
      const resOrden = await fetch(`${baseUrl}/reordenar-canciones`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            idPlaylist: playlistId,
            cancionesJson: {
              canciones: songs,
            },
          }),
      });
      if (!resOrden.ok) {
        const msg = await resOrden.text();
        throw new Error(`Orden de canciones: ${msg}`);
      }

      setShowSuccess(true);
      setTimeout(() => {
        setShowSuccess(false);
        if (onSave) onSave();
        navigation.goBack();
        setSubiendoPortada(false);
      }, 1500);
    } catch (error) {
      console.error("Error al guardar cambios:", error.message);
      Alert.alert("❌ Error al guardar", error.message);
      setSubiendoPortada(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={{ padding: 20 }}>
        <View style={styles.header}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerButton}>
                <Ionicons name="arrow-back" size={24} color="#f2ab55" />
            </TouchableOpacity>
        </View>

        <View style={{ marginBottom: 20, alignSelf: 'center', position: 'relative' }}>
          <TouchableOpacity onPress={handleImagePick}>
            <Image source={{ uri: portadaUri }} style={styles.image} />
          </TouchableOpacity>
          <TouchableOpacity onPress={handleImagePick} style={styles.imageOverlay}>
            <Ionicons name="pencil" size={20} color="#fff" />
          </TouchableOpacity>
        </View>

        <Text style={styles.label}>Nombre de la Playlist *</Text>
        <TextInput
          style={styles.input}
          value={playlistEdit.Nombre}
          onChangeText={(text) => setPlaylistEdit({ ...playlistEdit, Nombre: text })}
        />

        <Text style={styles.label}>Privacidad *</Text>
        <View style={styles.pickerContainer}>
          <Picker
            selectedValue={playlistEdit.TipoPrivacidad}
            onValueChange={(value) => setPlaylistEdit({ ...playlistEdit, TipoPrivacidad: value })}
            style={styles.picker}
          >
            <Picker.Item label="publico" value="publico" />
            <Picker.Item label="protegido" value="protegido" />
            <Picker.Item label="privado" value="privado" />
          </Picker>
        </View>

        <Text style={styles.label}>Descripción</Text>
        <TextInput
          style={[styles.input, { height: 80, textAlignVertical: "top" }]}
          multiline
          maxLength={150}
          value={playlistEdit.Descripcion}
          onChangeText={(text) => setPlaylistEdit({ ...playlistEdit, Descripcion: text })}
        />

        <Text style={styles.label}>Orden de las canciones</Text>
        {songs.map((song) => (
          <View key={song.id} style={styles.songItem}>
            <Image source={{ uri: song.portada }} style={styles.songImage} />
            <View style={styles.songTextContainer}>
              <Text numberOfLines={1} style={styles.songTitle}>{song.nombre}</Text>
            </View>
            <View style={styles.songIconsContainer}>
              <TouchableOpacity onPress={() => moverCancion(song, -1)} style={{ marginBottom: 4 }}>
                <Ionicons name="arrow-up" size={20} color="#fff" />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => moverCancion(song, 1)}>
                <Ionicons name="arrow-down" size={20} color="#fff" />
              </TouchableOpacity>
            </View>
          </View>
        ))}

        <TouchableOpacity 
          style={[styles.button, subiendoPortada && { opacity: 0.5 }]} 
          onPress={guardarCambios}
          disabled={subiendoPortada}
        >
          <Text style={styles.buttonText}>Guardar cambios</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginTop: 20 }}>
          <Text style={{ color: "#f2ab55", textAlign: "center" }}>Cancelar</Text>
        </TouchableOpacity>
      </ScrollView>
      {showSuccess && (
        <View style={{
            position: 'absolute',
            top: '45%',
            left: '10%',
            right: '10%',
            backgroundColor: '#1e1e1e',
            padding: 20,
            borderRadius: 16,
            alignItems: 'center',
            justifyContent: 'center',
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.3,
            shadowRadius: 4,
            elevation: 5,
          }}>
            <Ionicons name="checkmark-circle" size={36} color="#f2ab55" style={{ marginBottom: 10 }} />
            <Text style={{ color: '#f2ab55', fontSize: 16, fontWeight: 'bold' }}>
              Cambios guardados
            </Text>
          </View>
      )}
      {/* Modal de opciones de imagen */}
      <Modal
        visible={showImageOptionsModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowImageOptionsModal(false)}
      >
        <View style={{
          ...StyleSheet.absoluteFillObject,
          backgroundColor: 'rgba(0,0,0,0.6)',
          justifyContent: 'center',
          alignItems: 'center',
        }}>
          <View style={{
            width: '80%',
            backgroundColor: '#2e2e2e',
            borderRadius: 12,
            padding: 20,
            position: 'relative',
          }}>
            <TouchableOpacity style={{ backgroundColor: '#ffb723', borderRadius: 8, paddingVertical: 12, marginTop: 18 }} onPress={pickImageFromDevice}>
              <Text style={{ textAlign: 'center', fontWeight: 'bold', color: '#000' }}>Elegir imagen del dispositivo</Text>
            </TouchableOpacity>
            <TouchableOpacity style={{ backgroundColor: '#ffb723', borderRadius: 8, paddingVertical: 12, marginTop: 18 }} onPress={openDefaultPhotos}>
              <Text style={{ textAlign: 'center', fontWeight: 'bold', color: '#000' }}>Elegir foto predefinida</Text>
            </TouchableOpacity>
            <TouchableOpacity style={{ position: 'absolute', top: 12, right: 12 }} onPress={() => setShowImageOptionsModal(false)}>
              <Ionicons name="close" size={24} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Modal para mostrar fotos predefinidas */}
      <Modal
        visible={showDefaultPhotosModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowImageOptionsModal(false)}
      >
        <View style={{
          ...StyleSheet.absoluteFillObject,
          backgroundColor: 'rgba(0,0,0,0.6)',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 999
        }}>
          <View style={{
            width: '90%',
            maxHeight: '80%',
            backgroundColor: '#fff',
            borderRadius: 12,
            paddingTop: 40,
            paddingBottom: 20,
            paddingHorizontal: 10,
          }}>
            <TouchableOpacity style={{ position: 'absolute', top: 12, right: 12 }} onPress={() => setShowDefaultPhotosModal(false)}>
              <Ionicons name="close" size={24} color="#000" />
            </TouchableOpacity>
            <ScrollView contentContainerStyle={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center' }}>
              {defaultPhotos.map((item) => (
                <TouchableOpacity key={item} onPress={() => selectDefaultPhoto(item)} style={{ margin: 5 }}>
                  <Image source={{ uri: item }} style={{ width: 140, height: 140, borderRadius: 8 }} />
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#121111",
  },
  image: {
    width: 200,
    height: 200,
    borderRadius: 100,
  },
  imageOverlay: {
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
  button: {
    backgroundColor: '#f2ab55',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 20,
  },
  buttonText: {
    color: '#121111',
    fontSize: 16,
    fontWeight: 'bold',
  },
  songItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#222",
    borderRadius: 8,
    marginVertical: 5,
    padding: 8,
  },
  songImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
  },
  songTextContainer: {
    flex: 1,
    marginHorizontal: 10,
  },
  songTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#fff",
  },
  songIconsContainer: {
    justifyContent: "center",
    alignItems: "center",
  },
  headerButton: {},
  headerContent: {
    paddingHorizontal: 20,
    paddingTop: 10,
    alignItems: "center",
    position: "relative",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 25,
    paddingTop: 30,
  },
});
