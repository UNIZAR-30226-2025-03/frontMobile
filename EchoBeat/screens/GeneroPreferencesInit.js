import React, { useState, useEffect, useLayoutEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from '@expo/vector-icons';

export default function GeneroPreferencesInitScreen({ navigation }) {
  const [generos, setGeneros] = useState([]); 
  const [cargando, setCargando] = useState(true);
  const [userEmail, setUserEmail] = useState(null);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerShown: false,
    });
  }, [navigation]);

  useEffect(() => {
    obtenerEmailUsuario();
  }, []);

  useEffect(() => {
    if (userEmail) {
      console.log("🔍 Email del usuario obtenido:", userEmail);
      obtenerGeneros();
    }
  }, [userEmail]);

  // 🔹 Obtener el email del usuario desde AsyncStorage
  const obtenerEmailUsuario = async () => {
    try {
      const email = await AsyncStorage.getItem("email");
      if (email) {
        console.log("📧 Email del usuario:", email);
        setUserEmail(email);
      } else {
        Alert.alert("Error", "No se pudo obtener el email del usuario.");
      }
    } catch (error) {
      console.error("❌ Error al obtener el email:", error);
    }
  };

  // 🔹 Obtener los géneros desde la API y asegurarse de marcar los seleccionados
  const obtenerGeneros = async () => {
    if (!userEmail) return;

    try {
      console.log("📡 Haciendo solicitud a la API de géneros...");
      const response = await fetch(`https://echobeatapi.duckdns.org/genero?userEmail=${userEmail}`);
      const data = await response.json();

      console.log("📩 Géneros recibidos de la API:", JSON.stringify(data, null, 2));

      if (!response.ok) {
        throw new Error("Error al obtener los géneros");
      }

      // 🔹 Mapeamos los datos asegurando que los valores de "Seleccionado" se reflejan correctamente
      const generosFormateados = data.map((genero) => ({
        nombre: genero.NombreGenero,
        seleccionado: genero.Seleccionado === true,  // **Si es true, debe verse como botón marcado**
      }));

      console.log("✅ Géneros después de procesarlos:", JSON.stringify(generosFormateados, null, 2));

      setGeneros(generosFormateados);
      setCargando(false);
    } catch (error) {
      console.error("❌ Error al obtener géneros:", error);
      Alert.alert("Error", "No se pudieron cargar los géneros.");
      setCargando(false);
    }
  };

  // 🔹 Función para alternar selección de géneros
  const toggleGenero = (nombre) => {
    setGeneros((prevGeneros) =>
      prevGeneros.map((genero) =>
        genero.nombre === nombre ? { ...genero, seleccionado: !genero.seleccionado } : genero
      )
    );
  };

  // 🔹 Enviar géneros seleccionados a la API en el formato correcto
  const enviarGeneros = async () => {
    const generosSeleccionados = generos
      .filter((genero) => genero.seleccionado)
      .map((genero) => genero.nombre);

    if (generosSeleccionados.length < 4) {
      Alert.alert("Error", "Debes seleccionar al menos 4 géneros.");
      return;
    }

    const requestBody = {
      userEmail: userEmail,
      generos: generosSeleccionados,
    };

    console.log("🎵 Enviando géneros seleccionados:", JSON.stringify(requestBody, null, 2));

    try {
      const response = await fetch(
        "https://echobeatapi.duckdns.org/genero/add",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(requestBody),
        }
      );

      const data = await response.json();
      console.log("📩 Respuesta del servidor:", JSON.stringify(data, null, 2));

      if (!response.ok) {
        throw new Error(data.message || "Error al guardar los géneros.");
      }

      Alert.alert("Éxito", "Tus preferencias de género han sido guardadas. Inicia sesión.");
      navigation.navigate('Login_Register');
    } catch (error) {
      console.error("❌ Error al enviar géneros:", error);
      Alert.alert("Error", error.message);
    }
  };

  return (
    <View style={styles.container}>

      {/* Texto de instrucciones */}
      <Text style={styles.titulo}>Elige tus géneros favoritos (al menos 4)</Text>

      {cargando ? (
        <ActivityIndicator size="large" color="#f2ab55" />
      ) : (
        <ScrollView 
          showsVerticalScrollIndicator={false} 
          contentContainerStyle={styles.scrollViewContainer}
        >
          {generos.map((genero) => (
            <TouchableOpacity
              key={genero.nombre}
              style={[
                styles.botonGenero,
                genero.seleccionado ? styles.botonSeleccionado : styles.botonNoSeleccionado,
              ]}
              onPress={() => toggleGenero(genero.nombre)}
            >
              <Text style={styles.textoGenero}>{genero.nombre}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

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
  titulo: {
    fontSize: 17,
    fontWeight: "bold",
    color: "#f2ab55",
    textAlign: "center",
    marginBottom: 20,
  },
  scrollViewContainer: {
    alignItems: "center",
    paddingBottom: 20,
  },
  botonGenero: {
    width: "80%",
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
