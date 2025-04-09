import React, { useState, useLayoutEffect, useEffect } from 'react';
import { View, Text, TouchableOpacity, TextInput, StyleSheet, TouchableWithoutFeedback, Keyboard, Modal, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function Search({ navigation, route }) {
  const [searchText, setSearchText] = useState('');
  const [selectedOption, setSelectedOption] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [availableGeneros, setAvailableGeneros] = useState([]);

  const options = ["Canción", "Playlist", "Artista", "Álbum", "Géneros"];
  const optionMap = {
    "Canción": "canciones",
    "Playlist": "playlists",
    "Artista": "artistas",
    "Álbum": "albums"
  };

  useLayoutEffect(() => {
    navigation.setOptions({ headerShown: false });
  }, [navigation]);

  useEffect(() => {
    const getUserEmail = async () => {
      try {
        const email = await AsyncStorage.getItem('email');
        if (email) {
          setUserEmail(email);
        }
      } catch (error) {
        console.error("Error al obtener el email:", error);
      }
    };
    getUserEmail();
  }, []);

  useEffect(() => {
    if (route.params && route.params.defaultFilter) {
      setSelectedOption(route.params.defaultFilter);
    }
  }, [route.params]);

  const handleOptionPress = (option) => {
    if (option === "Géneros") {
      setModalVisible(true);
      obtenerGenerosModal();
      // No modificamos selectedOption en este caso
    } else {
      setSelectedOption(option === selectedOption ? null : option);
      setErrorMessage('');
    }
  };

  const handleSearch = async () => {
    setErrorMessage('');
    
    const tipo = selectedOption ? optionMap[selectedOption] : '';

    try {
      const email = await AsyncStorage.getItem('email');
      if (!email) {
        console.warn("No se encontró el email del usuario.");
        return;
      }

      const resUser = await fetch(`https://echobeatapi.duckdns.org/users/get-user?userEmail=${email}`);
      const userData = await resUser.json();
      const nickUsuario = userData.Nick;
      
      const url = `https://echobeatapi.duckdns.org/search?Búsqueda=${encodeURIComponent(searchText)}&tipo=${tipo}&usuarioNick=${encodeURIComponent(nickUsuario)}`;

      const response = await fetch(url);
      const data = await response.json();

      // Normalizar la estructura de resultados
      const normalizedResults = {
        canciones: data.canciones || [],
        artistas: data.artistas || [],
        albums: data.albums || [],
        listas: data.listas || [],
        playlists: data.playlists || []
      };

      navigation.navigate('SearchResults', {
        initialResults: normalizedResults,
        initialSearchText: searchText,
        initialSelectedOption: selectedOption,
      });
    } catch (error) {
      console.error("Error al realizar la búsqueda:", error);
      setErrorMessage('Error al realizar la búsqueda. Por favor, intenta de nuevo.');
    }
  };

  const obtenerGenerosModal = async () => {
    if (!userEmail) return;
    try {
      const response = await fetch(`https://echobeatapi.duckdns.org/genero?userEmail=${userEmail}`);
      const data = await response.json();
      // Mapeamos solo el nombre del género
      const nombresGeneros = data.map((genero) => genero.NombreGenero);
      setAvailableGeneros(nombresGeneros);
    } catch (error) {
      console.error("Error al obtener géneros:", error);
    }
  };

  const selectGenero = async (genero) => {
    setModalVisible(false);
    // DESCOMENTAR Y ACTUALIZAR CUANDO SE IMPLEMENTE LA BÚSQUEDA POR GÉNEROS:
    /*
    const email = await AsyncStorage.getItem('email');
    const resUser = await fetch(`https://echobeatapi.duckdns.org/users/get-user?userEmail=${email}`);
    const userData = await resUser.json();
    const nickUsuario = userData.Nick;
    
    const url = `https://echobeatapi.duckdns.org/search?Búsqueda=${encodeURIComponent(genero)}&tipo=generos&usuarioNick=${encodeURIComponent(nickUsuario)}`;
    const response = await fetch(url);
    const data = await response.json();
    navigation.navigate('SearchResults', {
      initialResults: data,
      initialSearchText: genero,
      initialSelectedOption: "Géneros",
    });
    */
    console.log("Género seleccionado (llamada a búsqueda pendiente):", genero);
  };

  return (
    <TouchableWithoutFeedback onPress={() => Keyboard.dismiss()}>
      <View style={styles.container}>
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
              onSubmitEditing={handleSearch}
            />
          </View>
        </View>

        <View style={styles.middleContainer}>
          <View style={styles.optionsCard}>
            <Text style={styles.selectionTitle}>¿Quieres buscar algo en concreto?</Text>
            <View style={styles.optionsContainer}>
              {options.map((option) => (
                <TouchableOpacity
                  key={option}
                  style={[
                    styles.optionButton,
                    selectedOption === option && styles.optionButtonSelected,
                  ]}
                  onPress={() => handleOptionPress(option)}
                >
                  <Text
                    style={[
                      styles.optionText,
                      selectedOption === option && styles.optionTextSelected,
                    ]}
                  >
                    {option}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <TouchableOpacity style={styles.searchButton} onPress={handleSearch}>
            <Text style={styles.searchButtonText}>Buscar</Text>
          </TouchableOpacity>

          {errorMessage ? (
            <Text style={styles.errorText}>{errorMessage}</Text>
          ) : null}
        </View>

        {modalVisible && (
          <Modal
            transparent={true}
            animationType="slide"
            onRequestClose={() => setModalVisible(false)}
          >
            <View style={styles.modalContainer}>
              <View style={styles.modalContent}>
                <Text style={styles.modalTitle}>Selecciona un género</Text>
                <ScrollView>
                  {availableGeneros.map((genero) => (
                    <TouchableOpacity key={genero} style={styles.modalItem} onPress={() => selectGenero(genero)}>
                      <Text style={styles.modalItemText}>{genero}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
                <TouchableOpacity style={styles.modalCloseButton} onPress={() => setModalVisible(false)}>
                  <Text style={styles.modalCloseButtonText}>Cerrar</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Modal>
        )}
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
  middleContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  optionsCard: {
    backgroundColor: '#222',
    borderRadius: 8,
    padding: 16,
    width: '80%',
    marginBottom: 20,
  },
  selectionTitle: {
    fontSize: 20,
    color: '#fff',
    marginBottom: 12,
    textAlign: 'center',
  },
  optionsContainer: {
    flexDirection: 'column',
    alignItems: 'center',
  },
  optionButton: {
    backgroundColor: '#444',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 6,
    marginVertical: 4,
    width: '100%',
    alignItems: 'center',
  },
  optionButtonSelected: {
    backgroundColor: '#666',
  },
  optionText: {
    color: '#fff',
    fontSize: 16,
  },
  optionTextSelected: {
    fontSize: 18,
  },
  searchButton: {
    backgroundColor: 'orange',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    alignSelf: 'center',
    width: '60%',
  },
  searchButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  errorText: {
    color: 'red',
    marginTop: 12,
    textAlign: 'center',
    fontSize: 16,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '80%',
    backgroundColor: '#222',
    borderRadius: 10,
    padding: 20,
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 12,
    textAlign: 'center',
  },
  modalItem: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#444',
    alignItems: 'center',
  },
  modalItemText: {
    color: '#fff',
    fontSize: 18,
  },
  modalCloseButton: {
    backgroundColor: 'orange',
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 20,
    alignItems: 'center'
  },
  modalCloseButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
});