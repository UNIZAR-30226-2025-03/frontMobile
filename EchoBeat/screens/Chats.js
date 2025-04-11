import React, { useState, useRef, useLayoutEffect, useEffect } from 'react';
import { 
  View, 
  Text, 
  FlatList, 
  Image, 
  StyleSheet, 
  Dimensions, 
  TouchableOpacity, 
  Animated 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');

export default function ChatScreen({ navigation }) {
  const [cancionSonando, setCancionSonando] = useState(true);
  const [chats, setChats] = useState([]);
  const [userName, setUserName] = useState('');

  const rotation = useRef(new Animated.Value(0)).current;

  // Configurar navegación: ocultar header
  useLayoutEffect(() => {
    navigation.setOptions({ headerShown: false });
  }, [navigation]);

  // Iniciar animación para el icono de música
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

  // Se hace la petición para cargar los chats recientes y obtener el nick de cada usuario
  useEffect(() => {
    const fetchChats = async () => {
      try {
        // Cambia el email si es necesario o recupéralo dinámicamente
        const userEmail = 'userA@gmail.com';
        const encodedEmail = encodeURIComponent(userEmail);
        const response = await fetch(`https://echobeatapi.duckdns.org/chat/chatsDelUsuario?userEmail=${encodedEmail}`, {
          headers: { accept: '*/*' }
        });
        if (!response.ok) {
          throw new Error('Error al obtener los chats'); 
        }
        const data = await response.json();

        // Por cada chat se consulta el nick del usuario
        const chatsWithNick = await Promise.all(
          data.map(async (item) => {
            try {
              const response = await fetch(`https://echobeatapi.duckdns.org/users/get-user?userEmail=${userEmail}`);
              const data = await response.json();
              if (!response.ok) throw new Error(data.message || "Error al obtener el nombre del usuario");
              setUserName(data.Nick || 'Usuario');
              // Se asume que la respuesta es un objeto { nick: "..." } o directamente un string.
              return {
                ...item,
                contact: data.Nick || data,
                foto: data.LinkFoto || item.foto,
              };
            } catch (error) {
              console.error("Error al obtener nick para", item.contact, error);
              // En caso de error, se retorna el item original sin modificar
              return item;
            }
          })
        );
        setChats(chatsWithNick);
      } catch (error) {
        console.error("Error al cargar chats:", error);
      }
    };

    fetchChats();
  }, []);

  // Renderiza cada ítem de chat
  const renderChatItem = ({ item }) => (
    <TouchableOpacity 
      style={styles.chatItem} 
      onPress={() => navigation.navigate('ChatScreen', { chat: item })}
    >
      {item.foto ? (
        <Image source={{ uri: item.foto }} style={styles.profileImage} />
      ) : (
        <Image source={require('../assets/default_user_icon.png')} style={styles.profileImage} />
      )}
      <View style={styles.chatInfo}>
        <Text style={styles.nickname}>{item.contact}</Text>
        <Text style={styles.lastSong}>{item.mensaje}</Text>
      </View>
      <Ionicons name="chatbubble-ellipses-outline" size={20} color="#f2ab55" />
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        {/* Botón retroceso */}
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#f2ab55" />
        </TouchableOpacity>

        {/* Título */}
        <Text style={styles.title}>Chats con amigos</Text>

        {/* Botón invisible para equilibrar el layout */}
        <TouchableOpacity style={{ opacity: 0 }}>
          <Ionicons name="arrow-back" size={24} color="transparent" />
        </TouchableOpacity>
      </View>
      
      {/* Lista de chats recientes obtenidos de la API */}
      <FlatList
        data={chats}
        renderItem={renderChatItem}
        keyExtractor={(item, index) => index.toString()}
        contentContainerStyle={styles.chatList}
      />

      {/* Botón que muestra el icono de música */}
      {cancionSonando && (
        <TouchableOpacity 
          onPress={() => navigation.navigate('MusicPlayer')} 
          style={styles.musicIconContainer}
        >
          <Animated.Image
            source={require('../assets/disc.png')}
            style={[styles.musicIcon, { transform: [{ rotate: spin }] }]}
          />
        </TouchableOpacity>
      )}

      {/* Botón semicircular para ir al apartado Amistades */}
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
