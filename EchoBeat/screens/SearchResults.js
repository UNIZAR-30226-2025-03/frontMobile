import React, { useState, useEffect, useLayoutEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  Image,
  Modal,
  TouchableWithoutFeedback,
  TextInput,
  Keyboard,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function SearchResults({ route, navigation }) {
  const { initialResults, initialSearchText, initialSelectedOption } = route.params || {};
  const [searchText, setSearchText] = useState(initialSearchText || '');
  const [selectedOption, setSelectedOption] = useState(initialSelectedOption || null);
  const [results, setResults] = useState(initialResults || {});
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);

  useLayoutEffect(() => {
      navigation.setOptions({ headerShown: false });
  }, [navigation]);

  // Opciones disponibles
  const options = ["Canción", "Playlist", "Autor", "Álbum"];
  const optionMap = {
    "Canción": "canciones",
    "Playlist": "listas",
    "Autor": "artistas",
    "Álbum": "albums",
  };

  // Función para realizar la búsqueda
  const handleSearch = async () => {
    const tipo = selectedOption ? optionMap[selectedOption] : '';
    const url = `https://echobeatapi.duckdns.org/search?q=${encodeURIComponent(searchText)}${tipo ? `&tipo=${tipo}` : ''}`;

    try {
      const response = await fetch(url);
      const data = await response.json();

      // Filtrar los resultados según la opción seleccionada
      let filteredResults = { ...data };

      if (selectedOption === "Playlist") {
        // Excluir álbumes de las listas
        filteredResults.listas = (data.listas || []).filter((item) => item.TipoLista !== 'Album');
      } else if (selectedOption === "Álbum") {
        // Solo incluir álbumes
        filteredResults = {
          albums: data.albums || [],
          listas: (data.listas || []).filter((item) => item.TipoLista === 'Album'),
        };
      }

      setResults(filteredResults);
      Keyboard.dismiss(); // Ocultar el teclado después de la búsqueda
    } catch (error) {
      console.error("Error al realizar la búsqueda:", error);
    }
  };

  // Efecto para realizar la búsqueda inicial al cargar la pantalla
  useEffect(() => {
    if (initialSearchText) {
      handleSearch();
    }
  }, []);

  // Combinar álbumes y listas de álbumes
  const combinedAlbums = [
    ...(results.albums || []).map((item) => ({ ...item, type: 'album' })),
    ...(results.listas || []).filter((item) => item.TipoLista === 'Album').map((item) => ({ ...item, type: 'album' })),
  ];

  // Combinar todos los resultados en una sola lista
  const combinedResults = [
    ...combinedAlbums,
    ...(results.artistas || []).map((item) => ({ ...item, type: 'artist' })),
    ...(results.canciones || []).map((item) => ({ ...item, type: 'song' })),
    ...(results.listas || []).filter((item) => item.TipoLista !== 'Album').map((item) => ({ ...item, type: 'list' })),
  ];

  // Función para formatear la duración de las canciones (segundos a minutos:segundos)
  const formatDuration = (duration) => {
    const minutes = Math.floor(duration / 60);
    const seconds = duration % 60;
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
  };

  // Función para abrir el modal con los tres puntos
  const openModal = (item) => {
    setSelectedItem(item);
    setModalVisible(true);
  };

  // Renderizar cada elemento según su tipo
  const renderItem = ({ item }) => {
    switch (item.type) {
      case 'album':
        return (
          <View style={styles.itemContainer}>
            <Image
              source={{ uri: item.Portada || 'URL_por_defecto' }}
              style={styles.itemImage}
            />
            <View style={styles.itemTextContainer}>
              <Text style={styles.itemTitle}>{item.Nombre}</Text>
              <Text style={styles.itemSubtitle}>
                {item.NumCanciones || 0} canciones • {item.FechaLanzamiento?.split('T')[0]}
              </Text>
            </View>
            <TouchableOpacity onPress={() => openModal(item)}>
              <Ionicons name="ellipsis-vertical" size={24} color="#fff" />
            </TouchableOpacity>
          </View>
        );

      case 'artist':
        return (
          <View style={[styles.itemContainer, styles.artistContainer]}>
            <Image
              source={{ uri: item.FotoPerfil || 'URL_por_defecto' }}
              style={styles.artistImage}
            />
            <View style={styles.artistTextContainer}>
              <Text style={styles.artistName}>{item.Nombre}</Text>
              <Text style={styles.artistListeners}>{item.NumOyentesTotales || 0} oyentes</Text>
            </View>
            <TouchableOpacity onPress={() => openModal(item)}>
              <Ionicons name="ellipsis-vertical" size={24} color="#fff" />
            </TouchableOpacity>
          </View>
        );

      case 'song':
        return (
          <View style={styles.itemContainer}>
            <Image
              source={{ uri: item.Portada || 'URL_por_defecto' }}
              style={styles.itemImage}
            />
            <View style={styles.itemTextContainer}>
              <Text style={styles.itemTitle}>{item.Nombre}</Text>
              <Text style={styles.itemSubtitle}>
                {formatDuration(item.Duracion)} • {item.Genero}
              </Text>
            </View>
            <TouchableOpacity onPress={() => openModal(item)}>
              <Ionicons name="ellipsis-vertical" size={24} color="#fff" />
            </TouchableOpacity>
          </View>
        );

      case 'list':
        return (
          <View style={styles.itemContainer}>
            <Image
              source={{ uri: item.Portada || 'URL_por_defecto' }}
              style={styles.itemImage}
            />
            <View style={styles.itemTextContainer}>
              <Text style={styles.itemTitle}>{item.Nombre}</Text>
              <Text style={styles.itemSubtitle}>{item.NumLikes || 0} likes</Text>
            </View>
            <TouchableOpacity onPress={() => openModal(item)}>
              <Ionicons name="ellipsis-vertical" size={24} color="#fff" />
            </TouchableOpacity>
          </View>
        );

      default:
        return null;
    }
  };

  return (
    <TouchableWithoutFeedback onPress={() => Keyboard.dismiss()}>
      <View style={styles.container}>
        {/* Barra de búsqueda */}
        <View style={styles.topContainer}>
          <View style={styles.topBar}>
            <TouchableOpacity onPress={() => navigation.goBack()}>
              <Ionicons name="arrow-back" size={24} color="#f2ab55" />
            </TouchableOpacity>
            <TextInput
              style={styles.searchInput}
              placeholder="Buscar..."
              placeholderTextColor="#ccc"
              value={searchText}
              onChangeText={setSearchText}
              onSubmitEditing={handleSearch} // Buscar al presionar "Intro"
              returnKeyType="search"
            />
          </View>
        </View>

        {/* Resultados de la búsqueda */}
        <FlatList
          data={combinedResults}
          keyExtractor={(item) => `${item.type}-${item.Id}`}
          renderItem={renderItem}
          contentContainerStyle={styles.listContainer}
        />

        {/* Modal para los tres puntos */}
        <Modal
          transparent={true}
          visible={modalVisible}
          onRequestClose={() => setModalVisible(false)}
        >
          <TouchableWithoutFeedback onPress={() => setModalVisible(false)}>
            <View style={styles.modalOverlay}>
              <View style={styles.modalContent}>
                <TouchableOpacity
                  style={styles.closeButton}
                  onPress={() => setModalVisible(false)}
                >
                  <Ionicons name="close" size={24} color="#fff" />
                </TouchableOpacity>
                <Text style={styles.modalText}>Opciones para: {selectedItem?.Nombre}</Text>
                {/* Aquí puedes añadir más opciones */}
              </View>
            </View>
          </TouchableWithoutFeedback>
        </Modal>
      </View>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  topContainer: {
    padding: 16,
    marginTop: 40,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  searchInput: {
    flex: 1,
    backgroundColor: '#333',
    borderRadius: 8,
    marginLeft: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    color: '#fff',
    fontSize: 18,
  },
  listContainer: {
    paddingBottom: 20,
  },
  itemContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  itemImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
    marginRight: 16,
  },
  itemTextContainer: {
    flex: 1,
  },
  itemTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  itemSubtitle: {
    color: '#ccc',
    fontSize: 14,
  },
  artistContainer: {
    backgroundColor: '#222',
    borderRadius: 8,
    padding: 16,
  },
  artistImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
    marginRight: 16,
  },
  artistTextContainer: {
    flex: 1,
  },
  artistName: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  artistListeners: {
    color: '#ccc',
    fontSize: 14,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: '#333',
    borderRadius: 8,
    padding: 16,
    width: '80%',
  },
  closeButton: {
    alignSelf: 'flex-end',
  },
  modalText: {
    color: '#fff',
    fontSize: 16,
    marginTop: 8,
  },
});