import React, { useState, useEffect, useRef, useLayoutEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image, Alert } from 'react-native';
import { Audio } from 'expo-av';
import Slider from '@react-native-community/slider';
import { io } from 'socket.io-client';
import * as FileSystem from 'expo-file-system';
import { Ionicons } from '@expo/vector-icons';
import { decode, encode } from 'base64-arraybuffer';
import AsyncStorage from '@react-native-async-storage/async-storage';

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

  const setupPlaybackStatusUpdate = (soundInstance) => {
    soundInstance.setOnPlaybackStatusUpdate((status) => {
      if (status.isLoaded) {
        setPosition(status.positionMillis);
        setDuration(status.durationMillis);
        if (status.didJustFinish) {
          console.log("🔁 Canción terminada");
          siguienteCancion();
        }
      }
    });
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
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerButton}>
          <Ionicons name="arrow-back" size={24} color="#f2ab55" />
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
    thumbTintColor: '#f2ab55',
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
