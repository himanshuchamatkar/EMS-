import React from 'react';
import { useColorScheme } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { DriverSessionProvider } from './src/hooks/useDriverSession';
import { ActiveIncidentProvider } from './src/hooks/useActiveIncident';
import RootNavigator from './src/navigation/RootNavigator';
import IncidentOfferGate from './src/components/IncidentOfferGate';

export default function App() {
  const scheme = useColorScheme();

  return (
    <SafeAreaProvider>
      <DriverSessionProvider>
        <ActiveIncidentProvider>
          <NavigationContainer>
            <RootNavigator />
            {/* Sibling to the navigator (not inside a screen) so an incoming
                offer overlays whichever screen is currently visible. */}
            <IncidentOfferGate />
          </NavigationContainer>
        </ActiveIncidentProvider>
      </DriverSessionProvider>
      <StatusBar style={scheme === 'light' ? 'dark' : 'light'} />
    </SafeAreaProvider>
  );
}
