import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { NavigationContainer } from '@react-navigation/native';

// Importamos las pantallas
import Login_Register from '../screens/Login_Register';
import ForgottenPswd from '../screens/ForgottenPswd';
import HomeScreen from '../screens/HomeScreen';
import ProfileScreen from '../screens/ProfileScreen';

const Stack = createNativeStackNavigator();

export default function StackNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Login_Register" component={Login_Register} />
        <Stack.Screen name="ForgottenPswd" component={ForgottenPswd} />
        <Stack.Screen name="HomeScreen" component={HomeScreen}/>
        <Stack.Screen name="ProfileScreen" component={ProfileScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}