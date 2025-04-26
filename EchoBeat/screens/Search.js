/**
 * @file Search.js
 * @description Pantalla de búsqueda que permite al usuario buscar canciones,
 * artistas, álbumes o géneros. Incluye un botón para abrir
 * el reproductor de música si hay una canción en reproducción.
 */
import React, { useState, useLayoutEffect, useEffect, useCallback, useRef } from 'react';
import { View, Text, TouchableOpacity, TextInput, StyleSheet, Animated, Easing, TouchableWithoutFeedback, Keyboard, Modal, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Pantalla de búsqueda que permite al usuario buscar canciones,
 * artistas, álbumes o géneros. Incluye un botón para abrir
 * el reproductor de música si hay una canción en reproducción.
 * 
 * @param {object} navigation - Prop de navegación de React Navigation.
 * @param {object} route - Prop de ruta de React Navigation.
 * @param {string} route.params.defaultFilter - Filtro de búsqueda por defecto.
 */
export default function Search({ navigation, route }) {
  const [searchText, setSearchText] = useState('');
  const [selectedOption, setSelectedOption] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [availableGeneros, setAvailableGeneros] = useState([]);
  const [cancionSonando, setCancionSonando] = useState(false);
  const [estaReproduciendo, setEstaReproduciendo] = useState(false);
  const rotation = useRef(new Animated.Value(0)).current;

  // Para evitar problemas con las tildes, usamos "Generos" sin tilde en el valor interno.
  const options = ["Canción", "Playlist", "Artista", "Álbum", "Generos"];

  useLayoutEffect(() => {
    navigation.setOptions({ headerShown: false });
  }, [navigation]);

  useFocusEffect(
    useCallback(() => {
      checkSongPlaying();
    }, [])
  );

  // Cargamos el email (otros datos se cargarán en SearchResults)
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
    checkSongPlaying();
  }, [route.params]);

  /**
   * Comprueba si hay una canción en reproducción guardada en AsyncStorage y
   * actualiza los estados 'cancionSonando' y 'estaReproduciendo', además de
   * iniciar o detener la animación de rotación según corresponda.
   * 
   * @returns {Promise<void>}
   */  
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

  /**
   * Inicia un bucle de animación que rota indefinidamente el icono de la discográfica.
   * 
   * @returns {void}
   */
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

  /**
   * Detiene la animación de rotación y resetea el valor de rotación a cero.
   * 
   * @returns {void}
   */
  const stopRotation = () => {
    rotation.stopAnimation(() => {
      rotation.setValue(0);
    });
  };

  const spin = rotation.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  /**
   * Navega al reproductor de música usando la canción y el ID almacenados
   * en AsyncStorage, si existen.
   * 
   * @returns {Promise<void>}
   */
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

  /**
   * Maneja la pulsación de una opción de filtro. Para "Generos" abre un modal,
   * para el resto alterna la selección.
   * 
   * @param {string} option - Opción pulsada.
   * @returns {void}
   */
  const handleOptionPress = (option) => {
    if (option === "Generos") {
      setModalVisible(true);
      obtenerGenerosModal();
    } else {
      setSelectedOption(option === selectedOption ? null : option);
      setErrorMessage('');
    }
  };

  /**
   * Realiza la navegación a la pantalla SearchResults, pasando el texto y
   * la opción seleccionada como parámetros.
   * 
   * @param {string} query - Texto de búsqueda.
   * @param {string|null} filterOption - Filtro seleccionado.
   * @returns {void}
   */
  const navigateToResults = (query, filterOption) => {
    navigation.navigate('SearchResults', {
      initialSearchText: query,
      initialSelectedOption: filterOption,
    });
  };

  /**
   * Gestiona la acción de búsqueda desde el input principal, validando que
   * no esté vacío y luego llamando a 'navigateToResults'.
   * 
   * @returns {void}
   */
  const handleSearch = () => {
    if (!searchText.trim()) {
      setErrorMessage("Ingrese un texto para buscar");
      return;
    }
    setErrorMessage('');
    navigateToResults(searchText, selectedOption);
  };

  /**
   * Selecciona un género desde el modal y navega a SearchResults con ese
   * género como consulta y filtro "Generos".
   * 
   * @param {string} genero - Género seleccionado.
   * @return {void}
   */
  const selectGenero = (genero) => {
    setModalVisible(false);
    // Como se seleccionó un género, este texto nunca estará vacío.
    navigateToResults(genero, "Generos");
  };

  /**
   * Obtiene la lista de géneros disponibles desde la API para mostrarlos
   * en el modal de selección.
   * 
   * @returns {Promise<void>}
   */
  const obtenerGenerosModal = async () => {
    if (!userEmail) return;
    try {
      const response = await fetch(`https://echobeatapi.duckdns.org/genero?userEmail=${userEmail}`);
      const data = await response.json();
      const nombresGeneros = data.map((genero) => genero.NombreGenero);
      setAvailableGeneros(nombresGeneros);
    } catch (error) {
      console.error("Error al obtener géneros:", error);
    }
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
        {cancionSonando && (
              <TouchableOpacity onPress={handleOpenMusicPlayer} style={styles.playerButton}>
                <Animated.Image
                  source={require('../assets/disc.png')}
                  style={[styles.playerIcon, { transform: [{ rotate: spin }] }]} 
                />
              </TouchableOpacity>
            )}
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
    backgroundColor: '#000' 
  },
  topContainer: { 
    padding: 16, 
    marginTop: 40 
  },
  topBar: { 
    flexDirection: 'row', 
    alignItems: 'center' 
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
    paddingHorizontal: 16 
  },
  optionsCard: { 
    backgroundColor: '#222', 
    borderRadius: 8, 
    padding: 16, 
    width: '80%', 
    marginBottom: 20 
  },
  selectionTitle: { 
    fontSize: 20, 
    color: '#fff', 
    marginBottom: 12, 
    textAlign: 'center' 
  },
  optionsContainer: { 
    flexDirection: 'column', 
    alignItems: 'center' 
  },
  optionButton: { 
    backgroundColor: '#444', 
    paddingVertical: 10, 
    paddingHorizontal: 14, 
    borderRadius: 6, 
    marginVertical: 4, 
    width: '100%', 
    alignItems: 'center' 
  },
  optionButtonSelected: { 
    backgroundColor: '#666' 
  },
  optionText: { 
    color: '#fff', 
    fontSize: 16 
  },
  optionTextSelected: { 
    fontSize: 18 
  },
  searchButton: { 
    backgroundColor: 'orange', 
    paddingVertical: 14, 
    borderRadius: 8, 
    alignItems: 'center', 
    alignSelf: 'center', 
    width: '60%' 
  },
  searchButtonText: { 
    color: '#fff', 
    fontSize: 18, 
    fontWeight: 'bold' 
  },
  errorText: { 
    color: 'red', 
    marginTop: 12, 
    textAlign: 'center', 
    fontSize: 16 
  },
  modalContainer: { 
    flex: 1, 
    backgroundColor: 'rgba(0,0,0,0.5)', 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  modalContent: { 
    width: '80%', 
    backgroundColor: '#222', 
    borderRadius: 10, 
    padding: 20, 
    maxHeight: '80%' 
  },
  modalTitle: { 
    fontSize: 20, 
    fontWeight: 'bold', 
    color: '#fff', 
    marginBottom: 12, 
    textAlign: 'center' 
  },
  modalItem: { 
    paddingVertical: 10, 
    borderBottomWidth: 1, 
    borderBottomColor: '#444', 
    alignItems: 'center' 
  },
  modalItemText: { 
    color: '#fff', 
    fontSize: 18 
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
    fontWeight: 'bold' 
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
    zIndex: 4,
  },
  playerIcon: { 
    width: 80, 
    height: 80, 
    borderRadius: 35 
  },
});
