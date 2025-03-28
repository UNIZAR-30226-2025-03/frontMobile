import * as React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import Login_Register from './screens/Login_Register';
import Register from './screens/Register';
import Welcome from './screens/Welcome';
import HomeScreen from './screens/HomeScreen';
import ProfileScreen from './screens/ProfileScreen';
import ForgottenPswd from './screens/ForgottenPswd';
import Search from './screens/Search';
import Chats from './screens/Chats';
import Favorites from './screens/Favorites';
import Settings from './screens/Settings';
import MyLists from './screens/MyLists';
import MusicPlayer from './screens/MusicPlayer';
import GeneroPreferences from './screens/GeneroPreferences';
import GeneroPreferencesInit from './screens/GeneroPreferencesInit';
import PlaylistDetails from './screens/PlaylistDetails';
import AlbumDetails from './screens/AlbumDetails';
import CrearPlaylist from './screens/CrearPlaylist';
import SearchResults from './screens/SearchResults';

const Stack = createNativeStackNavigator();

export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName="Login_Register">
        <Stack.Screen name="Login_Register" component={Login_Register} options={{ headerShown: false }} />
        <Stack.Screen name="Register" component={Register} />
        <Stack.Screen name="Welcome" component={Welcome} />
        <Stack.Screen name="HomeScreen" component={HomeScreen} />
        <Stack.Screen name="ProfileScreen" component={ProfileScreen} />
        <Stack.Screen name="ForgottenPswd" component={ForgottenPswd} />
        <Stack.Screen name="Search" component={Search} />
        <Stack.Screen name="Chats" component={Chats} />
        <Stack.Screen name="Favorites" component={Favorites} />
        <Stack.Screen name="Settings" component={Settings} />
        <Stack.Screen name="MyLists" component={MyLists} />
        <Stack.Screen name="MusicPlayer" component={MusicPlayer} />
        <Stack.Screen name="GeneroPreferences" component={GeneroPreferences} />
        <Stack.Screen name="GeneroPreferencesInit" component={GeneroPreferencesInit} />
        <Stack.Screen name="PlaylistDetails" component={PlaylistDetails} />
        <Stack.Screen name="AlbumDetails" component={AlbumDetails} />
        <Stack.Screen name="CrearPlaylist" component={CrearPlaylist} />
        <Stack.Screen name="SearchResults" component={SearchResults} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}