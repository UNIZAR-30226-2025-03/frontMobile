import React, { useState, useEffect, useRef, useLayoutEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image, Alert } from 'react-native';
import { Audio } from 'expo-av';
import Slider from '@react-native-community/slider';
import { io } from 'socket.io-client';
import * as FileSystem from 'expo-file-system';
import { decode } from 'base64-arraybuffer'; // Importar decodificador

export default function MusicPlayer({ navigation }) {
  const [sound, setSound] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(1);
  const [currentSong, setCurrentSong] = useState('');
  const [socket, setSocket] = useState(null);
  
  const audioChunksRef = useRef([]);
  const currentSongRef = useRef('');

  const isBase64 = (str) => {
    const regex = /^[A-Za-z0-9+/]+={0,2}$/; // Expresión regular para Base64
    return regex.test(str);
  };


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
        console.log(`🔍 Primeros 100 caracteres del chunk: ${data.data.substring(0, 100)}`);
        let chunkBase64 = data.data.trim(); // Asegurar que no haya espacios en blanco
      
        if (!isBase64(chunkBase64)) {
          console.error("🚨 Error: Chunk recibido no es Base64 válido, ignorando...");
          return;
        }
      
        console.log("🎵 Chunk recibido es Base64 válido");
        audioChunksRef.current.push(chunkBase64);
      });

      
      

      newSocket.on('streamComplete', async () => {
        console.log(`📥 Total de chunks recibidos: ${audioChunksRef.current.length}`);
      
        // 🔥 Concatenar los chunks eliminando caracteres inválidos y saltos de línea
        let fullBase64 = audioChunksRef.current.join('').replace(/[^A-Za-z0-9+/=]/g, '').replace(/\r?\n|\r/g, '');
        audioChunksRef.current = []; // Limpiar buffer
      
        console.log(`🔍 Base64 total recibido: ${fullBase64.length} caracteres`);
        console.log(`🔍 Primeros 100 caracteres: ${fullBase64.substring(0, 100)}`);
        console.log(`🔍 Últimos 100 caracteres: ${fullBase64.slice(-100)}`);
      
        // 🔹 Asegurar que el Base64 tenga el padding correcto
        while (fullBase64.length % 4 !== 0) {
          fullBase64 += '=';
        }
      
        console.log(`✅ Base64 corregido con padding: ${fullBase64.length} caracteres`);
      
        try {
          // 🔹 Decodificar Base64 a un buffer de bytes
          const binaryData = decode(fullBase64);
          console.log("✅ Base64 decodificado correctamente en ArrayBuffer.");
      
          // 📂 Guardar el archivo en binario en lugar de Base64
          const fileUri = FileSystem.cacheDirectory + 'audio.mp3';
          await FileSystem.writeAsBytesAsync(fileUri, new Uint8Array(binaryData));
      
          console.log('🎵 Archivo guardado en:', fileUri);
      
          // 🎵 Cargar y reproducir el audio
          try {
            console.log('🎵 Cargando audio desde archivo...');
            const { sound: newSound } = await Audio.Sound.createAsync(
              { uri: fileUri },
              { shouldPlay: true }
            );
      
            setSound(newSound);
          } catch (error) {
            console.error('🚨 Error en Audio.Sound.createAsync:', error);
            Alert.alert('Error', 'No se pudo reproducir el audio');
          }
        } catch (error) {
          console.error("🚨 Error al decodificar Base64 o escribir el archivo:", error);
          Alert.alert("Error", "Los datos de audio no son válidos");
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