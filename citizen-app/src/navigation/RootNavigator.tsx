import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { RootStackParamList } from './types';
import MainTabNavigator from './MainTabNavigator';

const Stack = createNativeStackNavigator<RootStackParamList>();

/**
 * A single-route stack wrapping the tab navigator — no Splash/Permission
 * screens in this pass (the new Stitch design doesn't include them; see
 * summary). Kept as a Stack, not the bare TabNavigator, so upcoming
 * modal-style screens (e.g. the "Potential Duplicate" dialog) can be pushed
 * on top of the tabs later without a structural rework.
 */
export default function RootNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Tabs" component={MainTabNavigator} />
    </Stack.Navigator>
  );
}
