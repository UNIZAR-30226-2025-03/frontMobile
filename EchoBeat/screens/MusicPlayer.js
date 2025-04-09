import React, { useState, useEffect, useRef, useLayoutEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image, Alert } from 'react-native';
import { Audio } from 'expo-av';
import Slider from '@react-native-community/slider';
import { io } from 'socket.io-client';
import * as FileSystem from 'expo-file-system';
import { Ionicons } from '@expo/vector-icons';
import { decode, encode } from 'base64-arraybuffer';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Modal } from 'react-native';

let globalSound = null;
let globalSocket = null;

export default function MusicPlayer({ navigation, route }) {
  const { songId, songName, userEmail: passedEmail } = route.params || {};
  const [sound, setSound] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(1);
  const [currentSong, setCurrentSong] = useState(songName || '');
  const [socket, setSocket] = useState(null);
  const [colaUnica, setColaUnica] = useState(false);
  const [userEmail, setUserEmail] = useState(passedEmail || '');
  const [favoritos, setFavoritos] = useState([]);
  const [isFavorita, setIsFavorita] = useState(false);
  const [loop, setLoop] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [playlists, setPlaylists] = useState([]);

  const audioChunksRef = useRef([]);

  const isBase64 = (str) => /^[A-Za-z0-9+/]+={0,2}$/.test(str);

  useLayoutEffect(() => {
    navigation.setOptions({ headerShown: false });
  }, [navigation]);

  useEffect(() => {
    Audio.setAudioModeAsync({
      allowsRecordingIOS: false,
      staysActiveInBackground: true,
      interruptionModeIOS: Audio.INTERRUPTION_MODE_IOS_DO_NOT_MIX,
      playsInSilentModeIOS: true,
      shouldDuckAndroid: false,
      interruptionModeAndroid: Audio.INTERRUPTION_MODE_ANDROID_DO_NOT_MIX,
      playThroughEarpieceAndroid: false,
    });
  }, []);

  useEffect(() => {
    // Creamos un intervalo de 2 segundos
    const progressInterval = setInterval(async () => {
      // Verificamos que existan el sonido y el socket y que se esté reproduciendo
      if (sound && socket && isPlaying) {
        try {
          const status = await sound.getStatusAsync();
          if (status.isLoaded && status.isPlaying) {
            const currentTimeSec = Math.floor(status.positionMillis / 1000);
            socket.emit('progressUpdate', {
              userId: userEmail,
              songId, // se usa la variable songId recibida como parámetro
              currentTime: currentTimeSec,
            });
            console.log(`Progreso enviado: ${currentTimeSec} segundos`);
          }
        } catch (error) {
          console.error("Error obteniendo el estado del sonido:", error);
        }
      }
    }, 2000);
  
    // Al desmontarse el componente se limpia el intervalo
    return () => clearInterval(progressInterval);
  }, [sound, socket, isPlaying, userEmail, songId]);


  const setupPlaybackStatusUpdate = (soundInstance) => {
    soundInstance.setOnPlaybackStatusUpdate((status) => {
      if (status.isLoaded) {
        setPosition(status.positionMillis);
        setDuration(status.durationMillis);
        if (status.didJustFinish) {
          if (loop) {
            soundInstance.setPositionAsync(0);
            soundInstance.playAsync();
          } else {
            siguienteCancion();
          }
        }
      }
    });
  };

  const toggleFavorito = async () => {
    if (!userEmail) return;
    const endpoint = isFavorita ? 'unlike' : 'like';
    const method = isFavorita ? 'DELETE' : 'POST';
  
    try {
      const res = await fetch(`https://echobeatapi.duckdns.org/cancion/${endpoint}/${encodeURIComponent(userEmail)}/${songId}`, {
        method,
      });
      if (!res.ok) throw new Error("Error al cambiar favorito");
      setIsFavorita(!isFavorita);
    } catch (err) {
      Alert.alert("Error", "No se pudo actualizar favorito");
    }
  };
  
  const fetchPlaylists = async () => {
    try {
      const res = await fetch(`https://echobeatapi.duckdns.org/playlists/user/${userEmail}`);
      const data = await res.json();
      setPlaylists(data);
    } catch (e) {
      console.error("❌ Error al obtener playlists:", e);
    }
  };
  
  const addSongToPlaylist = async (playlistId) => {
    try {
      const res = await fetch(`https://echobeatapi.duckdns.org/playlists/add-song/${playlistId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idLista: playlistId, songId }),
      });
      if (!res.ok) throw new Error("Error al añadir canción");
      Alert.alert("✅ Añadido", "Canción añadida a la playlist");
    } catch (err) {
      Alert.alert("Error", "No se pudo añadir a la playlist");
    } finally {
      setModalVisible(false);
    }
  };
  

  useEffect(() => {
    const initPlayer = async () => {
      const email = passedEmail || await AsyncStorage.getItem('email');
      if (!email) {
        console.warn("❌ No se pudo obtener el email del usuario");
        Alert.alert("Error", "No se pudo obtener el email del usuario.");
        return;
      }
      setUserEmail(email);
      // Verificar si la canción está en favoritos
      try {
        const favRes = await fetch(`https://echobeatapi.duckdns.org/cancion/favorites?email=${encodeURIComponent(email)}`);
        const favData = await favRes.json();
        const ids = (favData.canciones || []).map(c => c.id);
        setFavoritos(ids);
        setIsFavorita(ids.includes(songId));
      } catch (err) {
        console.warn("⚠️ No se pudieron obtener favoritos:", err);
      }


      try {
        const response = await fetch(`https://echobeatapi.duckdns.org/cola-reproduccion/cola?userEmail=${encodeURIComponent(email)}`);
        const data = await response.json();
        setColaUnica(Array.isArray(data.cola) && data.cola.length === 1);
      } catch (err) {
        console.warn("❌ Error al verificar cola:", err);
      }

      if (globalSound && globalSound.currentSong === songName) {
        setSound(globalSound);
        setupPlaybackStatusUpdate(globalSound);
        const status = await globalSound.getStatusAsync();
        setIsPlaying(status.isPlaying);
        return;
      } else if (globalSound) {
        await globalSound.unloadAsync();
        globalSound = null;
      }

      const setupSocket = (userEmail) => {
        const newSocket = io(`https://echobeatapi.duckdns.org`, { transports: ['websocket'] });

        newSocket.on('connect', () => {
          console.log('✅ WebSocket conectado');
          console.log('📤 startStream ->', { songId, userId: userEmail, currentTime: duration });
          newSocket.emit('startStream', { songId, userId: email, currentTime: duration });
        });

        newSocket.on('audioChunk', (data) => {
          const chunkBase64 = data.data.trim();
          if (!isBase64(chunkBase64)) {
            console.warn('⚠️ Chunk no válido');
            return;
          }
          audioChunksRef.current.push(chunkBase64);
        });

        newSocket.on('streamComplete', async () => {
          console.log('✅ Stream completo. Procesando...');
          try {
            const arrays = audioChunksRef.current.map(chunk => new Uint8Array(decode(chunk)));
            const totalLength = arrays.reduce((acc, arr) => acc + arr.length, 0);
            const combined = new Uint8Array(totalLength);
            arrays.reduce((offset, arr) => {
              combined.set(arr, offset);
              return offset + arr.length;
            }, 0);

            const base64Combined = encode(combined.buffer);
            const fileUri = FileSystem.cacheDirectory + 'audio.mp3';
            await FileSystem.writeAsStringAsync(fileUri, base64Combined, {
              encoding: FileSystem.EncodingType.Base64,
            });

            const { sound: newSound } = await Audio.Sound.createAsync(
              { uri: fileUri },
              { shouldPlay: true }
            );

            console.log('▶️ Reproduciendo audio');
            newSound.currentSong = songName;
            setSound(newSound);
            setupPlaybackStatusUpdate(newSound);
            setIsPlaying(true);
            globalSound = newSound;
            await AsyncStorage.setItem('lastSong', songName);
            await AsyncStorage.setItem('isPlaying', 'true');
          } catch (error) {
            console.error("❌ Error procesando audio:", error);
            Alert.alert("Error", "No se pudo procesar el audio");
          } finally {
            audioChunksRef.current = [];
          }
        });

        newSocket.on('error', (err) => {
          console.error('❗ WebSocket Error:', err);
          Alert.alert("Error", err.message || "Error de conexión");
        });

        setSocket(newSocket);
        globalSocket = newSocket;
      };

      setupSocket(email);
    };

    initPlayer();
  }, [songId, songName]);

  const siguienteCancion = async () => {
    if (colaUnica) return;
    try {
      const email = userEmail || await AsyncStorage.getItem('email');
      const response = await fetch(`https://echobeatapi.duckdns.org/cola-reproduccion/siguiente-cancion?userEmail=${encodeURIComponent(email)}`);
      const data = await response.json();
      if (!response.ok) return;
      const res2 = await fetch(`https://echobeatapi.duckdns.org/playlists/song-details/${data.siguienteCancionId}`);
      const songData = await res2.json();
      navigation.replace('MusicPlayer', {
        songId: data.siguienteCancionId,
        songName: songData.Nombre,
        userEmail: email,
      });
    } catch (err) {
      Alert.alert("Error", "No se pudo avanzar a la siguiente canción");
    }
  };

  const anteriorCancion = async () => {
    try {
      if (position > duration * 0.2 && sound) {
        await sound.setPositionAsync(0);
        if (!isPlaying) {
          await sound.playAsync();
          setIsPlaying(true);
        }
        return;
      }

      const email = userEmail || await AsyncStorage.getItem('email');
      const response = await fetch(`https://echobeatapi.duckdns.org/cola-reproduccion/anterior?userEmail=${encodeURIComponent(email)}`);
      const data = await response.json();
      const res2 = await fetch(`https://echobeatapi.duckdns.org/playlists/song-details/${data.cancionAnteriorId}`);
      const songData = await res2.json();
      navigation.replace('MusicPlayer', {
        songId: data.cancionAnteriorId,
        songName: songData.Nombre,
        userEmail: email,
      });
    } catch (err) {
      Alert.alert("Error", "No se pudo volver a la canción anterior");
    }
  };

  const togglePlayPause = async () => {
    if (sound) {
      if (isPlaying) {
        await sound.pauseAsync();
        setIsPlaying(false);
        await AsyncStorage.setItem('isPlaying', 'false');
      } else {
        await sound.playAsync();
        setIsPlaying(true);
        await AsyncStorage.setItem('isPlaying', 'true');
      }
    }
  };

  const handleSeek = async (value) => {
    if (sound) {
      await sound.setPositionAsync(value);
    }
  };

  return (
    <View style={styles.container}>
      <Image source={require('../assets/favorites.jpg')} style={styles.backgroundImage} />
  
      {/* Header con botón de volver */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerButton}>
          <Ionicons name="arrow-back" size={24} color="#f2ab55" />
        </TouchableOpacity>
      </View>
  
      {/* Título y corazón */}
      <View style={styles.titleRow}>
        <Text style={styles.songTitle}>{currentSong}</Text>
        <TouchableOpacity onPress={toggleFavorito}>
          <Ionicons name="heart" size={30} color={isFavorita ? "#f2ab55" : "#fff"} />
        </TouchableOpacity>
      </View>
  
      {/* Controles encima del slider */}
      <View style={styles.topControls}>
        {/* Loop */}
        <TouchableOpacity onPress={() => setLoop(prev => !prev)}>
          <Ionicons name="repeat" size={28} color={loop ? "#f2ab55" : "#fff"} />
        </TouchableOpacity>
  
        {/* Botón añadir a playlist */}
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => {
            fetchPlaylists();
            setModalVisible(true);
          }}
        >
          <Ionicons name="add" size={24} color="#121111" />
        </TouchableOpacity>
      </View>
  
      {/* Slider */}
      <Slider
        style={styles.slider}
        minimumValue={0}
        maximumValue={duration}
        value={position}
        onSlidingComplete={handleSeek}
        minimumTrackTintColor="#f2ab55"
        maximumTrackTintColor="#ffffff"
        thumbTintColor="#f2ab55"
      />
  
      {/* Controles */}
      <View style={styles.controls}>
        <TouchableOpacity onPress={anteriorCancion}>
          <Ionicons name="play-back" size={40} color="#f2ab55" />
        </TouchableOpacity>
  
        <TouchableOpacity onPress={togglePlayPause}>
          <Image
            source={isPlaying ? require('../assets/pause.png') : require('../assets/play.png')}
            style={styles.playPauseButton}
          />
        </TouchableOpacity>
  
        <TouchableOpacity onPress={siguienteCancion} disabled={colaUnica}>
          <Ionicons name="play-forward" size={40} color={colaUnica ? "#888" : "#f2ab55"} />
        </TouchableOpacity>
      </View>
  
      {/* Modal para seleccionar playlist */}
        <Modal
          animationType="fade"
          transparent={true}
          visible={modalVisible}
          onRequestClose={() => setModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Añadir a Playlist</Text>
              {playlists.map(pl => (
                <TouchableOpacity
                  key={pl.id}
                  onPress={() => addSongToPlaylist(pl.id)}
                  style={styles.playlistOption}
                >
                  <Text style={styles.playlistOptionText}>{pl.nombre || pl.Nombre}</Text>
                </TouchableOpacity>
              ))}
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Text style={styles.cancelText}>Cancelar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

      </View>
    );
} 

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#121111',
  },
  backgroundImage: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    opacity: 0.15,
  },
  header: {
    position: 'absolute',
    top: 50,
    width: '100%',
    paddingHorizontal: 20,
  },
  headerButton: {
    fontSize: 24,
    color: '#ffffff',
  },
  songTitle: {
    fontSize: 24,
    color: '#ffffff',
    fontWeight: 'bold',
    marginBottom: 20,
  },
  slider: {
    width: '80%',
    marginBottom: 20,
    marginTop: 250,
    thumbTintColor: '#f2ab55',
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: -380,
  },
  playPauseButton: {
    width: 60,
    height: 60,
    tintColor: '#f2ab55',
    marginHorizontal: 30,
  },
  disabledButton: {
    width: 60,
    height: 60,
    marginHorizontal: 30,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(242,171,85,0.5)',
    borderRadius: 30,
  },
  disabledText: {
    color: '#ffffff',
    fontSize: 24,
    fontWeight: 'bold',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: -100,
  },
  
  topControls: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '60%',
    marginBottom: 10,
    marginTop: -150, // para que quede encima del slider
    zIndex: 1,
    position: 'relative',
  },
  
  loopButton: {
    padding: 8,
  },
  
  addButton: {
    backgroundColor: '#f2ab55',
    borderRadius: 20,
    padding: 10,
  },
  
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 999,
  },
  
  modalContent: {
    width: '80%',
    backgroundColor: '#333',
    borderRadius: 10,
    padding: 20,
  },
  
  playlistOption: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#444',
  },
  
  playlistOptionText: {
    color: '#f2ab55',
    fontSize: 16,
  },
  
  cancelText: {
    color: '#aaa',
    textAlign: 'right',
    marginTop: 10,
  },
  
});
