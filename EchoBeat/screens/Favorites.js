import React, { useState, useLayoutEffect, useEffect, useCallback } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  SafeAreaView, 
  TouchableOpacity, 
  Image, 
  FlatList, 
  Dimensions, 
  Alert, 
  RefreshControl, 
  TouchableWithoutFeedback 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width } = Dimensions.get('window');

export default function FavoritesScreen({ navigation }) {
  const [songs, setSongs] = useState([]);
  const [userEmail, setUserEmail] = useState('');
  const [infoVisible, setInfoVisible] = useState(false);
  const [selectedSong, setSelectedSong] = useState(null);
  const [songOptionsVisible, setSongOptionsVisible] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [shuffle, setShuffle] = useState(false);
  const [cola, setCola] = useState(null);

  useLayoutEffect(() => {
    navigation.setOptions({ headerShown: false });
  }, [navigation]);

  const obtenerEmail = async () => {
    try {
      const email = await AsyncStorage.getItem('email');
      if (email) {
        setUserEmail(email);
        return email;
      }
    } catch (err) {
      console.error("Error obteniendo el email:", err);
    }
    return null;
  };

  const obtenerCanciones = async () => {
    try {
      const email = await obtenerEmail();
      if (!email) return;

      const encodedEmail = encodeURIComponent(email);
      const response = await fetch(`https://echobeatapi.duckdns.org/cancion/favorites?email=${encodedEmail}`);
      const data = await response.json();

      if (!response.ok) throw new Error(data.message || "Error al obtener las canciones de favoritos");

      setSongs(data.canciones || []);
      setCola({ canciones: data.canciones });
    } catch (error) {
      console.error("Error en obtenerCanciones:", error);
    }
  };

  const loadData = async () => {
    await obtenerCanciones();
  };

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  useEffect(() => {
    loadData();
  }, []);

  const iniciarReproduccion = async () => {
    try {
      const body = {
        userEmail,
        reproduccionAleatoria: shuffle,
        colaReproduccion: cola,
      };

      const response = await fetch('https://echobeatapi.duckdns.org/cola-reproduccion/play-list', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const result = await response.json();

      if (!response.ok) {
        Alert.alert("Error", result.message || "No se pudo iniciar la reproducción");
        return;
      }

      if (songs.length > 0) {
        navigation.navigate('MusicPlayer', {
          songId: songs[0].id,
          songName: songs[0].nombre,
        });
      }
    } catch (error) {
      console.error("Error al iniciar reproducción:", error);
      Alert.alert("Error", "No se pudo reproducir");
    }
  };

  const iniciarReproduccionDesdeCancion = async (song, index) => {
    try {
      const body = {
        userEmail,
        reproduccionAleatoria: shuffle,
        posicionCola: index,
        colaReproduccion: cola,
      };

      const response = await fetch('https://echobeatapi.duckdns.org/cola-reproduccion/play-list-by-position', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const result = await response.json();
      if (!response.ok) {
        Alert.alert("Error", result.message || "No se pudo iniciar la reproducción");
        return;
      }

      navigation.navigate('MusicPlayer', {
        songId: songs[index].id,
        songName: songs[index].nombre,
      });
    } catch (error) {
      console.error("Error:", error);
      Alert.alert("Error", "No se pudo iniciar la canción");
    }
  };

  // Función para eliminar (quitar de favoritos) una canción
  const eliminarCancionDeFavoritos = async () => {
    if (!selectedSong || !userEmail) return;
    try {
      const encodedEmail = encodeURIComponent(userEmail);
      const songId = selectedSong.id || selectedSong.Id;
      const response = await fetch(`https://echobeatapi.duckdns.org/cancion/unlike/${encodedEmail}/${songId}`, {
        method: 'DELETE',
        headers: { 'accept': '*/*' },
      });
      const text = await response.text();
      if (!response.ok) throw new Error(text);
      Alert.alert("Éxito", "Canción eliminada de favoritos");
      setSongOptionsVisible(false);
      // Actualizamos la lista eliminando el item
      setSongs(prev => prev.filter(song => (song.id || song.Id) !== songId));
    } catch (error) {
      console.error("Error al eliminar canción de favoritos:", error);
      Alert.alert("Error", error.message || "No se pudo eliminar la canción de favoritos");
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const renderSong = ({ item }) => (
    <View style={styles.songItem}>
      <TouchableOpacity
        style={{ flex: 1 }}
        onPress={() => iniciarReproduccionDesdeCancion(item, songs.findIndex(s => s.id === item.id))}
      >
        <Image
          source={item.portada === "URL"
            ? require('../assets/default_song_portada.jpg')
            : { uri: item.portada }
          }
          style={styles.songImage}
        />
        <Text style={styles.songTitle} numberOfLines={1}>{item.nombre}</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.songOptionsButton}
        onPress={() => {
          setSelectedSong(item);
          setSongOptionsVisible(true);
        }}
      >
        <Ionicons name="ellipsis-vertical" size={20} color="#fff" />
      </TouchableOpacity>
    </View>
  );

  // Renderiza el modal de opciones para la canción (incluyendo eliminar)
  const renderSongOptionsModal = () => {
    if (!selectedSong) return null;
    return (
      <TouchableWithoutFeedback onPress={() => setSongOptionsVisible(false)}>
        <View style={styles.songOptionsOverlay}>
          <View style={styles.songOptionsContainer}>
            <TouchableOpacity
              style={styles.closeSongOptionsButton}
              onPress={() => setSongOptionsVisible(false)}
            >
              <Ionicons name="close" size={24} color="#000" />
            </TouchableOpacity>
            <Text style={styles.songOptionsTitle}>Opciones para la canción</Text>
            <TouchableOpacity
              style={styles.modalOption}
              onPress={eliminarCancionDeFavoritos}
            >
              <Text style={styles.modalOptionText}>Eliminar de la lista</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.songOptionsBlur} />
        </View>
      </TouchableWithoutFeedback>
    );
  };

  const ListHeader = () => (
    <View style={styles.headerContent}>
      <Image source={require('../assets/favorites.jpg')} style={styles.playlistImage} />
      <Text style={styles.playlistTitle}>Favoritos</Text>
      <Text style={styles.playlistDescription}>{""}</Text>

      <View style={styles.controlsRow}>
        <TouchableOpacity
          style={[styles.shuffleButton, shuffle && styles.shuffleActive]}
          onPress={() => setShuffle(prev => !prev)}
        >
          <Ionicons name="shuffle" size={20} color={shuffle ? '#121111' : '#f2ab55'} />
          <Text style={[styles.shuffleButtonText, shuffle && styles.shuffleButtonTextActive]}>
            {shuffle ? "Aleatorio activado" : "Aleatorio desactivado"}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.playButton}
          onPress={iniciarReproduccion}
        >
          <Ionicons name="play" size={20} color="#121111" />
          <Text style={styles.playButtonText}>Reproducir</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.sectionTitle}>Canciones</Text>
      {songs.length === 0 && <Text style={styles.noSongsText}>No hay canciones en favoritos.</Text>}
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerButton}>
          <Ionicons name="arrow-back" size={24} color="#f2ab55" />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setInfoVisible(true)} style={styles.headerButton}>
          <Ionicons name="information-circle-outline" size={28} color="#f2ab55" />
        </TouchableOpacity>
      </View>
      <FlatList
        data={songs}
        renderItem={renderSong}
        keyExtractor={(item, index) => index.toString()}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={ListHeader}
        contentContainerStyle={styles.flatListContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#f2ab55']}
            tintColor="#f2ab55"
          />
        }
      />
      {songOptionsVisible && renderSongOptionsModal()}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121111',
    paddingTop: 30,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 25,
    paddingTop: 30,
  },
  headerButton: {},
  headerContent: {
    paddingHorizontal: 20,
    paddingTop: 10,
    alignItems: 'center',
    position: 'relative',
  },
  playlistImage: {
    width: 200,
    height: 200,
    borderRadius: 10,
    marginBottom: 10,
    marginTop: 20,
  },
  playlistTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#f2ab55',
    marginBottom: -25,
    textAlign: 'center',
  },
  playlistDescription: {
    fontSize: 16,
    color: '#ffffff',
    marginBottom: 20,
    textAlign: 'center',
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#f2ab55',
    marginBottom: 10,
    alignSelf: 'flex-start',
    paddingLeft: 5,
  },
  flatListContent: {
    paddingBottom: 20,
    paddingHorizontal: 10,
  },
  songItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    padding: 8,
    backgroundColor: '#222',
    borderRadius: 8,
    marginHorizontal: 5,
  },
  songImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
    marginRight: 10,
  },
  songTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ffffff',
    flexShrink: 1,
  },
  songOptionsButton: {
    marginLeft: 'auto',
  },
  noSongsText: {
    fontSize: 16,
    color: '#ffffff',
    textAlign: 'center',
    marginVertical: 20,
  },
  addButton: {
    backgroundColor: '#ffffff',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 20,
    alignSelf: 'center',
    marginTop: 20,
  },
  addButtonText: {
    color: '#000',
    fontSize: 16,
    fontWeight: 'bold',
  },
  songOptionsOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 200,
  },
  songOptionsContainer: {
    width: '80%',
    backgroundColor: '#ccc',
    borderRadius: 8,
    padding: 20,
    alignItems: 'center',
    zIndex: 201,
  },
  closeSongOptionsButton: {
    position: 'absolute',
    top: 10,
    right: 10,
  },
  songOptionsTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 10,
  },
  songOptionsBlur: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    zIndex: 200,
  },
  infoOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 100,
  },
  blurBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  infoContainer: {
    width: '80%',
    backgroundColor: '#ccc',
    borderRadius: 8,
    padding: 20,
    zIndex: 101,
    alignItems: 'center',
  },
  closeButton: {
    position: 'absolute',
    top: 10,
    right: 10,
  },
  infoTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#000',
  },
  infoText: {
    fontSize: 16,
    marginBottom: 5,
    color: '#000',
  },
  editButton: {
    backgroundColor: 'orange',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    marginTop: 20,
  },
  editButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  deleteButton: {
    backgroundColor: 'red',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    marginTop: 20,
  },
  deleteButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  controlsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
    marginBottom: 20,
    flexWrap: 'wrap',
  },
  shuffleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f2ab55',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  shuffleButtonText: {
    marginLeft: 6,
    color: '#121111',
    fontWeight: 'bold',
  },
  shuffleActive: {
    backgroundColor: '#fff',
  },
  shuffleButtonTextActive: {
    color: '#f2ab55',
  },
  playButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f2ab55',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    marginLeft: 10,
  },
  playButtonText: {
    marginLeft: 6,
    color: '#121111',
    fontWeight: 'bold',
  },
});
