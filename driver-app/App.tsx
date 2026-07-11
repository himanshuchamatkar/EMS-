import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { DriverSessionProvider } from './src/hooks/useDriverSession';
import RootNavigator from './src/navigation/RootNavigator';
import IncidentOfferGate from './src/components/IncidentOfferGate';

export default function App() {
  return (
    <SafeAreaProvider>
      <DriverSessionProvider>
        <NavigationContainer>
          <RootNavigator />
          {/* Sibling to the navigator (not inside a screen) so an incoming
              offer overlays whichever screen is currently visible. */}
          <IncidentOfferGate />
        </NavigationContainer>
      </DriverSessionProvider>
      <StatusBar style="light" />
    </SafeAreaProvider>
  );
}
