import React, { useState, useRef, useLayoutEffect, useEffect, useCallback } from 'react';
import { View, Text, FlatList, Image, StyleSheet, Dimensions, TouchableOpacity, Animated, Easing, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width } = Dimensions.get('window');

export default function Chats({ navigation, route }) {
  const { userEmail } = route.params;  // Se recibe el email del usuario desde los parámetros
  const [chats, setChats] = useState([]);
  const [refreshing, setRefreshing] = useState(false); // Nuevo estado para refrescar
  const [cancionSonando, setCancionSonando] = useState(false);
  const [estaReproduciendo, setEstaReproduciendo] = useState(false);
  const rotation = useRef(new Animated.Value(0)).current;

  useLayoutEffect(() => {
    navigation.setOptions({ headerShown: false });
  }, [navigation]);


  // Función para cargar chats vía API
  const fetchChats = useCallback(async () => {
    try {
      const encodedEmail = encodeURIComponent(userEmail);
      const response = await fetch(`https://echobeatapi.duckdns.org/chat/chatsDelUsuario?userEmail=${encodedEmail}`, {
        headers: { accept: '*/*' }
      });
      if (!response.ok) {
        throw new Error('Error al obtener los chats');
      }
      const data = await response.json();
      // Se asume que cada objeto "item" tiene la propiedad "contact" (correo del amigo) y "mensaje"
      const chatsWithEmail = data.map(item => ({
        ...item,
        contact: item.contact,
        foto: item.foto,
      }));
      setChats(chatsWithEmail);
    } catch (error) {
      console.error("Error al cargar chats:", error);
    }
  }, [userEmail]);

  // Cargar chats al montar la pantalla
  useFocusEffect(
    useCallback(() => {
      checkSongPlaying();
      if (userEmail) {
        fetchChats();
      }
    }, [userEmail, fetchChats])
  );

  useEffect(() => {
    checkSongPlaying();
  }, []);

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

  const stopRotation = () => {
    rotation.stopAnimation(() => {
      rotation.setValue(0);
    });
  };

  const spin = rotation.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

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
    
  // Función para refrescar la lista de chats (pull to refresh)
  const onRefresh = async () => {
    setRefreshing(true);
    await fetchChats();
    setRefreshing(false);
  };

  const renderChatItem = ({ item }) => (
    <TouchableOpacity 
      style={styles.chatItem} 
      onPress={() => navigation.navigate('ChatScreen', { chat: item, userEmail })}
    >
      {item.foto ? (
        <Image source={{ uri: item.foto }} style={styles.profileImage} />
      ) : (
        <Image source={require('../assets/default_user_icon.png')} style={styles.profileImage} />
      )}
      <View style={styles.chatInfo}>
        {/* Se muestra el correo (contact) encima del último mensaje */}
        <Text style={styles.friendEmail}>{item.contact}</Text>
        <Text style={styles.lastSong}>{item.mensaje}</Text>
      </View>
      <Ionicons name="chatbubble-ellipses-outline" size={20} color="#f2ab55" />
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#f2ab55" />
        </TouchableOpacity>
        <Text style={styles.title}>Chats con amigos</Text>
        <TouchableOpacity style={{ opacity: 0 }}>
          <Ionicons name="arrow-back" size={24} color="transparent" />
        </TouchableOpacity>
      </View>
      
      <FlatList
        data={chats}
        renderItem={renderChatItem}
        keyExtractor={(item, index) => index.toString()}
        contentContainerStyle={styles.chatList}
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={onRefresh} 
            colors={['#f2ab55']}
            tintColor="#f2ab55"
          />
        }
      />

      <View style={styles.bottomContainer}>
        <TouchableOpacity 
          style={styles.halfCircleButton} 
          onPress={() => navigation.navigate('Amistades', { userEmail })}
        >
          <Ionicons name="people-outline" size={30} color="#fff" />
        </TouchableOpacity>
      </View>
      {cancionSonando && (
          <TouchableOpacity onPress={handleOpenMusicPlayer} style={styles.playerButton}>
            <Animated.Image
              source={require('../assets/disc.png')}
              style={[styles.playerIcon, { transform: [{ rotate: spin }] }]} 
            />
          </TouchableOpacity>
        )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121111',
    paddingHorizontal: 15,
    paddingTop: 40,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#f2ab55',
    textAlign: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  chatList: {
    paddingBottom: 20,
  },
  chatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E1E1E',
    padding: 12,
    borderRadius: 10,
    marginBottom: 10,
  },
  profileImage: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 15,
  },
  chatInfo: {
    flex: 1,
  },
  friendEmail: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 2,
  },
  lastSong: {
    fontSize: 14,
    color: '#bbbbbb',
  },
  musicIconContainer: {
    position: 'absolute',
    bottom: 20,
    right: 20,
  },
  musicIcon: {
    width: 60,
    height: 60,
  },
  bottomContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 100,
    justifyContent: 'flex-end',
    alignItems: 'center',
    zIndex: 5,
  },
  halfCircleButton: {
    width: 160,
    height: 100,
    borderTopLeftRadius: 100,
    borderTopRightRadius: 100,
    backgroundColor: '#ffb723',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: -20,
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
    zIndex: 5,
  },
  playerIcon: { 
    width: 80, 
    height: 80, 
    borderRadius: 35 
  },
});
