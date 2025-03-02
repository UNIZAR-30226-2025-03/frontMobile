import React, { useState, useLayoutEffect } from 'react';
import { View, Text, TouchableOpacity, TextInput, StyleSheet, TouchableWithoutFeedback, Keyboard } from 'react-native';

export default function Search({ navigation }) {
  // Estados para el texto ingresado, opción seleccionada y mensaje de error
  const [searchText, setSearchText] = useState('');
  const [selectedOption, setSelectedOption] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');

  // Opciones disponibles
  const options = ["Canción", "Playlist", "Género", "Autor", "Album"];

  useLayoutEffect(() => {
    navigation.setOptions({ headerShown: false });
  }, [navigation]);

  // Función para manejar la selección de una opción
  const handleOptionPress = (option) => {
    setSelectedOption(option);
    setErrorMessage('');
  };

  // Función para simular la llamada a la API de búsqueda
  const handleSearch = () => {
    if (!selectedOption) {
      setErrorMessage("Por favor, seleccione una opción");
      return;
    }
    setErrorMessage('');
    console.log("Buscar:", searchText, "|| Opción:", selectedOption);
    // Aquí se llamaría a la API de búsqueda (aún no implementada)
  };

  return (
    <TouchableWithoutFeedback onPress={() => Keyboard.dismiss()}>
      <View style={styles.container}>
        {/* Sección superior: barra de búsqueda */}
        <View style={styles.topContainer}>
          <View style={styles.topBar}>
            <TouchableOpacity onPress={() => navigation.goBack()}>
              <Text style={styles.backArrow}>←</Text>
            </TouchableOpacity>
            <TextInput
              style={styles.searchInput}
              placeholder="Buscar..."
              placeholderTextColor="#ccc"
              value={searchText}
              onChangeText={setSearchText}
            />
          </View>
        </View>

        {/* Sección intermedia: recuadro de opciones y botón de buscar */}
        <View style={styles.middleContainer}>
          <View style={styles.optionsCard}>
            <Text style={styles.selectionTitle}>¿Qué quieres buscar?</Text>
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
  backArrow: {
    fontSize: 24,
    color: '#fff',
    marginRight: 16,
  },
  searchInput: {
    flex: 1,
    backgroundColor: '#333',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    color: '#fff',
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
