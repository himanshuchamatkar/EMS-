import React from 'react';
import { View, StyleSheet } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Feather } from '@expo/vector-icons';
import type { MainTabParamList } from './types';
import { useAppTheme } from '../hooks/useAppTheme';
import type { ThemeColors } from '../theme/colors';
import IncidentScreen from '../screens/IncidentScreen';
import StatusScreen from '../screens/StatusScreen';
import HistoryScreen from '../screens/HistoryScreen';
import MapScreen from '../screens/MapScreen';

const Tab = createBottomTabNavigator<MainTabParamList>();

type IconName = React.ComponentProps<typeof Feather>['name'];

function TabIcon({ name, focused, theme }: { name: IconName; focused: boolean; theme: ThemeColors }) {
  const styles = getStyles(theme);
  return (
    <View style={[styles.iconWrap, focused && styles.iconWrapActive]}>
      <Feather name={name} size={17} color={focused ? '#F8FAFC' : theme.inkFaint} />
    </View>
  );
}

export default function MainTabNavigator() {
  const theme = useAppTheme();
  const styles = getStyles(theme);

  return (
    <Tab.Navigator
      initialRouteName="Status"
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.accentInk,
        tabBarInactiveTintColor: theme.inkFaint,
        tabBarStyle: styles.bar,
        tabBarLabelStyle: styles.label,
        tabBarItemStyle: styles.item,
      }}
    >
      <Tab.Screen
        name="Incident"
        component={IncidentScreen}
        options={{ tabBarIcon: ({ focused }) => <TabIcon name="alert-triangle" focused={focused} theme={theme} /> }}
      />
      <Tab.Screen
        name="Status"
        component={StatusScreen}
        options={{ tabBarIcon: ({ focused }) => <TabIcon name="briefcase" focused={focused} theme={theme} /> }}
      />
      <Tab.Screen
        name="History"
        component={HistoryScreen}
        options={{ tabBarIcon: ({ focused }) => <TabIcon name="clock" focused={focused} theme={theme} /> }}
      />
      <Tab.Screen
        name="Map"
        component={MapScreen}
        options={{ tabBarIcon: ({ focused }) => <TabIcon name="map-pin" focused={focused} theme={theme} /> }}
      />
    </Tab.Navigator>
  );
}

const getStyles = (theme: ThemeColors) =>
  StyleSheet.create({
    bar: {
      backgroundColor: theme.surface,
      borderTopWidth: 1,
      borderTopColor: theme.border,
      height: 66,
      paddingTop: 8,
      paddingBottom: 10,
    },
    item: { gap: 2 },
    label: { fontSize: 10, fontWeight: '700', letterSpacing: 0.4, textTransform: 'uppercase' },
    iconWrap: { width: 34, height: 26, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
    iconWrapActive: { backgroundColor: theme.accent },
  });
