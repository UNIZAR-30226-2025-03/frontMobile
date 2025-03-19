import React, { useState, useLayoutEffect, useEffect, useRef } from 'react';
import { View, Text, FlatList, Image, StyleSheet, Dimensions, TouchableOpacity, Animated, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

export default function HomeScreen({ navigation }) {
  const [playlistCreadas, setPlaylistCreadas] = useState([]);
  const [cancionSonando, setCancionSonando] = useState(true);
  const rotation = useRef(new Animated.Value(0)).current;
  const [menuAbierto, setMenuAbierto] = useState(false);
  const blurAnimation = useRef(new Animated.Value(0)).current;
  const [recomendations, setRecomendations] = useState([]);
  const [userEmail, setUserEmail] = useState('');
  const [userName, setUserName] = useState('');

  useLayoutEffect(() => {
    navigation.setOptions({ headerShown: false });
  }, [navigation]);

  useEffect(() => {
    obtenerInfoUser();
  }, []);

  const obtenerInfoUser = async () => {
    try {
      const email = await AsyncStorage.getItem('email');
      if (!email) {
        Alert.alert("Error", "No se pudo recuperar el email del usuario.");
        return;
      }
      setUserEmail(email);
      const response = await fetch(`https://echobeatapi.duckdns.org/users/nick?userEmail=${email}`);
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || "Error al obtener el nombre del usuario");
      }
      setUserName(data.Nick || 'Usuario');
      await obtenerPlaylistsCreadas(email);
      await obtenerRecomendaciones(email);
    } catch (error) {
      Alert.alert("Error", error.message);
    }
  };

  const obtenerPlaylistsCreadas = async (email) => {
    try {
      const response = await fetch(`https://echobeatapi.duckdns.org/playlists/user/${email}`);
      const data = await response.json();
      if (data.playlists) {
        setPlaylistCreadas(data.playlists); // Si es un objeto, usar la propiedad "playlists"
      } else {
        setPlaylistCreadas(data); // Si es un array, usarlo directamente
      }
    } catch (error) {
      Alert.alert("Error", error.message);
    }
  };

  const obtenerRecomendaciones = async (email) => {
    try {
      const response = await fetch(`https://echobeatapi.duckdns.org/genero/preferencia?userEmail=${email}`);
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || "Error al obtener recomendaciones");
      }
      setRecomendations(data);
    } catch (error) {
      Alert.alert("Error", error.message);
    }
  };

  // Crea un Animated.Value para cada uno de los 5 botones del menú
  const menuButtonAnimValues = useRef([
    new Animated.Value(0),
    new Animated.Value(0),
    new Animated.Value(0),
    new Animated.Value(0),
    new Animated.Value(0),
  ]).current;

  const toggleMenu = () => {
    if (!menuAbierto) {
      // Abrir: animar cada botón de forma escalonada (izquierda a derecha)
      Animated.stagger(100, menuButtonAnimValues.map(anim =>
        Animated.timing(anim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        })
      )).start();
    } else {
      // Cerrar: animar en orden inverso (derecha a izquierda)
      Animated.stagger(100, menuButtonAnimValues.slice().reverse().map(anim =>
        Animated.timing(anim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        })
      )).start();
    }
    setMenuAbierto(!menuAbierto);
    Animated.timing(blurAnimation, {
      toValue: menuAbierto ? 0 : 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  };

  const renderBotonesMenu = () => {
    const botones = [
      { id: 1, label: 'MIS LISTAS', screen: 'MyLists', icon: 'list' },
      { id: 2, label: 'FAVS', screen: 'Favorites', icon: 'heart' },
      { id: 3, label: 'BUSCAR', screen: 'Search', icon: 'search' },
      { id: 4, label: 'CHATS', screen: 'Chats', icon: 'chatbubbles' },
      { id: 5, label: 'AJUSTES', screen: 'Settings', icon: 'settings' },
    ];

    return botones.map((boton, index) => {
      const angle = (Math.PI / (botones.length - 1)) * index;
      const x = Math.cos(angle) * 145;
      const y = -Math.sin(angle) * 120;
      const animValue = menuButtonAnimValues[index];
      const translateX = animValue.interpolate({
        inputRange: [0, 1],
        outputRange: [0, x],
      });
      const translateY = animValue.interpolate({
        inputRange: [0, 1],
        outputRange: [0, y],
      });
      return (
        <Animated.View
          key={boton.id}
          style={[
            styles.menuBoton,
            {
              transform: [{ translateX }, { translateY }],
              opacity: animValue,
            },
          ]}
        >
          <TouchableOpacity style={styles.botonMenuSecundario} onPress={() => navigation.navigate(boton.screen)}>
            <Ionicons name={boton.icon} size={24} color="#fff" style={{ marginBottom: 5 }} />
            <Text style={styles.botonTexto}>{boton.label}</Text>
          </TouchableOpacity>
        </Animated.View>
      );
    });
  };

  Animated.loop(
    Animated.timing(rotation, {
      toValue: 1,
      duration: 4000,
      useNativeDriver: true,
    })
  ).start();

  const spin = rotation.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const renderPlaylistCreada = ({ item }) => {
    const defaultImage = require('../assets/darkraul.jpg');
    const imageSource =
      item.lista && item.lista.Portada && item.lista.Portada !== "URL_por_defecto"
        ? { uri: item.lista.Portada }
        : defaultImage;
        return (
          <TouchableOpacity onPress={() => navigation.navigate("PlaylistDetail", { playlist: item.lista })}>
            <View style={styles.playlistItem}>
              <Image source={imageSource} style={styles.playlistImage} />
              <Text style={styles.playlistTitle}>{item.lista ? item.lista.Nombre : '####'}</Text>
            </View>
          </TouchableOpacity>
        );
  };

  const renderRecomendationsItem = ({ item }) => {
    const defaultImage = require('../assets/darkraul.jpg');
    const imageSource =
      item.FotoGenero && item.FotoGenero !== "URL_por_defecto"
        ? { uri: item.ForoGenero }
        : defaultImage;
    const nameGenero = (item.NombreGenero && item.NombreGenero !== "NULL") ? item.NombreGenero : '####';
    return (
      <View style={styles.recomendationsItem}>
        <Image source={imageSource} style={styles.recomendationsImage} />
        <Text style={styles.recomendationsTitle}>{nameGenero}</Text>
      </View>
    );
  };

  const handleOpenMusicPlayer = async () => {
    try {
        const lastSong = await AsyncStorage.getItem('lastSong');
        if (lastSong) {
            navigation.navigate('MusicPlayer', { songName: lastSong });
        } else {
            Alert.alert("🔇 No hay ninguna canción en reproducción");
        }
    } catch (error) {
        console.error("Error obteniendo la última canción:", error);
    }
  };

  return (
    <View style={styles.container}>
      <Animated.View
        pointerEvents={menuAbierto ? 'auto' : 'none'}
        style={[
          styles.blurView,
          {
            opacity: blurAnimation.interpolate({
              inputRange: [0, 1],
              outputRange: [0, 0.7],
            }),
            zIndex: 1,
          },
        ]}
      />
      <View pointerEvents={menuAbierto ? 'none' : 'auto'} style={{ flex: 1 }}>
        <View style={styles.headerContainer}>
          <Text style={styles.greeting}>Hola 😄, {userName}</Text>
          <TouchableOpacity onPress={() => navigation.navigate('ProfileScreen')}>
            <Image source={require('../assets/favicon.png')} style={styles.profileImage} />
          </TouchableOpacity>
        </View>

        {/* Primer contenedor: "Tus Listas" */}
        <View>
          <Text style={styles.subTitle}>Tus Listas</Text>
          {playlistCreadas.length === 0 ? (
            // Mostrar botón si no hay playlists
            <TouchableOpacity
              style={styles.createFirstPlaylistButton}
              onPress={() => navigation.navigate("CrearPlaylist")}
            >
              <Text style={styles.createFirstPlaylistButtonText}> Crea tu 1ª Playlist! </Text>
            </TouchableOpacity>
          ) : (
            // Mostrar FlatList si hay playlists
            <FlatList
              data={playlistCreadas}
              renderItem={renderPlaylistCreada}
              keyExtractor={(item, index) => index.toString()}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.playlistList}
              style={styles.playlistCreadasSlider}
            />
          )}
        </View>

        {/* Segundo contenedor: "Recomendaciones" */}
        <View style={{ flex: 1 }}>
          <Text style={styles.subTitle}>Recomendaciones</Text>
          {recomendations.length === 0 ? (
            <Text style={{ color: '#fff', textAlign: 'center', marginTop: 20 }}>
              No hay recomendaciones disponibles
            </Text>
          ) : (
          <FlatList
            data={recomendations}
            renderItem={renderRecomendationsItem}
            keyExtractor={(item, index) => index.toString()}
            numColumns={2}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.recomendationsList}
            columnWrapperStyle={styles.recomendationsList}
            style={styles.recomendationsSlider}
          />
          )}
        </View>
      </View>
      <View style={styles.bottomContainer}>
        {renderBotonesMenu()}
        <TouchableOpacity style={styles.halfCircleButton} onPress={toggleMenu} activeOpacity={0.8}>
          <Text style={styles.buttonText}>{menuAbierto ? 'x' : '. . .'}</Text>
        </TouchableOpacity>
        {cancionSonando && (
          <Animated.View
            pointerEvents={menuAbierto ? 'none' : 'auto'}
            style={{
              opacity: blurAnimation.interpolate({
                inputRange: [0, 1],
                outputRange: [1, 0.2],
              }),
              zIndex: 4,
            }}
          >
            <TouchableOpacity onPress={handleOpenMusicPlayer} style={styles.musicIconContainer}>
              <Animated.Image
                source={require('../assets/favicon.png')}
                style={[styles.discIcon, { transform: [{ rotate: spin }] }]}
              />
            </TouchableOpacity>
          </Animated.View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121111',
    paddingHorizontal: 15,
  },
  blurView: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#000',
    zIndex: 1,
  },
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 30,
  },
  greeting: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
    marginLeft: 18,
    marginTop: 15,
  },
  profileImage: {
    width: 45,
    height: 45,
    borderRadius: 22.5,
    backgroundColor: '#333',
    marginTop: 15,
  },
  subTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#f2ab55',
    marginTop: 10,
    marginBottom: 5,
    marginLeft: 20,
  },
  playlistCreadasSlider: {
    width: width * 0.9,
    alignSelf: 'center',
    marginTop: 10,
  },
  playlistList: {
    paddingHorizontal: 5,
  },
  playlistItem: {
    width: width / 2.5 - 15,
    marginRight: 20,
    alignItems: 'center',
  },
  playlistImage: {
    width: width / 3 - 20,
    height: width / 3 - 20,
    borderRadius: 20,
    backgroundColor: '#333',
  },
  playlistTitle: {
    marginTop: 5,
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  recomendationsSlider: {
    width: width * 0.9,
    alignSelf: 'center',
  },
  recomendationsList: {
    justifyContent: 'space-between',
    paddingHorizontal: 5,
  },
  recomendationsItem: {
    width: width / 2.5 - 15,
    marginBottom: 15,
    alignItems: 'center',
  },
  recomendationsImage: {
    width: width / 2.5 - 20,
    height: width / 2.5 - 20,
    borderRadius: 20,
    backgroundColor: '#333',
  },
  recomendationsTitle: {
    marginTop: 5,
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  bottomContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 200,
    justifyContent: 'flex-end',
    alignItems: 'center',
    zIndex: 2,
  },
  halfCircleButton: {
    width: 170,
    height: 100,
    borderTopLeftRadius: 100,
    borderTopRightRadius: 100,
    backgroundColor: '#ffb723',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: -20,
    zIndex: 3,
  },
  buttonText: {
    fontSize: 50,
    color: '#fff',
    fontWeight: 'bold',
    marginBottom: 40,
  },
  menuBoton: {
    position: 'absolute',
    bottom: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  botonMenuSecundario: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#f2ab55',
    justifyContent: 'center',
    alignItems: 'center',
  },
  botonTexto: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 11,
    textAlign: 'center',
  },
  musicIconContainer: {
    position: 'absolute',
    bottom: 20,
    right: 20,
  },
  discIcon: {
    width: 50,
    height: 50,
    position: 'absolute',
    bottom: 15,
    right: -200,
  },
  createFirstPlaylistButton: {
    backgroundColor: '#ffb723',
    paddingVertical: 15,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
    marginBottom: 20,
    alignSelf: 'center',
  },
  createFirstPlaylistButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
});