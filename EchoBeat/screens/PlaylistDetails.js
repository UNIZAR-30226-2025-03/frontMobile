import React, { useState, useLayoutEffect, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  SafeAreaView, 
  TouchableOpacity, 
  Image, 
  FlatList 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function PlaylistDetail({ navigation, route }) {
  const { playlist } = route.params;
  const [songs, setSongs] = useState([]);
  const [playlistInfo, setPlaylistInfo] = useState(null);
  const [infoVisible, setInfoVisible] = useState(false);
  // Estado para las opciones de la canción
  const [selectedSong, setSelectedSong] = useState(null);
  const [songOptionsVisible, setSongOptionsVisible] = useState(false);

  useLayoutEffect(() => {
    navigation.setOptions({ headerShown: false });
  }, [navigation]);

  useEffect(() => {
    obtenerCanciones();
    obtenerPlaylistInfo();
  }, []);

  const obtenerCanciones = async () => {
    try {
      const response = await fetch(`https://echobeatapi.duckdns.org/playlists/${playlist.Id}/songs`);
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || "Error al obtener las canciones");
      }
      setSongs(data.canciones || []);
    } catch (error) {
      console.error("Error en obtenerCanciones:", error);
    }
  };

  const obtenerPlaylistInfo = async () => {
    try {
      const response = await fetch(`https://echobeatapi.duckdns.org/playlists/playlist/${playlist.Id}`);
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || "Error al obtener la información de la playlist");
      }
      setPlaylistInfo(data);
    } catch (error) {
      console.error("Error en obtenerPlaylistInfo:", error);
    }
  };

  const eliminarPlaylist = async () => {
    try {
      const response = await fetch(`https://echobeatapi.duckdns.org/playlists/${playlist.Id}`, {
        method: "DELETE",
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || "Error al eliminar la playlist");
      }
      navigation.replace("Welcome");
    } catch (error) {
      console.error("Error en eliminarPlaylist:", error);
    }
  };

  const renderSong = ({ item }) => (
    <View style={styles.songItem}>
      <Image 
        source={ item.portada === "URL" 
            ? require('../assets/default_song_portada.jpg') 
            : { uri: item.portada } 
        }
        style={styles.songImage} 
      />
      <Text style={styles.songTitle} numberOfLines={1}>{item.nombre}</Text>
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

  const ListHeader = () => (
    <View style={styles.headerContent}>
      <Image 
        source={ playlist.Portada ? { uri: playlist.Portada } : require('../assets/default_playlist_portada.jpg') } 
        style={styles.playlistImage} 
      />
      <Text style={styles.playlistTitle}>{playlist.Nombre}</Text>
      <Text style={styles.playlistDescription}>{playlist.Descripcion}</Text>
      <Text style={styles.sectionTitle}>Canciones</Text>
      {songs.length === 0 && (
        <Text style={styles.noSongsText}>No hay canciones en la lista.</Text>
      )}
    </View>
  );

  const ListFooter = () => (
    <TouchableOpacity 
      style={styles.addButton}
      onPress={() => navigation.navigate("Search", { defaultFilter: "Canción" })}
    >
      <Text style={styles.addButtonText}>+ Añadir canciones</Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header con flecha de retroceso e información */}
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
        ListFooterComponent={ListFooter}
        contentContainerStyle={styles.flatListContent}
      />
      {/* Overlay para opciones de la canción */}
      {songOptionsVisible && (
        <View style={styles.songOptionsOverlay}>
          <View style={styles.songOptionsContainer}>
            <TouchableOpacity 
              style={styles.closeSongOptionsButton}
              onPress={() => setSongOptionsVisible(false)}
            >
              <Ionicons name="close" size={24} color="#000" />
            </TouchableOpacity>
            <Text style={styles.songOptionsTitle}>Opciones para la canción</Text>
            {/* Aquí puedes agregar más botones o información para la canción */}
          </View>
          <View style={styles.songOptionsBlur} />
        </View>
      )}
      {/* Overlay de información de la playlist */}
      {infoVisible && (
        <View style={styles.infoOverlay}>
          <View style={styles.infoContainer}>
            <TouchableOpacity 
              style={styles.closeButton}
              onPress={() => setInfoVisible(false)}
            >
              <Ionicons name="close" size={30} color="#000" />
            </TouchableOpacity>
            <Text style={styles.infoTitle}>Información</Text>
            {playlistInfo ? (
              <>
                <Text style={styles.infoText}>Privacidad: {playlistInfo.TipoPrivacidad}</Text>
                <Text style={styles.infoText}>Género: {playlistInfo.Genero}</Text>
              </>
            ) : (
              <Text style={styles.infoText}>Cargando información...</Text>
            )}
            <TouchableOpacity style={styles.editButton} onPress={() => eliminarPlaylist()}>
              <Text style={styles.editButtonText}>Editar playlist</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.deleteButton} onPress={() => {}}>
              <Text style={styles.deleteButtonText}>Eliminar playlist</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.blurBackground} />
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121111',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 25,
    paddingTop: 30,
  },
  headerButton: {
    // Ambos botones se verán en el mismo nivel
  },
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
    marginBottom: 10,
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
  /* Overlay para opciones de canción */
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
});
