import React, { useState, useLayoutEffect, useEffect, useCallback, useRef } from 'react';
import { View, Text, TouchableOpacity, TextInput, StyleSheet, Animated, Easing, TouchableWithoutFeedback, Keyboard, Modal, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';

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

  const stopRotation = () => {
    rotation.stopAnimation(() => {
      rotation.setValue(0);
    });
  };

  const spin = rotation.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

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

  const handleOptionPress = (option) => {
    if (option === "Generos") {
      setModalVisible(true);
      obtenerGenerosModal();
    } else {
      setSelectedOption(option === selectedOption ? null : option);
      setErrorMessage('');
    }
  };

  // Navegamos a SearchResults pasando el texto y la opción.
  const navigateToResults = (query, filterOption) => {
    navigation.navigate('SearchResults', {
      initialSearchText: query,
      initialSelectedOption: filterOption,
    });
  };

  // Función para cuando se pulsa el botón Buscar (búsqueda normal)
  // Se valida que el texto a buscar no sea vacío.
  const handleSearch = () => {
    if (!searchText.trim()) {
      setErrorMessage("Ingrese un texto para buscar");
      return;
    }
    setErrorMessage('');
    navigateToResults(searchText, selectedOption);
  };

  // Para la búsqueda por género, se usa el género seleccionado desde el modal
  const selectGenero = (genero) => {
    setModalVisible(false);
    // Como se seleccionó un género, este texto nunca estará vacío.
    navigateToResults(genero, "Generos");
  };

  // Obtención de géneros (solo nombre) para mostrar en el modal
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
