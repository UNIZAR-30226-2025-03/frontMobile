import React, { useState, useLayoutEffect, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, Image, FlatList, Dimensions, Alert, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width } = Dimensions.get('window');

export default function FavoritesScreen({ navigation }) {
  const [songs, setSongs] = useState([]);
  const [userEmail, setUserEmail] = useState('');
  const [infoVisible, setInfoVisible] = useState(false);
  const [selectedSong, setSelectedSong] = useState(null);
  const [songOptionsVisible, setSongOptionsVisible] = useState(false);
  const [refreshing, setRefreshing] = useState(false); // Pull to refresh

  useLayoutEffect(() => {
    navigation.setOptions({ headerShown: false });
  }, [navigation]);

  const loadData = async () => {
    await obtenerCanciones();
  };

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  useEffect(() => {
    loadData();
  }, []);

  const obtenerEmail = async () => {
    try {
      const email = await AsyncStorage.getItem('email');
      console.log("Email recuperado:", `"${email}"`);
      if (email) {
        setUserEmail(email);
        return email;
      }
    } catch (err) {
      console.error("Error obteniendo el email:", err);
    }
    return null;
  };
  

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const obtenerCanciones = async () => {
    try {
      const email = await obtenerEmail();
      if (!email) return;
  
      const encodedEmail = encodeURIComponent(email);
      const response = await fetch(`https://echobeatapi.duckdns.org/cancion/favorites?email=${encodedEmail}`);
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || "Error al obtener las canciones de favoritos");
      }
  
      setSongs(data.canciones || []);
    } catch (error) {
      console.error("Error en obtenerCanciones:", error);
    }
  };
  

  const renderSong = ({ item }) => (
    <View style={styles.songItem}>
      <TouchableOpacity
        style={{ flex: 1 }}
        onPress={() => navigation.navigate('MusicPlayer', { songName: item.nombre })}
      >
        <Image
          source={item.portada === "URL"
            ? require('../assets/default_song_portada.jpg')
            : { uri: item.portada }
          }
          style={styles.songImage}
        />
        <Text style={styles.songTitle} numberOfLines={1}>{item.nombre}</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.songOptionsButton}
        onPress={() => {
          setSelectedSong(item);
          setSongOptionsVisible(true);
        }}
      >
        <Ionicons name="ellipsis-vertical" size={20} color="#fff" />
      </TouchableOpacity>
    </View>
  );

  const ListHeader = () => (
    <View style={styles.headerContent}>
      <Image
        source={require('../assets/favorites.jpg')}
        style={styles.playlistImage}
      />
      <Text style={styles.playlistTitle}>Favoritos</Text>
      <Text style={styles.playlistDescription}>
        Tus canciones favoritas siempre estarán aquí.
      </Text>
      <Text style={styles.sectionTitle}>Canciones</Text>
      {songs.length === 0 && (
        <Text style={styles.noSongsText}>No hay canciones en favoritos.</Text>
      )}
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerButton}>
          <Ionicons name="arrow-back" size={24} color="#f2ab55" />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setInfoVisible(true)} style={styles.headerButton}>
          <Ionicons name="information-circle-outline" size={28} color="#f2ab55" />
        </TouchableOpacity>
      </View>
      <FlatList
        data={songs}
        renderItem={renderSong}
        keyExtractor={(item, index) => index.toString()}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={ListHeader}
        contentContainerStyle={styles.flatListContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#f2ab55']}
            tintColor="#f2ab55"
          />
        }
      />
      {/* Opciones de la canción */}
      {songOptionsVisible && (
        <View style={styles.songOptionsOverlay}>
          <View style={styles.songOptionsContainer}>
            <TouchableOpacity
              style={styles.closeSongOptionsButton}
              onPress={() => setSongOptionsVisible(false)}
            >
              <Ionicons name="close" size={24} color="#000" />
            </TouchableOpacity>
            <Text style={styles.songOptionsTitle}>Opciones para la canción</Text>
          </View>
          <View style={styles.songOptionsBlur} />
        </View>
      )}
      {/* Información de favoritos */}
      {infoVisible && (
        <View style={styles.infoOverlay}>
          <View style={styles.infoContainer}>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setInfoVisible(false)}
            >
              <Ionicons name="close" size={30} color="#000" />
            </TouchableOpacity>
            <Text style={styles.infoTitle}>Información</Text>
            <Text style={styles.infoText}>Privacidad: Privada (Siempre)</Text>
            <Text style={styles.infoText}>Género: Variedad</Text>
          </View>
          <View style={styles.blurBackground} />
        </View>
      )}
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
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 25,
    paddingTop: 30,
  },
  headerButton: {},
  headerContent: {
    paddingHorizontal: 20,
    paddingTop: 10,
    alignItems: 'center',
    position: 'relative',
  },
  playlistImage: {
    width: 200,
    height: 200,
    borderRadius: 10,
    marginBottom: 10,
    marginTop: 20,
  },
  playlistTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#f2ab55',
    marginBottom: 10,
    textAlign: 'center',
  },
  playlistDescription: {
    fontSize: 16,
    color: '#ffffff',
    marginBottom: 20,
    textAlign: 'center',
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#f2ab55',
    marginBottom: 10,
    alignSelf: 'flex-start',
    paddingLeft: 5,
  },
  flatListContent: {
    paddingBottom: 20,
    paddingHorizontal: 10,
  },
  songItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    padding: 8,
    backgroundColor: '#222',
    borderRadius: 8,
    marginHorizontal: 5,
  },
  songImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
    marginRight: 10,
  },
  songTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ffffff',
    flexShrink: 1,
  },
  songOptionsButton: {
    marginLeft: 'auto',
  },
  noSongsText: {
    fontSize: 16,
    color: '#ffffff',
    textAlign: 'center',
    marginVertical: 20,
  },
  songOptionsOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 200,
  },
  songOptionsContainer: {
    width: '80%',
    backgroundColor: '#ccc',
    borderRadius: 8,
    padding: 20,
    alignItems: 'center',
    zIndex: 201,
  },
  closeSongOptionsButton: {
    position: 'absolute',
    top: 10,
    right: 10,
  },
  songOptionsTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 10,
  },
  infoOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 100,
  },
  infoContainer: {
    width: '80%',
    backgroundColor: '#ccc',
    borderRadius: 8,
    padding: 20,
    zIndex: 101,
    alignItems: 'center',
  },
  closeButton: {
    position: 'absolute',
    top: 10,
    right: 10,
  },
  infoTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#000',
  },
});
