import React, { useState, useEffect, useRef, useLayoutEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image, Alert } from 'react-native';
import { Audio } from 'expo-av';
import Slider from '@react-native-community/slider';
import { io } from 'socket.io-client';

export default function MusicPlayer({ navigation }) {
  const [sound, setSound] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(1);
  const [currentSong, setCurrentSong] = useState('');
  const [socket, setSocket] = useState(null);
  
  const audioChunksRef = useRef([]);
  const currentSongRef = useRef('');

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
        if (currentSongRef.current !== data.filename) {
          audioChunksRef.current = [];
          currentSongRef.current = data.filename;
          setCurrentSong(data.filename);
        }
        audioChunksRef.current.push(data.data);
        console.log('Recibido chunk de audio');
      });

      newSocket.on('streamComplete', async () => {
        const fullBase64 = audioChunksRef.current.join(''); // Mantén la estructura, pero verifica la integridad del Base64
        if (!fullBase64) {
          console.error("No se ha recibido ningún audio en Base64");
          return;
        }
        else{
          console.log("Audio recibido en Base64");
        }
        console.log(`Longitud del Base64 recibido: ${fullBase64.length}`);


        audioChunksRef.current = [];
        console.log('Transmisión de audio completada');
        try {
          if (sound) {
            try {
              await sound.unloadAsync();
            } catch (error) {
              console.error("Error descargando el audio anterior", error);
            }
            setSound(null);
          }
          try {
            const uri = `data:audio/mp3;base64,${fullBase64}`; // Define la URI correctamente
            console.log("🎵 URI generada:", uri);

            console.log("🔄 Intentando cargar el audio...");
            const { sound: newSound } = await Audio.Sound.createAsync(
              { uri },
              { shouldPlay: false }
            );
            console.log("✅ Audio cargado correctamente");
            setSound(newSound);
          } catch (error) {
            console.error("🚨 Error en Audio.Sound.createAsync:", error);
          }
          
          
          newSound.setOnPlaybackStatusUpdate(status => {
            if (status.isLoaded) {
              setPosition(status.positionMillis);
              setDuration(status.durationMillis);
              setIsPlaying(status.isPlaying);
              console.log(`🎵 Posición: ${status.positionMillis} / Duración: ${status.durationMillis}`);
              if (status.didJustFinish) {
                newSound.unloadAsync();
                setIsPlaying(false);
              }
            }
          });
          console.log("🎵 Reproducción iniciada correctamente");
          await newSound.playAsync();
          setIsPlaying(true);
        } catch (error) {
          Alert.alert('Error', 'Error al reproducir el audio');
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