import React, { useState, useEffect, useLayoutEffect, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, TextInput, FlatList, TouchableOpacity, Image, Animated, Easing, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';

/**
 * Pantalla de gestión de amistades. Permite ver la lista de amigos,
 * buscar por nick, eliminar amistades y navegar a solicitudes de amistad.
 *
 * @param {object} navigation - Objeto de navegación de React Navigation.
 * @param {object} route - Objeto de ruta de React Navigation.
 * @param {string} route.params.userEmail - Email del usuario autenticado.
 */
export default function Amistades({ navigation, route }) {
  const { userEmail } = route.params;
  const [nick, setNick] = useState('');
  const [amigos, setAmigos] = useState([]);
  const [busqueda, setBusqueda] = useState('');
  const [numSolicitudes, setNumSolicitudes] = useState(0);
  const [mensajeConfirmacion, setMensajeConfirmacion] = useState('');
  const [cancionSonando, setCancionSonando] = useState(false);
  const [estaReproduciendo, setEstaReproduciendo] = useState(false);
  const rotation = useRef(new Animated.Value(0)).current;

  useLayoutEffect(() => {
      navigation.setOptions({ headerShown: false });
  }, [navigation]);

  useFocusEffect(
    useCallback(() => {
      cargarAmigos();
      checkSongPlaying();
    }, [])
  );

  useEffect(() => {
    checkSongPlaying();
  }, []);

  /**
   * Comprueba si hay una canción en reproducción según AsyncStorage
   * y activa/desactiva la animación de rotación del icono.
   */
  const checkSongPlaying = async () => {
    const lastSong = await AsyncStorage.getItem('lastSong');
    const isPlaying = await AsyncStorage.getItem('isPlaying');

    const hayCancion = !!lastSong;
    const reproduciendo = isPlaying === 'true';

    setCancionSonando(hayCancion);
    setEstaReproduciendo(reproduciendo);

    if (hayCancion && reproduciendo) {
      startRotationLoop();
    } else {
      stopRotation();
    }
  };

  /**
   * Inicia un bucle de animación rotatoria continua.
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
   * Detiene la animación rotatoria y reinicia su valor.
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
   * Navega a la pantalla MusicPlayer con la última canción guardada.
   */
  const handleOpenMusicPlayer = async () => {
    try {
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
        Alert.alert("No hay ninguna canción en reproducción");
      }
    } catch (error) {
      console.error("Error obteniendo la última canción:", error);
    }
  };

  /**
   * Obtiene el número de solicitudes de amistad pendientes para un nick dado.
   *
   * @param {string} nickUsuario - Nick del usuario para consultar solicitudes.
   */
  const cargarSolicitudes = async (nickUsuario) => {
    try {
      const res = await fetch(`https://echobeatapi.duckdns.org/amistades/verSolicitudes/${nickUsuario}`);
      const data = await res.json();
      setNumSolicitudes(data.length);
    } catch (error) {
      console.error("Error al cargar solicitudes:", error);
      setNumSolicitudes(0);
    }
  };  

  /**
   * Carga la lista de amigos del usuario y su propio nick desde la API.
   */
  const cargarAmigos = async () => {
    try {
      const email = await AsyncStorage.getItem('email');
      if (!email) {
        console.warn("No se encontró el email del usuario.");
        return;
      }

      const resUser = await fetch(`https://echobeatapi.duckdns.org/users/get-user?userEmail=${email}`);
      const userData = await resUser.json();
      const nickUsuario = userData.Nick;
      setNick(nickUsuario);
      await cargarSolicitudes(nickUsuario);

      const res = await fetch(`https://echobeatapi.duckdns.org/amistades/verAmigos/${nickUsuario}`);
      const data = await res.json();
      setAmigos(data || []);
      //console.log("Amigos:", data);
    } catch (error) {
      console.error("Error al cargar amigos:", error);
      Alert.alert('Error', 'No se pudieron cargar los amigos');
    }
  };

  /**
   * Elimina una amistad entre el usuario actual y otro por nick.
   *
   * @param {string} nickReceiver - Nick del amigo a eliminar.
   */
  const eliminarAmigo = async (nickReceiver) => {
    try {
      console.log(`Eliminando a: ${nick} -> ${nickReceiver}`);
      const response = await fetch(`https://echobeatapi.duckdns.org/amistades/eliminar/${nick}/${nickReceiver}`, {
        method: 'DELETE',
      });
  
      const result = await response.json();
  
      if (response.ok) {
        setMensajeConfirmacion(result.message || 'Amistad eliminada.');
        // Recargamos la lista de amigos tras eliminar
        setAmigos(prev => prev.filter(a => a.Nick !== nickReceiver));
      } else {
        setMensajeConfirmacion('Error al eliminar al amigo');
      }
    } catch (error) {
      console.error("Error eliminando amigo:", error);
      setMensajeConfirmacion('Error al eliminar al amigo');
    }
  
    setTimeout(() => setMensajeConfirmacion(''), 3000);
  };  

  // Filtra amigos según texto de búsqueda en el nick
  const amigosFiltrados = amigos.filter(a =>
    a.Nick?.toLowerCase().includes(busqueda.toLowerCase())
  );

  /**
   * Renderiza cada elemento de la lista de amigos.
   *
   * @param {object} param0 - Objeto con la propiedad item.
   * @param {object} param0.item - Datos de un amigo.
   */
  const renderItem = ({ item }) => (
    <TouchableOpacity
      style={styles.friendItem}
      onPress={() => navigation.navigate('ProfileAmistades', { userEmail: item.Email })}
    >
      <Image
        source={item.LinkFoto ? { uri: item.LinkFoto } : require('../assets/logo.png')}
        style={styles.avatar}
      />
      <View style={{ flex: 1 }}>
        <Text style={styles.nick}>{item.Nick}</Text>
        <Text style={styles.lastSong}>Última canción escuchada: {item.CancionActual || 'Ninguna'}</Text>
      </View>
      <TouchableOpacity onPress={() => eliminarAmigo(item.Nick)}>
        <Ionicons name="person-remove-outline" size={24} color="red" />
      </TouchableOpacity>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        {/* Icono de retroceso a la pantalla anterior */}
        <TouchableOpacity onPress={() => navigation.goBack()} >
          <Ionicons name="arrow-back" size={24} color="#f2ab55" />
        </TouchableOpacity>

        {/* Título y campanita */}
        <Text style={styles.title}>Amigos</Text>
        <TouchableOpacity onPress={() => navigation.navigate('FriendRequest')} style={{ position: 'relative' }}>
        <Ionicons name="notifications-outline" size={26} color="#f2ab55" />
        {numSolicitudes > 0 && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{numSolicitudes}</Text>
          </View>
        )}
      </TouchableOpacity>
      </View>

      {/* Buscador */}
      <TextInput
        style={styles.searchInput}
        placeholder="Buscar amigo por nick"
        placeholderTextColor="#bbb"
        value={busqueda}
        onChangeText={setBusqueda}
      />

      {/* Lista de amigos */}
      <FlatList
        data={amigosFiltrados}
        renderItem={renderItem}
        keyExtractor={(item, index) => index.toString()}
        contentContainerStyle={{ paddingBottom: 30 }}
      />
      {cancionSonando && (
          <TouchableOpacity onPress={handleOpenMusicPlayer} style={styles.playerButton}>
            <Animated.Image
              source={require('../assets/disc.png')}
              style={[styles.playerIcon, { transform: [{ rotate: spin }] }]} 
            />
          </TouchableOpacity>
      )}      

      {mensajeConfirmacion !== '' && (
        <View style={styles.toast}>
          <Text style={styles.toastText}>{mensajeConfirmacion}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121111',
    paddingTop: 50,
    paddingHorizontal: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#f2ab55',
  },
  searchInput: {
    backgroundColor: '#1e1e1e',
    padding: 10,
    borderRadius: 8,
    borderColor: '#f2ab55',
    borderWidth: 1,
    color: '#fff',
    marginBottom: 20,
  },
  friendItem: {
    backgroundColor: '#1e1e1e',
    padding: 12,
    borderRadius: 10,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 12,
    backgroundColor: '#444',
  },
  nick: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  lastSong: {
    color: '#ccc',
    fontSize: 14,
  },
  badge: {
    position: 'absolute',
    top: -6,
    right: -6,
    backgroundColor: 'red',
    borderRadius: 10,
    width: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: 'bold',
  },
  toast: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
    backgroundColor: '#ffb723',
    padding: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  toastText: {
    color: '#000',
    fontSize: 14,
    fontWeight: 'bold',
  },
  playerButton: {
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
  playerIcon: { 
    width: 80, 
    height: 80, 
    borderRadius: 35 
  },

});
