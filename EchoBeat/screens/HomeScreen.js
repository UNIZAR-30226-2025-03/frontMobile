/**
 * @file HomeScreen.js
 * @description Pantalla principal de la aplicación EchoBeat.
 * Muestra el saludo al usuario, su foto de perfil, listas de reproducción creadas y recomendaciones.
 * Permite navegar a otras pantallas y controlar la animación de un disco giratorio.
 * Incluye un menú radial con accesos rápidos y la opción de refrescar los datos.
 */
import React, { useState, useLayoutEffect, useEffect, useRef } from 'react';
import { View, Text, FlatList, Image, StyleSheet, Dimensions, TouchableOpacity, 
         TouchableWithoutFeedback, Animated, Alert, Easing,RefreshControl, ScrollView } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';

const { width, height } = Dimensions.get('window');

/**
 * Pantalla principal de la app donde:
 * - Se muestra saludo y foto de perfil del usuario.
 * - Se listan las playlists creadas y recomendaciones.
 * - Se controla animación de disco giratorio si hay canción sonando.
 * - Se maneja menú radial con accesos rápidos.
 * - Se permite refrescar datos con pull-to-refresh.
 *
 * @param {object} navigation - Prop de navegación de React Navigation.
 * @param {object} route - Prop de ruta de React Navigation.
 */
export default function HomeScreen({ navigation, route }) {
  const [playlistCreadas, setPlaylistCreadas] = useState([]);
  const [cancionSonando, setCancionSonando] = useState(false);
  const [estaReproduciendo, setEstaReproduciendo] = useState(false);
  const rotation = useRef(new Animated.Value(0)).current;
  const [menuAbierto, setMenuAbierto] = useState(false);
  const blurAnimation = useRef(new Animated.Value(0)).current;
  const [recomendations, setRecomendations] = useState([]);
  const [userEmail, setUserEmail] = useState('');
  const [userName, setUserName] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [profilePhoto, setProfilePhoto] = useState(null);
  

  useLayoutEffect(() => {
    navigation.setOptions({ headerShown: false });
  }, [navigation]);

  useFocusEffect(
    React.useCallback(() => {
      obtenerInfoUser();
      checkSongPlaying();
    }, [])
  );

  useEffect(() => {
    obtenerInfoUser();
    checkSongPlaying();
  }, []);

  /**
   * Refresca la pantalla, recargando datos de usuario y estado de reproducción.
   * 
   * @returns {void}
   */
  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await obtenerInfoUser();
      await checkSongPlaying();
      if ((cancionSonando === true) && (estaReproduciendo === "true") && (menuAbierto === false)) {
        startRotationLoop();
      } else {
        stopRotation();
      }
    } catch (error) {
      Alert.alert("Error", "No se pudo actualizar los datos");
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if ((cancionSonando === true) && (estaReproduciendo === "true") && (menuAbierto === false)) {
      startRotationLoop();
    } else {
      stopRotation();
    }
  }, [cancionSonando, estaReproduciendo, menuAbierto]);

  /**
   * Obtiene la información básica del usuario: email, nick, foto y listas.
   * 
   * @returns {void}
   */
  const obtenerInfoUser = async () => {
    try {
      const email = await AsyncStorage.getItem('email');
      if (!email) {
        Alert.alert("Error", "No se pudo recuperar el email del usuario.");
        return;
      }
      setUserEmail(email);
      const response = await fetch(`https://echobeatapi.duckdns.org/users/get-user?userEmail=${email}`);
      const data = await response.json();
      
      if (!response.ok) throw new Error(data.message || "Error al obtener el nombre del usuario");
      setUserName(data.Nick || 'Usuario');
      await AsyncStorage.setItem("nick", data.Nick);
      setProfilePhoto(data.LinkFoto);
      await obtenerPlaylistsCreadas(email);
      await obtenerRecomendaciones(email);
    } catch (error) {
      Alert.alert("Error", error.message);
    }
  };

  /**
   * Verifica si actualmente hay una canción sonando y actualiza estado.
   * 
   * @returns {void}
   */
  const checkSongPlaying = async () => {
    const lastSong = await AsyncStorage.getItem('lastSong');
    const isPlaying = await AsyncStorage.getItem('isPlaying');
    const loggeado = await AsyncStorage.getItem('logged');

    if(loggeado === '0') {
      try{
        const email = await AsyncStorage.getItem('email');
        if (!email) {
          Alert.alert("Error", "No se pudo recuperar el email del usuario.");
          return;
        }
        await AsyncStorage.setItem('logged', '1');
        const res = await fetch(`https://echobeatapi.duckdns.org/users/first-song?Email=${(email)}`);
        const data = await res.json();
        if (res.ok) {
          await AsyncStorage.setItem('lastSong', data.Nombre);
          await AsyncStorage.setItem('lastSongId', data.PrimeraCancionId.toString());
          await AsyncStorage.setItem('minuto', data.MinutoEscucha.toString());
        }
      }catch(error){
        console.error("Error al obtener la canción actual:", error);
      }
    }

    const hayCancion = !!lastSong;

    setCancionSonando(hayCancion);
    setEstaReproduciendo(isPlaying);

    if (hayCancion && (isPlaying==='true') && !menuAbierto) {
      startRotationLoop();
    } else{
      stopRotation();
    }
  };

  /**
   * Carga las playlists creadas por el usuario.
   * 
   * @param {string} email - Email del usuario.
   * @returns {void}
   */
  const obtenerPlaylistsCreadas = async (email) => {
    try {
      const response = await fetch(`https://echobeatapi.duckdns.org/playlists/user/${email}`);
      const data = await response.json();
      setPlaylistCreadas(data.playlists || data);
    } catch (error) {
      Alert.alert("Error", error.message);
    }
  };

  /**
   * Carga recomendaciones basadas en preferencias de géneros.
   * 
   * @param {string} email - Email del usuario.
   * @return {void}
   */
  const obtenerRecomendaciones = async (email) => {
    try {
      const response = await fetch(`https://echobeatapi.duckdns.org/genero/preferencia?userEmail=${email}`);
  
      // Si no es un 2xx, intenta extraer el error pero de forma segura
      if (!response.ok) {
        const errorData = await response.text();
        if (errorData.includes("No se encontraron géneros") || response.status === 500) {
          console.warn("⚠️ No hay géneros preferidos definidos aún.");
          setRecomendations([]); // simplemente muestra vacío
          return;
        }
        throw new Error(errorData || "Error al obtener recomendaciones");
      }
  
      const data = await response.json();
      setRecomendations(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("❌ Error en obtenerRecomendaciones:", error.message);
      Alert.alert("Error", "No se pudieron cargar recomendaciones.");
      setRecomendations([]);
    }
  };
  

  const menuButtonAnimValues = useRef([...Array(5)].map(() => new Animated.Value(0))).current;

  /**
   * Alterna apertura del menú radial con animación de botones.
   * 
   * @returns {void}
   */
  const toggleMenu = () => {
    if (!menuAbierto) {
      Animated.stagger(100, menuButtonAnimValues.map(anim =>
        Animated.timing(anim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        })
      )).start();
    } else {
      Animated.stagger(100, menuButtonAnimValues.slice().reverse().map(anim =>
        Animated.timing(anim, {
          toValue: 0,
          duration: 150,
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

  /**
   * Renderiza los botones del menú radial.
   * Cada botón tiene una animación de entrada/salida.
   * 
   * @returns {JSX.Element} - Elementos de los botones del menú.
   */
  const renderBotonesMenu = () => {
    const botones = [
      { id: 1, label: 'MIS LISTAS', screen: 'MyLists', icon: 'list' },
      { id: 2, label: 'FAVS', screen: 'Favorites', icon: 'heart' },
      { id: 3, label: 'BUSCAR', screen: 'Search', icon: 'search' },
      { id: 4, label: 'CHATS', screen: 'Chats', icon: 'chatbubbles' },
    ];

    return botones.map((boton, index) => {
      const angle = (Math.PI / (botones.length - 1)) * index;
      const x = Math.cos(angle) * 140;
      const y = -Math.sin(angle) * 130;
      const animValue = menuButtonAnimValues[index];
      const translateX = animValue.interpolate({ inputRange: [0, 1], outputRange: [0, x] });
      const translateY = animValue.interpolate({ inputRange: [0, 1], outputRange: [0, y] });

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
          <TouchableOpacity
            style={styles.botonMenuSecundario}
            onPress={() => navigation.navigate(boton.screen, { userEmail})}
          >
            <Ionicons name={boton.icon} size={24} color="#fff" style={{ marginBottom: 5 }} />
            <Text style={styles.botonTexto}>{boton.label}</Text>
          </TouchableOpacity>
        </Animated.View>
      );
    });
  };

  /**
   * Inicia el loop de animación de rotación del icono de disco.
   * 
   * @returns {void}
   */
  const startRotationLoop = () => {
    rotation.setValue(0);
    Animated.loop(
      Animated.timing(rotation, {
        toValue: 1,
        duration: 4000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    ).start();
  };

  /**
   * Detiene la animación de rotación y resetea el valor.
   * 
   * @returns {void}
   */
  const stopRotation = () => {
    rotation.stopAnimation(() => {
      rotation.setValue(0);
    });
  };

  const spin = rotation.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  /**
   * Renderiza cada elemento de la lista de playlists creadas.
   * 
   * @param {object} param0 - Objeto con la propiedad item.
   * @param {object} param0.item - Playlist creada por el usuario.
   * @returns {JSX.Element}
   */
  const renderPlaylistCreada = ({ item }) => {
    const imageSource = { uri: item.lista.Portada };
    const normalizedPlaylist = {
      Id: item.id || item.Id,
      Nombre: item.nombre || item.Nombre || item.lista?.Nombre || 'Sin nombre',
      Portada: item.lista?.Portada || item.Portada || '',
      Descripcion: item.descripcion || item.Descripcion || '',
    };
    
    return (
      <TouchableOpacity 
        onPress={() => navigation.navigate("PlaylistDetails", { playlist: normalizedPlaylist })}
        style={styles.playlistItem}
      >
        <Image source={imageSource} style={styles.playlistImage} />
        <Text style={styles.playlistTitle}>{item.lista?.Nombre || '####'}</Text>
      </TouchableOpacity>
    );
  };

  /**
   * Renderiza cada elemento de la lista de recomendaciones.
   * 
   * @param {object} param0 - Objeto con la propiedad item.
   * @param {object} param0.item - Vista de la recomendación asignada al user.
   * @returns {JSX.Element}
   */
  const renderRecomendationsItem = ({ item }) => {
    const imageSource = { uri: item.FotoGenero };

    return (
      <TouchableOpacity 
      onPress={() =>
        navigation.navigate('PlaylistDetails', {
          playlist: {
            Id: item.IdLista, // Usa el nombre como ID
            Nombre: item.NombreGenero,
            Portada: item.FotoGenero || '',
            Descripcion: item.Descripcion || `Lista predefinida de ${item.NombreGenero}`,
          }
        })
      }
      style={styles.recomendationsItem}
      >
        <Image source={imageSource} style={styles.recomendationsImage} />
        <Text style={styles.recomendationsTitle}>{item.NombreGenero || '####'}</Text>
      </TouchableOpacity>
    );
  };

  /**
   * Abre el reproductor de música con la última canción reproducida.
   * 
   * @returns {void}
   */
  const handleOpenMusicPlayer = async () => {
    try {
      if (route.params?.fromWelcome) {
        await AsyncStorage.setItem('isPlaying', 'false');
      }

      const lastSong = await AsyncStorage.getItem('lastSong');
      const lastSongIdStr = await AsyncStorage.getItem('lastSongId');
      const lastSongId = parseInt(lastSongIdStr);

      if (lastSong && !isNaN(lastSongId)) {
        navigation.navigate('MusicPlayer', { 
          songName: lastSong, 
          songId: lastSongId,
          userEmail: userEmail
        });
      } else {
        Alert.alert("🔇 No hay ninguna canción en reproducción");
      }
    } catch (error) {
      console.error("Error obteniendo la última canción:", error);
    }
  };

  return (
      <TouchableWithoutFeedback onPress={() => menuAbierto && toggleMenu()}>
        <View style={styles.container}>
          <Animated.View
            pointerEvents={menuAbierto ? 'auto' : 'none'}
            style={[
              styles.blurView,
              {
                opacity: blurAnimation.interpolate({ inputRange: [0, 1], outputRange: [0, 0.7] }),
                zIndex: 1,
              },
            ]}
          />

          <View pointerEvents={menuAbierto ? 'none' : 'auto'} style={{ flex: 1 }}>
            <View style={styles.headerContainer}>
              <Text style={styles.greeting}>Hola 😄, {userName}</Text>
              <TouchableOpacity onPress={() => navigation.navigate('ProfileScreen')}>
                <Image source={{uri: profilePhoto}} style={styles.profileImage} />
              </TouchableOpacity>
            </View>

            <ScrollView 
              style={styles.scrollContainer}
              refreshControl={
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={onRefresh}
                  colors={['#f2ab55']}
                  tintColor="#f2ab55"
                />
              }
            >
              {/* Sección Tus Listas */}
              <View style={styles.sectionContainer}>
                <Text style={styles.subTitle}>Tus Listas</Text>
                {playlistCreadas.length === 0 ? (
                  <TouchableOpacity
                    style={styles.createFirstPlaylistButton}
                    onPress={() => navigation.navigate("CrearPlaylist")}
                  >
                    <Text style={styles.createFirstPlaylistButtonText}>Crea tu 1ª Playlist!</Text>
                  </TouchableOpacity>
                ) : (
                  <FlatList
                    data={playlistCreadas}
                    renderItem={renderPlaylistCreada}
                    keyExtractor={(item, index) => index.toString()}
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.horizontalListContent}
                  />
                )}
              </View>

              {/* Sección Recomendaciones */}
              <View style={styles.sectionContainer}>
                <Text style={styles.subTitle}>Recomendaciones</Text>
                {recomendations.length === 0 ? (
                  <Text style={styles.noContentText}>No hay recomendaciones disponibles</Text>
                ) : (
                  <FlatList
                    data={recomendations}
                    renderItem={renderRecomendationsItem}
                    keyExtractor={(item, index) => index.toString()}
                    numColumns={2}
                    scrollEnabled={false}
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={styles.gridListContent}
                  />
                )}
              </View>
              
              {/* Espacio para el menú inferior */}
              <View style={{ height: 100 }} />
            </ScrollView>
          </View>

          <View style={styles.bottomContainer}>
            {renderBotonesMenu()}
            <TouchableOpacity style={styles.halfCircleButton} onPress={toggleMenu} activeOpacity={0.8}>
              <Text style={styles.buttonText}>{menuAbierto ? 'x' : '. . .'}</Text>
            </TouchableOpacity>

            {cancionSonando && !menuAbierto && (
              <TouchableOpacity onPress={handleOpenMusicPlayer} style={styles.musicIconContainer}>
                <Animated.Image
                  source={require('../assets/disc.png')}
                  style={[styles.discIcon, { transform: [{ rotate: spin }] }]}
                />
              </TouchableOpacity>
            )}
          </View>
        </View>
      </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingTop: 40,
    flex: 1,
    backgroundColor: '#121111',
  },
  scrollContainer: {
    flex: 1,
    paddingHorizontal: 15,
  },
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 15,
    paddingHorizontal: 20,
  },
  greeting: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  profileImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  sectionContainer: {
    marginBottom: 20,
  },
  subTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#f2ab55',
    marginLeft: 5,
    marginBottom: 10,
  },
  horizontalListContent: {
    paddingLeft: 5,
    paddingBottom: 5,
  },
  playlistItem: {
    width: width / 3.2,
    marginRight: 12,
    alignItems: 'center',
  },
  playlistImage: {
    width: width / 3.5,
    height: width / 3.5,
    borderRadius: 12,
    backgroundColor: '#333',
  },
  playlistTitle: {
    marginTop: 8,
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  gridListContent: {
    paddingHorizontal: 5,
    alignItems: 'center',
  },
  recomendationsItem: {
    width: width / 2.17,
    marginBottom: 12,
    alignItems: 'center',
    paddingHorizontal: 10,
  },
  recomendationsImage: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: 12,
    backgroundColor: '#333',
  },
  recomendationsTitle: {
    marginTop: 8,
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  noContentText: {
    color: '#aaa',
    textAlign: 'center',
    marginVertical: 20,
    fontSize: 16,
  },
  createFirstPlaylistButton: {
    backgroundColor: '#ffb723',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignSelf: 'center',
  },
  createFirstPlaylistButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
  blurView: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#000',
    zIndex: 1,
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
    bottom: 15,
    right: 16,
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
    zIndex: 4,
  },
  discIcon: {
    width: 80,
    height: 80,
    borderRadius: 35,
  },
});