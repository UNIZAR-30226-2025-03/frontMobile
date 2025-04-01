import React, { useState, useEffect, useLayoutEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, Image, FlatList, ActivityIndicator, Modal, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';

export default function MyLists({ navigation }) {
  const [playlists, setPlaylists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedPlaylist, setSelectedPlaylist] = useState(null);
  const [userEmail, setUserEmail] = useState('');

  useLayoutEffect(() => {
    navigation.setOptions({ headerShown: false });
  }, [navigation]);

  useEffect(() => {
    obtenerPlaylists();
    obtenerEmail();
  }, []);

  const obtenerEmail = async () => {
    try {
      const email = await AsyncStorage.getItem("email");
      setUserEmail(email);
    } catch (error) {
      console.error("Error al obtener el email:", error);
    }
  };

  const obtenerPlaylists = async () => {
    try {
      const email = await AsyncStorage.getItem("email");
      if (!email) {
        setLoading(false);
        return;
      }

      // Obtener playlists creadas por el usuario
      const responseCreated = await fetch(`https://echobeatapi.duckdns.org/playlists/user/${email}`);
      const dataCreated = await responseCreated.json();
      let userPlaylists = dataCreated.playlists ? dataCreated.playlists : dataCreated; // Manejar si es array u objeto

      // Obtener playlists guardadas (listas ajenas)
      const responseLiked = await fetch(`https://echobeatapi.duckdns.org/playlists/liked/${email}`);
      const dataLiked = await responseLiked.json();

      // Combinar ambas listas
      let allPlaylists = [];
      if (Array.isArray(userPlaylists)) {
        allPlaylists = userPlaylists;
      } else if (userPlaylists) {
        allPlaylists.push(userPlaylists);
      }
      // Marcamos las playlists guardadas con la propiedad "guardada"
      if (dataLiked && Array.isArray(dataLiked)) {
        const likedPlaylists = dataLiked.map(item => ({ ...item, guardada: true }));
        allPlaylists = [...allPlaylists, ...likedPlaylists];
      }

      console.log("Playlists combinadas:", allPlaylists);
      setPlaylists(allPlaylists);
    } catch (error) {
      console.error("Error al obtener playlists:", error);
    } finally {
      setLoading(false);
    }
  };

  const openOptionsModal = (playlist) => {
    setSelectedPlaylist(playlist);
    setModalVisible(true);
  };

  // Función para borrar playlist creada por el usuario usando el endpoint actualizado
  const borrarPlaylist = async () => {
    if (!selectedPlaylist) return;
    try {
      const response = await fetch('https://echobeatapi.duckdns.org/playlists/delete', {
        method: 'DELETE',
        headers: {
          'accept': '*/*',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          userEmail: userEmail,
          idLista: selectedPlaylist.Id || selectedPlaylist.id
        })
      });
      console.log("Response de borrar playlist:", response);
      if (!response.ok) throw new Error("Error al borrar la playlist");
      Alert.alert("Éxito", "Playlist borrada correctamente");
      // Actualizamos la lista
      obtenerPlaylists();
    } catch (error) {
      console.error("Error al borrar playlist:", error);
      Alert.alert("Error", "No se pudo borrar la playlist");
    } finally {
      setModalVisible(false);
      setSelectedPlaylist(null);
    }
  };

  // Función para olvidar (desguardar) una playlist guardada
  const olvidarPlaylist = async () => {
    if (!selectedPlaylist) return;
    try {
      const response = await fetch(`https://echobeatapi.duckdns.org/playlists/like/${userEmail}/${selectedPlaylist.id || selectedPlaylist.Id}`, {
        method: 'DELETE',
        headers: { 'accept': '*/*' }
      });
      if (!response.ok) throw new Error("Error al olvidar la playlist");
      Alert.alert("Éxito", "Playlist olvidada correctamente");
      // Actualizamos la lista
      obtenerPlaylists();
    } catch (error) {
      console.error("Error al olvidar playlist:", error);
      Alert.alert("Error", "No se pudo olvidar la playlist");
    } finally {
      setModalVisible(false);
      setSelectedPlaylist(null);
    }
  };

  const renderPlaylist = ({ item }) => {
    // Normalizamos el objeto para que incluya la propiedad "Id" (con mayúscula)
    const normalizedPlaylist = {
      Id: item.id || item.Id, // se fuerza el uso de "Id" para que PlaylistDetails la reconozca
      Nombre: item.nombre || item.Nombre || item.lista?.Nombre || 'Sin nombre',
      Portada: item.lista?.Portada || item.Portada || '',
      Descripcion: item.descripcion || item.Descripcion || '',
      guardada: item.guardada || false,
    };

    return (
      <View style={styles.playlistItemContainer}>
        <TouchableOpacity
          style={styles.playlistMain}
          onPress={() => {
            console.log('📀 Playlist enviada desde MyLists:', normalizedPlaylist);
            if (normalizedPlaylist.guardada) {
              // Navegar a AlbumDetails para playlists guardadas
              navigation.navigate("AlbumDetails", { playlist: normalizedPlaylist });
            } else {
              navigation.navigate("PlaylistDetails", { playlist: normalizedPlaylist });
            }
          }}
        >
          <Image
            source={
              normalizedPlaylist.Portada
                ? { uri: normalizedPlaylist.Portada }
                : require('../assets/default_playlist_portada.jpg')
            }
            style={styles.playlistImage}
          />
          <View style={styles.playlistTextContainer}>
            <Text style={styles.playlistTitle} numberOfLines={1}>
              {normalizedPlaylist.Nombre}
            </Text>
            {normalizedPlaylist.guardada && (
              <Text style={styles.plusIcon}>+</Text>
            )}
          </View>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => openOptionsModal(normalizedPlaylist)} style={styles.optionsButton}>
          <Ionicons name="ellipsis-vertical" size={24} color="#f2ab55" />
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.replace("HomeScreen")} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#f2ab55" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Mis Listas</Text>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#f2ab55" style={{ marginTop: 20 }} />
      ) : playlists.length === 0 ? (
        <View style={styles.emptyMessageContainer}>
          <Text style={styles.emptyMessageText}>
            No has creado ni guardado ninguna playlist aún{'\n'}¡Créala o guárdala presionando el botón '+'!
          </Text>
        </View>
      ) : (
        <FlatList 
          data={playlists}
          renderItem={renderPlaylist}
          keyExtractor={(item, index) => index.toString()}
          contentContainerStyle={styles.listContent}
        />
      )}

      {/* Botón para crear playlist */}
      <TouchableOpacity 
        style={styles.addButton}
        onPress={() => navigation.navigate("CrearPlaylist")}
      >
        <Ionicons name="add" size={30} color="#fff" />
      </TouchableOpacity>

      {/* Modal de opciones */}
      <Modal
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <TouchableOpacity style={styles.modalOverlay} onPress={() => setModalVisible(false)}>
          <View style={styles.modalContent}>
            {selectedPlaylist && !selectedPlaylist.guardada ? (
              <TouchableOpacity style={styles.modalOption} onPress={borrarPlaylist}>
                <Text style={styles.modalOptionText}>Borrar playlist</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity style={styles.modalOption} onPress={olvidarPlaylist}>
                <Text style={styles.modalOptionText}>Olvidar playlist</Text>
              </TouchableOpacity>
            )}
          </View>
        </TouchableOpacity>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#121111',
    marginTop: 30,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 25,
    paddingVertical: 10,
    paddingTop: 30,
  },
  backButton: {},
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#f2ab55',
  },
  emptyMessageContainer: {
    marginTop: 30,
    alignItems: 'center',
    height: '80%',
    justifyContent: 'center',
  },
  emptyMessageText: {
    fontSize: 24,
    color: '#fff',
    textAlign: 'center',
    marginTop: 10,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 80,
  },
  playlistItemContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
    justifyContent: 'space-between',
  },
  playlistMain: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  playlistImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
    marginRight: 10,
  },
  playlistTextContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  playlistTitle: {
    fontSize: 18,
    color: '#fff',
  },
  plusIcon: {
    fontSize: 18,
    color: '#f2ab55',
    marginLeft: 6,
  },
  optionsButton: {
    padding: 8,
  },
  addButton: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    backgroundColor: '#ffb723',
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#333',
    borderRadius: 8,
    padding: 16,
    width: '80%',
  },
  modalOption: {
    paddingVertical: 12,
  },
  modalOptionText: {
    color: '#fff',
    fontSize: 18,
    textAlign: 'center',
  },
});
