import React, { useState, useRef, useLayoutEffect, useEffect } from 'react';
import { 
  View, 
  Text, 
  FlatList, 
  Image, 
  TextInput, 
  TouchableOpacity, 
  StyleSheet, 
  Dimensions, 
  KeyboardAvoidingView,
  Platform,
  Animated 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { io } from 'socket.io-client';

const { width } = Dimensions.get('window');

export default function ChatScreen({ navigation, route }) {
  // Si se recibe el objeto "chat" en route.params, estamos en modo conversación.
  const chatDetail = route.params?.chat;

  // --------------------------
  // Estados para MODO LISTA DE CHATS:
  const [chats, setChats] = useState([]);
  const [cancionSonando, setCancionSonando] = useState(true);
  const rotation = useRef(new Animated.Value(0)).current;

  // --------------------------
  // Estados para MODO CONVERSACIÓN:
  const [message, setMessage] = useState('');
  const [chatMessages, setChatMessages] = useState([]);
  // Suponemos que el usuario autenticado es este (puedes reemplazarlo o recuperarlo de AsyncStorage)
  const [userEmail] = useState('userA@gmail.com');
  const socketRef = useRef(null);

  // Ocultar el header nativo para usar uno personalizado.
  useLayoutEffect(() => {
    navigation.setOptions({ headerShown: false });
  }, [navigation]);

  // MODO LISTA: Iniciar animación para el ícono de música
  useEffect(() => {
    if (!chatDetail) {
      Animated.loop(
        Animated.timing(rotation, {
          toValue: 1,
          duration: 4000,
          useNativeDriver: true,
        })
      ).start();
    }
  }, [rotation, chatDetail]);

  const spin = rotation.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  // MODO LISTA: Cargar chats recientes vía API
  useEffect(() => {
    if (!chatDetail) {
      const fetchChats = async () => {
        try {
          const user = 'userA@gmail.com';
          const encodedEmail = encodeURIComponent(user);
          const response = await fetch(
            `https://echobeatapi.duckdns.org/chat/chatsDelUsuario?userEmail=${encodedEmail}`,
            { headers: { accept: '*/*' } }
          );
          if (!response.ok) {
            throw new Error('Error al obtener los chats');
          }
          const data = await response.json();
          setChats(data);
        } catch (error) {
          console.error("Error al cargar chats:", error);
        }
      };
      fetchChats();
    }
  }, [chatDetail]);

  // MODO CONVERSACIÓN: Cargar historial de mensajes vía API
  useEffect(() => {
    if (chatDetail) {
      const fetchHistory = async () => {
        try {
          const url = `https://echobeatapi.duckdns.org/chat/historialDelChat?userPrincipal=${encodeURIComponent(userEmail)}&userAmigo=${encodeURIComponent(chatDetail.contact)}`;
          const response = await fetch(url, { headers: { accept: '*/*' } });
          if (!response.ok) {
            throw new Error("Error al cargar historial de chat");
          }
          const data = await response.json();
          const mappedMessages = data.map(item => ({
            key: String(item.Id),
            text: item.Mensaje,
            type: item.posicion === 'izquierda' ? 'received' : 'sent'
          }));
          setChatMessages(mappedMessages);
        } catch (error) {
          console.error("Error al cargar historial:", error);
        }
      };
      fetchHistory();
    }
  }, [chatDetail, userEmail]);

  // MODO CONVERSACIÓN: Conexión automática al WebSocket para enviar/recibir mensajes
  useEffect(() => {
    if (chatDetail) {
      socketRef.current = io("https://cdn.socket.io/4.6.1/socket.io.min.js://localhost:3000");
      socketRef.current.on("connect", () => {
        console.log("Conectado con ID:", socketRef.current.id);
        socketRef.current.emit("register", userEmail);
      });

      socketRef.current.on("receiveMessage", (mensaje) => {
        console.log("Mensaje recibido:", mensaje);
        setChatMessages(prev => [
          ...prev,
          { key: String(Date.now()), text: `${mensaje.EmailSender}: ${mensaje.Mensaje}`, type: 'received' }
        ]);
      });

      socketRef.current.on("messageSent", (mensaje) => {
        console.log("Mensaje enviado:", mensaje);
        setChatMessages(prev => [
          ...prev,
          { key: String(Date.now()), text: `Tú: ${mensaje.Mensaje}`, type: 'sent' }
        ]);
      });

      return () => {
        if (socketRef.current) {
          socketRef.current.disconnect();
          socketRef.current = null;
        }
      };
    }
  }, [chatDetail, userEmail]);

  // Función para enviar mensaje en modo conversación.
  // Esta función emite el mensaje vía WebSocket y además llama a la API para guardar el mensaje.
  const sendMessage = async () => {
    if (!socketRef.current || !socketRef.current.connected) {
      alert("No estás conectado al chat.");
      return;
    }
    if (!message.trim()) return;
    
    const senderId = userEmail;
    const receiverId = chatDetail.contact;
    const content = message.trim();

    // Emitir el mensaje vía WebSocket
    socketRef.current.emit("enviarMensaje", { senderId, receiverId, content });
    
    // Llamada a la API para guardar el mensaje.
    try {
      const url = `https://echobeatapi.duckdns.org/chat/guardarMensaje?senderId=${encodeURIComponent(senderId)}&receiverId=${encodeURIComponent(receiverId)}&content=${encodeURIComponent(content)}`;
      const response = await fetch(url, {
        method: 'POST',
        headers: { accept: '*/*' }
      });
      if (!response.ok) {
        throw new Error("Error al guardar el mensaje");
      }
      const data = await response.json();
      console.log("Mensaje guardado:", data);
    } catch (error) {
      console.error("Error al guardar el mensaje:", error);
    }

    // Actualizar localmente la lista de mensajes
    setChatMessages(prev => [
      ...prev,
      { key: String(Date.now()), text: `Tú: ${content}`, type: 'sent' }
    ]);
    setMessage('');
  };

  // MODO LISTA: Renderiza cada ítem del listado de chats recientes.
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

  // Si estamos en modo conversación, renderizamos la vista de chat detail.
  if (chatDetail) {
    return (
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={80}
      >
        {/* Header personalizado con el nombre del contacto */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color="#f2ab55" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{chatDetail.contact}</Text>
          <View style={{ width: 24 }} />
        </View>

        {/* Lista de mensajes de la conversación */}
        <FlatList
          data={chatMessages}
          renderItem={({ item }) => {
            const isSent = item.type === 'sent';
            return (
              <View style={[styles.messageBubble, isSent ? styles.sentBubble : styles.receivedBubble]}>
                <Text style={isSent ? styles.sentText : styles.receivedText}>{item.text}</Text>
              </View>
            );
          }}
          keyExtractor={item => item.key}
          style={styles.messagesList}
          contentContainerStyle={styles.messagesContent}
        />

        {/* Área para escribir y enviar mensajes */}
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder="Escribe un mensaje..."
            placeholderTextColor="#888"
            value={message}
            onChangeText={setMessage}
          />
          <TouchableOpacity style={styles.sendButton} onPress={sendMessage}>
            <Ionicons name="send" size={20} color="#121111" />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    );
  }

  // MODO LISTA: Renderizamos la pantalla de chats recientes.
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        {/* Botón retroceso */}
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
      />

      {cancionSonando && (
        <TouchableOpacity 
          onPress={() => navigation.navigate('MusicPlayer')} 
          style={styles.musicIconContainer}
        >
          <Animated.Image
            source={require('../assets/favicon.png')}
            style={[styles.musicIcon, { transform: [{ rotate: spin }] }]}
          />
        </TouchableOpacity>
      )}

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
  /* Estilos generales (modo lista) */
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
  headerTitle: {
    fontSize: 24,
    color: '#f2ab55',
    fontWeight: 'bold',
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
  /* Estilos para modo Conversación */
  messagesList: {
    flex: 1,
    paddingHorizontal: 15,
    backgroundColor: '#1E1E1E',
  },
  messagesContent: {
    paddingVertical: 15,
  },
  messageBubble: {
    maxWidth: '75%',
    borderRadius: 15,
    padding: 10,
    marginVertical: 5,
  },
  sentBubble: {
    backgroundColor: '#f2ab55',
    alignSelf: 'flex-end',
    borderBottomRightRadius: 0,
  },
  receivedBubble: {
    backgroundColor: '#333',
    alignSelf: 'flex-start',
    borderBottomLeftRadius: 0,
    borderWidth: 1,
    borderColor: '#444',
  },
  sentText: {
    color: '#121111',
  },
  receivedText: {
    color: '#f2ab55',
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 10,
    borderTopWidth: 1,
    borderTopColor: '#444',
    backgroundColor: '#1E1E1E',
    alignItems: 'center',
  },
  input: {
    flex: 1,
    height: 40,
    borderWidth: 1,
    borderColor: '#444',
    borderRadius: 20,
    paddingHorizontal: 15,
    color: '#f2ab55',
    marginRight: 10,
    backgroundColor: '#121111',
  },
  sendButton: {
    backgroundColor: '#f2ab55',
    borderRadius: 20,
    padding: 10,
  },
});
