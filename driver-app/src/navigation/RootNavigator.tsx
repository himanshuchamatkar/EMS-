import React from 'react';
import { ActivityIndicator, View } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { RootStackParamList } from './types';
import LoginScreen from '../screens/LoginScreen';
import HomeScreen from '../screens/HomeScreen';
import NavigationScreen from '../screens/NavigationScreen';
import { useDriverSession } from '../hooks/useDriverSession';

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function RootNavigator() {
  const { identity, loadingIdentity } = useDriverSession();

  if (loadingIdentity) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#0F172A' }}>
        <ActivityIndicator size="large" color="#3B82F6" />
      </View>
    );
  }

  return (
    <Stack.Navigator initialRouteName={identity ? 'Home' : 'Login'} screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Home" component={HomeScreen} />
      <Stack.Screen name="Navigation" component={NavigationScreen} options={{ headerShown: false }} />
    </Stack.Navigator>
  );
}
