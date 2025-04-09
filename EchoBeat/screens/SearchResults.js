import React, { useState, useEffect, useLayoutEffect } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, Image, Modal, TouchableWithoutFeedback, TextInput, Keyboard, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function SearchResults({ route, navigation }) {
  const { initialResults, initialSearchText, initialSelectedOption } = route.params || {};
  const [searchText, setSearchText] = useState(initialSearchText || '');
  const [selectedOption, setSelectedOption] = useState(initialSelectedOption || null);
  const [results, setResults] = useState(initialResults || {});
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [showPlaylists, setShowPlaylists] = useState(false);
  const [playlists, setPlaylists] = useState([]);
  const [email, setEmail] = useState('');

  useLayoutEffect(() => {
    navigation.setOptions({ headerShown: false });
  }, [navigation]);

  const optionMap = {
    "Canción": "canciones",
    "Playlist": "playlists",
    "Autor": "artistas",
    "Álbum": "albums",
  };

  const handleSearch = async () => {
    const tipo = selectedOption ? optionMap[selectedOption] : '';
    

    try {
      const email = await AsyncStorage.getItem('email');
      if (!email) {
        console.warn("No se encontró el email del usuario.");
        return;
      }

      const resUser = await fetch(`https://echobeatapi.duckdns.org/users/get-user?userEmail=${email}`);
      const userData = await resUser.json();
      const nickUsuario = userData.Nick;

      const url = `https://echobeatapi.duckdns.org/search?Búsqueda=${encodeURIComponent(searchText)}&tipo=${tipo}&usuarioNick=${encodeURIComponent(nickUsuario)}`;

      const response = await fetch(url);
      const data = await response.json();
      console.log("🔍 Resultados de búsqueda:", data);

      // Normalizar la estructura de resultados
      const normalizedResults = {
        canciones: data.canciones || [],
        artistas: data.artistas || [],
        albums: data.albums || [],
        listas: data.listas || [],
        playlists: data.playlists || []
      };

      setResults(normalizedResults);
      Keyboard.dismiss();
    } catch (error) {
      console.error("Error al realizar la búsqueda:", error);
      Alert.alert("Error", "No se pudieron obtener los resultados de búsqueda");
    }
  };

  useEffect(() => {
    if (initialSearchText) {
      handleSearch();
    }
    rellenarEmail();
  }, []);

  const rellenarEmail = async () => {
    try {
      const emailUsuario = await AsyncStorage.getItem('email');
      setEmail(emailUsuario);
    } catch (error) {
      console.error("Error al obtener el email del usuario:", error);
    }
  };

  // Función para guardar (dar like) a una playlist
  const likePlaylist = async (playlist) => {
    const playlistId = playlist.id || playlist.Id;
    if (!playlistId) {
      console.error("ID de la playlist no encontrado");
      Alert.alert("Error", "No se encontró el ID de la playlist");
      return;
    }
    try {
      const response = await fetch(`https://echobeatapi.duckdns.org/playlists/like/${email}/${playlistId}`, {
        method: 'POST',
        headers: { 'accept': '*/*' }
      });
      if (!response.ok) throw new Error("Error al guardar la playlist");
      Alert.alert("Éxito", "Playlist guardada correctamente");
    } catch (error) {
      console.error("Error al guardar playlist:", error);
      Alert.alert("Error", "No se pudo guardar la playlist");
    }
  };

  // Función para guardar (dar like) a un álbum
  const likeAlbum = async (album) => {
    const albumId = album.id || album.Id;
    if (!albumId) {
      console.error("ID del álbum no encontrado");
      Alert.alert("Error", "No se encontró el ID del álbum");
      return;
    }
    try {
      const response = await fetch(`https://echobeatapi.duckdns.org/playlists/like/${email}/${albumId}`, {
        method: 'POST',
        headers: { 'accept': '*/*' }
      });
      if (!response.ok) throw new Error("Error al guardar el álbum");
      Alert.alert("Éxito", "Álbum guardado correctamente");
    } catch (error) {
      console.error("Error al guardar álbum:", error);
      Alert.alert("Error", "No se pudo guardar el álbum");
    }
  };

  // Función para guardar (dar like) a una canción (añadir a favoritos)
  const likeSong = async (song) => {
    const songId = song.id || song.Id;
    if (!songId) {
      console.error("ID de la canción no encontrado");
      Alert.alert("Error", "No se encontró el ID de la canción");
      return;
    }
    try {
      const response = await fetch(`https://echobeatapi.duckdns.org/cancion/like/${encodeURIComponent(email)}/${songId}`, {
        method: 'POST',
        headers: { 'accept': '*/*' }
      });
      if (!response.ok) throw new Error("Error al dar like a la canción");
      Alert.alert("Éxito", "Canción añadida a favoritos");
    } catch (error) {
      console.error("Error al dar like a la canción:", error);
      Alert.alert("Error", "Canción ya guardada en favoritos");
    }
  };

  // Combinar y normalizar resultados
  const combinedResults = [
    ...(results.albums || []).map(item => ({ 
      ...item, 
      type: 'album',
      id: item.id || item.Id,
      nombre: item.nombre || item.Nombre,
      portada: item.portada || item.Portada
    })),
    ...(results.artistas || []).map(item => ({ 
      ...item, 
      type: 'artist',
      id: item.id || item.Id,
      nombre: item.nombre || item.Nombre,
      fotoPerfil: item.fotoPerfil || item.FotoPerfil
    })),
    ...(results.canciones || []).map(item => ({ 
      ...item, 
      type: 'song',
      id: item.id || item.Id,
      nombre: item.nombre || item.Nombre,
      portada: item.portada || item.Portada
    })),
    ...(results.listas || []).map(item => ({ 
      ...item, 
      type: 'album', // Tratamos listas como álbumes si tienen TipoLista === 'Album'
      id: item.id || item.Id,
      nombre: item.nombre || item.Nombre,
      portada: item.portada || item.Portada,
      esAlbum: item.TipoLista === 'Album'
    })),
    ...(results.playlists || []).map(item => ({ 
      ...item, 
      type: 'playlist',
      // Incluimos EmailAutor si existe para poder distinguir las playlists propias de las de otros usuarios
      Id: item.id || item.Id,
      nombre: item.nombre || item.Nombre,
      portada: item.portada || item.Portada,
      EmailAutor: item.EmailAutor || null,
    }))
  ];

  // Filtrar resultados según la opción seleccionada
  const filteredResults = selectedOption 
    ? combinedResults.filter(item => {
        switch(selectedOption) {
          case 'Canción': return item.type === 'song';
          case 'Playlist': return item.type === 'playlist';
          case 'Autor': return item.type === 'artist';
          case 'Álbum': return item.type === 'album' || (item.type === 'list' && item.esAlbum);
          default: return true;
        }
      })
    : combinedResults;

  const formatDuration = (duration) => {
    if (!duration) return '0:00';
    const minutes = Math.floor(duration / 60);
    const seconds = duration % 60;
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
  };

  const fetchPlaylists = async () => {
    try {
      const response = await fetch(`https://echobeatapi.duckdns.org/playlists/user/${email}`);
      if (!response.ok) throw new Error("Error al obtener playlists");
      const data = await response.json();
      setPlaylists(data);
    } catch (error) {
      console.error("Error al obtener las playlists:", error);
    }
  };

  const addSongToPlaylist = async (idLista, songId) => {
    try {
      const response = await fetch(`https://echobeatapi.duckdns.org/playlists/add-song/${idLista}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idLista, songId }),
      });
      if (!response.ok) throw new Error("No se pudo añadir la canción");
      Alert.alert("Éxito", "Canción añadida a la playlist");
    } catch (error) {
      console.error("Error al añadir canción:", error);
      Alert.alert("Error", "Canción ya añadida a la playlist o no se pudo añadir");
    }
  };

  const openModal = (item) => {
    setSelectedItem(item);
    setModalVisible(true);
    if (item.type === 'song') {
      fetchPlaylists();
    }
  };

  const renderModalContent = () => {
    if (!selectedItem) return null;

    switch (selectedItem.type) {
      case 'song':
        return (
          <View>
            <TouchableOpacity
              style={styles.modalOption}
              onPress={() => {
                likeSong(selectedItem);
                setModalVisible(false);
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
                {playlists.map((playlist) => (
                  <TouchableOpacity
                    key={playlist.id || playlist.Id}
                    style={styles.playlistItem}
                    onPress={() => {
                      addSongToPlaylist(playlist.id || playlist.Id, selectedItem.id || selectedItem.Id);
                      setModalVisible(false);
                    }}
                  >
                    <Image
                      source={{ uri: playlist.portada || playlist.lista?.Portada || 'https://via.placeholder.com/150' }}
                      style={styles.playlistImage}
                    />
                    <Text style={styles.playlistItemText}>{playlist.nombre || playlist.lista?.Nombre || 'Playlist sin nombre'}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        );
        case 'playlist':
          const normalizedPlaylist = {
            Id: item.id || item.Id,
            Nombre: item.nombre || item.Nombre,
            Portada: item.portada || item.Portada,
            Descripcion: item.descripcion || item.Descripcion || '',
            EmailAutor: item.EmailAutor || null,
          };
          return (
            <TouchableOpacity 
              style={styles.itemContainer} 
              onPress={() => {
                console.log('🔍 Playlist enviada desde SearchResults:', normalizedPlaylist);
                // Si EmailAutor existe y coincide con el email actual, es tuya; de lo contrario, es ajena
                if (normalizedPlaylist.EmailAutor && normalizedPlaylist.EmailAutor === email) {
                  navigation.navigate('PlaylistDetails', { playlist: normalizedPlaylist });
                } else {
                  navigation.navigate('AlbumDetails', { playlist: normalizedPlaylist });
                }
              }}
            >
              <Image source={imageSource} style={styles.itemImage} />
              <View style={styles.itemTextContainer}>
                <Text style={styles.itemTitle}>{item.nombre || item.Nombre}</Text>
                <Text style={styles.itemSubtitle}>
                  Playlist • {item.numeroLikes || item.NumLikes || 0} likes
                </Text>
              </View>
              <TouchableOpacity onPress={() => openModal(item)}>
                <Ionicons name="ellipsis-vertical" size={24} color="#fff" />
              </TouchableOpacity>
            </TouchableOpacity>
          );

        
      case 'album':
        return (
          <View>
            <TouchableOpacity
              style={styles.modalOption}
              onPress={() => {
                likeAlbum(selectedItem);
                setModalVisible(false);
              }}
            >
              <Text style={styles.modalOptionText}>Guardar Álbum</Text>
            </TouchableOpacity>
          </View>
        );
      default:
        return null;
    }
  };

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

  const renderItem = ({ item }) => {
    const imageSource = { uri: item.portada || item.Portada || item.FotoPerfil || 'https://via.placeholder.com/150' };

    switch (item.type) {
      case 'album': 
        const normalizedAlbum = {
          Id: item.id || item.Id,
          Nombre: item.nombre || item.Nombre,
          Portada: item.portada || item.Portada,
          Descripcion: item.descripcion || item.Descripcion || '',
        };

        return (
          <TouchableOpacity
            style={styles.itemContainer}
            onPress={() => {
              console.log("🎧 Navegando a AlbumDetails con:", normalizedAlbum);
              navigation.navigate('AlbumDetails', { playlist: normalizedAlbum });
            }}
          >
            <Image source={{ uri: normalizedAlbum.Portada }} style={styles.itemImage} />
            <View style={styles.itemTextContainer}>
              <Text style={styles.itemTitle}>{normalizedAlbum.Nombre}</Text>
              <Text style={styles.itemSubtitle}>Álbum</Text>
            </View>
            <TouchableOpacity onPress={() => openModal(item)}>
              <Ionicons name="ellipsis-vertical" size={24} color="#fff" />
            </TouchableOpacity>
          </TouchableOpacity>
        );

      case 'list':
        return (
          <View style={styles.itemContainer}>
            <Image source={imageSource} style={styles.itemImage} />
            <View style={styles.itemTextContainer}>
              <Text style={styles.itemTitle}>{item.nombre || item.Nombre}</Text>
              <Text style={styles.itemSubtitle}>
                {item.type === 'album' ? 'Álbum' : 'Playlist'} • {item.autor || item.EmailAutor || 'Desconocido'}
              </Text>
            </View>
            <TouchableOpacity onPress={() => openModal(item)}>
              <Ionicons name="ellipsis-vertical" size={24} color="#fff" />
            </TouchableOpacity>
          </View>
        );

        case 'artist':
          return (
            <TouchableOpacity style={[styles.itemContainer, styles.artistContainer]} onPress={() => navigation.navigate('ArtistDetails', { artist: item })}>
              <Image source={imageSource} style={styles.artistImage} />
              <View style={styles.artistTextContainer}>
                <Text style={styles.artistName}>{item.nombre || item.Nombre}</Text>
                <Text style={styles.artistListeners}>{item.numOyentesTotales || item.NumOyentesTotales || 0} oyentes</Text>
              </View>
              <TouchableOpacity onPress={() => openModal(item)}>
                <Ionicons name="ellipsis-vertical" size={24} color="#fff" />
              </TouchableOpacity>
            </TouchableOpacity>
          );

      case 'song':
        return (
          <TouchableOpacity style={styles.itemContainer} onPress={() => playSingleSong(item)}>
            <Image source={imageSource} style={styles.itemImage} />
            <View style={styles.itemTextContainer}>
              <Text style={styles.itemTitle}>{item.nombre || item.Nombre}</Text>
              <Text style={styles.itemSubtitle}>
                {formatDuration(item.duracion || item.Duracion)} • {item.genero || item.Genero || 'Desconocido'}
              </Text>
            </View>
            <TouchableOpacity onPress={() => openModal(item)}>
              <Ionicons name="ellipsis-vertical" size={24} color="#fff" />
            </TouchableOpacity>
          </TouchableOpacity>
        );

      case 'playlist':
        // Normalizamos la playlist incluyendo EmailAutor si existe
        const normalizedPlaylist = {
          Id: item.id || item.Id,
          Nombre: item.nombre || item.Nombre,
          Portada: item.portada || item.Portada,
          Descripcion: item.descripcion || item.Descripcion || '',
          EmailAutor: item.EmailAutor || null,
        };
        return (
          <TouchableOpacity 
            style={styles.itemContainer} 
            onPress={() => {
              console.log('🔍 Playlist enviada desde SearchResults:', normalizedPlaylist);
              // Si la playlist tiene EmailAutor y es distinta al email actual, se considera ajena
              if (normalizedPlaylist.EmailAutor && normalizedPlaylist.EmailAutor !== email) {
                navigation.navigate('AlbumDetails', { playlist: normalizedPlaylist });
              } else {
                navigation.navigate('PlaylistDetails', { playlist: normalizedPlaylist });
              }
            }}
          >
            <Image source={imageSource} style={styles.itemImage} />
            <View style={styles.itemTextContainer}>
              <Text style={styles.itemTitle}>{item.nombre || item.Nombre}</Text>
              <Text style={styles.itemSubtitle}>
                Playlist • {item.numeroLikes || item.NumLikes || 0} likes
              </Text>
            </View>
            <TouchableOpacity onPress={() => openModal(item)}>
              <Ionicons name="ellipsis-vertical" size={24} color="#fff" />
            </TouchableOpacity>
          </TouchableOpacity>
        );
      default:
        return null;
    }
  };

  return (
    <TouchableWithoutFeedback onPress={() => Keyboard.dismiss()}>
      <View style={styles.container}>
        <View style={styles.topContainer}>
          <View style={styles.topBar}>
            <TouchableOpacity onPress={() => navigation.goBack()}>
              <Ionicons name="arrow-back" size={24} color="#f2ab55" />
            </TouchableOpacity>
            <TextInput
              style={styles.searchInput}
              placeholder="Buscar..."
              placeholderTextColor="#ccc"
              value={searchText}
              onChangeText={setSearchText}
              onSubmitEditing={handleSearch}
              returnKeyType="search"
            />
          </View>
        </View>

        <FlatList
          data={filteredResults}
          keyExtractor={(item, index) => `${item.type}-${item.id || item.Id || index}`}
          renderItem={renderItem}
          contentContainerStyle={styles.listContainer}
        />

        <Modal
          transparent={true}
          visible={modalVisible}
          onRequestClose={() => setModalVisible(false)}
        >
          <TouchableWithoutFeedback onPress={() => setModalVisible(false)}>
            <View style={styles.modalOverlay}>
              <View style={styles.modalContent}>
                <TouchableOpacity 
                  style={styles.closeButton} 
                  onPress={() => setModalVisible(false)}
                >
                  <Ionicons name="close" size={24} color="#fff" />
                </TouchableOpacity>
                {renderModalContent()}
              </View>
            </View>
          </TouchableWithoutFeedback>
        </Modal>
      </View>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#000' 
  },
  topContainer: { 
    padding: 16, 
    marginTop: 40 
  },
  topBar: { 
    flexDirection: 'row', 
    alignItems: 'center' 
  },
  searchInput: {
    flex: 1,
    backgroundColor: '#333',
    borderRadius: 8,
    marginLeft: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    color: '#fff',
    fontSize: 18,
  },
  listContainer: { 
    paddingBottom: 20 
  },
  itemContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    paddingHorizontal: 16,
  },
  itemImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
    marginRight: 16,
  },
  artistContainer: {
    borderRadius: 8,
    padding: 5,
  },
  artistImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
    marginRight: 16,
  },
  artistTextContainer: {
    flex: 1,
  },
  artistName: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  artistListeners: {
    color: '#ccc',
    fontSize: 14,
  },
  itemTextContainer: { 
    flex: 1 
  },
  itemTitle: { 
    color: '#fff', 
    fontSize: 16, 
    fontWeight: 'bold' 
  },
  itemSubtitle: { 
    color: '#ccc', 
    fontSize: 14 
  },
  modalOverlay: {
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center', 
    backgroundColor: 'rgba(0, 0, 0, 0.5)'
  },
  modalContent: {
    backgroundColor: '#333',
    borderRadius: 8,
    padding: 16,
    width: '90%',
  },
  closeButton: { 
    alignSelf: 'flex-end' 
  },
  modalOption: { 
    paddingVertical: 12 
  },
  modalOptionText: { 
    color: '#fff', 
    fontSize: 18 
  },
  playlistOptionContainer: {
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between',
  },
  playlistList: { 
    marginTop: 8 
  },
  playlistItem: {
    flexDirection: 'row', 
    alignItems: 'center', 
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
    color: '#fff', 
    fontSize: 16,
  },
});
