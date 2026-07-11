import React from 'react';
import { View, Text, StyleSheet, Switch, ScrollView, Platform } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/types';
import { useDriverSession } from '../hooks/useDriverSession';
import StatusBadge from '../components/StatusBadge';
import ConnectionIndicator from '../components/ConnectionIndicator';
import AmbulanceStatusSelector from '../components/AmbulanceStatusSelector';

type Props = NativeStackScreenProps<RootStackParamList, 'Home'>;

export default function HomeScreen({ navigation }: Props) {
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

  const handleLogout = async () => {
    await logout();
    navigation.replace('Login');
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.label}>VEHICLE</Text>
          <Text style={styles.vehicle}>{identity?.vehicleNumber ?? '—'}</Text>
        </View>
        <ConnectionIndicator connected={connected} />
      </View>

      <View style={styles.card}>
        <View style={styles.rowBetween}>
          <View style={{ flex: 1, paddingRight: 12 }}>
            <Text style={styles.cardTitle}>Duty Status</Text>
            <Text style={styles.cardSubtitle}>
              {online ? 'Reporting location every 5 seconds' : 'Not visible to dispatch'}
            </Text>
          </View>
          <Switch
            value={online}
            onValueChange={setOnline}
            trackColor={{ false: '#334155', true: '#10B981' }}
            thumbColor="#F8FAFC"
          />
        </View>
        <StatusBadge online={online} />
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Ambulance Status</Text>
        <Text style={styles.cardSubtitle}>Controls whether dispatch can offer you new incidents.</Text>
        <AmbulanceStatusSelector value={ambulanceStatus} updating={statusUpdating} onChange={setAmbulanceStatus} />
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Current GPS</Text>
        {coords ? (
          <>
            <Text style={styles.coord}>Lat: {coords.latitude.toFixed(6)}</Text>
            <Text style={styles.coord}>Lng: {coords.longitude.toFixed(6)}</Text>
          </>
        ) : (
          <Text style={styles.coordEmpty}>
            {online ? 'Acquiring GPS fix…' : 'Go online to start sharing your location.'}
          </Text>
        )}
        {locationError ? <Text style={styles.error}>{locationError}</Text> : null}
      </View>

      <Text style={styles.logout} onPress={handleLogout}>
        Sign out of this device
      </Text>
    </ScrollView>
  );
}

const monoFont = Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' });

const styles = StyleSheet.create({
  container: { flexGrow: 1, backgroundColor: '#0F172A', padding: 20, gap: 16 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  label: { fontSize: 11, color: '#64748B', fontWeight: '700', letterSpacing: 1 },
  vehicle: { fontSize: 24, color: '#F8FAFC', fontWeight: '800' },
  card: {
    backgroundColor: '#1E293B',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#334155',
    padding: 16,
    gap: 10,
  },
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardTitle: { fontSize: 14, color: '#F8FAFC', fontWeight: '700' },
  cardSubtitle: { fontSize: 12, color: '#94A3B8', marginTop: 2 },
  coord: { fontSize: 14, color: '#CBD5E1', fontFamily: monoFont },
  coordEmpty: { fontSize: 13, color: '#64748B', fontStyle: 'italic' },
  error: { fontSize: 12, color: '#EF4444', marginTop: 4 },
  logout: { textAlign: 'center', color: '#F87171', fontSize: 13, marginTop: 8, fontWeight: '600' },
});
