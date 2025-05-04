/**
 * @file AlbumDetails.js
 * @description Pantalla que muestra los detalles de un álbum (playlist),
 * incluyendo portada, descripción, lista de canciones, y permite acciones
 * como reproducir, alternar aleatorio, favoritar y añadir canciones a otras playlists.
 */
import React, { useState, useLayoutEffect, useEffect, useCallback, useRef } from "react";
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, Image, Animated, Easing, FlatList, Dimensions, Alert, RefreshControl, Keyboard, } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";

const { width } = Dimensions.get("window");

/**
 * Componente de pantalla que muestra los detalles de un álbum (playlist),
 * incluyendo portada, descripción, lista de canciones, y permite acciones
 * como reproducir, alternar aleatorio, favoritar y añadir canciones a otras playlists.
 *
 * @param {object} navigation - Objeto de navegación de React Navigation.
 * @param {object} route - Objeto de ruta de React Navigation.
 * @param {object} route.params.playlist - Datos del álbum: { Id, Nombre, Portada, Descripcion }.
 */
export default function AlbumDetails({ navigation, route }) {
  const { playlist } = route.params;
  const [songs, setSongs] = useState([]);
  const [userEmail, setUserEmail] = useState("");
  const [albumInfo, setAlbumInfo] = useState(null);
  const [infoVisible, setInfoVisible] = useState(false);
  const [selectedSong, setSelectedSong] = useState(null);
  const [songOptionsVisible, setSongOptionsVisible] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [favoritos, setFavoritos] = useState([]);
  const [shuffle, setShuffle] = useState(false);
  const [cola, setCola] = useState(null);
  const [cancionSonando, setCancionSonando] = useState(false);
  const [estaReproduciendo, setEstaReproduciendo] = useState(false);
  const rotation = useRef(new Animated.Value(0)).current;
  const [playlistsUsuario, setPlaylistsUsuario] = useState([]);
  const [mostrarPlaylists, setMostrarPlaylists] = useState(false);
  const [isAlbumLiked, setIsAlbumLiked] = useState(false);


  useLayoutEffect(() => {
    navigation.setOptions({ headerShown: false });
  }, [navigation]);

  /**
   * Carga los datos iniciales del álbum:
   * - Canciones del álbum
   * - Metadatos del álbum
   * - Canciones favoritas del usuario
   * 
   * @returns {Promise<void>}
   */
  const loadData = async () => {
    try {
      const email = await AsyncStorage.getItem("email");
      if (!email) return;
      setUserEmail(email);
      const resFavoritos = await fetch(`https://echobeatapi.duckdns.org/playlists/liked/${email}`);
      const listasFavoritas = await resFavoritos.json();
      const idsFavoritos = listasFavoritas.map(l => l.Id);
      setIsAlbumLiked(idsFavoritos.includes(playlist.Id));
      const listasDelUsuario = await fetch(`https://echobeatapi.duckdns.org/playlists/user/${encodeURIComponent(email)}`).then(res => res.json());
      setPlaylistsUsuario(listasDelUsuario);
      const [cancionesData, albumData, favoritosData] = await Promise.all([
        fetch(`https://echobeatapi.duckdns.org/playlists/${playlist.Id}/songs`).then((res) => res.json()),
        fetch(`https://echobeatapi.duckdns.org/playlists/album/${playlist.Id}`).then((res) => res.json()),
        fetch(`https://echobeatapi.duckdns.org/cancion/favorites?email=${encodeURIComponent(email)}`).then((res) => res.json()),
      ]);
      setCola(cancionesData);
      const loadedSongs = cancionesData.canciones || [];

      const cancionesConAutor = await Promise.all(loadedSongs.map(async (cancion) => {
        try {
          const res = await fetch(`https://echobeatapi.duckdns.org/playlists/song-details/${cancion.id}`);
          const detalle = await res.json();
          return {
            ...cancion,
            autor: Array.isArray(detalle.Autores) ? detalle.Autores.join(", ") : "Autor desconocido"
          };
        } catch (e) {
          console.warn("Error al obtener el autor para la canción", cancion.id);
          return { ...cancion, autor: "Autor desconocido" };
        }
      }));
      setSongs(cancionesConAutor);
      setAlbumInfo(albumData);
      setFavoritos((favoritosData.canciones || []).map((c) => c.id));
    } catch (error) {
      console.error("Error en loadData:", error);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadData();
      checkSongPlaying();
    }, [])
  );

  useEffect(() => {
    loadData();
    checkSongPlaying();
  }, []);

  /**
   * Alterna el estado de favorito de un álbum para el usuario actual.
   * 
   * Esta función envía una solicitud a la API para añadir o eliminar el álbum de la lista
   * de favoritos del usuario. Utiliza el método POST para añadir y DELETE para eliminar.
   * El estado local `isAlbumLiked` se actualiza en función de la acción realizada, y se
   * muestra una alerta indicando el resultado.
   * 
   * @returns {Promise<void>} No retorna valor, pero actualiza el estado local y notifica al usuario.
   */
  const toggleAlbumLike = async () => {
    try {
      const method = isAlbumLiked ? "DELETE" : "POST";
      const response = await fetch(`https://echobeatapi.duckdns.org/playlists/like/${userEmail}/${playlist.Id}`, {
        method,
        headers: { "accept": "*/*" }
      });
  
      if (!response.ok) throw new Error("Error al cambiar favorito");
  
      setIsAlbumLiked(prev => !prev);
      Alert.alert("Éxito", isAlbumLiked ? "Álbum eliminado de favoritos" : "Álbum añadido a favoritos");
    } catch (error) {
      Alert.alert("Error", "No se pudo actualizar favoritos");
    }
  };

  /**
   * Comprueba si hay una canción actualmente en reproducción
   * y gestiona el estado de la animación de rotación.
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
   * Inicia un bucle de animación rotatoria continua.
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
   * Detiene la animación rotatoria y reinicia su valor.
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
   * Navega a la pantalla del reproductor con la última canción
   * registrada en AsyncStorage.
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
          userEmail: userEmail
        });
      } else {
        Alert.alert("No hay ninguna canción en reproducción");
      }
    } catch (error) {
      console.error("Error obteniendo la última canción:", error);
    }
  };

  /**
   * Alterna el estado de favorito de una canción via API.
   *
   * @param {number} songId - ID de la canción a alternar.
   * @returns {Promise<void>}
   */
  const toggleFavorito = async (songId) => {
    if (!userEmail) {
      console.warn("Email no disponible aún");
      return;
    }
    const esFavorita = favoritos.includes(songId);
    const endpoint = esFavorita ? "unlike" : "like";
    const method = esFavorita ? "DELETE" : "POST";
    const url = `https://echobeatapi.duckdns.org/cancion/${endpoint}/${encodeURIComponent(
      userEmail
    )}/${songId}`;
    try {
      const response = await fetch(url, { method });
      if (!response.ok) throw new Error("Error");
      setFavoritos((prev) =>
        esFavorita ? prev.filter((id) => id !== songId) : [...prev, songId]
      );
    } catch (error) {
      console.error("Error al togglear favorito:", error);
    }
  };

  /**
   * Refresh control para recargar datos de la pantalla.
   * 
   * @returns {Promise<void>}
   */
  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  /**
   * Renderiza cada canción en la FlatList.
   *
   * @param {object} param0 - Objeto con el item de la canción.
   * @param {object} param0.item - Objeto de canción.
   * @returns {JSX.Element} - Componente de canción.
   */
  const renderSong = ({ item }) => {
    const esFavorita = favoritos.includes(item.id);
    return (
      <TouchableOpacity
        onPress={() => iniciarReproduccionDesdeCancion(item, songs.indexOf(item))}
        style={styles.songItem}>
        <Image
          source={{ uri: item.portada || item.Portada }}
          style={styles.songImage}
        />
        <View style={styles.songTextContainer}>
          <Text style={styles.songTitle} numberOfLines={1}>{item.nombre}</Text>
          <Text style={styles.songAuthor} numberOfLines={1}>{item.autor}</Text>
        </View>
        <View style={styles.songIconsContainer}>
          <TouchableOpacity onPress={() => toggleFavorito(item.id)} style={styles.heartButton}>
            <Ionicons name="heart" size={22} color={esFavorita ? "#f2ab55" : "#fff"} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.songOptionsButton} onPress={() => {
            setSelectedSong(item);
            setSongOptionsVisible(true);
          }}>
            <Ionicons name="ellipsis-vertical" size={20} color="#fff" />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  /**
   * Añade una canción a una playlist existente del usuario.
   *
   * @param {number} idLista - ID de la playlist destino.
   * @param {number} songId - ID de la canción a añadir.
   * @returns {Promise<void>}
   */
  const addSongToPlaylist = async (idLista, songId) => {
    try {
      const response = await fetch(`https://echobeatapi.duckdns.org/playlists/add-song/${idLista}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idLista, songId }),
      });
      if (!response.ok) throw new Error("No se pudo añadir");
      Alert.alert("Éxito", "Añadida a la playlist");
      setSongOptionsVisible(false);
    } catch (error) {
      Alert.alert("Error", "Ya estaba añadida o no se pudo añadir");
    }
  };

  /**
   * Inicia reproducción de la playlist desde la primera canción.
   * Usa la API de cola de reproducción. 
   * Tiene en cuenta el estado de aleatorio.
   * 
   * @returns {Promise<void>}
   */
  const iniciarReproduccion = async () => {
    try {
          const body = {
            userEmail: userEmail,
            reproduccionAleatoria: shuffle,
            colaReproduccion: cola,
          };
      
          const response = await fetch('https://echobeatapi.duckdns.org/cola-reproduccion/play-list', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(body),
          });
      
          const result = await response.json();
      
          if (!response.ok) {
            console.error("❌ Error en reproducción:", result.message);
            Alert.alert("Error", result.message || "No se pudo iniciar la reproducción");
            return;
          }
    
          console.log("✅ Respuesta de la API:", result);
          const primeraCancionId = result.primeraCancionId;
    
          if (primeraCancionId) {
            const detalleResp = await fetch(`https://echobeatapi.duckdns.org/playlists/song-details/${primeraCancionId}`);
            const detalle = await detalleResp.json();
    
            if (!detalleResp.ok) {
              console.error("❌ Error al obtener detalles de la canción:", detalle.message);
              Alert.alert("Error", detalle.message || "No se pudo obtener el nombre de la canción");
              return;
            }
    
            navigation.navigate('MusicPlayer', {
              songId: primeraCancionId,
              songName: detalle.Nombre, 
              userEmail: userEmail,
            });
          }
        } catch (error) {
          console.error("❌ Error al iniciar reproducción:", error);
          Alert.alert("Error", "Error inesperado al iniciar la reproducción");
        }
  };

  /**
   * Reproduce la canción seleccionada en su posición dentro de la cola.
   *
   * @param {object} song - Objeto de canción.
   * @param {number} index - Índice de la canción en la cola.
   * 
   * @returns {Promise<void>}
   */
  const iniciarReproduccionDesdeCancion = async (song, index) => {
    try {
      const body = {
        userEmail: userEmail,
        reproduccionAleatoria: shuffle,
        posicionCola: index,
        colaReproduccion: cola,
      };
      const response = await fetch("https://echobeatapi.duckdns.org/cola-reproduccion/play-list-by-position", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const result = await response.json();
      if (!response.ok) {
        Alert.alert("Error", result.message || "No se pudo iniciar la reproducción");
        return;
      }
      navigation.navigate("MusicPlayer", {
        songId: songs[index].id,
        songName: songs[index].nombre,
        userEmail: userEmail,
      });
    } catch (error) {
      Alert.alert("Error", "Error al iniciar reproducción desde la canción seleccionada");
    }
  };

  /**
   * Cabecera de la lista: muestra portada, título, descripción,
   * controles de mezcla y botón de reproducir.
   * 
   * @returns {JSX.Element}
   */
  const ListHeader = () => (
    <View style={styles.headerContent}>
      <Image
        source={{ uri: playlist.Portada }}
        style={styles.playlistImage}
      />
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <Text style={styles.playlistTitle}>{playlist.Nombre}</Text>
        <TouchableOpacity onPress={toggleAlbumLike}>
          <Ionicons name="heart" size={24} color={isAlbumLiked ? "#f2ab55" : "#fff"} />
        </TouchableOpacity>
      </View>
      <Text style={styles.playlistDescription}>{playlist.Descripcion}</Text>
      <View style={styles.controlsRow}>
        <TouchableOpacity style={[styles.shuffleButton, shuffle && styles.shuffleActive]} onPress={() => setShuffle(prev => !prev)}>
          <Ionicons name="shuffle" size={20} color={shuffle ? "#121111" : "#121111"} />
          <Text style={[styles.shuffleButtonText, shuffle && styles.shuffleButtonTextActive]}>
            {shuffle ? "Aleatorio activado" : "Aleatorio desactivado"}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.playButton} onPress={() => iniciarReproduccion()}>
          <Ionicons name="play" size={20} color="#121111" />
        </TouchableOpacity>
      </View>
      <Text style={styles.sectionTitle}>Canciones</Text>
      {songs.length === 0 && (
        <Text style={styles.noSongsText}>No hay canciones en la lista.</Text>
      )}
    </View>
  );

  /**
   * Formatea una fecha ISO a un formato legible.
   *
   * @param {string} isoString - Fecha en formato ISO.
   * @returns {string} - Fecha formateada.
   */
  const formatDate = (isoString) => {
    const d = new Date(isoString);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  };

  return (
    <SafeAreaView style={styles.container}>
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
            colors={["#f2ab55"]}
            tintColor="#f2ab55"
          />
        }
      />

      {cancionSonando && (
        <TouchableOpacity onPress={handleOpenMusicPlayer} style={styles.playerButton}>
          <Animated.Image
            source={require('../assets/disc.png')}
            style={[styles.playerIcon, { transform: [{ rotate: spin }] }]} 
          />
        </TouchableOpacity>
      )}

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

            {/* Opción Añadir a Playlist */}
            <TouchableOpacity 
              style={[styles.modalOption, { alignItems: 'center' }]} 
              onPress={() => setMostrarPlaylists(!mostrarPlaylists)}
            >
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <Text style={[styles.songOptionsTitle, { fontSize: 16 }]}>Añadir a Playlist</Text>
                <Ionicons 
                  name={mostrarPlaylists ? "chevron-up" : "chevron-down"} 
                  size={18} 
                  color="#000" 
                  style={{ marginLeft: 6 }} 
                />
              </View>
            </TouchableOpacity>

            {mostrarPlaylists && (
              <View style={{ width: "100%" }}>
                {playlistsUsuario.map((pl) => (
                  <TouchableOpacity
                    key={pl.Id}
                    style={{ paddingVertical: 8, paddingLeft: 12 }}
                    onPress={() => addSongToPlaylist(pl.Id, selectedSong.id || selectedSong.Id)}
                  >
                    <Text style={[styles.songOptionsTitle, { fontSize: 15 }]}>• {pl.Nombre}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
          <View style={styles.songOptionsBlur} />
        </View>
      )}

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
            {albumInfo ? (
              <>
                <Text style={styles.infoText}>Autor: {albumInfo.autor}</Text>
                <Text style={styles.infoText}>Fecha de Lanzamiento: {formatDate(albumInfo.fechaLanzamiento)}</Text>
                <Text style={styles.infoText}>Número de Canciones: {albumInfo.numCanciones}</Text>
                <Text style={styles.infoText}>Número de Likes: {albumInfo.numLikes}</Text>
                <Text style={styles.infoText}>Número de Reproducciones: {albumInfo.numReproducciones}</Text>
              </>
            ) : (
              <Text style={styles.infoText}>Cargando información...</Text>
            )}
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
    backgroundColor: "#121111",
    paddingTop: 30,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 25,
    paddingTop: 30,
  },
  headerButton: {},
  headerContent: {
    paddingHorizontal: 20,
    paddingTop: 10,
    alignItems: "center",
    position: "relative",
  },
  playlistImage: {
    width: 200,
    height: 200,
    borderRadius: 10,
    marginVertical: 20,
  },
  playlistTitle: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#f2ab55",
    textAlign: "center",
  },
  playlistDescription: {
    fontSize: 16,
    color: "#ffffff",
    marginBottom: 20,
    textAlign: "center",
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#f2ab55",
    marginBottom: 10,
    alignSelf: "flex-start",
    paddingLeft: 5,
  },
  flatListContent: {
    paddingBottom: 20,
    paddingHorizontal: 10,
  },
  // Estilos unificados para el item de canción en AlbumDetails:
  songItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#222",
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
  heartButton: {
    marginRight: 5,
  },
  songOptionsButton: {},
  // Fin de los estilos para el item de canción.
  controlsRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 10,
    marginBottom: 20,
    flexWrap: "wrap",
  },
  shuffleButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f2ab55",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  shuffleButtonText: {
    marginLeft: 6,
    color: "#121111",
    fontWeight: "bold",
  },
  shuffleActive: {
    backgroundColor: "#fff",
  },
  shuffleButtonTextActive: {
    color: "#f2ab55",
  },
  playButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f2ab55",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    marginLeft: 10,
  },
  playButtonText: {
    marginLeft: 6,
    color: "#121111",
    fontWeight: "bold",
  },
  noSongsText: {
    fontSize: 16,
    color: "#ffffff",
    textAlign: "center",
    marginVertical: 20,
  },
  // Estilos para modales y overlays.
  songOptionsOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 200,
  },
  songOptionsContainer: {
    width: "80%",
    backgroundColor: "#ccc",
    borderRadius: 8,
    padding: 20,
    alignItems: "center",
    zIndex: 201,
  },
  closeSongOptionsButton: {
    position: "absolute",
    top: 10,
    right: 10,
  },
  songOptionsTitle: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#000",
    marginBottom: 10,
  },
  songOptionsBlur: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.5)",
    zIndex: 200,
  },
  infoOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 100,
  },
  blurBackground: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  infoContainer: {
    width: "80%",
    backgroundColor: "#ccc",
    borderRadius: 8,
    padding: 20,
    zIndex: 101,
    alignItems: "center",
  },
  songAuthor: {
    fontSize: 12,
    color: "#ccc",
  },
  infoTitle: {
    fontSize: 22,
    fontWeight: "bold",
    marginBottom: 10,
    color: "#000",
  },
  infoText: {
    fontSize: 16,
    marginBottom: 5,
    color: "#000",
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
