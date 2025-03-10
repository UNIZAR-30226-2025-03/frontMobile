import React, { useState, useLayoutEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
} from "react-native";

export default function GeneroPreferencesScreen({ navigation }) {
  const generosDisponibles = [
    "Rock",
    "Pop",
    "Jazz",
    "Blues",
    "Hip-Hop",
    "Reggaeton",
    "Salsa",
    "Electrónica",
    "Metal",
    "Clásica",
    "Genero 1",
    "Genero 2",
    "Genero 3",
  ];

  const [generosSeleccionados, setGenerosSeleccionados] = useState([]);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerShown: false,
    });
  }, [navigation]);

  const toggleGenero = (genero) => {
    if (generosSeleccionados.includes(genero)) {
      setGenerosSeleccionados(generosSeleccionados.filter((g) => g !== genero));
    } else {
      setGenerosSeleccionados([...generosSeleccionados, genero]);
    }
  };

  const enviarGeneros = async () => {
    if (generosSeleccionados.length < 3) {
      Alert.alert("Error", "Debes seleccionar al menos 3 géneros.");
      return;
    }

    const generosString = generosSeleccionados.join(";");

    console.log("🎵 Enviando géneros seleccionados:", generosString);

    try {
      const response = await fetch(
        "https://echobeatapi.duckdns.org/users/update-genres",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ generos: generosString }),
        }
      );

      const data = await response.json();
      console.log("📩 Respuesta del servidor:", data);

      if (!response.ok) {
        throw new Error(data.message || "Error al guardar los géneros.");
      }

      Alert.alert("Éxito", "Tus preferencias de género han sido guardadas.");
      navigation.goBack();
    } catch (error) {
      console.error("❌ Error al enviar géneros:", error);
      Alert.alert("Error", error.message);
    }
  };

  return (
    <View style={styles.container}>
      {/* Botón de volver */}
      <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
        <Text style={styles.backButtonText}>← Volver</Text>
      </TouchableOpacity>

      {/* Texto de instrucciones */}
      <Text style={styles.titulo}>Elige tus géneros favoritos (al menos 3)</Text>

      {/* Lista de botones de géneros en un slider vertical */}
      <ScrollView 
        showsVerticalScrollIndicator={false} 
        contentContainerStyle={styles.scrollViewContainer}
      >
        {generosDisponibles.map((genero) => (
          <TouchableOpacity
            key={genero}
            style={[
              styles.botonGenero,
              generosSeleccionados.includes(genero) ? styles.botonSeleccionado : styles.botonNoSeleccionado,
            ]}
            onPress={() => toggleGenero(genero)}
          >
            <Text style={styles.textoGenero}>{genero}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Botón de guardar cambios */}
      <TouchableOpacity style={styles.botonGuardar} onPress={enviarGeneros}>
        <Text style={styles.textoGuardar}>Guardar cambios</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#121111",
    paddingHorizontal: 20,
    paddingTop: 50,
  },
  backButton: {
    alignSelf: "flex-start",
    marginBottom: 10,
  },
  backButtonText: {
    color: "#f2ab55",
    fontSize: 16,
    textDecorationLine: "underline",
  },
  titulo: {
    fontSize: 17,
    fontWeight: "bold",
    color: "#f2ab55",
    textAlign: "center",
    marginBottom: 20,
  },
  scrollViewContainer: {
    alignItems: "center", // Alinea los botones en el centro
    paddingBottom: 20,
  },
  botonGenero: {
    width: "80%",  // Ajusta los botones para que sean anchos
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderRadius: 10,
    marginBottom: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  botonNoSeleccionado: {
    backgroundColor: "gray",
  },
  botonSeleccionado: {
    backgroundColor: "orange",
  },
  textoGenero: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "bold",
  },
  botonGuardar: {
    backgroundColor: "#ffb723",
    padding: 15,
    borderRadius: 10,
    marginTop: 20,
    marginBottom: 25,
    alignItems: "center",
    width: "80%",
    alignSelf: "center",
  },
  textoGuardar: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
  },
});
