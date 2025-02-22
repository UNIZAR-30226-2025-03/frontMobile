import React, { useState } from 'react';
import {View,Text,FlatList,Image,StyleSheet,Dimensions,TouchableOpacity,Animated} from 'react-native';
import SvgIcon from '../assets/record-vinyl.svg';

const { width } = Dimensions.get('window');
const AnimatedSvg = Animated.createAnimatedComponent(SvgIcon);

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

      <View style={styles.bottomContainer}>
        <TouchableOpacity style={styles.halfCircleButton}>
          <Text style={styles.buttonText}>. . .</Text>
        </TouchableOpacity>

        {cancionSonando && (
          <AnimatedSvg
            width={65}
            height={65}
            marginTop={5}
            marginRight={20}
            fill="#ffb723"
            backgroundColor="#333"
            style={[styles.discIcon, { transform: [{ rotate: spin }] }]}
          />
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
  },
  profileImage: {
    width: 45,
    height: 45,
    borderRadius: 22.5,
    backgroundColor: '#333',
  },
  subTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#f2ab55',
    marginTop: 20,
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
    height: 90,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 15,
  },
  halfCircleButton: {
    width: 170,
    height: 100,
    borderTopLeftRadius: 100,
    borderTopRightRadius: 100,
    backgroundColor: '#ffb723',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 105,
    marginTop: 32,
  },
  buttonText: {
    fontSize: 60,
    marginTop: -45,
    color: '#fff',
    fontWeight: 'bold',
  },
  discIcon: {
    width: 50,
    height: 50,
  },
});
