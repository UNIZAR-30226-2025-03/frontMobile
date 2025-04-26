/**
 * @file ArtistDetails.js
 * Pantalla que muestra detalles de un artista, incluyendo su biografía,
 * discografía y top canciones. Permite reproducir canciones, marcarlas
 * como favoritas y añadirlas a playlists del usuario.s
 */
import React, { useState, useEffect, useLayoutEffect } from 'react';
import { View, Text, Image, StyleSheet, TouchableOpacity, Modal, TouchableWithoutFeedback, FlatList, Dimensions, ScrollView, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Pantalla que muestra detalles de un artista, incluyendo su biografía,
 * discografía y top canciones. Permite reproducir canciones, marcarlas
 * como favoritas y añadirlas a playlists del usuario.
 *
 * @param {object} route - Prop de ruta de React Navigation.
 * @param {object} route.params.artist - Objeto artista con propiedades `nombre` o `Nombre`.
 * @param {object} navigation - Prop de navegación de React Navigation.
 */
export default function ArtistDetails({ route, navigation }) {
  const { artist } = route.params;
  const [artistData, setArtistData] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [songOptionsVisible, setSongOptionsVisible] = useState(false);
  const [selectedSong, setSelectedSong] = useState(null);
  const [showPlaylists, setShowPlaylists] = useState(false);
  const [playlists, setPlaylists] = useState([]);
  const [email, setEmail] = useState(null);

  useLayoutEffect(() => {
    navigation.setOptions({ headerShown: false });
  }, [navigation]);

  useEffect(() => {
    /**
     * Obtiene el email del usuario almacenado en AsyncStorage.
     * Si existe, lo guarda en el estado `email`.
     * Maneja errores de lectura.
     * 
     * @return {Promise<void>}
     */
    const getEmail = async () => {
      try {
        const storedEmail = await AsyncStorage.getItem('email');
        if (storedEmail) {
          setEmail(storedEmail);
        }
      } catch (error) {
        console.error("Error al obtener el email:", error);
      }
    };
    getEmail();
    // Solicita datos del artista al servidor
    const fetchArtistDetails = async () => {
      try {
        const response = await fetch(`https://echobeatapi.duckdns.org/artistas/perfil?artistName=${encodeURIComponent(artist.nombre || artist.Nombre)}`);
        const data = await response.json();
        console.log("Detalles del artista:", data);
        setArtistData(data);
      } catch (error) {
        console.error("Error al obtener detalles del artista:", error);
      }
    };

    fetchArtistDetails();
  }, [artist, email]);

  // Altura para limitar el modal de biografía
  const { height } = Dimensions.get('window');
  const modalMaxHeight = (2 / 3) * height;

  /**
   * Inicia la reproducción de una única canción, creando una cola con un solo elemento.
   *
   * @param {object} song - Objeto canción con propiedades id/Id, nombre/Nombre, duracion/Duracion, etc.
   * @return {Promise<void>}
   */
  const playSingleSong = async (song) => {
    try {
      const emailStored = await AsyncStorage.getItem('email');
      if (!emailStored) return;
      const body = {
        userEmail: emailStored,
        reproduccionAleatoria: false,
        posicionCola: 0,
        colaReproduccion: {
          canciones: [{
            id: song.id || song.Id,
            nombre: song.nombre || song.Nombre,
            duracion: song.duracion || song.Duracion,
            numReproducciones: song.numReproducciones || song.NumReproducciones,
            numFavoritos: song.numFavoritos || song.NumFavoritos,
            portada: song.portada || song.Portada
          }]
        }
      };

      await fetch('https://echobeatapi.duckdns.org/cola-reproduccion/play-list-by-position', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      navigation.navigate('MusicPlayer', {
        songId: song.id || song.Id,
        songName: song.nombre || song.Nombre,
      });
    } catch (error) {
      Alert.alert("Error", "No se pudo reproducir la canción");
    }
  };

  /**
   * Marca la canción seleccionada como favorita.
   * 
   * @return {Promise<void>}
   */
  const likeSong = async () => {
    try {
      const response = await fetch(`https://echobeatapi.duckdns.org/cancion/like/${encodeURIComponent(email)}/${selectedSong.id}`, {
        method: 'POST',
        headers: { 'accept': '*/*' }
      });
      if (!response.ok) throw new Error("Error al dar like");
      Alert.alert("Éxito", "Canción añadida a favoritos");
      console.log("Canción agregada a favoritos");
    } catch (error) {
      console.error("Error al dar like a la canción:", error);
    }
  };

  /**
   * Añade la canción seleccionada a la playlist indicada.
   *
   * @param {number|string} playlistId - ID de la playlist destino.
   * @param {number|string} songId - ID de la canción a añadir.
   * @return {Promise<void>}
   */
  const addSongToPlaylist = async (playlistId, songId) => {
    try {
      const response = await fetch(`https://echobeatapi.duckdns.org/playlists/add-song/${playlistId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idLista: playlistId, songId }),
      });
      if (!response.ok) throw new Error("No se pudo añadir la canción");
      Alert.alert("Éxito", "Canción añadida a lista");
      console.log("Canción añadida a la playlist");
    } catch (error) {
      console.error("Error al añadir canción:", error);
    }
  };

  if (!artistData) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Cargando información del artista...</Text>
      </View>
    );
  }

  /**
   * Abre el modal de opciones para la canción y carga las playlists del usuario.
   *
   * @param {object} song - Objeto canción seleccionado.
   * @return {void}
   */
  const openSongOptions = (song) => {
    setSelectedSong(song);
    setSongOptionsVisible(true);
    fetchPlaylists();
  };

  /**
   * Obtiene las playlists del usuario autenticado.
   * 
   * @return {Promise<void>}
   */
  const fetchPlaylists = async () => {
    try {
      // Aquí se podría ajustar la URL según la lógica de tu API
      const response = await fetch(`https://echobeatapi.duckdns.org/playlists/user/${email}`);
      const data = await response.json();
      setPlaylists(data);
    } catch (error) {
      console.error("Error al obtener las playlists:", error);
    }
  };

  /**
   * Renderiza cada álbum de la discografía.
   *
   * @param {object} param0.item - Objeto álbum con propiedades Id, Portada, Nombre.
   * @return {JSX.Element}
   */
  const renderAlbumItem = ({ item }) => (
    <TouchableOpacity 
      style={styles.albumItem} 
      onPress={() => navigation.navigate('AlbumDetails', { playlist: item })}
    >
      <Image source={{ uri: item.Portada || 'https://via.placeholder.com/150' }} style={styles.albumImage} />
      <Text style={styles.albumTitle}>{item.Nombre}</Text>
    </TouchableOpacity>
  );

  /**
   * Renderiza cada canción del listado topCanciones.
   *
   * @param {object} param0.item - Objeto canción con propiedades Id, Nombre, Portada.
   * @return {JSX.Element}
   */
  const renderSongItem = ({ item }) => (
    <View style={styles.songItem}>
      <TouchableOpacity 
        style={styles.songPlayArea} 
        onPress={() => playSingleSong(item)}
      >
        <Image source={{ uri: item.Portada || 'https://via.placeholder.com/150' }} style={styles.songImage} />
        <View style={styles.songTextContainer}>
          <Text style={styles.songTitle} numberOfLines={1}>{item.Nombre}</Text>
        </View>
      </TouchableOpacity>
      <View style={styles.songIconsContainer}>
        <TouchableOpacity onPress={() => openSongOptions(item)} style={styles.iconButton}>
          <Ionicons name="ellipsis-vertical" size={20} color="#fff" />
        </TouchableOpacity>
      </View>
    </View>
  );

  /**
   * Componente de cabecera para la lista, incluye imagen del artista,
   * biografía y sección de discografía/top canciones.
   * 
   * @return {JSX.Element}
   */
  const ListHeaderComponent = () => (
    <View>
      {/* Cabecera con la imagen del artista, botón de volver y botón para ver biografía */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerButton}>
          <Ionicons name="arrow-back" size={24} color="#f2ab55" />
        </TouchableOpacity>
        <Image 
          source={{ uri: artistData.artista.FotoPerfil || 'https://via.placeholder.com/150' }} 
          style={styles.artistImage} 
        />
        <View style={styles.artistNameContainer}>
          <Text style={styles.artistName}>{artist.nombre || artist.Nombre}</Text>
          <TouchableOpacity onPress={() => setModalVisible(true)}>
            <Ionicons name="book-outline" size={24} color="#fff" style={styles.bioIcon} />
          </TouchableOpacity>
        </View>
        <Text style={styles.listenersText}>
          Total oyentes : {artistData.artista.NumOyentesTotales}
        </Text>
      </View>

      {/* Sección de Discografía */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Discografía</Text>
        <FlatList
          data={artistData.discografia}
          renderItem={renderAlbumItem}
          keyExtractor={(item) => item.Id.toString()}
          horizontal={true}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 16 }}
        />
      </View>

      {/* Título para la sección de Top Canciones */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Top Canciones</Text>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={artistData.topCanciones}
        renderItem={renderSongItem}
        keyExtractor={(item) => item.Id.toString()}
        ListHeaderComponent={ListHeaderComponent}
        contentContainerStyle={{ paddingBottom: 16 }}
      />

      {/* Modal para mostrar la biografía */}
      <Modal
        transparent={true}
        visible={modalVisible}
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <TouchableWithoutFeedback onPress={() => setModalVisible(false)}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback>
              <View style={[styles.modalContent, { maxHeight: modalMaxHeight }]}>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>Biografía</Text>
                  <TouchableOpacity onPress={() => setModalVisible(false)}>
                    <Ionicons name="close" size={24} color="#fff" />
                  </TouchableOpacity>
                </View>
                <ScrollView>
                  <Text style={styles.modalText}>{artistData.artista.Biografia}</Text>
                </ScrollView>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
      <Modal
        transparent={true}
        visible={songOptionsVisible}
        animationType="slide"
        onRequestClose={() => setSongOptionsVisible(false)}
      >
        <TouchableWithoutFeedback onPress={() => setSongOptionsVisible(false)}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback>
              <View style={styles.modalContentOptions}>
                <TouchableOpacity
                  style={styles.modalOption}
                  onPress={() => {
                    likeSong(selectedSong);
                    setSongOptionsVisible(false);
                  }}
                >
                  <Text style={styles.modalOptionText}>Añadir a Favoritos</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.modalOption}
                  onPress={() => setShowPlaylists(!showPlaylists)}
                >
                  <View style={styles.playlistOptionContainer}>
                    <Text style={styles.modalOptionText}>Añadir a Playlist</Text>
                    <Ionicons
                      name={showPlaylists ? 'chevron-up' : 'chevron-down'}
                      size={20}
                      color="#fff"
                    />
                  </View>
                </TouchableOpacity>
                {showPlaylists && (
                  <View style={styles.playlistList}>
                    {playlists.map((pl) => (
                      <TouchableOpacity
                        key={pl.id || pl.Id}
                        style={styles.playlistItem}
                        onPress={() => {
                          addSongToPlaylist(pl.id || pl.Id, selectedSong.id || selectedSong.Id);
                          setSongOptionsVisible(false);
                        }}
                      >
                        <Image
                          source={{ uri: pl.portada || pl.lista?.Portada || 'https://via.placeholder.com/150' }}
                          style={styles.playlistImage}
                        />
                        <Text style={styles.playlistItemText}>
                          {pl.nombre || pl.lista?.Nombre || 'Playlist sin nombre'}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: "#000",
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    color: "#fff",
    fontSize: 18,
  },
  header: {
    marginTop: 40,
    alignItems: "center",
    marginBottom: 24,
    position: "relative",
  },
  headerButton: {
    position: "absolute",
    top: 16,
    left: 16,
    zIndex: 1,
  },
  artistImage: {
    width: 275,
    height: 275,
    borderRadius: 150,
    marginBottom: 12,
  },
  artistNameContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  artistName: {
    color: "#fff",
    fontSize: 24,
    fontWeight: "bold",
    marginRight: 8,
  },
  bioIcon: {},
  listenersText: {
    color: "#fff",
    fontSize: 16,
    marginTop: 8,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    color: "#f2ab55",
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 12,
    paddingHorizontal: 16,
  },
  albumItem: {
    marginRight: 16,
    alignItems: "center",
  },
  albumImage: {
    width: 150,
    height: 150,
    borderRadius: 8,
    marginBottom: 8,
  },
  albumTitle: {
    color: "#fff",
    fontSize: 16,
  },
  // Estilos unificados para el item de canción en ArtistDetails:
  songItem: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 8,
    marginVertical: 5,
    marginHorizontal: 10,
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
    justifyContent: "center",
  },
  songTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#fff",
  },
  songIconsContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  iconButton: {
    marginHorizontal: 4,
  },
  // Fin de estilos unificados para el item de canción.
  headerContent: {
    paddingHorizontal: 20,
    paddingTop: 10,
    alignItems: "center",
    position: "relative",
  },
  listenersTextModal: {
    color: "#fff",
    fontSize: 16,
    marginTop: 4,
  },
  // Modal de biografía
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    backgroundColor: "#333",
    borderRadius: 8,
    padding: 16,
    width: "90%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  modalTitle: {
    color: "#fff",
    fontSize: 20,
    fontWeight: "bold",
  },
  modalText: {
    color: "#fff",
    fontSize: 16,
  },
  // Modal de opciones para canción
  modalContentOptions: {
    backgroundColor: "#333",
    borderRadius: 8,
    padding: 16,
    width: "90%",
  },
  modalOption: {
    paddingVertical: 12,
  },
  modalOptionText: {
    color: "#fff",
    fontSize: 18,
  },
  playlistOptionContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  playlistList: {
    marginTop: 8,
  },
  playlistItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    paddingLeft: 16,
  },
  playlistImage: {
    width: 40,
    height: 40,
    borderRadius: 4,
    marginRight: 8,
  },
  playlistItemText: {
    color: "#fff",
    fontSize: 16,
  },
  // Modal de info/biografía y otros overlays
  closeButton: {
    alignSelf: "flex-end",
  },
  songPlayArea: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
  },
});