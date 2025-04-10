import React, { useState, useLayoutEffect, useEffect, useCallback } from "react";
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, Image, Dimensions, Alert, RefreshControl } from "react-native";
import DraggableFlatList from "react-native-draggable-flatlist";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { GestureHandlerRootView } from "react-native-gesture-handler";

const { width } = Dimensions.get("window");

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

  useLayoutEffect(() => {
    navigation.setOptions({ headerShown: false });
  }, [navigation]);

  const loadData = async () => {
    try {
      const email = await AsyncStorage.getItem("email");
      if (!email) return;
      setUserEmail(email);
      const encodedEmail = encodeURIComponent(email);
      const [cancionesData, playlistData, favoritosData, listasDelUsuario] = await Promise.all([
        fetch(`https://echobeatapi.duckdns.org/playlists/${playlist.Id}/songs`).then((res) => res.json()),
        fetch(`https://echobeatapi.duckdns.org/playlists/playlist/${playlist.Id}`).then((res) => res.json()),
        fetch(`https://echobeatapi.duckdns.org/cancion/favorites?email=${encodedEmail}`).then((res) => res.json()),
        fetch(`https://echobeatapi.duckdns.org/playlists/user/${encodedEmail}`).then((res) => res.json()),
      ]);
      setCola(cancionesData);
      setSongs(cancionesData.canciones || []);
      setPlaylistInfo(playlistData);
      setFavoritos((favoritosData.canciones || []).map((c) => c.id));
      const nombresDelUsuario = listasDelUsuario.map((p) => p.Nombre);
      const esPropia = nombresDelUsuario.includes(playlist.Nombre);
      setEsAutor(esPropia);
    } catch (error) {
      console.error("Error en loadData:", error);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  useEffect(() => {
    loadData();
  }, []);

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

  const eliminarCancionDeLista = async () => {
    if (!selectedSong || !playlist?.Id) return;
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
      const resultText = await response.text();
      if (!response.ok) throw new Error("Error al eliminar la canción de la lista");
      Alert.alert("Éxito", "Canción eliminada de la lista");
      setSongOptionsVisible(false);
      loadData();
    } catch (error) {
      console.error("Error al eliminar canción:", error);
      Alert.alert("Error", error.message || "No se pudo eliminar la canción de la lista");
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  // Render unificado para cada canción en PlaylistDetails: se muestra la imagen a la izquierda,
  // el nombre de la canción a la derecha de la imagen y los íconos (like y opciones) al final, con el like pegado a la izquierda de los tres puntos.
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
          source={item.portada === "URL"
            ? require("../assets/default_song_portada.jpg")
            : { uri: item.portada }}
          style={styles.songImage}
        />
        <View style={styles.songTextContainer}>
          <Text style={styles.songTitle} numberOfLines={1}>{item.nombre}</Text>
        </View>
        <View style={styles.songIconsContainer}>
          <TouchableOpacity onPress={() => toggleFavorito(item.id)} style={styles.heartButton}>
            <Ionicons name="heart" size={22} color={favoritos.includes(item.id) ? "#f2ab55" : "#fff"} />
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

  const ListHeader = () => (
    <View style={styles.headerContent}>
      <Image
        source={playlist.Portada ? { uri: playlist.Portada } : require("../assets/default_playlist_portada.jpg")}
        style={styles.playlistImage}
      />
      <Text style={styles.playlistTitle}>{playlist.Nombre}</Text>
      <Text style={styles.playlistDescription}>{playlist.Descripcion}</Text>
      <View style={styles.controlsRow}>
        <TouchableOpacity style={[styles.shuffleButton, shuffle && styles.shuffleActive]} onPress={() => setShuffle(prev => !prev)}>
          <Ionicons name="shuffle" size={20} color={shuffle ? "#121111" : "#f2ab55"} />
          <Text style={[styles.shuffleButtonText, shuffle && styles.shuffleButtonTextActive]}>
            {shuffle ? "Aleatorio activado" : "Aleatorio desactivado"}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.playButton} onPress={() => iniciarReproduccion()}>
          <Ionicons name="play" size={20} color="#121111" />
          <Text style={styles.playButtonText}>Reproducir</Text>
        </TouchableOpacity>
      </View>
      <Text style={styles.sectionTitle}>Canciones</Text>
      {songs.length === 0 && (
        <Text style={styles.noSongsText}>No hay canciones en la lista.</Text>
      )}
    </View>
  );

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
          data={songs}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderSong}
          onDragEnd={({ data }) => {
            setSongs(data);
            guardarNuevoOrden(data);
          }}
          ListHeaderComponent={ListHeader}
          ListFooterComponent={esAutor ? (
            <TouchableOpacity style={styles.addButton} onPress={() => navigation.navigate("Search", { defaultFilter: "Canción" })}>
              <Text style={styles.addButtonText}>+ Añadir canciones</Text>
            </TouchableOpacity>
          ) : null}
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

        {songOptionsVisible && (
          <View style={styles.songOptionsOverlay}>
            <View style={styles.songOptionsContainer}>
              <TouchableOpacity style={styles.closeSongOptionsButton} onPress={() => setSongOptionsVisible(false)}>
                <Ionicons name="close" size={24} color="#000" />
              </TouchableOpacity>
              <Text style={styles.songOptionsTitle}>Opciones para la canción</Text>
              <TouchableOpacity style={styles.modalOption} onPress={eliminarCancionDeLista}>
                <Text style={styles.modalOptionText}>Eliminar de la lista</Text>
              </TouchableOpacity>
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
                </>
              ) : (
                <Text style={styles.infoText}>Cargando información...</Text>
              )}
              {esAutor && (
                <>
                  <TouchableOpacity style={styles.editButton} onPress={() => {}}>
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
  // Estilos unificados para el item de canción en PlaylistDetails:
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
  // Fin de estilos unificados para los items de canción.
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
});
