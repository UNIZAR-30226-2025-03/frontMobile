import React, { useState, useLayoutEffect, useEffect } from 'react';
import { View, Text, TouchableOpacity, TextInput, StyleSheet, TouchableWithoutFeedback, Keyboard } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function Search({ navigation, route }) {
  const [searchText, setSearchText] = useState('');
  const [selectedOption, setSelectedOption] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');

  const options = ["Canción", "Playlist", "Artista", "Álbum"];
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
    if (route.params && route.params.defaultFilter) {
      setSelectedOption(route.params.defaultFilter);
    }
  }, [route.params]);

  const handleOptionPress = (option) => {
    setSelectedOption(option === selectedOption ? null : option);
    setErrorMessage('');
  };

  const handleSearch = async () => {
    setErrorMessage('');
    
    const tipo = selectedOption ? optionMap[selectedOption] : '';
    const url = `https://echobeatapi.duckdns.org/search?q=${encodeURIComponent(searchText)}${tipo ? `&tipo=${tipo}` : ''}`;
  
    try {
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
});