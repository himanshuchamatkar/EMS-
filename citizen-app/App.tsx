import React from 'react';
import { useColorScheme } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer, DefaultTheme as NavDefaultTheme, DarkTheme as NavDarkTheme } from '@react-navigation/native';
import { PaperProvider } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import RootNavigator from './src/navigation/RootNavigator';
import { smartEmsDarkTheme, smartEmsLightTheme } from './src/theme/paperTheme';

export default function App() {
  const scheme = useColorScheme();
  const isDark = scheme !== 'light';
  const paperTheme = isDark ? smartEmsDarkTheme : smartEmsLightTheme;

  const navTheme = {
    ...(isDark ? NavDarkTheme : NavDefaultTheme),
    colors: {
      ...(isDark ? NavDarkTheme.colors : NavDefaultTheme.colors),
      primary: paperTheme.colors.primary,
      background: paperTheme.colors.background,
      card: paperTheme.colors.surface,
      text: paperTheme.colors.onSurface,
      border: paperTheme.colors.outlineVariant,
    },
  };

  return (
    <SafeAreaProvider>
      {/* @expo/vector-icons stands in for react-native-vector-icons here, which
          Paper's components use internally for default icons. */}
      <PaperProvider theme={paperTheme} settings={{ icon: (props) => <MaterialCommunityIcons {...props} /> }}>
        <NavigationContainer theme={navTheme}>
          <RootNavigator />
        </NavigationContainer>
        <StatusBar style={isDark ? 'light' : 'dark'} />
      </PaperProvider>
    </SafeAreaProvider>
  );
}
