import React, { useState, useEffect, useRef, useLayoutEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image, Alert } from 'react-native';
import { Audio } from 'expo-av';
import Slider from '@react-native-community/slider';
import { io } from 'socket.io-client';
import * as FileSystem from 'expo-file-system';

export default function MusicPlayer({ navigation }) {
  const [sound, setSound] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(1);
  const [currentSong, setCurrentSong] = useState('');
  const [socket, setSocket] = useState(null);
  
  const audioChunksRef = useRef([]);
  const currentSongRef = useRef('');

  const saveAudioToFile = async (base64) => {
    try {
      const fileUri = FileSystem.cacheDirectory + 'audio.mp3';
  
      // Escribir el archivo en caché
      await FileSystem.writeAsStringAsync(fileUri, base64, {
        encoding: FileSystem.EncodingType.Base64,
      });
  
      // Verificar si el archivo fue creado correctamente
      const fileInfo = await FileSystem.getInfoAsync(fileUri);
      if (!fileInfo.exists) {
        throw new Error('El archivo de audio no se guardó correctamente.');
      }
  
      console.log(`✅ Archivo guardado en: ${fileUri}`);
      return fileUri;
    } catch (error) {
      console.error('🚨 Error guardando archivo de audio:', error);
      return null;
    }
  };

  useLayoutEffect(() => {
        navigation.setOptions({
          headerShown: false,
        });
      }, [navigation]);

  useEffect(() => {
    const setupSocket = () => {
      const newSocket = io(`https://echobeatapi.duckdns.org`, {
        transports: ['websocket'],
      });

      newSocket.on('connect', () => {
        console.log('Conectado al servidor WebSocket');
      });

      newSocket.on('audioChunk', (data) => {
        console.log(`📦 Chunk recibido #${audioChunksRef.current.length + 1}, Tamaño: ${data.data.length} bytes`);
      
        if (currentSongRef.current !== data.filename) {
          console.log(`🎶 Nueva canción detectada: ${data.filename}`);
          audioChunksRef.current = []; // Reiniciar chunks al cambiar de canción
          currentSongRef.current = data.filename;
          setCurrentSong(data.filename);
        }
      
        // 🔴 Evitar duplicaciones verificando si el chunk ya está en la lista
        if (audioChunksRef.current.includes(data.data)) {
          console.warn("⚠️ Chunk duplicado detectado, ignorando...");
          return;
        }
      
        audioChunksRef.current.push(data.data);
      });
      
      

      newSocket.on('streamComplete', async () => {
        console.log(`📥 Total de chunks recibidos: ${audioChunksRef.current.length}`);

        const fullBase64 = audioChunksRef.current.join('');
        audioChunksRef.current = []; // Limpiar el buffer para liberar memoria

        console.log(`🔍 Base64 total recibido: ${fullBase64.length} caracteres`);

        if (fullBase64.length > 3000000) {
          console.error("⚠️ ¡Base64 demasiado grande! Posible problema en los datos.");
          return;
        }

        console.log('🎵 Guardando audio en archivo...');
        const fileUri = await saveAudioToFile(fullBase64);

        if (!fileUri) {
          Alert.alert('Error', 'No se pudo guardar el archivo de audio');
          return;
        }

        console.log('🎵 Archivo guardado en:', fileUri);

        // Descargar el sonido anterior si existe
        if (sound) {
          try {
            await sound.unloadAsync();
          } catch (error) {
            console.error('Error descargando el audio anterior', error);
          }
          setSound(null);
        }

        try {
          console.log('🎵 Cargando audio desde archivo...');
          const { sound: newSound } = await Audio.Sound.createAsync(
            { uri: fileUri }, // 📌 Aquí cambiamos Base64 por una ruta de archivo
            { shouldPlay: true }
          );

          newSound.setOnPlaybackStatusUpdate(status => {
            if (status.isLoaded) {
              setPosition(status.positionMillis);
              setDuration(status.durationMillis);
              setIsPlaying(status.isPlaying);
              if (status.didJustFinish) {
                newSound.unloadAsync();
                setIsPlaying(false);
              }
            }
          });

          setSound(newSound);
        } catch (error) {
          console.error('🚨 Error en Audio.Sound.createAsync:', error);
          Alert.alert('Error', 'No se pudo reproducir el audio');
        }
      });


      newSocket.on('error', (error) => {
        Alert.alert('Error', error.message || 'Error de conexión');
      });

      setSocket(newSocket);
    };

    setupSocket();

    return () => {
      if (socket) socket.disconnect();
      if (sound) sound.unloadAsync();
    };
  }, []);

  const togglePlayPause = async () => {
    if (!socket) return;

    if (sound) {
      if (isPlaying) {
        await sound.pauseAsync();
      } else {
        await sound.playAsync();
      }
      setIsPlaying(!isPlaying);
      console.log('Toggled play/pause');
    } else {
      // Iniciar transmisión de una canción específica
      socket.emit('startStream', { songName: 'New_Bitch' });
    }
  };

  const handleSeek = async (value) => {
    if (sound) {
      await sound.setPositionAsync(value);
    }
  };

  return (
    <View style={styles.container}>
      <Image 
        source={require('../assets/mujerona.jpg')} 
        style={styles.backgroundImage} 
      />

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
        <TouchableOpacity onPress={togglePlayPause}>
          <Image
            source={isPlaying 
              ? require('../assets/pause.png') 
              : require('../assets/play.png')}
            style={styles.playPauseButton}
          />
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
});