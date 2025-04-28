/**
 * @file PlaylistDetail.js
 * @description Pantalla de detalles de una playlist.
 * Permite ver información de la lista, reordenar canciones (solo si eres autor)
 */
import React, { useState, useLayoutEffect, useEffect, useCallback, useRef } from "react";
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, Image, Animated, Easing, Dimensions, Alert, RefreshControl} from "react-native";
import DraggableFlatList from "react-native-draggable-flatlist";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { GestureHandlerRootView } from "react-native-gesture-handler";

const { width } = Dimensions.get("window");

/**
 * Pantalla de detalles de una playlist, que permite:
 * - Ver información de la lista (imagen, título, descripción, likes(si se te permite)).
 * - Reordenar canciones mediante arrastre (si es tuya la playlist).
 * - Reproducir la playlist completa o una canción específica.
 * - Marcar/desmarcar canciones como favoritas.
 * - Filtrar el orden de las canciones.
 * - Añadir/cambiar canciones (si es autor).
 * - Mostrar opciones contextuales (eliminar iconos, añadir a otras playlists, etc.).
 *
 * @param {object} props.navigation - Prop de navegación de React Navigation.
 * @param {object} props.route - Contiene `playlist` con los datos básicos de la lista.
 */
export default function PlaylistDetail({ navigation, route }) {
  const { playlist } = route.params;
  const [songs, setSongs] = useState([]);
  const [userEmail, setUserEmail] = useState("");
  const [playlistInfo, setPlaylistInfo] = useState(null);
  const [infoVisible, setInfoVisible] = useState(false);
  const [selectedSong, setSelectedSong] = useState(null);
  const [songOptionsVisible, setSongOptionsVisible] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [favoritos, setFavoritos] = useState([]);
  const [shuffle, setShuffle] = useState(false);
  const [cola, setCola] = useState(null);
  const [esAutor, setEsAutor] = useState(false);
  const [orderDropdownVisible, setOrderDropdownVisible] = useState(false);
  const [infoLista, setInfoLista] = useState(null);
  const [playlistsUsuario, setPlaylistsUsuario] = useState([]);
  const [mostrarPlaylists, setMostrarPlaylists] = useState(false);
  const [playlistEdit, setPlaylistEdit] = useState({
    Nombre: "",
    Descripcion: "",
    TipoPrivacidad: "",
  });
  const [creadorEmail, setCreadorEmail] = useState("");
  const [privCreador, setPrivCreador] = useState("");
  const [creadorNick, setCreadorNick] = useState("");
  const [numLikes, setNumLikes] = useState(0);
  const [isFriend, setIsFriend] = useState(false);

  const orderOptions = [
    { value: 0, label: "Orden original" },
    { value: 1, label: "Orden alfabético A-Z" },
    { value: 2, label: "Orden por reproducciones" },
  ];

  const [cancionSonando, setCancionSonando] = useState(false);
  const [estaReproduciendo, setEstaReproduciendo] = useState(false);
  const rotation = useRef(new Animated.Value(0)).current;


  useLayoutEffect(() => {
    navigation.setOptions({ headerShown: false });
  }, [navigation]);

  /**
   * Carga todos los datos iniciales de la playlist:
   * - Canciones de la lista.
   * - Información detallada.
   * - Estado de favoritos del usuario.
   * - Listas del usuario para saber si es autor.
   * - Número de likes y estado de amistad (si es playlist protegida).
   *
   * @returns {Promise<object>} Información de la playlist (infoPlaylist).
   */
  const loadData = async () => {
    try {
      const email = await AsyncStorage.getItem("email");
      if (!email) return;
      setUserEmail(email);
      const encodedEmail = encodeURIComponent(email);
      const [cancionesData, playlistData, favoritosData, listasDelUsuario, infoPlaylist] = await Promise.all([
        fetch(`https://echobeatapi.duckdns.org/playlists/${playlist.Id}/songs`).then((res) => res.json()),
        fetch(`https://echobeatapi.duckdns.org/playlists/playlist/${playlist.Id}`).then((res) => res.json()),
        fetch(`https://echobeatapi.duckdns.org/cancion/favorites?email=${encodedEmail}`).then((res) => res.json()),
        fetch(`https://echobeatapi.duckdns.org/playlists/user/${encodedEmail}`).then((res) => res.json()),
        fetch(`https://echobeatapi.duckdns.org/playlists/lista/${playlist.Id}`).then((res) => res.json()),
      ]);
      // Información del autor de la playlist
      console.log("PlaylistData", playlistData);
      setCreadorEmail(playlistData.EmailAutor);
      setPrivCreador(playlistData.Autor.Privacidad);
      setCreadorNick(playlistData.Autor.Nick);
      // Número de Likes de la playlist
      setNumLikes(infoPlaylist.NumLikes);

      // Canciones de la playlist
      setCola(cancionesData);
      const loadedSongs = cancionesData.canciones || [];
      setSongs([...loadedSongs]);
      setPlaylistInfo(playlistData);
      setPlaylistEdit({
        Nombre: infoPlaylist.Nombre || "",
        Descripcion: infoPlaylist.Descripcion || "",
        TipoPrivacidad: playlistData.TipoPrivacidad,
      });
      setInfoLista(infoPlaylist);
      setFavoritos((favoritosData.canciones || []).map((c) => c.id));

      let listas = listasDelUsuario.playlists ?? listasDelUsuario;
      const idsDelUsuario = listas.map((p) => p.Id);
      const esPropia = idsDelUsuario.includes(playlist.Id);
      setEsAutor(esPropia);
      const amigosRes = await fetch(`https://echobeatapi.duckdns.org/amistades/verAmigos/${playlistData.Autor.Nick}`);
      const amigosJson = await amigosRes.json();
      setIsFriend(Array.isArray(amigosJson) &&amigosJson.some((a) => a.Email === email));
      setPlaylistsUsuario(listas);

      return infoPlaylist;
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
   * Verifica si hay canción en reproducción guardada en AsyncStorage
   * y lanza animación de giro si corresponde.
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
   * Inicia animación de rotación continua.
   * 
   * @returns {Promise<void>}
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
   * Detiene la animación de rotación.
   * 
   * @returns {Promise<void>}
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
   * Navega al reproductor con la última canción guardada.
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
   * Marca o desmarca una canción como favorita.
   * 
   * @param {number} songId - ID de la canción a togglear.
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
    const encodedEmail = encodeURIComponent(userEmail);
    const url = `https://echobeatapi.duckdns.org/cancion/${endpoint}/${encodedEmail}/${songId}`;
    try {
      const response = await fetch(url, { method });
      const text = await response.text();
      if (!response.ok) throw new Error(text);
      setFavoritos((prev) =>
        esFavorita ? prev.filter((id) => id !== songId) : [...prev, songId]
      );
    } catch (error) {
      console.error(`Error al togglear favorito para canción ${songId}:`, error.message);
    }
  };

  /**
   * Elimina la playlist (solo autor).
   * 
   * @returns {Promise<void>}
   */
  const eliminarPlaylist = async () => {
    try {
      const body = {
        userEmail: userEmail,
        idLista: playlist.Id,
      };
      const response = await fetch(`https://echobeatapi.duckdns.org/playlists/delete`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const responseText = await response.text();
      let data = {};
      try {
        data = JSON.parse(responseText);
      } catch (e) {
        console.log("Respuesta no es JSON:", responseText);
      }
      if (!response.ok) throw new Error(data.message || "Error al eliminar la playlist");
      navigation.navigate("HomeScreen");
    } catch (error) {
      console.error("Error en eliminarPlaylist:", error);
      Alert.alert("Error", error.message);
    }
  };

  /**
   * Elimina una canción de la lista (solo autor).
   * 
   * @returns {Promise<void>}
   */
  const eliminarCancionDeLista = async () => {
    if (!selectedSong || !playlist?.Id) return;
    console.log("Eliminando canción de la lista:", selectedSong, playlist.Id);
    try {
      const body = {
        idLista: playlist.Id,
        songId: selectedSong.id || selectedSong.Id,
      };
      const response = await fetch(`https://echobeatapi.duckdns.org/playlists/delete-song/${playlist.Id}`, {
        method: "DELETE",
        headers: {
          "accept": "*/*",
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });
      if (!response.ok) throw new Error("Error al eliminar la canción de la lista");
      Alert.alert("Éxito", "Canción eliminada de la lista");
      setSongOptionsVisible(false);
      loadData();
    } catch (error) {
      console.error("Error al eliminar canción:", error);
      Alert.alert("Error", error.message || "No se pudo eliminar la canción de la lista");
    }
  };
  
  /**
   * Añade una canción a otra playlist del usuario.
   * 
   * @param {number} idLista - ID de la playlist destino.
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
      if (!response.ok) throw new Error("No se pudo añadir");
      Alert.alert("Éxito", "Añadida a la playlist");
      setSongOptionsVisible(false);
    } catch (error) {
      Alert.alert("Error", "Ya estaba añadida o no se pudo añadir");
    }
  };

  /**
   * Refresca la lista de canciones al hacer pull-to-refresh.
   * 
   * @returns {Promise<void>}
   */
  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  /**
   * Cambia el orden de las canciones vía API.
   * 
   * @param {number} orderValue - Valor de orden (0,1,2).
   * @returns {Promise<void>}
   */
  const handleOrderChange = async (orderValue) => {
    try {
      const response = await fetch(`https://echobeatapi.duckdns.org/playlists/ordenar-canciones/${playlist.Id}/${orderValue}`);
      const data = await response.json();
      // Se supone que la API devuelve un objeto con un array de canciones similar al obtenido en loadData.
      setSongs(data.canciones || []);
      setOrderDropdownVisible(false);
    } catch (error) {
      console.error("Error al cambiar el orden de canciones:", error);
      Alert.alert("Error", "No se pudo cambiar el orden de las canciones.");
    }
  };

  /**
   * Renderiza un ítem de canción en la lista draggable.
   * 
   * @param {{ item: object, drag: Function, isActive: boolean }} props
   * @returns {JSX.Element} Componente de canción.
   */
  const renderSong = ({ item, drag, isActive }) => {
    const esFavorita = favoritos.includes(item.id);
    return (
      <TouchableOpacity
        onLongPress={drag}
        disabled={isActive}
        style={[styles.songItem, isActive && { opacity: 0.8 }]}
        onPress={() => iniciarReproduccionDesdeCancion(item, songs.findIndex(s => s.id === item.id))}
      >
        <Image
          source={{ uri: item.portada }}
          style={styles.songImage}
        />
        <View style={styles.songTextContainer}>
          <Text style={styles.songTitle} numberOfLines={1}>{item.nombre}</Text>
        </View>

        <View style={styles.songIconsContainer}>
          <>
            <TouchableOpacity onPress={() => toggleFavorito(item.id)} style={styles.heartButton}>
              <Ionicons name="heart" size={22} color={esFavorita ? "#f2ab55" : "#fff"} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.songOptionsButton} onPress={() => {
              setSelectedSong(item);
              setSongOptionsVisible(true);
            }}>
              <Ionicons name="ellipsis-vertical" size={20} color="#fff" />
            </TouchableOpacity>
          </>
      </View>
      </TouchableOpacity>
    );
  };

  /**
   * Inicia la reproducción de la playlist completa.
   * 
   * @returns {Promise<void>} Promesa que se resuelve al iniciar la reproducción.
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
        Alert.alert("Añade canciones para reproducir");
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
   * Inicia la reproducción desde una canción específica.
   * 
   * @param {object} song - Canción seleccionada.
   * @param {number} index - Índice de la canción en la lista.
   * @return {Promise<void>} Promesa que se resuelve al iniciar la reproducción.
   */
  const iniciarReproduccionDesdeCancion = async (song, index) => {
    try {
      const body = {
        userEmail: userEmail,
        reproduccionAleatoria: shuffle,
        posicionCola: index,
        colaReproduccion: cola,
      };
  
      console.log("📤 Enviando datos a la API:", JSON.stringify(body, null, 2));
  
      const response = await fetch('https://echobeatapi.duckdns.org/cola-reproduccion/play-list-by-position', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });
  
      const result = await response.json();
      console.log("✅ Respuesta de la API:", result);
  
      if (!response.ok) {
        console.error("❌ Error al iniciar reproducción desde canción:", result.message);
        Alert.alert("Error", result.message || "No se pudo iniciar la reproducción");
        return;
      }
      
      navigation.navigate('MusicPlayer', {
        songId: songs[index].id,
        songName: songs[index].nombre,
        userEmail: userEmail,
      });
    } catch (error) {
      console.error("❌ Error inesperado:", error);
      Alert.alert("Error", "Error al iniciar reproducción desde la canción seleccionada");
    }
  };

  /**
   * Cabecera de la pantalla de la playlist.
   * 
   * @returns {JSX.Element} Componente de cabecera.
   */
  const ListHeader = () => {
    const portada = infoLista?.Portada || playlist.Portada;
  
    return (
      <View style={{ paddingHorizontal: 20, paddingTop: 10, alignItems: "center" }}>
          <View style={styles.headerContent}>
            <Image
              source={{ uri: portada }}
              style={styles.playlistImage}
            />
            <Text style={styles.playlistTitle}>{infoLista?.Nombre || playlist.Nombre}</Text>
            <Text style={styles.playlistDescription}>{playlistInfo?.Descripcion || infoLista?.Descripcion}</Text>
  
            <View style={styles.controlsRow}>
              <TouchableOpacity
                style={[styles.shuffleButton, shuffle && styles.shuffleActive]}
                onPress={() => setShuffle(prev => !prev)}
              >
                <Ionicons name="shuffle" size={20} color={shuffle ? "#121111" : "#121111"} />
                <Text style={[styles.shuffleButtonText, shuffle && styles.shuffleButtonTextActive]}>
                  {shuffle ? "Aleatorio activado" : "Aleatorio desactivado"}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.playButton} onPress={iniciarReproduccion}>
                <Ionicons name="play" size={20} color="#121111" />
              </TouchableOpacity>
            </View>
  
            <View style={styles.songsHeaderRow}>
              <Text style={styles.sectionTitle}>Canciones</Text>
              <TouchableOpacity style={styles.orderButton} onPress={() => setOrderDropdownVisible(!orderDropdownVisible)}>
                <Ionicons name="filter" size={20} color="#f2ab55" />
              </TouchableOpacity>
            </View>
  
            {orderDropdownVisible && (
              <View style={styles.orderDropdown}>
                {orderOptions.map((option) => (
                  <TouchableOpacity
                    key={option.value}
                    style={styles.orderOption}
                    onPress={() => handleOrderChange(option.value)}
                  >
                    <Text style={styles.orderOptionText}>{option.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
      </View>
    );
  };

  /**
   * Pie de la lista de canciones.
   * Si es autor, muestra botón para añadir canciones.
   * 
   * @returns {JSX.Element|null} Componente de pie de lista o null.
   */
  const ListFooter = () => {
    if (!esAutor) return null;
  
    return (
      <View style={{ marginBottom: 80, alignItems: "center", paddingHorizontal: 20 }}>
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => navigation.navigate("Search", { defaultFilter: "Canción" })}
          >
            <Text style={styles.addButtonText}>+ Añadir canciones</Text>
          </TouchableOpacity>
      </View>
    );
  };

  const listaConFakeItem = esAutor ? songs : [...songs, { id: "fake-item-final" }];

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerButton}>
            <Ionicons name="arrow-back" size={24} color="#f2ab55" />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setInfoVisible(true)} style={styles.headerButton}>
            <Ionicons name="information-circle-outline" size={28} color="#f2ab55" />
          </TouchableOpacity>
        </View>
        <DraggableFlatList
          data={listaConFakeItem} // ⚡ Añadimos un item falso al final
          keyExtractor={(item, index) => item.id?.toString() || index.toString()}
          renderItem={({ item, drag, isActive }) => (
            item.id === "fake-item-final" ? (
              <View style={{ height: 120 }} /> // 🔥 Solo espacio vacío si fake-item
            ) : (
              renderSong({ item, drag, isActive })
            )
          )}
          onDragEnd={({ data }) => {
            const newData = data.filter(item => item.id !== "fake-item-final");
            setSongs(newData);
          }}
          ListHeaderComponent={ListHeader}
          ListFooterComponent={ListFooter}
          contentContainerStyle={{ paddingBottom: 120, paddingHorizontal: 10 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={["#f2ab55"]}
              tintColor="#f2ab55"
            />
          }
          keyboardDismissMode="on-drag"
          keyboardShouldPersistTaps="handled"
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
              <TouchableOpacity style={styles.closeSongOptionsButton} onPress={() => setSongOptionsVisible(false)}>
                <Ionicons name="close" size={24} color="#000" />
              </TouchableOpacity>
              <Text style={styles.songOptionsTitle}>Opciones para la canción</Text>

              <TouchableOpacity 
                style={[styles.modalOption, { alignItems: 'center' }]} 
                onPress={() => setMostrarPlaylists(!mostrarPlaylists)}
              >
                <View style={{ flexDirection: "row", alignItems: "center" }}>
                  <Text style={[styles.modalOptionText, { textAlign: "center", fontSize: 16 }]}>  Añadir a Playlist</Text>
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
                      <Text style={[styles.modalOptionText, { fontSize: 15 }]}>• {pl.Nombre}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
              {esAutor && (
                <View>
                  <View style={{ height: 12 }} />
                  <TouchableOpacity 
                    style={[styles.modalOption, { alignItems: 'center' }]} 
                    onPress={eliminarCancionDeLista}
                  >
                    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center" }}>
                      <Text style={[styles.modalOptionText, { textAlign: "center", fontSize: 16 }]}>Eliminar de la lista</Text>
                    </View>
                  </TouchableOpacity>
                </View>
              )}
            </View>
            <View style={styles.songOptionsBlur} />
          </View>
        )}
        {infoVisible && (
          <View style={styles.infoOverlay}>
            <View style={styles.infoContainer}>
              <TouchableOpacity style={styles.closeButton} onPress={() => setInfoVisible(false)}>
                <Ionicons name="close" size={30} color="#000" />
              </TouchableOpacity>
              <Text style={styles.infoTitle}>Información</Text>
              {playlistInfo ? (
                <>
                  <Text style={styles.infoText}>Privacidad: {playlistInfo.TipoPrivacidad}</Text>
                  <Text style={styles.infoText}>Género: {playlistInfo.Genero}</Text>
                  {(esAutor ||
                    privCreador === "publico" ||
                    (privCreador === "protegido" && isFriend)) && (
                    <View style={{ flexDirection: "row", alignItems: "center", marginRight: 8 }}>
                      <Text style={{ color: "#000", marginLeft: 4, fontWeight: "bold" }}>
                        {numLikes}
                      </Text>
                      <Ionicons name="heart" size={20} color="#000" />
                    </View>
                  )}
                </>
              ) : (
                <Text style={styles.infoText}>Cargando información...</Text>
              )}
              {esAutor && (
                <>
                  <TouchableOpacity style={styles.editButton} onPress={() => {
                    navigation.navigate("EditPlaylistScreen", {
                      playlistEdit: {
                        Nombre: playlistEdit.Nombre,
                        Descripcion: playlistEdit.Descripcion,
                        TipoPrivacidad: playlistEdit.TipoPrivacidad,
                        Portada: playlistInfo?.Portada || playlist.Portada,
                      },
                      playlistId: playlist.Id,
                      songs: songs,
                      onSave: async () => {
                        await loadData();
                      }
                    });
                    setInfoVisible(false);
                  }}>
                    <Text style={styles.editButtonText}>Editar playlist</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.deleteButton} onPress={eliminarPlaylist}>
                    <Text style={styles.deleteButtonText}>Eliminar playlist</Text>
                  </TouchableOpacity>
                </>
              )}
            </View>
            <View style={styles.blurBackground} />
          </View>
        )}
      </SafeAreaView>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: "#121111", 
    paddingTop: 30 
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
    marginTop: 10,
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
  },
  flatListContent: {
    paddingBottom: 20,
    paddingHorizontal: 10,
  },
  // NUEVO: songsHeaderRow: contenedor con posición relativa para que el dropdown se superponga sin empujar contenido.
  songsHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    position: "relative",
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  orderButton: {
    padding: 4,
    marginLeft: 8,
  },
  // El dropdown se posiciona de forma absoluta dentro del contenedor songsHeaderRow.
  orderDropdown: {
    marginBottom: 10,
    backgroundColor: "#333",
    borderRadius: 4,
  },
  orderOption: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#555",
  },
  orderOptionText: {
    color: "#fff",
    fontSize: 16,
  },
  // Estilos unificados para el item de canción:
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
  // Fin de estilos unificados para el item de canción.
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
  addButton: {
    backgroundColor: "#ffffff",
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 20,
    alignSelf: "center",
    marginTop: 20,
    marginBottom: 80,
  },
  addButtonText: {
    color: "#000",
    fontSize: 16,
    fontWeight: "bold",
  },
  // Estilos para el modal y overlays.
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
  editButton: {
    backgroundColor: "orange",
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    marginTop: 20,
  },
  editButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  deleteButton: {
    backgroundColor: "red",
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    marginTop: 20,
  },
  deleteButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  label: {
    fontSize: 16,
    color: '#f2ab55',
    marginBottom: 5,
    alignSelf: 'flex-start',
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
    width: '100%',
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#f2ab55',
    borderRadius: 8,
    overflow: 'hidden',
    marginBottom: 15,
    width: '100%',
  },
  picker: {
    color: '#ffffff',
  },
  submitButton: {
    backgroundColor: '#ffb723',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
    width: '100%',
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
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
  flatListContentPadding: {
    paddingBottom: 80,
    paddingHorizontal: 10,
  }
});
