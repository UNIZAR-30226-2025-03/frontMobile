/**
 * @file SearchResults.js
 * @description Pantalla de resultados de búsqueda.
 */
import React, { useState, useLayoutEffect, useEffect, useCallback, useRef } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, Image, Animated, Easing, Modal, 
         TouchableWithoutFeedback, TextInput, Keyboard, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Pantalla de resultados de búsqueda.
 * - Permite buscar canciones, artistas, álbumes y playlists.
 * - Muestra los resultados en una lista.
 * - Permite dar like a canciones, álbumes y playlists.
 * - Permite añadir canciones a playlists.
 * - Permite abrir el reproductor de música.
 * 
 * @param {object} route - Propiedades de la ruta, incluyendo parámetros iniciales.
 * @param {object} navigation - Propiedades de navegación de React Navigation.
 * @param {string} route.params.initialSearchText - Texto de búsqueda inicial.
 * @param {string} route.params.initialSelectedOption - Opción de filtro inicial.
 */
export default function SearchResults({ route, navigation }) {
  // Recibimos los parámetros iniciales: texto y filtro seleccionado.
  const { initialSearchText = '', initialSelectedOption = null } = route.params || {};
  const [searchText, setSearchText] = useState(initialSearchText);
  const [selectedOption, setSelectedOption] = useState(initialSelectedOption);
  const [results, setResults] = useState({});
  const [email, setEmail] = useState('');
  const [userNick, setUserNick] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [loading, setLoading] = useState(false);

  // Estados para el modal y para acciones adicionales (como añadir a playlist)
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [showPlaylists, setShowPlaylists] = useState(false);
  const [playlists, setPlaylists] = useState([]);

  const [cancionSonando, setCancionSonando] = useState(false);
  const [estaReproduciendo, setEstaReproduciendo] = useState(false);
  const rotation = useRef(new Animated.Value(0)).current;

  // Mapeo de opciones para la búsqueda.
  const optionMap = {
    "Canción": "canciones",
    "Playlist": "playlists",
    "Artista": "artistas",
    "Álbum": "albums",
    "Generos": "genero",
  };

  useLayoutEffect(() => {
    navigation.setOptions({ headerShown: false });
  }, [navigation]);

  useFocusEffect(
    useCallback(() => {
      checkSongPlaying();
    }, [])
  );  

  // Al montar, obtenemos el email y el nick del usuario.
  useEffect(() => {
    const loadUserData = async () => {
      try {
        const emailStored = await AsyncStorage.getItem('email');
        if (emailStored) {
          setEmail(emailStored);
          const resUser = await fetch(`https://echobeatapi.duckdns.org/users/get-user?userEmail=${emailStored}`);
          const userData = await resUser.json();
          if (userData.Nick) {
            setUserNick(userData.Nick);
          }
        }
      } catch (error) {
        console.error("Error al obtener datos del usuario:", error);
      }
    };
    loadUserData();
  }, []);

  // Realizamos la búsqueda al montar si ya hay texto inicial y datos de usuario.
  useEffect(() => {
    if (searchText && email && userNick) {
      handleSearch();
    }
    checkSongPlaying();
  }, [email, userNick]);

  /** 
   * Verifica si hay una canción en reproducción en AsyncStorage y actualiza
   * los estados para mostrar o detener la animación de disco.
   * 
   * @returns {Promise<void>}
   */
  const checkSongPlaying = async () => {
    const lastSong = await AsyncStorage.getItem('lastSong');
    const isPlaying = await AsyncStorage.getItem('isPlaying');

    const hayCancion = !!lastSong;
    const reproduciendo = isPlaying === 'true';

    setCancionSonando(hayCancion);
    setEstaReproduciendo(reproduciendo);

    if (hayCancion && reproduciendo) {
      startRotationLoop();
    } else {
      stopRotation();
    }
  };

  /**
   * Inicia un bucle de animación de rotación en el valor `rotation`.
   * 
   * @returns {void}
   */
  const startRotationLoop = () => {
    rotation.setValue(0);
    Animated.loop(
      Animated.timing(rotation, {
        toValue: 1,
        duration: 4000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    ).start();
  };

  /**
   * Detiene la animación de rotación y resetea el valor de `rotation` a 0.
   * 
   * @returns {void}
   */
  const stopRotation = () => {
    rotation.stopAnimation(() => {
      rotation.setValue(0);
    });
  };

  const spin = rotation.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  /** 
   * Navega al MusicPlayer usando la canción guardada en AsyncStorage.
   * 
   * @returns {Promise<void>}
   */
  const handleOpenMusicPlayer = async () => {
    try {
      const lastSong = await AsyncStorage.getItem('lastSong');
      const lastSongIdStr = await AsyncStorage.getItem('lastSongId');
      const lastSongId = parseInt(lastSongIdStr);

      if (lastSong && !isNaN(lastSongId)) {
        navigation.navigate('MusicPlayer', {
          songName: lastSong,
          songId: lastSongId,
          userEmail: email
        });
      } else {
        Alert.alert("No hay ninguna canción en reproducción");
      }
    } catch (error) {
      console.error("Error obteniendo la última canción:", error);
    }
  };
  
  /**
   * Normaliza la respuesta de la API añadiendo un campo `type` a cada item.
   * 
   * @param {object} data - Objeto de respuesta de la API.
   * @param {string} tipo - Tipo de búsqueda (canciones, playlists, etc.).
   * @returns {object} - Resultados normalizados.
   */
  const processResults = (data, tipo) => {
    // Función de mapeo para cada categoría.
    const mapItems = (items, type) => items.map(item => ({ ...item, type }));
    
    if (tipo === "genero") {
      return {
        canciones: mapItems(data.canciones || [], 'song'),
        artistas: mapItems(data.artistas || [], 'artist'),
        albums: mapItems(data.albums || [], 'album'),
        listas: mapItems(data.listas || [], 'list'),
        playlists: mapItems(data.playlistsPorGenero || [], 'playlist'),
      };
    } else {
      return {
        canciones: mapItems(data.canciones || [], 'song'),
        artistas: mapItems(data.artistas || [], 'artist'),
        albums: mapItems(data.albums || [], 'album'),
        listas: mapItems(data.listas || [], 'list'),
        playlists: (data.playlistsProtegidasDeAmigos && data.playlistsProtegidasDeAmigos.length > 0)
          ? mapItems([...data.playlistsProtegidasDeAmigos, ...(data.playlists || [])], 'playlist')
          : mapItems(data.playlists || [], 'playlist'),
      };
    }
  };

  /**
   * Ejecuta la búsqueda en la API con el texto y filtro seleccionados.
   * Maneja validaciones y muestra mensajes de error si es necesario.
   * 
   * @returns {Promise<void>}
   */
  const handleSearch = async () => {
    if (!searchText.trim()) {
      setErrorMessage("Ingrese un texto para buscar");
      return;
    }
    if (!email || !userNick) {
      console.warn("Datos de usuario no cargados aún");
      return;
    }
    setErrorMessage('');
    setLoading(true);
    // Determinamos el tipo de búsqueda.
    const tipo = selectedOption && optionMap[selectedOption] ? optionMap[selectedOption] : '';
    try {
      const url = `https://echobeatapi.duckdns.org/search?B%C3%BAsqueda=${encodeURIComponent(searchText)}&tipo=${tipo}&usuarioNick=${encodeURIComponent(userNick)}`;
      const response = await fetch(url);
      const data = await response.json();

      // Se procesa la respuesta para agregar el campo "type" a cada objeto.
      const normalizedResults = processResults(data, tipo);
      setResults(normalizedResults);
      setLoading(false);
      Keyboard.dismiss();
    } catch (error) {
      console.error("Error al realizar la búsqueda:", error);
      setErrorMessage("Error al realizar la búsqueda. Por favor, intenta de nuevo.");
      setLoading(false);
    }
  };

  /**
   * Marca una playlist como guardada (like).
   * 
   * @param {object} playlist - Objeto playlist.
   * @return {Promise<void>}
   */
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

  /**
   * Marca un álbum como guardado (like).
   * 
   * @param {object} album - Objeto álbum.
   * @return {Promise<void>}
   */
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

  /**
   * Añade una canción a favoritos (like).
   * 
   * @param {object} song - Objeto canción.
   * @return {Promise<void>}
   */
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
      Alert.alert("Error", "Canción ya guardada en favoritos");
    }
  };

  /**
   * Obtiene las playlists del usuario para el modal.
   * 
   * @returns {Promise<void>}
   */
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

  /**
   * Añade una canción a la playlist indicada.
   * 
   * @param {number} idLista - ID de la playlist.
   * @param {number} songId - ID de la canción.
   * @return {Promise<void>}
   */
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
      Alert.alert("Error", "Canción ya añadida a la playlist o no se pudo añadir");
    }
  };

  /**
   * Abre el modal de acciones para el item seleccionado.
   * 
   * @param {object} item - Item sobre el que se abren acciones.
   * @returns {void}
   */
  const openModal = (item) => {
    setSelectedItem(item);
    setModalVisible(true);
    if (item.type === 'song') {
      fetchPlaylists();
    }
  };

  /**
   * Renderiza el contenido del modal según el tipo de item.
   * 
   * @returns {JSX.Element|null}
   */
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
                    <Text style={styles.playlistItemText}>
                      {playlist.nombre || playlist.lista?.Nombre || 'Playlist sin nombre'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        );
      case 'playlist':
        const normalizedPlaylist = {
          Id: selectedItem.id || selectedItem.Id,
          Nombre: selectedItem.nombre || selectedItem.Nombre,
          Portada: selectedItem.portada || selectedItem.Portada,
          Descripcion: selectedItem.descripcion || selectedItem.Descripcion || '',
          EmailAutor: selectedItem.EmailAutor || null,
        };
        return (
          <TouchableOpacity
            style={styles.itemContainer}
            onPress={() => {
              if (normalizedPlaylist.EmailAutor && normalizedPlaylist.EmailAutor === email) {
                navigation.navigate('PlaylistDetails', { playlist: normalizedPlaylist });
              } else {
                navigation.navigate('AlbumDetails', { playlist: normalizedPlaylist });
              }
            }}
          >
            <TouchableOpacity
              style={styles.modalOption}
              onPress={() => {
                likePlaylist(selectedItem);
                setModalVisible(false);
              }}
            >
              <Text style={styles.modalOptionText}>Guardar Playlist</Text>
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

  /**
   * Formatea una duración en segundos a mm:ss.
   * 
   * @param {number} duration - Duración en segundos.
   * @returns {string}
   */
  const formatDuration = (duration) => {
    if (!duration) return '0:00';
    const minutes = Math.floor(duration / 60);
    const seconds = duration % 60;
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
  };

  /**
   * Reproduce una canción individual enviando la cola sólo con esa canción.
   * 
   * @param {object} song - Objeto canción.
   * @returns {Promise<void>}
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

  // Se combinan los arrays de resultados para mostrar en el FlatList.
  const combinedResults = [
    ...(results.canciones || []),
    ...(results.artistas || []),
    ...(results.albums || []),
    ...(results.listas || []),
    ...(results.playlists || []),
  ];

  /**
   * Renderiza cada item del FlatList según su tipo.
   * 
   * @param {object} item - Objeto item a renderizar.
   * @returns {JSX.Element}
   */
  const renderItem = ({ item }) => {
    const imageSource = { uri: item.portada || item.Portada || item.FotoPerfil || 'https://via.placeholder.com/150' };
    switch (item.type) {
      case 'album': {
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
      }
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
      case 'playlist': {
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
                Playlist
              </Text>
            </View>
            <TouchableOpacity onPress={() => openModal(item)}>
              <Ionicons name="ellipsis-vertical" size={24} color="#fff" />
            </TouchableOpacity>
          </TouchableOpacity>
        );
      }
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
            <TouchableOpacity style={styles.searchButton} onPress={handleSearch}>
              <Text style={styles.searchButtonText}>Buscar</Text>
            </TouchableOpacity>
          </View>
          {errorMessage ? (
            <Text style={styles.errorText}>{errorMessage}</Text>
          ) : null}
        </View>
        {cancionSonando && (
              <TouchableOpacity onPress={handleOpenMusicPlayer} style={styles.playerButton}>
                <Animated.Image
                  source={require('../assets/disc.png')}
                  style={[styles.playerIcon, { transform: [{ rotate: spin }] }]} 
                />
              </TouchableOpacity>
            )}        
        
        {/* Condiciones para mostrar mensajes de carga o sin resultados */}
        {loading ? (
          <Text style={{ color: '#fff', textAlign: 'center' }}>
            Cargando resultados de búsqueda...
          </Text>
        ) : combinedResults.length === 0 ? (
          <Text style={{ color: '#fff', textAlign: 'center' }}>
            No se han encontrado resultados.
          </Text>
        ) : (
          <FlatList
            data={combinedResults}
            keyExtractor={(item, index) => `${item.type}-${item.id || item.Id || index}`}
            renderItem={renderItem}
            contentContainerStyle={styles.listContainer}
          />
        )}

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
  searchButton: { 
    backgroundColor: 'orange', 
    paddingVertical: 10, 
    paddingHorizontal: 16, 
    borderRadius: 8, 
    marginLeft: 8 
  },
  searchButtonText: { 
    color: '#fff', 
    fontSize: 16 
  },
  errorText: { 
    color: 'red', 
    marginTop: 12, 
    textAlign: 'center', 
    fontSize: 16 
  },
  listContainer: { 
    paddingBottom: 20 
  },
  itemContainer: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    marginBottom: 16, 
    paddingHorizontal: 16 
  },
  itemImage: { 
    width: 60, 
    height: 60, 
    borderRadius: 8, 
    marginRight: 16 
  },
  artistContainer: { 
    borderRadius: 8, 
    padding: 5 
  },
  artistImage: { 
    width: 80, 
    height: 80, 
    borderRadius: 8, 
    marginRight: 16 
  },
  artistTextContainer: { 
    flex: 1 
  },
  artistName: { 
    color: '#fff', 
    fontSize: 18, 
    fontWeight: 'bold' 
  },
  artistListeners: { 
    color: '#ccc', 
    fontSize: 14 
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
    width: '90%' 
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
    justifyContent: 'space-between' 
  },
  playlistList: { 
    marginTop: 8 
  },
  playlistItem: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    paddingVertical: 8, 
    paddingLeft: 16 
  },
  playlistImage: { 
    width: 40, 
    height: 40, 
    borderRadius: 4, 
    marginRight: 8 
  },
  playlistItemText: { 
    color: '#fff', 
    fontSize: 16 
  },
  playerButton: {
    position: 'absolute',
    bottom: 15,
    right: 16,
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
    zIndex: 4,
  },
  playerIcon: { 
    width: 80, 
    height: 80, 
    borderRadius: 35 
  },
});
