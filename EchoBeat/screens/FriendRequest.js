import React, { useState, useEffect, useLayoutEffect } from 'react';
import { View, Text, StyleSheet, TextInput, FlatList, TouchableOpacity, Image, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';

export default function FriendRequest({ navigation }) {
  const [nick, setNick] = useState('');
  const [solicitudes, setSolicitudes] = useState([]);
  const [busqueda, setBusqueda] = useState('');
  const [mensajeConfirmacion, setMensajeConfirmacion] = useState('');


  useLayoutEffect(() => {
    navigation.setOptions({ headerShown: false });
  }, [navigation]);

  useEffect(() => {
    const cargarSolicitudes = async () => {
        const email = await AsyncStorage.getItem('email');
        if (!email) {
          console.warn("⚠️ No se encontró el email del usuario.");
          return;
        }
    
        try {
          const resUser = await fetch(`https://echobeatapi.duckdns.org/users/get-user?userEmail=${email}`);
          const userData = await resUser.json();
          const nickUsuario = userData.Nick;
          setNick(nickUsuario);

          const res = await fetch(`https://echobeatapi.duckdns.org/amistades/verSolicitudes/${nickUsuario}`);
          const data = await res.json();
          setSolicitudes(data || []);
        } catch (error) {
          console.error("❌ Error cargando solicitudes:", error);
          Alert.alert('Error', 'No se pudieron cargar las solicitudes');
        }
      };

    cargarSolicitudes();
  }, []);

  const gestionarSolicitud = async (accion, nickSender) => {
    try {
      const endpoint = accion === 'aceptar' ? 'aceptar' : 'rechazar';
  
      const response = await fetch(`https://echobeatapi.duckdns.org/amistades/${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nickSender: nickSender,
          nickReceiver: nick,
        }),
      });
  
      if (!response.ok) throw new Error(await response.text());
  
      // Actualizar lista sin recargar
      setSolicitudes(prev => prev.filter(s => s.NickFriendSender !== nickSender));
      setMensajeConfirmacion(`Solicitud ${accion === 'aceptar' ? 'aceptada' : 'rechazada'}`);
  
      setTimeout(() => setMensajeConfirmacion(''), 3000);
    } catch (error) {
      console.error(`❌ Error al ${accion} solicitud:`, error.message);
      Alert.alert('Error', `No se pudo ${accion} la solicitud.`);
    }
  };  

  const renderItem = ({ item }) => (
    <View style={styles.solicitudItem}>
    <Image
            source={item.LinkFoto ? { uri: item.LinkFoto } : require('../assets/logo.png')}
            style={styles.avatar}
    />
    <Text style={styles.nick}>{item.NickFriendSender}</Text>
    <View style={styles.botones}>
    <TouchableOpacity style={styles.botonAceptar} onPress={() => gestionarSolicitud('aceptar', item.NickFriendSender)}>
      <Ionicons name="checkmark" size={18} color="#121111" />
    </TouchableOpacity>
    <TouchableOpacity style={styles.botonRechazar} onPress={() => gestionarSolicitud('rechazar', item.NickFriendSender)}>
      <Ionicons name="close" size={18} color="#fff" />
    </TouchableOpacity>
    </View>
  </View>
  );

  return (
    <View style={styles.container}>

      <View style={styles.header}>
        {/* Botón retroceso */}
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#f2ab55" />
        </TouchableOpacity>
      
        {/* Título */}
        <Text style={styles.title}>Solicitudes</Text>
      
        {/* Botón invisible para equilibrar el layout */}
        <TouchableOpacity style={{ opacity: 0 }}>
          <Ionicons name="arrow-back" size={24} color="transparent" />
        </TouchableOpacity>
      </View>

      <TextInput
        style={styles.searchInput}
        placeholder="Introducir Nick al que enviar solicitud"
        placeholderTextColor="#bbb"
        value={busqueda}
        onChangeText={setBusqueda}
      />

      <FlatList
        data={solicitudes}
        renderItem={renderItem}
        keyExtractor={(item, index) => index.toString()}
        contentContainerStyle={{ paddingBottom: 30 }}
      />

      {/* Mensaje de confirmación */}
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
  backButton: {
    marginBottom: 10,
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
  searchInput: {
    backgroundColor: '#1e1e1e',
    padding: 10,
    borderRadius: 8,
    borderColor: '#f2ab55',
    borderWidth: 1,
    color: '#fff',
    marginBottom: 20,
  },
  solicitudItem: {
    backgroundColor: '#1e1e1e',
    padding: 10,
    borderRadius: 10,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 45,
    height: 45,
    borderRadius: 25,
    marginRight: 12,
    backgroundColor: '#444',
  },
  nick: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
    flex: 1,
  },
  botones: {
    flexDirection: 'row',
    gap: 8,
  },
  botonAceptar: {
    backgroundColor: '#f2ab55',
    borderRadius: 20,
    padding: 6,
  },
  botonRechazar: {
    backgroundColor: '#d9534f',
    borderRadius: 20,
    padding: 6,
  },
  toast: {
    position: 'absolute',
    bottom: 30,
    left: '10%',
    right: '10%',
    backgroundColor: '#f2ab55',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    elevation: 4,
  },
  toastText: {
    color: '#121111',
    fontWeight: 'bold',
  },
});