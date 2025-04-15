import React, { useState, useLayoutEffect, useEffect, useCallback } from "react";
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
  Keyboard,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";

const { width } = Dimensions.get("window");

export default function AlbumDetails({ navigation, route }) {
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

  useLayoutEffect(() => {
    navigation.setOptions({ headerShown: false });
  }, [navigation]);

  const loadData = async () => {
    try {
      const email = await AsyncStorage.getItem("email");
      if (!email) return;
      setUserEmail(email);
      const [cancionesData, playlistData, favoritosData] = await Promise.all([
        fetch(`https://echobeatapi.duckdns.org/playlists/${playlist.Id}/songs`).then((res) => res.json()),
        fetch(`https://echobeatapi.duckdns.org/playlists/playlist/${playlist.Id}`).then((res) => res.json()),
        fetch(`https://echobeatapi.duckdns.org/cancion/favorites?email=${encodeURIComponent(email)}`).then((res) => res.json()),
      ]);
      setCola(cancionesData);
      setSongs(cancionesData.canciones || []);
      setPlaylistInfo(playlistData);
      setFavoritos((favoritosData.canciones || []).map((c) => c.id));
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

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  // Render unificado para cada canción: imagen a la izquierda, título a la derecha y
  // en el extremo derecho (en un contenedor) se ubican el ícono de like y el de opciones.
  const renderSong = ({ item }) => {
    const esFavorita = favoritos.includes(item.id);
    return (
      <View style={styles.songItem}>
        <Image
          source={{ uri: item.portada || item.Portada }}
          style={styles.songImage}
        />
        <View style={styles.songTextContainer}>
          <Text style={styles.songTitle} numberOfLines={1}>
            {item.nombre}
          </Text>
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
      </View>
    );
  };

  const iniciarReproduccion = async () => {
    try {
      const body = {
        userEmail: userEmail,
        reproduccionAleatoria: shuffle,
        colaReproduccion: cola,
      };
      const response = await fetch("https://echobeatapi.duckdns.org/cola-reproduccion/play-list", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const result = await response.json();
      if (!response.ok) {
        Alert.alert("Error", result.message || "No se pudo iniciar la reproducción");
        return;
      }
      if (songs.length > 0) {
        navigation.navigate("MusicPlayer", {
          songId: songs[0].id,
          songName: songs[0].nombre,
          userEmail: userEmail,
        });
      }
    } catch (error) {
      Alert.alert("Error", "Error inesperado al iniciar la reproducción");
    }
  };

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

  const ListHeader = () => (
    <View style={styles.headerContent}>
      <Image
        source={{ uri: playlist.Portada }}
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
            {playlistInfo ? (
              <>
                <Text style={styles.infoText}>Privacidad: {playlistInfo.TipoPrivacidad}</Text>
                <Text style={styles.infoText}>Género: {playlistInfo.Genero}</Text>
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
});
