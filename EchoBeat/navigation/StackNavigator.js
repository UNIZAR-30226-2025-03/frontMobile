import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { NavigationContainer } from '@react-navigation/native';

// Importamos las pantallas
import Login_Register from '../screens/Login_Register';
import Register from '../screens/Register';
import ForgottenPswd from '../screens/ForgottenPswd';
import Welcome from '../screens/Welcome';
import HomeScreen from '../screens/HomeScreen';
import ProfileScreen from '../screens/ProfileScreen';
import Search from '../screens/Search';
import Chats from './screens/Chats';
import Favorites from './screens/Favorites';
import Settings from './screens/Settings';
import MyLists from './screens/MyLists';
import MusicPlayer from './screens/MusicPlayer';

const Stack = createNativeStackNavigator();

export default function StackNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator 
        initialRouteName="Login_Register" 
        screenOptions={{ headerShown: false }}
      >
        <Stack.Screen name="Login_Register" component={Login_Register} />
        <Stack.Screen name="ForgottenPswd" component={ForgottenPswd} />
        <Stack.Screen name="Welcome" component={Welcome} />
        <Stack.Screen name="Register" component={Register} />
        <Stack.Screen name="HomeScreen" component={HomeScreen} />
        <Stack.Screen name="ProfileScreen" component={ProfileScreen} />
        <Stack.Screen name="Search" component={Search} />
        <Stack.Screen name="Chats" component={Chats} />
        <Stack.Screen name="Favorites" component={Favorites} />
        <Stack.Screen name="Settings" component={Settings} />
        <Stack.Screen name="MyLists" component={MyLists} />
        <Stack.Screen name="MusicPlayer" component={MusicPlayer} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
