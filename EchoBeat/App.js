import * as React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import Login_Register from './screens/Login_Register';
import Register from './screens/Register';
import HomeScreen from './screens/HomeScreen';
import ProfileScreen from './screens/ProfileScreen';
import ForgottenPswd from './screens/ForgottenPswd';
import Search from './screens/Search';
import Chats from './screens/Chats';
import Favorites from './screens/Favorites';
import Settings from './screens/Settings';
import MyLists from './screens/MyLists';

const Stack = createNativeStackNavigator();

export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName="Login_Register">
        <Stack.Screen name="Login_Register" component={Login_Register} options={{ headerShown: false }} />
        <Stack.Screen name="Register" component={Register} />
        <Stack.Screen name="HomeScreen" component={HomeScreen} />
        <Stack.Screen name="ProfileScreen" component={ProfileScreen} />
        <Stack.Screen name="ForgottenPswd" component={ForgottenPswd} />
        <Stack.Screen name="Search" component={Search} />
        <Stack.Screen name="Chats" component={Chats} />
        <Stack.Screen name="Favorites" component={Favorites} />
        <Stack.Screen name="Settings" component={Settings} />
        <Stack.Screen name="MyLists" component={MyLists} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}