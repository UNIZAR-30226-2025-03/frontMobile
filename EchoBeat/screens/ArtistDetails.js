import React, { useState, useEffect, useLayoutEffect } from 'react';
import { 
  View, 
  Text, 
  Image, 
  StyleSheet, 
  TouchableOpacity, 
  Modal, 
  TouchableWithoutFeedback, 
  FlatList, 
  Dimensions, 
  ScrollView 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function ArtistDetails({ route, navigation }) {
  const { artist } = route.params; // Se espera que artist tenga al menos la propiedad "nombre" o "Nombre"
  const [artistData, setArtistData] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);

  useLayoutEffect(() => {
    navigation.setOptions({ headerShown: false });
  }, [navigation]);

  useEffect(() => {
    const fetchArtistDetails = async () => {
      try {
        const response = await fetch(`https://echobeatapi.duckdns.org/artistas/perfil?artistName=${encodeURIComponent(artist.nombre || artist.Nombre)}`);
        const data = await response.json();
        setArtistData(data);
      } catch (error) {
        console.error("Error al obtener detalles del artista:", error);
      }
    };

    fetchArtistDetails();
  }, [artist]);

  // Obtenemos la altura de la pantalla para limitar el modal
  const { height } = Dimensions.get('window');
  const modalMaxHeight = (2 / 3) * height;

  if (!artistData) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Cargando información del artista...</Text>
      </View>
    );
  }

  // Renderizado de cada álbum en la discografía (más grande)
  const renderAlbumItem = ({ item }) => (
    <TouchableOpacity 
      style={styles.albumItem} 
      onPress={() => navigation.navigate('AlbumDetails', { album: item })}
    >
      <Image source={{ uri: item.Portada || 'https://via.placeholder.com/150' }} style={styles.albumImage} />
      <Text style={styles.albumTitle}>{item.Nombre}</Text>
    </TouchableOpacity>
  );

  // Renderizado de cada canción en Top Canciones (vertical)
  const renderSongItem = ({ item }) => (
    <View style={styles.songItem}>
      <Image source={{ uri: item.Portada || 'https://via.placeholder.com/150' }} style={styles.songImage} />
      <View style={styles.songInfo}>
        <Text style={styles.songTitle}>{item.Nombre}</Text>
      </View>
    </View>
  );

  // Header que se mostrará en la FlatList
  const ListHeaderComponent = () => (
    <View>
      {/* Cabecera con la imagen del artista, botón de volver y botón para ver biografía */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerButton}>
          <Ionicons name="arrow-back" size={24} color="#f2ab55" />
        </TouchableOpacity>
        <Image 
          source={{ uri: artistData.artista.FotoPerfil || 'https://via.placeholder.com/150' }} 
          style={styles.artistImage} 
        />
        <View style={styles.artistNameContainer}>
          <Text style={styles.artistName}>{artist.nombre || artist.Nombre}</Text>
          <TouchableOpacity onPress={() => setModalVisible(true)}>
            <Ionicons name="book-outline" size={24} color="#fff" style={styles.bioIcon} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Sección de Discografía */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Discografía</Text>
        <FlatList
          data={artistData.discografia}
          renderItem={renderAlbumItem}
          keyExtractor={(item) => item.Id.toString()}
          horizontal={true}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 16 }}
        />
      </View>

      {/* Título para la sección de Top Canciones */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Top Canciones</Text>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={artistData.topCanciones}
        renderItem={renderSongItem}
        keyExtractor={(item) => item.Id.toString()}
        ListHeaderComponent={ListHeaderComponent}
        contentContainerStyle={{ paddingBottom: 16 }}
      />

      {/* Modal para mostrar la biografía */}
      <Modal
        transparent={true}
        visible={modalVisible}
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <TouchableWithoutFeedback onPress={() => setModalVisible(false)}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback>
              <View style={[styles.modalContent, { maxHeight: modalMaxHeight }]}>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>Biografía</Text>
                  <TouchableOpacity onPress={() => setModalVisible(false)}>
                    <Ionicons name="close" size={24} color="#fff" />
                  </TouchableOpacity>
                </View>
                <ScrollView>
                  <Text style={styles.modalText}>{artistData.artista.Biografia}</Text>
                </ScrollView>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#fff',
    fontSize: 18,
  },
  header: {
    marginTop: 40,
    alignItems: 'center',
    marginBottom: 24,
    position: 'relative',
  },
  headerButton: {
    position: 'absolute',
    top: 16,
    left: 16,
    zIndex: 1,
  },
  artistImage: {
    width: 275,
    height: 275,
    borderRadius: 150,
    marginBottom: 12,
  },
  artistNameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  artistName: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
    marginRight: 8,
  },
  bioIcon: {},
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    color: '#f2ab55',
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 12,
    paddingHorizontal: 16,
  },
  albumItem: {
    marginRight: 16,
    alignItems: 'center',
  },
  albumImage: {
    width: 150,
    height: 150,
    borderRadius: 8,
    marginBottom: 8,
  },
  albumTitle: {
    color: '#fff',
    fontSize: 16,
  },
  songItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    paddingHorizontal: 16,
  },
  songImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
    marginRight: 8,
  },
  songInfo: {
    justifyContent: 'center',
  },
  songTitle: {
    color: '#fff',
    fontSize: 16,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#333',
    borderRadius: 8,
    padding: 16,
    width: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  modalTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  modalText: {
    color: '#fff',
    fontSize: 16,
  },
});
