import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import type { CompositeScreenProps } from '@react-navigation/native';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { NativeStackNavigationProp, NativeStackScreenProps } from '@react-navigation/native-stack';
import type { MainTabParamList, RootStackParamList } from '../navigation/types';
import { useDriverSession } from '../hooks/useDriverSession';
import { useAppTheme } from '../hooks/useAppTheme';
import type { ThemeColors } from '../theme/colors';
import AppHeader from '../components/AppHeader';
import AmbulanceStatusSelector from '../components/AmbulanceStatusSelector';

type Props = CompositeScreenProps<
  BottomTabScreenProps<MainTabParamList, 'Status'>,
  NativeStackScreenProps<RootStackParamList>
>;

export default function StatusScreen({ navigation }: Props) {
  const theme = useAppTheme();
  const styles = getStyles(theme);
  const {
    identity,
    online,
    setOnline,
    connected,
    coords,
    locationError,
    ambulanceStatus,
    statusUpdating,
    setAmbulanceStatus,
    logout,
  } = useDriverSession();

  // No Settings/Profile screen exists yet — long-press the unit title to sign out.
  const handleSignOutRequest = () => {
    Alert.alert('Sign out of this device?', undefined, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign out',
        style: 'destructive',
        onPress: async () => {
          await logout();
          navigation.getParent<NativeStackNavigationProp<RootStackParamList>>()?.replace('Login');
        },
      },
    ]);
  };

  const gpsState = locationError ? 'error' : coords ? 'active' : online ? 'acquiring' : 'disabled';
  const gpsLabel =
    gpsState === 'error' ? 'Permission Denied' : gpsState === 'active' ? 'Active' : gpsState === 'acquiring' ? 'Acquiring…' : 'Disabled';
  const gpsColor = gpsState === 'error' ? theme.danger : gpsState === 'active' ? theme.good : gpsState === 'acquiring' ? theme.warn : theme.inkFaint;

  const socketLabel = online ? (connected ? 'Connected' : 'Connecting…') : 'Disconnected';
  const socketColor = online ? (connected ? theme.good : theme.warn) : theme.inkFaint;

  return (
    <View style={styles.container}>
      <AppHeader
        unitLabel={identity?.vehicleNumber ?? '—'}
        dutyLabel={online ? 'ON DUTY' : 'OFF DUTY'}
        dutyColor={online ? theme.good : theme.danger}
        connected={connected}
        onTitleLongPress={handleSignOutRequest}
      />

      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.hero}>
          <View style={[styles.heroIcon, { backgroundColor: online ? theme.accentSoft : theme.surfaceAlt }]}>
            {online ? (
              <Feather name="navigation" size={30} color={theme.accent} />
            ) : (
              <MaterialCommunityIcons name="weather-night" size={30} color={theme.inkFaint} />
            )}
          </View>
          <Text style={styles.heroTitle}>{online ? 'System Active' : 'System Standby'}</Text>
          <Text style={styles.heroSubtitle}>
            {online
              ? 'Vehicle systems are online. Broadcasting live location to dispatch.'
              : 'Vehicle systems are offline. GPS and telemetry tracking suspended.'}
          </Text>

          {online ? (
            <Text style={styles.coords}>
              {coords ? `${coords.latitude.toFixed(5)}, ${coords.longitude.toFixed(5)}` : 'Acquiring GPS fix…'}
            </Text>
          ) : null}

          <TouchableOpacity style={styles.dutyButton} onPress={() => setOnline(!online)}>
            <Feather name="power" size={16} color="#F8FAFC" />
            <Text style={styles.dutyButtonText}>{online ? 'GO OFF DUTY' : 'GO ON DUTY'}</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.sectionLabel}>VEHICLE STATUS</Text>
        <AmbulanceStatusSelector value={ambulanceStatus} updating={statusUpdating} onChange={setAmbulanceStatus} />

        <View style={styles.diagRow}>
          <View style={styles.diagCard}>
            <Feather name="target" size={16} color={gpsColor} />
            <Text style={styles.diagLabel}>GPS Tracker</Text>
            <Text style={[styles.diagValue, { color: gpsColor }]}>{gpsLabel}</Text>
          </View>
          <View style={styles.diagCard}>
            <Feather name="server" size={16} color={socketColor} />
            <Text style={styles.diagLabel}>CAD Socket</Text>
            <Text style={[styles.diagValue, { color: socketColor }]}>{socketLabel}</Text>
          </View>
        </View>

        <TouchableOpacity style={styles.signOutButton} onPress={handleSignOutRequest}>
          <Feather name="log-out" size={15} color={theme.danger} />
          <Text style={styles.signOutButtonText}>SIGN OUT VEHICLE</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const getStyles = (theme: ThemeColors) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.bg },
    scroll: { flexGrow: 1, padding: 20, gap: 16 },

    hero: { alignItems: 'center', paddingVertical: 28, gap: 6 },
    heroIcon: { width: 64, height: 64, borderRadius: 18, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
    heroTitle: { fontSize: 22, fontWeight: '800', color: theme.ink },
    heroSubtitle: { fontSize: 13, color: theme.inkMuted, textAlign: 'center', lineHeight: 19, maxWidth: 280, marginTop: 2 },
    coords: { fontSize: 12.5, color: theme.accentInk, fontVariant: ['tabular-nums'], marginTop: 6 },

    dutyButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      backgroundColor: theme.accent,
      borderRadius: 12,
      paddingVertical: 15,
      paddingHorizontal: 28,
      marginTop: 20,
      alignSelf: 'stretch',
    },
    dutyButtonText: { color: '#F8FAFC', fontWeight: '800', fontSize: 13.5, letterSpacing: 0.5 },

    sectionLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 0.8, color: theme.inkFaint, textAlign: 'center' },

    diagRow: { flexDirection: 'row', gap: 12 },
    diagCard: {
      flex: 1,
      backgroundColor: theme.surface,
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 12,
      padding: 14,
      gap: 6,
    },
    diagLabel: { fontSize: 11.5, color: theme.inkMuted, fontWeight: '600' },
    diagValue: { fontSize: 13, fontWeight: '700' },

    signOutButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      borderWidth: 1,
      borderColor: theme.danger,
      borderRadius: 12,
      paddingVertical: 14,
      marginTop: 8,
      alignSelf: 'stretch',
    },
    signOutButtonText: { color: theme.danger, fontWeight: '800', fontSize: 13, letterSpacing: 0.5 },
  });
