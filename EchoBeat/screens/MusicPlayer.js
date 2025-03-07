import React, { useState, useEffect, useLayoutEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image, Alert } from 'react-native';
import { Audio } from 'expo-av';
import Slider from '@react-native-community/slider';
import { goBack } from 'expo-router/build/global-state/routing';


export default function MusicPlayer({ navigation }) {
  const [sound, setSound] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [songIndex, setSongIndex] = useState(0);
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(1);

  const songList = [
    {
      title: 'Canción 1',
      artist: 'Artista 1',
      image: require('../assets/thanos1.jpg'),
      audio: require('../assets/japo.mp3'),
    },
    {
      title: 'The Definitive Gossip',
      artist: 'The Lías & JoG',
      image: require('../assets/eliasgossip.jpg'),
      audio: require('../assets/24.mp3'),
    },
  ];

  useLayoutEffect(() => {
      navigation.setOptions({
        headerShown: false,
      });
    }, [navigation]);
  
  useEffect(() => {
    loadSong();
    return () => {
      if (sound) {
        sound.unloadAsync();
      }
    };
  }, [songIndex]);

  const loadSong = async () => {
    if (sound) {
      await sound.unloadAsync();
    }

    const { sound: newSound } = await Audio.Sound.createAsync(songList[songIndex].audio, {
      shouldPlay: isPlaying,
    });

    setSound(newSound);

    newSound.setOnPlaybackStatusUpdate((status) => {
      if (status.isLoaded) {
        setPosition(status.positionMillis);
        setDuration(status.durationMillis);
        if (status.didJustFinish) {
          nextSong();
        }
      }
    });
  };

  const togglePlayPause = async () => {
    if (!sound) return;

    if (isPlaying) {
      await sound.pauseAsync();
    } else {
      await sound.playAsync();
    }

    setIsPlaying(!isPlaying);
  };

  const nextSong = () => {
    setSongIndex((prevIndex) => (prevIndex + 1) % songList.length);
  };

  const prevSong = () => {
    setSongIndex((prevIndex) => (prevIndex - 1 + songList.length) % songList.length);
  };

  const handleSeek = async (value) => {
    if (sound) {
      await sound.setPositionAsync(value);
    }
  };

  const saveToList = () => {
    Alert.alert('Guardado', 'Canción guardada en tu lista.');
  };

  return (
    <View style={styles.container}>
      {/* Fondo con imagen de la canción */}
      <Image source={songList[songIndex].image} style={styles.backgroundImage} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.headerButton}>←</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => Alert.alert('Info', 'Información de la canción')}>
          <Text style={styles.headerButton}>ℹ️</Text>
        </TouchableOpacity>
      </View>

      {/* Imagen de la Canción */}
      <Image source={songList[songIndex].image} style={styles.albumArt} />

      {/* Info de la canción */}
      <Text style={styles.songTitle}>{songList[songIndex].title}</Text>
      <Text style={styles.songArtist}>{songList[songIndex].artist}</Text>

      <TouchableOpacity style={styles.saveButton} onPress={saveToList}>
        <Text style={styles.saveInListText}>Guardar en Lista</Text>
      </TouchableOpacity>

      {/* Barra de progreso */}
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
        <TouchableOpacity onPress={prevSong}>
          <Image source={require('../assets/prev.png')} style={styles.controlButton} />
        </TouchableOpacity>

        <TouchableOpacity onPress={togglePlayPause}>
          <Image
            source={isPlaying ? require('../assets/pause.png') : require('../assets/play.png')}
            style={styles.playPauseButton}
          />
        </TouchableOpacity>

        <TouchableOpacity onPress={nextSong}>
          <Image source={require('../assets/next.png')} style={styles.controlButton} />
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
  },
  headerButton: {
    fontSize: 24,
    color: '#ffffff',
  },
  albumArt: {
    width: 250,
    height: 250,
    borderRadius: 20,
    marginTop: 10,
    marginBottom: 12,
  },
  songTitle: {
    fontSize: 24,
    color: '#ffffff',
    fontWeight: 'bold',
  },
  songArtist: {
    fontSize: 18,
    color: '#aaaaaa',
    marginTop: 5,
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
  controlButton: {
    width: 60,
    height: 60,
    tintColor: '#f2ab55',
  },
  playPauseButton: {
    width: 60,
    height: 60,
    tintColor: '#f2ab55',
    marginHorizontal: 30,
  },
  saveButton: {
    alignSelf: "center",
    marginTop: -12,
  },
  saveInListText: {
    color: "#f2ab55",
    fontSize: 16,
    textDecorationLine: "underline",
  },
});
