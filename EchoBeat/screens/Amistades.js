import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, FlatList, TouchableOpacity, Image, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';

export default function Amistades({ navigation }) {
  const [nick, setNick] = useState('');
  const [solicitudes, setSolicitudes] = useState([]);
  const [busqueda, setBusqueda] = useState('');

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

  const renderItem = ({ item }) => (
    <View style={styles.solicitudItem}>
    <Image
      source={require('../assets/logo.png')} // Imagen por defecto ya que no tenemos foto
      style={styles.avatar}
    />
    <Text style={styles.nick}>{item.NickFriendSender}</Text>
    <View style={styles.botones}>
      <TouchableOpacity style={styles.botonAceptar}>
        <Ionicons name="checkmark" size={18} color="#121111" />
      </TouchableOpacity>
      <TouchableOpacity style={styles.botonRechazar}>
        <Ionicons name="close" size={18} color="#fff" />
      </TouchableOpacity>
    </View>
  </View>
  );

  return (
    <View style={styles.container}>

      <Text style={styles.title}>Amigos</Text>

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
    fontSize: 26,
    fontWeight: 'bold',
    color: '#f2ab55',
    marginBottom: 20,
    textAlign: 'center',
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
});