import React, { use, useState, useLayoutEffect } from 'react';
import { View,Text,FlatList,Image,StyleSheet,Dimensions,TouchableOpacity,Animated } from 'react-native';

const { width } = Dimensions.get('window');
const AnimatedImage = Animated.createAnimatedComponent(Image);

const songData = [
  { id: '1', title: 'Canción 1', image: require('../assets/favicon.png') },
  { id: '2', title: 'Canción 2', image: require('../assets/favicon.png') },
  { id: '3', title: 'Canción 3', image: require('../assets/favicon.png') },
  { id: '4', title: 'Canción 4', image: require('../assets/favicon.png') },
  { id: '5', title: 'Canción 5', image: require('../assets/favicon.png') },
  { id: '6', title: 'Canción 6', image: require('../assets/favicon.png') },
];

const playlistData = [
  { id: '1', title: 'Lista 1', image: require('../assets/logo.png') },
  { id: '2', title: 'Lista 2', image: require('../assets/logo.png') },
  { id: '3', title: 'Lista 3', image: require('../assets/logo.png') },
  { id: '4', title: 'Lista 4', image: require('../assets/logo.png') },
  { id: '5', title: 'Lista 5', image: require('../assets/logo.png') },
  { id: '6', title: 'Lista 6', image: require('../assets/logo.png') },
  { id: '7', title: 'Lista 7', image: require('../assets/logo.png') },
  { id: '8', title: 'Lista 8', image: require('../assets/logo.png') },
];

export default function HomeScreen({ navigation }) {
  const [cancionSonando, setCancionSonando] = useState(true);
  const rotation = new Animated.Value(0);
  const [menuAbierto, setMenuAbierto] = useState(false);
  const [blurAnimation] = useState(new Animated.Value(0));
  const [menuAnimation] = useState(new Animated.Value(0));

  useLayoutEffect(() => {
    navigation.setOptions({
      headerShown: false,
    });
  }, [navigation]);

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
      { id: 3, label: 'Opción 3' },
      { id: 4, label: 'Opción 4' },
      { id: 5, label: 'Opción 5' },
    ];

    return botones.map((boton, index) => {
      const angle = (Math.PI / (botones.length - 1)) * index;
      const x = Math.cos(angle) * 120;
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
          <TouchableOpacity style={styles.botonMenuSecundario}>
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

  const renderSongItem = ({ item }) => (
    <View style={styles.songItem}>
      <Image source={item.image} style={styles.songImage} />
      <Text style={styles.songTitle}>{item.title}</Text>
    </View>
  );

  const renderPlaylistItem = ({ item }) => (
    <View style={styles.playlistItem}>
      <Image source={item.image} style={styles.playlistImage} />
      <Text style={styles.playlistTitle}>{item.title}</Text>
    </View>
  );

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
          <Text style={styles.greeting}>Buenos días, nombreUsuario</Text>
          <TouchableOpacity onPress={() => navigation.navigate('ProfileScreen')}>
            <Image
              source={require('../assets/favicon.png')}
              style={styles.profileImage}
            />
          </TouchableOpacity>
        </View>

        <Text style={styles.subTitle}>Escuchado recientemente</Text>
        <FlatList
          data={songData}
          renderItem={renderSongItem}
          keyExtractor={(item) => item.id}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.songList}
          style={styles.songSlider}
        />

        <Text style={styles.subTitle}>Tus listas de reproducción</Text>
        <FlatList
          data={playlistData}
          renderItem={renderPlaylistItem}
          keyExtractor={(item) => item.id}
          numColumns={2}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.playlistList}
          columnWrapperStyle={{ justifyContent: 'space-between' }}
          style={styles.playlistSlider}
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
            {menuAbierto ? 'X' : '. . .'}
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
    marginTop: 20,
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
    fontSize: 20,
    fontWeight: 'bold',
    color: '#f2ab55',
    marginTop: 10,
    marginBottom: 10,
    marginLeft: 20,
  },
  songList: {
    justifyContent: 'center',
    paddingBottom: 50,
  },
  songSlider: {
    width: width * 0.83,
    alignSelf: 'center',
  },
  songItem: {
    width: width / 5 - 10,
    marginRight: 15,
    alignItems: 'center',
  },
  songImage: {
    width: width / 5 - 20,
    height: width / 5 - 20,
    borderRadius: 10,
    backgroundColor: '#333',
  },
  songTitle: {
    marginTop: 5,
    color: '#fff',
    fontSize: 12,
    textAlign: 'center',
  },
  playlistSlider: {
    width: width * 0.9,
    alignSelf: 'center',
  },
  playlistList: {
    paddingBottom: 100,
    paddingHorizontal: 5,
  },
  playlistItem: {
    width: width / 2.5 - 15,
    margin: 15,
    alignItems: 'center',
  },
  playlistImage: {
    width: width / 2.5 - 5,
    height: width / 2.5 - 5,
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
