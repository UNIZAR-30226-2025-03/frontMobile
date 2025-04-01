import React, { useState, useRef, useLayoutEffect, useEffect } from 'react';
import { View, Text, FlatList, Image, StyleSheet, Dimensions, TouchableOpacity, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

export default function ChatScreen({ navigation }) {
  const [cancionSonando, setCancionSonando] = useState(true);
  const rotation = useRef(new Animated.Value(0)).current;

  const amigos = [
    { id: '1', nickname: 'Pedro', ultimaCancion: 'Bohemian Rhapsody', fotoPerfil: require('../assets/thanos1.jpg') },
    { id: '2', nickname: 'Elías', ultimaCancion: 'Rolling in the Deep', fotoPerfil: require('../assets/eliasgossip.jpg') },
    { id: '3', nickname: 'Carlos', ultimaCancion: 'Hotel California', fotoPerfil: require('../assets/carloscoche.jpg') },
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
      <Text style={styles.title}>Chats con amigos</Text>
  
      <FlatList
        data={amigos}
        renderItem={renderChatItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.chatList}
      />
  
      {cancionSonando && (
        <TouchableOpacity onPress={() => navigation.navigate('MusicPlayer')} style={styles.musicIconContainer}>
          <Animated.Image
            source={require('../assets/favicon.png')}
            style={[styles.musicIcon, { transform: [{ rotate: spin }] }]}
          />
        </TouchableOpacity>
      )}
  
      {/* Botón semicircular para el apartado Amistades */}
      <View style={styles.bottomContainer}>
        <TouchableOpacity 
          style={styles.halfCircleButton} 
          onPress={() => navigation.navigate('Amistades')}
        >
          <Ionicons name="people-outline" size={30} color="#fff" />
        </TouchableOpacity>
      </View>
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
});
