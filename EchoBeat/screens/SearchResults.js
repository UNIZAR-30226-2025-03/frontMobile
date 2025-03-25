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

  const options = ["Canción", "Playlist", "Autor", "Álbum"];
  const optionMap = {
    "Canción": "canciones",
    "Playlist": "playlists",
    "Autor": "artistas",
    "Álbum": "albums",
  };

  const handleSearch = async () => {
    const tipo = selectedOption ? optionMap[selectedOption] : '';
    const url = `https://echobeatapi.duckdns.org/search?q=${encodeURIComponent(searchText)}${tipo ? `&tipo=${tipo}` : ''}`;
    console.log("Tipo de busqueda", tipo);
    try {
      const response = await fetch(url);
      const data = await response.json();

      let filteredResults = { ...data };

      if (selectedOption === "Playlist") {
        filteredResults.listas = (data.listas || []).filter((item) => item.TipoLista !== 'Album');
      } else if (selectedOption === "Álbum") {
        filteredResults = {
          albums: data.albums || [],
          listas: (data.listas || []).filter((item) => item.TipoLista === 'Album'),
        };
      }

      setResults(filteredResults);
      Keyboard.dismiss();
    } catch (error) {
      console.error("Error al realizar la búsqueda:", error);
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

  const combinedAlbums = [
    ...(results.albums || []).map((item) => ({ ...item, type: 'album' })),
    ...(results.listas || []).filter((item) => item.TipoLista === 'Album').map((item) => ({ ...item, type: 'album' })),
  ];

  const combinedResults = [
    ...combinedAlbums,
    ...(results.artistas || []).map((item) => ({ ...item, type: 'artist' })),
    ...(results.canciones || []).map((item) => ({ ...item, type: 'song' })),
    ...(results.listas || []).filter((item) => item.TipoLista !== 'Album').map((item) => ({ ...item, type: 'list' })),
  ];

  const formatDuration = (duration) => {
    const minutes = Math.floor(duration / 60);
    const seconds = duration % 60;
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
  };

  const fetchPlaylists = async () => {
    try {
      const response = await fetch(`https://echobeatapi.duckdns.org/playlists/user/${email}`);
      if (!response.ok) {
        console.error("Error al obtener las playlists del usuario");
        return;
      }
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
    } catch (error) {
      console.error("Error al realizar la solicitud:", error);
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
              onPress={() => console.log("Añadir a Favoritos")}
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
                    key={playlist.Id}
                    style={styles.playlistItem}
                    onPress={() => {
                      addSongToPlaylist(playlist.Id, selectedItem.Id);
                      setModalVisible(false);
                    }}
                  >
                    <Image
                      source={{ uri: playlist.lista.Portada }}
                      style={styles.playlistImage}
                    />
                    <Text style={styles.playlistItemText}>{playlist.lista.Nombre}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        );
  
      default:
        return null;
    }
  };
  

  const playSingleSong = async (song) => {
    try {
      const email = await AsyncStorage.getItem('email');
      if (!email) return;

      const body = {
        userEmail: email,
        reproduccionAleatoria: false,
        posicionCola: 0,
        colaReproduccion: {
          canciones: [{
            id: song.Id,
            nombre: song.Nombre,
            duracion: song.Duracion,
            numReproducciones: song.NumReproducciones,
            numFavoritos: song.NumFavoritos,
            portada: song.Portada
          }]
        }
      };

      await fetch('https://echobeatapi.duckdns.org/cola-reproduccion/play-list-by-position', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      navigation.navigate('MusicPlayer', {
        songId: song.Id,
        songName: song.Nombre,
      });

    } catch (error) {
      Alert.alert("Error", "No se pudo reproducir la canción");
    }
  };

  const renderItem = ({ item }) => {
    switch (item.type) {
      case 'album':
        return (
          <View style={styles.itemContainer}>
            <Image
              source={{ uri: item.Portada || 'URL_por_defecto' }}
              style={styles.itemImage}
            />
            <View style={styles.itemTextContainer}>
              <Text style={styles.itemTitle}>{item.Nombre}</Text>
              <Text style={styles.itemSubtitle}>
                {item.NumCanciones} canciones • {item.FechaLanzamiento?.split('T')[0]}
              </Text>
            </View>
            <TouchableOpacity onPress={() => openModal(item)}>
              <Ionicons name="ellipsis-vertical" size={24} color="#fff" />
            </TouchableOpacity>
          </View>
        );

      case 'artist':
        return (
          <View style={[styles.itemContainer, styles.artistContainer]}>
            <Image
              source={{ uri: item.FotoPerfil || 'URL_por_defecto' }}
              style={styles.artistImage}
            />
            <View style={styles.artistTextContainer}>
              <Text style={styles.artistName}>{item.Nombre}</Text>
              <Text style={styles.artistListeners}>{item.NumOyentesTotales || 0} oyentes</Text>
            </View>
            <TouchableOpacity onPress={() => openModal(item)}>
              <Ionicons name="ellipsis-vertical" size={24} color="#fff" />
            </TouchableOpacity>
          </View>
        );

      case 'song':
        return (
          <TouchableOpacity style={styles.itemContainer} onPress={() => playSingleSong(item)}>
            <Image source={{ uri: item.Portada || 'URL_por_defecto' }} style={styles.itemImage} />
            <View style={styles.itemTextContainer}>
              <Text style={styles.itemTitle}>{item.Nombre}</Text>
              <Text style={styles.itemSubtitle}>{formatDuration(item.Duracion)} • {item.Genero}</Text>
            </View>
            <TouchableOpacity onPress={() => openModal(item)}>
              <Ionicons name="ellipsis-vertical" size={24} color="#fff" />
            </TouchableOpacity>
          </TouchableOpacity>
        );

      case 'playlists':
        return (
          <View style={styles.itemContainer}>
            <Image
              source={{ uri: item.portada || 'URL_por_defecto' }}
              style={styles.itemImage}
            />
            <View style={styles.itemTextContainer}>
              <Text style={styles.itemTitle}>{item.nombre}</Text>
              <Text style={styles.itemSubtitle}>{item.numeroLikes} likes</Text>
            </View>
            <TouchableOpacity onPress={() => openModal(item)}>
              <Ionicons name="ellipsis-vertical" size={24} color="#fff" />
            </TouchableOpacity>
          </View>
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
          data={combinedResults}
          keyExtractor={(item) => `${item.type}-${item.Id}`}
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
                <TouchableOpacity style={styles.closeButton} onPress={() => setModalVisible(false)}>
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
    backgroundColor: '#222',
    borderRadius: 8,
    padding: 16,
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
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  playlistList: { 
    marginTop: 8 
  },
  playlistItem: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: 8, paddingLeft: 16,
  },
  playlistImage: {
    width: 40, height: 40, borderRadius: 4, marginRight: 8,
  },
  playlistItemText: {
    color: '#fff', fontSize: 16,
  },
});
