import React, { useEffect, useState, useLayoutEffect, useCallback, useRef } from 'react';
import { View, Text, Image, StyleSheet, FlatList, Animated, Easing, TouchableOpacity, ActivityIndicator, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from "@react-navigation/native";


const screenWidth = Dimensions.get('window').width;

export default function ProfileAmistades({ route, navigation }) {
  const { userEmail } = route.params; // Este email es el del usuario (amigo) cuyo perfil se está viendo
  const [userData, setUserData] = useState(null);
  // Estado para el email del usuario autenticado (logged-in)
  const [loggedEmail, setLoggedEmail] = useState(null);
  const [cancionSonando, setCancionSonando] = useState(false);
  const [estaReproduciendo, setEstaReproduciendo] = useState(false);
  const rotation = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Obtener el email del usuario autenticado desde AsyncStorage
    const fetchLoggedEmail = async () => {
      try {
        const email = await AsyncStorage.getItem('email');
        if (email) {
          setLoggedEmail(email);
        }
      } catch (error) {
        console.error("Error al obtener el email autenticado:", error);
      }
    };
    fetchLoggedEmail();
    checkSongPlaying();
  }, []);

  useEffect(() => {
    fetch(`https://echobeatapi.duckdns.org/users/profile-with-playlists?userEmail=${encodeURIComponent(userEmail)}`)
      .then(res => res.json())
      .then(data => setUserData(data))
      .catch(err => console.error("Error cargando perfil:", err));
  }, [userEmail]);

    useFocusEffect(
      useCallback(() => {
        checkSongPlaying();
      }, [])
    );

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
  
    const stopRotation = () => {
      rotation.stopAnimation(() => {
        rotation.setValue(0);
      });
    };
  
    const spin = rotation.interpolate({
      inputRange: [0, 1],
      outputRange: ['0deg', '360deg'],
    });
  
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

  useLayoutEffect(() => {
    navigation.setOptions({ headerShown: false });
  }, [navigation]);

  if (!userData) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#f2ab55" />
        <Text style={styles.loadingText}>Cargando perfil...</Text>
      </View>
    );
  }

  // Se crea un objeto chat con la información necesaria para abrir la conversación.
  const chat = {
    contact: userEmail,      // El email del amigo
    foto: userData.LinkFoto, // La foto del perfil del amigo
    mensaje: ""              // Inicialmente en blanco
  };

  return (
    <View style={styles.container}>
      {/* Back button */}
      <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
        <Ionicons name="arrow-back" size={28} color="#f2ab55" />
      </TouchableOpacity>

      {/* Icono para abrir chat (posición superior derecha) */}
      {loggedEmail && (
        <TouchableOpacity 
          style={styles.chatIcon}
          onPress={() => navigation.navigate('ChatScreen', { chat, userEmail: loggedEmail })}
        >
          <Ionicons name="chatbubble-ellipses-outline" size={20} color="#f2ab55" />
        </TouchableOpacity>
      )}

      <View style={styles.profileContainer}>
        <Image
          source={userData.LinkFoto
            ? { uri: userData.LinkFoto }
            : require('../assets/logo.png')
          }
          style={styles.profileImage}
        />
        <Text style={styles.nick}>{userData.Nick}</Text>
      </View>

      <Text style={styles.sectionTitle}>Playlists visibles</Text>

      {userData.Playlists.length === 0 ? (
        <Text style={styles.emptyText}>Este usuario no tiene playlists públicas.</Text>
      ) : (
        <FlatList
          data={userData.Playlists}
          keyExtractor={item => item.Id.toString()}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 30 }}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.playlistItem}
              activeOpacity={0.8}
              onPress={() => navigation.navigate('PlaylistDetails', { playlist: item })}
            >
              <Image
                source={item.Portada
                  ? { uri: item.Portada }
                  : require('../assets/default_playlist_portada.jpg')}
                style={styles.playlistImage}
              />     
              <View style={styles.playlistInfo}>
                <Text style={styles.playlistName}>{item.Nombre}</Text>
              </View>
              <Ionicons name="chevron-forward" size={22} color="#f2ab55" />
            </TouchableOpacity>
          )}
        />
      )}
      {cancionSonando && (
                <TouchableOpacity onPress={handleOpenMusicPlayer} style={styles.playerButton}>
                  <Animated.Image
                    source={require('../assets/disc.png')}
                    style={[styles.playerIcon, { transform: [{ rotate: spin }] }]} 
                  />
                </TouchableOpacity>
              )}         
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121111',
    paddingHorizontal: 20,
    paddingTop: 50,
  },
  backButton: {
    marginBottom: 20,
  },
  chatIcon: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 10,
  },
  profileContainer: {
    alignItems: 'center',
    marginBottom: 30,
  },
  profileImage: {
    width: 130,
    height: 130,
    borderRadius: 65,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: '#f2ab55',
    backgroundColor: '#333',
  },
  nick: {
    color: '#f2ab55',
    fontSize: 26,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  sectionTitle: {
    fontSize: 20,
    color: '#f2ab55',
    marginBottom: 16,
    fontWeight: 'bold',
    alignSelf: 'center',
  },
  emptyText: {
    color: '#aaa',
    textAlign: 'center',
    fontSize: 15,
    marginTop: 20,
  },
  playlistItem: {
    backgroundColor: '#1e1e1e',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  playlistImage: {
    width: 60,
    height: 60,
    borderRadius: 10,
    marginRight: 12,
    backgroundColor: '#444',
  },
  playlistInfo: {
    flex: 1,
  },
  playlistName: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#121111',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#ccc',
    marginTop: 10,
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
