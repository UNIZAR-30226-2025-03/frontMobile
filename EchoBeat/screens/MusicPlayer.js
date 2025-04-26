/**
 * @file MusicPlayer.js
 * @description Pantalla de reproducción de música.
 */
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

/**
 * Pantalla de reproducción de música que:
 * - Recibe streaming de audio por WebSocket.
 * - Permite play/pause, avanzar, retroceder y loop.
 * - Envía actualizaciones de progreso al servidor.
 * - Gestiona favoritos y añadidos a playlists.
 *
 * @param {object} navigation - Prop de navegación de React Navigation.
 * @param {object} route - Prop de ruta de React Navigation, con params { songId, songName, userEmail }.
 */
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
  const [portadaSong, setPortadaSong] = useState(null);
  const [autoresSong, setAutoresSong] = useState([]);

  const audioChunksRef = useRef([]);
  const loopRef = useRef(loop);

  /**
   * Verifica si una cadena es base64 válida.
   * 
   * @param {string} str - Cadena a evaluar.
   * @returns {boolean} true si es base64, false en caso contrario.
   */
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
    loopRef.current = loop;
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
            await AsyncStorage.setItem('minuto', String(currentTimeSec));
          }
        } catch (error) {
          console.error("Error obteniendo el estado del sonido:", error);
        }
      }
    }, 1500);
  
    // Al desmontarse el componente se limpia el intervalo
    return () => clearInterval(progressInterval);
  }, [loop, sound, socket, isPlaying, userEmail, songId]);

  /**
   * Configura el callback para actualizar la posición y duración,
   * y maneja el evento 'didJustFinish' para loop o siguiente canción.
   * 
   * @param {Audio.Sound} soundInstance - Instancia de sonido de Expo Audio.
   * @returns {void}
   */
  const setupPlaybackStatusUpdate = (soundInstance) => {
    soundInstance.setOnPlaybackStatusUpdate(async (status) => {
      if (status.isLoaded) {
        setPosition(status.positionMillis);
        setDuration(status.durationMillis);
        if (status.didJustFinish) {
          console.log("el loop tambien esta activo:", loopRef.current);
          if (loopRef.current) {
            try {
              await soundInstance.setPositionAsync(0);
              await soundInstance.playAsync();
              console.log("🔁 Canción reiniciada en modo loop");
            } catch (error) {
              console.error("❌ Error al reiniciar la canción en loop:", error);
            }
          } else {
            siguienteCancion();
          }
        }
      }
    });
  };

  /**
   * Alterna el estado de favorito de la canción actual en la API.
   * 
   * @returns {void}
   */
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
  
  /**
   * Obtiene las playlists del usuario para mostrarlas en el modal.
   * 
   * @returns {void}
   */
  const fetchPlaylists = async () => {
    try {
      const res = await fetch(`https://echobeatapi.duckdns.org/playlists/user/${userEmail}`);
      const data = await res.json();
      setPlaylists(data);
    } catch (e) {
      console.error("❌ Error al obtener playlists:", e);
    }
  };
  
  /**
   * Añade la canción actual a una playlist seleccionada.
   * 
   * @param {string|number} playlistId - ID de la playlist.
   * @param {string|number} songId - ID de la canción.
   * @returns {void}
   */
  const addSongToPlaylist = async (playlistId, songId) => {
    try {
      const res = await fetch(`https://echobeatapi.duckdns.org/playlists/add-song/${playlistId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idLista: playlistId, songId }),
      });
      if (!res.ok) throw new Error("Error al añadir canción");
      Alert.alert("✅ Añadido", "Canción añadida a la playlist");
    } catch (err) {
      Alert.alert("Error", "Esta cancion ya se encuentra en la playlist seleccionada");
    } finally {
      setModalVisible(false);
    }
  };

  useEffect(() => {
    /**
     * Inicializa el reproductor de audio y la conexión WebSocket.
     * - Carga el estado de loop desde AsyncStorage.
     * - Verifica si la canción está en favoritos.
     * - Configura el socket para recibir audio.
     * - Carga la portada y autores de la canción.
     * 
     * @returns {void}
     */
    const initPlayer = async () => {
      const storedLoop = await AsyncStorage.getItem('loopMode');
      if (storedLoop !== null) {
        const parsed = JSON.parse(storedLoop);
        setLoop(parsed);
        loopRef.current = parsed;
      }
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
        console.log("Reproducion status? ", status.isPlaying);
        if(!status.isPlaying) {
          const minStr = await AsyncStorage.getItem('minuto');
          const min = parseInt(minStr);
          if(!isNaN(min)) {
            await globalSound.setPositionAsync(min * 1000);
            return;
          }
          return;
        }
        return;
      } else if (globalSound) {
        await globalSound.unloadAsync();
        globalSound = null;
      }

      /**
       * Configura el socket para recibir audio.
       * 
       * @param {string} userEmail 
       * @returns {void}
       */
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

            const playFlag = (await AsyncStorage.getItem('isPlaying')) === 'true';
            const minStr = await AsyncStorage.getItem('minuto');
            const min = parseInt(minStr);

            const { sound: newSound } = await Audio.Sound.createAsync(
              { uri: fileUri },
              { shouldPlay: playFlag }
            );

            console.log('▶️ Reproduciendo audio');
            newSound.currentSong = songName;
            setSound(newSound);
            setupPlaybackStatusUpdate(newSound);
            setIsPlaying(true);
            globalSound = newSound;

            if (!playFlag && !isNaN(min)) {
              await newSound.setPositionAsync(min * 1000);
            }

            if (songId && songName) {
              console.log("💾 Guardando en AsyncStorage:", { songId, songName });
              await AsyncStorage.setItem('lastSongId', String(songId));
              await AsyncStorage.setItem('lastSong', songName);
              await AsyncStorage.setItem('isPlaying', playFlag ? 'true' : 'false');
            } else {
              console.warn("❌ songId o songName undefined al intentar guardar");
            }
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
    infoCancion();
  }, [songId, songName]);

  /**
   * Obtiene información de la canción actual desde la API.
   * - Carga la portada y autores.
   * - Maneja errores de conexión y datos faltantes.
   * 
   * @returns {void}
   */
  const infoCancion = async () => {
    try {
      const response = await fetch(`https://echobeatapi.duckdns.org/playlists/song-details/${songId}`);
      const songData = await response.json();
      if (!songData.Portada || !songData.Autores) {
        console.warn("⚠️ Falta información de la canción");
        return;
      }
      setPortadaSong(songData.Portada);
      setAutoresSong(songData.Autores);
    } catch (error) {
      console.error("Error al obtener información de la canción:", error);
    }
  };

  /**
   * Avanza a la siguiente canción en la cola.
   * Si loop está activo, reinicia la misma canción.
   * 
   * @returns {void}
   */
  const siguienteCancion = async () => {
    if (loopRef.current && sound) {
      await sound.setPositionAsync(0);
      await sound.playAsync();
      return;
    }

    if (colaUnica) return;
    try {
      const email = userEmail || await AsyncStorage.getItem('email');
      const response = await fetch(`https://echobeatapi.duckdns.org/cola-reproduccion/siguiente-cancion?userEmail=${encodeURIComponent(email)}`);
      const data = await response.json();
      if (!response.ok) return;
      const res2 = await fetch(`https://echobeatapi.duckdns.org/playlists/song-details/${data.siguienteCancionId}`);
      await AsyncStorage.setItem('isPlaying', 'true');
      const songData = await res2.json();
      setPortadaSong(songData.Portada);
      setAutoresSong(songData.Autores);
      navigation.replace('MusicPlayer', {
        songId: data.siguienteCancionId,
        songName: songData.Nombre,
        userEmail: email,
      });
    } catch (err) {
      Alert.alert("Error", "No se pudo avanzar a la siguiente canción");
    }
  };

  /**
   * Retrocede a la canción anterior o reinicia la actual si el progreso > 20%.
   * 
   * @returns {void}
   */
  const anteriorCancion = async () => {
    if (loopRef.current && sound) {
      await sound.setPositionAsync(0);
      await sound.playAsync();
      return;
    }

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
      setPortadaSong(songData.Portada);
      setAutoresSong(songData.Autores);
      navigation.replace('MusicPlayer', {
        songId: data.cancionAnteriorId,
        songName: songData.Nombre,
        userEmail: email,
      });
    } catch (err) {
      Alert.alert("Error", "No se pudo volver a la canción anterior");
    }
  };

  /**
   * Alterna play/pause de la canción actual y guarda el estado.
   * 
   * @returns {void}
   */
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

  /**
   * Mueve la posición de reproducción al valor indicado.
   * 
   * @param {number} value - Tiempo en milisegundos al que hacer seek.
   * @returns {void}
   */
  const handleSeek = async (value) => {
    if (sound) {
      await sound.setPositionAsync(value);
    }
  };

  return (
    <View style={styles.container}>
      <Image source={portadaSong? {uri: portadaSong }: require('../assets/favorites.jpg')} style={styles.backgroundImage} />
  
      {/* Header con botón de volver */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerButton}>
          <Ionicons name="arrow-back" size={24} color="#f2ab55" />
        </TouchableOpacity>
      </View>
    
      <View style={styles.footer}>
        {portadaSong && (
          <Image
            source={{ uri: portadaSong }}
            style={styles.coverImage}
          />
        )}
        {/* Título y corazón */}
        <View style={styles.titleRow}>
          <Text style={styles.songTitle}>{currentSong}</Text>
          <TouchableOpacity onPress={toggleFavorito}>
            <Ionicons name="heart" size={30} color={isFavorita ? "#f2ab55" : "#fff"} />
          </TouchableOpacity>
        </View>
        {/* Nueva sección para mostrar el/los autor/es */}
        <View style={styles.authorRow}>
          <TouchableOpacity onPress={() => navigation.navigate('ArtistDetails', { artist: { nombre: autoresSong[0] }})}>
            <Text style={styles.authorText}>
              {autoresSong.length > 0 ? `${autoresSong.join(', ')}` : 'Unknown Artist'}
            </Text>
          </TouchableOpacity>
        </View>
    
        {/* Controles encima del slider */}
        <View style={styles.topControls}>
          {/* Loop */}
          <TouchableOpacity
          onPress={async () => {
            const newLoop = !loop;
            setLoop(newLoop);
            loopRef.current = newLoop;
            await AsyncStorage.setItem('loopMode', JSON.stringify(newLoop));
          }}
        >
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
              style={styles.playPauseButton} // Se mantiene el estilo original del botón play.
            />
          </TouchableOpacity>
    
          <TouchableOpacity onPress={siguienteCancion} disabled={colaUnica}>
            <Ionicons name="play-forward" size={40} color={colaUnica ? "#888" : "#f2ab55"} />
          </TouchableOpacity>
        </View>
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
                key={pl.id || pl.Id || `playlist-${index}`} 
                onPress={() => addSongToPlaylist(pl.id || pl.Id, songId)}
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
    backgroundColor: '#1e1e1e',
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  backgroundImage: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    opacity: 0.1,
  },
  footer: {
    position: 'absolute',
    bottom: 40,
    left: 0,
    right: 0,
    paddingVertical: 20,
    alignItems: 'center',
  },
  header: {
    position: 'absolute',
    top: 50,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerButton: {
    fontSize: 28,
    color: '#f2ab55',
  },
  coverImage: {
    width: 250,
    height: 250,
    borderRadius: 15,
    marginBottom: -90,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 120,
    width: '90%',
  },
  songTitle: {
    flex: 1,
    fontSize: 26,
    color: '#fff',
    fontWeight: '700',
    textAlign: 'center',
  },
  authorRow: {
    marginTop: 10,
    marginBottom: 20,
    width: '90%',
  },
  authorText: {
    fontSize: 18,
    color: '#f2ab55',
    fontStyle: 'italic',
    textAlign: 'center',
  },
  slider: {
    width: '85%',
    height: 40,
    marginVertical: 20,
  },
  topControls: {
    flexDirection: 'row',
    width: '85%',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 10,
  },
  loopButton: {
    padding: 8,
  },
  addButton: {
    backgroundColor: '#f2ab55',
    borderRadius: 25,
    paddingVertical: 12,
    paddingHorizontal: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 8,
  },
  controls: {
    flexDirection: 'row',
    width: '100%',
    justifyContent: 'space-evenly',
    alignItems: 'center',
    marginTop: 15,
    marginBottom: 20,
    paddingHorizontal: 20,
  },
  playPauseButton: {
    width: 70,
    height: 70,
    resizeMode: 'contain',
    borderRadius: 35,
    tintColor: '#f2ab55',
    padding: 10,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '80%',
    backgroundColor: '#2e2e2e',
    borderRadius: 15,
    padding: 25,
  },
  modalTitle: {
    fontSize: 22,
    color: '#f2ab55',
    textAlign: 'center',
    marginBottom: 20,
  },
  playlistOption: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#444',
  },
  playlistOptionText: {
    color: '#f2ab55',
    fontSize: 18,
  },
  cancelText: {
    color: '#aaa',
    textAlign: 'right',
    marginTop: 15,
    fontSize: 16,
  },
});
