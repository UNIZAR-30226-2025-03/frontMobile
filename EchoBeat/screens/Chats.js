import React, { useState, useRef, useLayoutEffect, useEffect } from 'react';
import { View, Text, FlatList, Image, StyleSheet, Dimensions, TouchableOpacity, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

export default function ChatScreen({ navigation }) {
  const [cancionSonando, setCancionSonando] = useState(true);
  const rotation = useRef(new Animated.Value(0)).current;

  // 🔹 Simulación de amigos y chats
  const amigos = [
    { id: '1', nickname: 'Pedro', ultimaCancion: 'Bohemian Rhapsody', fotoPerfil: require('../assets/thanos1.jpg') },
    { id: '2', nickname: 'Lucía', ultimaCancion: 'Rolling in the Deep', fotoPerfil: require('../assets/jordi.jpg') },
    { id: '3', nickname: 'Carlos', ultimaCancion: 'Hotel California', fotoPerfil: require('../assets/mujerona.jpg') },
    { id: '4', nickname: 'María', ultimaCancion: 'Someone Like You', fotoPerfil: require('../assets/darkraul.jpg') },
    { id: '5', nickname: 'Andrés', ultimaCancion: 'Stairway to Heaven', fotoPerfil: require('../assets/jordi.jpg') },
    { id: '6', nickname: 'Sofía', ultimaCancion: 'Shape of You', fotoPerfil: require('../assets/thanos1.jpg') },
  ];

  useLayoutEffect(() => {
    navigation.setOptions({ headerShown: false });
  }, [navigation]);

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

  // 🔹 Renderizar cada amigo como un chat en la lista
  const renderChatItem = ({ item }) => (
    <TouchableOpacity style={styles.chatItem} onPress={() => navigation.navigate('ChatScreen', { friend: item })}>
      <Image source={item.fotoPerfil} style={styles.profileImage} />
      <View style={styles.chatInfo}>
        <Text style={styles.nickname}>{item.nickname}</Text>
        <Text style={styles.lastSong}>Última canción escuchada: {item.ultimaCancion}</Text>
      </View>
      <Ionicons name="chatbubble-ellipses-outline" size={20} color="#f2ab55" />
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {/* 🔹 Encabezado */}
      <Text style={styles.title}>Chats con amigos</Text>

      {/* 🔹 Lista de chats */}
      <FlatList
        data={amigos}
        renderItem={renderChatItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.chatList}
      />

      {/* 🔹 Icono rotatorio (acceso al reproductor musical) */}
      {cancionSonando && (
        <TouchableOpacity onPress={() => navigation.navigate('MusicPlayer')} style={styles.musicIconContainer}>
          <Animated.Image
            source={require('../assets/favicon.png')}
            style={[styles.musicIcon, { transform: [{ rotate: spin }] }]}
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
  nickname: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
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
});
