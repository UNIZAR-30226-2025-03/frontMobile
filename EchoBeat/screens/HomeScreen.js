import React, { use, useState, useLayoutEffect, useEffect } from 'react';
import { View,Text,FlatList,Image,StyleSheet,Dimensions,TouchableOpacity,Animated,Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width } = Dimensions.get('window');
const AnimatedImage = Animated.createAnimatedComponent(Image);

export default function HomeScreen({ navigation }) {
  const [playlistCreadas, setPlaylistCreadas] = useState([]);
  const [cancionSonando, setCancionSonando] = useState(true);
  const rotation = new Animated.Value(0);
  const [menuAbierto, setMenuAbierto] = useState(false);
  const [blurAnimation] = useState(new Animated.Value(0));
  const [menuAnimation] = useState(new Animated.Value(0));
  const [recomendations, setRecomendations] = useState([]);
  const [userEmail, setUserEmail] = useState('');
  const [userName, setUserName] = useState('');

  useLayoutEffect(() => {
    navigation.setOptions({
      headerShown: false,
    });
  }, [navigation]);

  useEffect(() => {
    obtenerInfoUser();
  }, []);

  const obtenerInfoUser = async () => {
    try {
      const email = await AsyncStorage.getItem('email'); // Obtiene el email almacenado en login

      if (!email) {
        Alert.alert("Error", "No se pudo recuperar el email del usuario.");
        return;
      }
      setUserEmail(email);

      // 🔹 Chivato antes de llamar a la API
      console.log("Email para la API:", email);

      // Llamada a la API para obtener el nombre del usuario
      const response = await fetch(`http://48.209.24.188:3000/users/nick?userEmail=${email}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Error al obtener el nombre del usuario");
      }

      setUserName(data.Nick || 'Usuario'); // Asegura que haya un nombre

      await obtenerPlaylistsCreadas(email);
      await obtenerRecomendaciones(email);

    } catch (error) {
      console.error("Error obteniendo el nombre del usuario:", error);
      Alert.alert("Error", error.message);
    }
  };

  // Obtiene las Playlists creadas por un usuario
  const obtenerPlaylistsCreadas = async (email) => {
    try {
      const response = await fetch(`http://48.209.24.188:3000/playlists/user?userEmail=${email}`);
      const data = await response.json();

      setPlaylistCreadas(data);
    } catch (error) {
      console.error("Error obteniendo playlists creadas:", error);
      Alert.alert("Error", error.message);
    }
  }

  // Obtiene las recomendaciones de playlists para un usuario -> Son Objetos de "Generos" desde los 
  // que se puede acceder a las playlists de esos generos
  const obtenerRecomendaciones = async (email) => {
    try {
      const response = await fetch(`http://48.209.24.188:3000/genero/preferencia?userEmail=${email}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Error al obtener recomendaciones");
      }
    
      setRecomendations(data);
    } catch (error) {
      console.error("Error obteniendo recomendaciones:", error);
      Alert.alert("Error", error.message);
    }
  };

  const toggleMenu = () => {
    setMenuAbierto(!menuAbierto);
    Animated.parallel([
      Animated.timing(blurAnimation, {
        toValue: menuAbierto ? 0 : 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(menuAnimation, {
        toValue: menuAbierto ? 0 : 1,
        duration: 400,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const renderBotonesMenu = () => {
    const botones = [
      { id: 1, label: 'Opción 1' },
      { id: 2, label: 'Opción 2' },
      { id: 3, label: 'LUPA', screen: 'Search' },
      { id: 4, label: 'Opción 4' },
      { id: 5, label: 'Opción 5' },
    ];

    return botones.map((boton, index) => {
      const angle = (Math.PI / (botones.length - 1)) * index;
      const x = Math.cos(angle) * 145;
      const y = -Math.sin(angle) * 120;

      return (
        <Animated.View
          key={boton.id}
          style={[
            styles.menuBoton,
            {
              transform: [
                { translateX: menuAnimation.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, x],
                  })
                },
                { translateY: menuAnimation.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, y],
                  })
                },
              ],
            },
          ]}
        >
          <TouchableOpacity style={styles.botonMenuSecundario}
                                   onPress={() => navigation.navigate(boton.screen)}>
            <Text style={styles.botonTexto}>{boton.label}</Text>
          </TouchableOpacity>
        </Animated.View>
      );
    });
  };

  Animated.loop(
    Animated.timing(rotation, {
      toValue: 1,
      duration: 4000,
      useNativeDriver: true,
    })
  ).start();

  const spin = rotation.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const renderPlaylistCreada = ({ item }) => {
    const defaultImage = require('../assets/darkraul.jpg');
    const imageSource = (item.lista && item.lista.Portada && item.lista.Portada !== "URL_por_defecto")
      ? { uri: item.lista.Portada }
      : defaultImage;

    return (
      <View style={styles.playlistItem}>
        <Image source={imageSource} style={styles.playlistImage} />
        <Text style={styles.playlistTitle}>{item.lista ? item.lista.Nombre : '####'}</Text>
      </View>
    );
  };

  const renderRecomendationsItem = ({ item }) => {
    const defaultImage = require('../assets/darkraul.jpg');
    const imageSource = (item.FotoGenero && item.FotoGenero !== "URL_por_defecto")
      ? { uri: item.ForoGenero }
      : defaultImage;
    const nameGenero = (item.NombreGenero && item.NombreGenero !== "NULL")
      ? item.NombreGenero
      : '####';


    return (
      <View style={styles.recomendationsItem}>
        <Image source={imageSource} style={styles.recomendationsImage} />
        <Text style={styles.recomendationsTitle}>{nameGenero}</Text>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <Animated.View
        pointerEvents={menuAbierto ? 'auto' : 'none'}
        style={[
          styles.blurView,
          {
            opacity: blurAnimation.interpolate({
              inputRange: [0, 1],
              outputRange: [0, 0.7],
            }),
            zIndex: 1,
          },
        ]}
      />
      <View 
        pointerEvents={menuAbierto ? 'none' : 'auto'} 
        style={{ flex: 1 }}
      >
        <View style={styles.headerContainer}>
          <Text style={styles.greeting}>Hola 😄, {userName}</Text>
          <TouchableOpacity onPress={() => navigation.navigate('ProfileScreen')}>
            <Image
              // Completar con API de la imagen del usuario
              source={require('../assets/favicon.png')}
              style={styles.profileImage}
            />
          </TouchableOpacity>
        </View>

        <Text style={styles.subTitle}>Tus Listas</Text>
        <FlatList
          data={playlistCreadas}
          renderItem={renderPlaylistCreada}
          keyExtractor={(item, index) => index.toString()}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.playlistList}
          style={styles.playlistCreadasSlider}
        />

        <Text style={styles.subTitle}>Recomendaciones</Text>
        <FlatList
          data={recomendations}
          renderItem={renderRecomendationsItem}
          keyExtractor={(item, index) => index.toString()}
          numColumns={2}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.recomendationsList}
          columnWrapperStyle={ styles.recomendationsList }
          style={styles.recomendationsSlider}
        />
      </View>

      <View style={styles.bottomContainer}>
        {renderBotonesMenu()}
        <TouchableOpacity 
          style={styles.halfCircleButton} 
          onPress={toggleMenu}
          activeOpacity={0.8}
        >
          <Text style={styles.buttonText}>
            {menuAbierto ? 'x' : '. . .'}
          </Text>
        </TouchableOpacity>

        {cancionSonando && (
          <Animated.View
            pointerEvents={menuAbierto ? 'none' : 'auto'} // Bloquea interacción al abrir el menú
            style={{
              opacity: blurAnimation.interpolate({
                inputRange: [0, 1],
                outputRange: [1, 0.2], // Difumina el icono cuando se abre el menú
              }),
            }}
          >
            <AnimatedImage
              width={65}
              height={65}
              marginTop={5}
              marginRight={20}
              source={require('../assets/favicon.png')}
              style={[styles.discIcon, { transform: [{ rotate: spin }] }]}
            />
          </Animated.View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121111',
    paddingHorizontal: 15,
  },
  blurView: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#000',
    zIndex: 1,
  },
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 30,
  },
  greeting: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
    marginLeft: 18,
    marginTop: 15,
  },
  profileImage: {
    width: 45,
    height: 45,
    borderRadius: 22.5,
    backgroundColor: '#333',
    marginTop: 15,
  },
  subTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#f2ab55',
    marginTop: 10,
    marginBottom: 10,
    marginLeft: 20,
  },
  playlistCreadasSlider: {
    flex: 1,
    width: width * 0.9,
    alignSelf: 'center',
  },
  playlistList: {
    paddingHorizontal: 5,
  },
  playlistItem: {
    width: width / 2.5 - 15,
    marginRight: 20,
    alignItems: 'center',
  },
  playlistImage: {
    width: width / 3 - 20,
    height: width / 3 - 20,
    borderRadius: 20,
    backgroundColor: '#333',
  },
  playlistTitle: {
    marginTop: 5,
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  recomendationsSlider: {
    width: width * 0.9,
    alignSelf: 'center',
  },
  recomendationsList: {
    justifyContent: 'space-between',
    paddingHorizontal: 5,
  },
  recomendationsItem: {
    width: width / 2.5 - 15,
    marginBottom: 15, 
    alignItems: 'center',
  },
  recomendationsImage: {
    width: width / 2.5 - 20,
    height: width / 2.5 - 20,
    borderRadius: 20,
    backgroundColor: '#333',
  },
  recomendationsTitle: {
    marginTop: 5,
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  bottomContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 200,
    justifyContent: 'flex-end',
    alignItems: 'center',
    zIndex: 2,
  },
  halfCircleButton: {
    width: 170,
    height: 100,
    borderTopLeftRadius: 100,
    borderTopRightRadius: 100,
    backgroundColor: '#ffb723',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: -20,
    zIndex: 3,
  },
  buttonText: {
    fontSize: 50,
    color: '#fff',
    fontWeight: 'bold',
    marginBottom: 40,
  },
  menuBoton: {
    position: 'absolute',
    bottom: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  botonMenuSecundario: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#f2ab55',
    justifyContent: 'center',
    alignItems: 'center',
  },
  botonTexto: {
    color: '#fff',
    fontWeight: 'bold',
  },
  discIcon: {
    width: 50,
    height: 50,
    position: 'absolute',
    bottom: 15,
    right: -200,
  },
});
