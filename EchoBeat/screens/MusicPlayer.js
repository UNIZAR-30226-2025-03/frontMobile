import React, { useState, useEffect, useRef, useLayoutEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image, Alert } from 'react-native';
import { Audio } from 'expo-av';
import Slider from '@react-native-community/slider';
import { io } from 'socket.io-client';
import * as FileSystem from 'expo-file-system';
import { decode, encode } from 'base64-arraybuffer';

// Variables globales para conservar el sonido y el socket
let globalSound = null;
let globalSocket = null;

export default function MusicPlayer({ navigation, route }) {
  // Recibimos el nombre de la canción seleccionada desde la pantalla de lista
  const { songName } = route.params || {};
  const [sound, setSound] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(1);
  const [currentSong, setCurrentSong] = useState(songName || '');
  const [socket, setSocket] = useState(null);
  
  
  const audioChunksRef = useRef([]);

  const isBase64 = (str) => {
    const regex = /^[A-Za-z0-9+/]+={0,2}$/;
    return regex.test(str);
  };

  // Configurar el audio para background
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

  useLayoutEffect(() => {
    navigation.setOptions({ headerShown: false });
  }, [navigation]);

  // Configuración del slider en base al estado del audio
  const setupPlaybackStatusUpdate = (soundInstance) => {
    soundInstance.setOnPlaybackStatusUpdate((status) => {
      if (status.isLoaded) {
        setPosition(status.positionMillis);
        setDuration(status.durationMillis);
      }
    });
  };

  useEffect(() => {
    const initPlayer = async () => {
      // Si ya existe un sonido global, comprobamos si es la misma canción
      if (globalSound) {
        if (globalSound.currentSong === songName) {
          // Si es la misma, reutilizamos la instancia
          setSound(globalSound);
          if (globalSocket) setSocket(globalSocket);
          setupPlaybackStatusUpdate(globalSound);
          const status = await globalSound.getStatusAsync();
          setIsPlaying(status.isPlaying);
          return;
        } else {
          // Si es una canción distinta, liberamos la instancia actual
          await globalSound.unloadAsync();
          globalSound = null;
        }
      }

      const setupSocket = () => {
        const newSocket = io(`https://echobeatapi.duckdns.org`, {
          transports: ['websocket'],
        });

        newSocket.on('connect', () => {
          console.log('Conectado al servidor WebSocket');
          // Emitir startStream con el nombre de la canción seleccionada
          newSocket.emit('startStream', { songName: songName });
        });

        newSocket.on('audioChunk', (data) => {
          console.log(`📦 Chunk recibido #${audioChunksRef.current.length + 1}`);
          let chunkBase64 = data.data.trim();
          if (!isBase64(chunkBase64)) {
            console.error("🚨 Error: Chunk no es Base64 válido");
            return;
          }
          audioChunksRef.current.push(chunkBase64);
        });

        newSocket.on('streamComplete', async () => {
          console.log(`📥 Total de chunks recibidos: ${audioChunksRef.current.length}`);
          try {
            const arrays = audioChunksRef.current.map(chunk => new Uint8Array(decode(chunk)));
            const totalLength = arrays.reduce((acc, arr) => acc + arr.length, 0);
            const combined = new Uint8Array(totalLength);
            let offset = 0;
            arrays.forEach(arr => {
              combined.set(arr, offset);
              offset += arr.length;
            });
            const base64Combined = encode(combined.buffer);
            const fileUri = FileSystem.cacheDirectory + 'audio.mp3';
            await FileSystem.writeAsStringAsync(fileUri, base64Combined, {
              encoding: FileSystem.EncodingType.Base64,
            });
            console.log('🎵 Archivo guardado en:', fileUri);
            const { sound: newSound } = await Audio.Sound.createAsync(
              { uri: fileUri },
              { shouldPlay: true }
            );
            // Guardamos el nombre de la canción en la instancia del sonido
            newSound.currentSong = songName;
            setSound(newSound);
            setupPlaybackStatusUpdate(newSound);
            setIsPlaying(true);
            setCurrentSong(songName);
            globalSound = newSound; // Guardamos el sonido globalmente
          } catch (error) {
            console.error("🚨 Error al procesar el audio:", error);
            Alert.alert("Error", "No se pudo procesar el audio");
          } finally {
            audioChunksRef.current = [];
          }
        });

        newSocket.on('error', (error) => {
          Alert.alert('Error', error.message || 'Error de conexión');
        });

        setSocket(newSocket);
        globalSocket = newSocket;
      };

      setupSocket();
    };

    initPlayer();

    // No desconectamos globalSound ni globalSocket para mantener la reproducción en background
    return () => {
      // Se deja la instancia para futuras visitas
    };
  }, [songName]);

  const togglePlayPause = async () => {
    if (sound) {
      if (isPlaying) {
        await sound.pauseAsync();
        setIsPlaying(false);
      } else {
        await sound.playAsync();
        setIsPlaying(true);
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
      <Image source={require('../assets/mujerona.jpg')} style={styles.backgroundImage} />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.headerButton}>←</Text>
        </TouchableOpacity>
      </View>
      <Text style={styles.songTitle}>{currentSong}</Text>
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
      <View style={styles.controls}>
        {sound ? (
          <TouchableOpacity onPress={togglePlayPause}>
            <Image
              source={isPlaying 
                ? require('../assets/pause.png') 
                : require('../assets/play.png')}
              style={styles.playPauseButton}
            />
          </TouchableOpacity>
        ) : (
          <View style={styles.disabledButton}>
            <Text style={styles.disabledText}>...</Text>
          </View>
        )}
      </View>
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
    marginTop: 170,
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: -70,
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
});
