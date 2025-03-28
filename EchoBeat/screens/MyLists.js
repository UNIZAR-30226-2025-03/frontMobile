import React, { useState, useEffect, useLayoutEffect } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, Image, FlatList, ActivityIndicator } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';

export default function MyLists({ navigation }) {
  const [playlists, setPlaylists] = useState([]);
  const [loading, setLoading] = useState(true);

  useLayoutEffect(() => {
    navigation.setOptions({ headerShown: false });
  }, [navigation]);

  useEffect(() => {
    obtenerPlaylists();
  }, []);

  const obtenerPlaylists = async () => {
    try {
      const email = await AsyncStorage.getItem("email");
      if (!email) {
        setLoading(false);
        return;
      }

      // Llamada a la API para obtener las playlists del usuario
      const response = await fetch(`https://echobeatapi.duckdns.org/playlists/user/${email}`);
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || "Error al obtener las playlists");
      }

      let userPlaylists = data.playlists ? data.playlists : data; // Manejar si es array u objeto

      console.log("Playlists:", userPlaylists);
      // Agregar la playlist "Favoritos" como primera lista
      const favoritosPlaylist = {
        Nombre: "Favoritos",
        Portada: "favoritos",
        esFavoritos: true,
      };

      //setPlaylists([favoritosPlaylist, ...userPlaylists]);
      setPlaylists(userPlaylists);
    } catch (error) {
      console.error("Error al obtener playlists:", error);
    } finally {
      setLoading(false);
    }
  };

  const renderPlaylist = ({ item }) => {
    const normalizedPlaylist = {
      Id: item.id || item.Id,
      Nombre: item.nombre || item.Nombre || item.lista?.Nombre || 'Sin nombre',
      Portada: item.lista?.Portada || item.Portada || '',
      Descripcion: item.descripcion || item.Descripcion || '',
    };
  
    return (
      <TouchableOpacity
        style={styles.playlistItem}
        onPress={() => {
          console.log('📀 Playlist enviada desde MyLists:', normalizedPlaylist);
          navigation.navigate("PlaylistDetails", { playlist: normalizedPlaylist });
        }}
      >
        <Image
          source={
            normalizedPlaylist.Portada
              ? { uri: normalizedPlaylist.Portada }
              : require('../assets/default_playlist_portada.jpg')
          }
          style={styles.playlistImage}
        />
        <Text style={styles.playlistTitle} numberOfLines={1}>
          {normalizedPlaylist.Nombre}
        </Text>
      </TouchableOpacity>
    );
  };
  

  return (
    <SafeAreaView style={styles.container}>
      {/* Header con flecha de retroceso y título */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.replace("HomeScreen")} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#f2ab55" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Mis Listas</Text>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#f2ab55" style={{ marginTop: 20 }} />
      ) : playlists.length === 0 ? (
        <View style={styles.emptyMessageContainer}>
          <Text style={styles.emptyMessageText}>
            No has creado ninguna playlist aún {'\n'} ¡Créala presionando el botón '+' de abajo!
          </Text>
        </View>
      ) : (
        <FlatList 
          data={playlists}
          renderItem={renderPlaylist}
          keyExtractor={(item, index) => index.toString()}
          contentContainerStyle={styles.listContent}
        />
      )}

      {/* Botón de "+" en la esquina inferior izquierda */}
      <TouchableOpacity 
        style={styles.addButton}
        onPress={() => navigation.navigate("CrearPlaylist")}
      >
        <Ionicons name="add" size={30} color="#fff" />
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121111',
    marginTop: 30,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 25,
    paddingVertical: 10,
    paddingTop: 30,
  },
  backButton: { },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#f2ab55',
  },
  emptyMessageContainer: {
    marginTop: 30,
    alignItems: 'center',
    height: '80%',
    justifyContent: 'center',
  },
  emptyMessageText: {
    fontSize: 24,
    color: '#fff',
    textAlign: 'center',
    marginTop: 10,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 80, // espacio para el botón flotante
  },
  playlistItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  playlistImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
    marginRight: 10,
  },
  playlistTitle: {
    fontSize: 18,
    color: '#fff',
  },
  addButton: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    backgroundColor: '#ffb723',
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
