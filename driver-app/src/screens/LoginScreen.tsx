import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  ScrollView,
  Platform,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/types';
import { api } from '../services/api';
import { useDriverSession } from '../hooks/useDriverSession';
import { requestLocationPermission, getCurrentCoords } from '../services/location';

type Props = NativeStackScreenProps<RootStackParamList, 'Login'>;

// MVP has no authentication (per spec). Two modes:
// - Login: resolves what the driver types against the existing ambulance list.
// - Register: creates a brand-new ambulance — the admin panel's Add Ambulance
//   UI was removed when it became monitor-only, so this is now the only way
//   a new vehicle gets into the system.
export default function LoginScreen({ navigation }: Props) {
  const { login } = useDriverSession();
  const [mode, setMode] = useState<'login' | 'register'>('login');

  // Login state
  const [query, setQuery] = useState('');

  // Register state
  const [regName, setRegName] = useState('');
  const [regVehicleNumber, setRegVehicleNumber] = useState('');
  const [regDriverName, setRegDriverName] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const switchMode = (next: 'login' | 'register') => {
    setMode(next);
    setError(null);
  };

  const handleLoginSubmit = async () => {
    const trimmed = query.trim();
    if (!trimmed) {
      setError('Enter your Ambulance ID or Vehicle Number.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const ambulances = await api.getAmbulances();
      const match = ambulances.find(
        (amb) => amb.id === trimmed || amb.vehicle_number.toLowerCase() === trimmed.toLowerCase()
      );

      if (!match) {
        setError('No ambulance found with that ID or vehicle number. Use "Register New" if this is a new vehicle.');
        return;
      }

      await login({ ambulanceId: match.id, vehicleNumber: match.vehicle_number });
      navigation.replace('Home');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not reach the dispatch server.');
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterSubmit = async () => {
    const name = regName.trim();
    const vehicleNumber = regVehicleNumber.trim();
    if (!name || !vehicleNumber) {
      setError('Call sign and vehicle number are required.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const existing = await api.getAmbulances();
      const dupe = existing.find((amb) => amb.vehicle_number.toLowerCase() === vehicleNumber.toLowerCase());
      if (dupe) {
        setError('That vehicle number is already registered — use Login instead.');
        return;
      }

      const granted = await requestLocationPermission();
      if (!granted) {
        setError('Location permission is required to register an ambulance.');
        return;
      }
      const coords = await getCurrentCoords();

      const created = await api.createAmbulance({
        name,
        vehicle_number: vehicleNumber,
        driver_name: regDriverName.trim() || undefined,
        latitude: coords.latitude,
        longitude: coords.longitude,
      });

      await login({ ambulanceId: created.id, vehicleNumber: created.vehicle_number });
      navigation.replace('Home');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not reach the dispatch server.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <Text style={styles.badge}>🚑</Text>
        <Text style={styles.title}>Ambulance Driver</Text>

        <View style={styles.tabs}>
          <TouchableOpacity
            style={[styles.tab, mode === 'login' && styles.tabActive]}
            onPress={() => switchMode('login')}
          >
            <Text style={[styles.tabText, mode === 'login' && styles.tabTextActive]}>Login</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, mode === 'register' && styles.tabActive]}
            onPress={() => switchMode('register')}
          >
            <Text style={[styles.tabText, mode === 'register' && styles.tabTextActive]}>Register New</Text>
          </TouchableOpacity>
        </View>

        {mode === 'login' ? (
          <>
            <Text style={styles.subtitle}>
              Enter your Ambulance ID or Vehicle Number to identify this device. No password required.
            </Text>

            <TextInput
              style={styles.input}
              placeholder="e.g. AMB-911-A"
              placeholderTextColor="#64748B"
              value={query}
              onChangeText={setQuery}
              autoCapitalize="characters"
              autoCorrect={false}
              editable={!loading}
              onSubmitEditing={handleLoginSubmit}
              returnKeyType="go"
            />

            {error ? <Text style={styles.error}>{error}</Text> : null}

            <TouchableOpacity style={styles.button} onPress={handleLoginSubmit} disabled={loading}>
              {loading ? <ActivityIndicator color="#F8FAFC" /> : <Text style={styles.buttonText}>Continue</Text>}
            </TouchableOpacity>
          </>
        ) : (
          <>
            <Text style={styles.subtitle}>
              Register this vehicle if it isn't in the system yet. Your current GPS position will be used as its
              starting location.
            </Text>

            <TextInput
              style={styles.input}
              placeholder="Call sign, e.g. Rescue Indigo"
              placeholderTextColor="#64748B"
              value={regName}
              onChangeText={setRegName}
              autoCorrect={false}
              editable={!loading}
            />
            <TextInput
              style={styles.input}
              placeholder="Vehicle number, e.g. AMB-911-I"
              placeholderTextColor="#64748B"
              value={regVehicleNumber}
              onChangeText={setRegVehicleNumber}
              autoCapitalize="characters"
              autoCorrect={false}
              editable={!loading}
            />
            <TextInput
              style={styles.input}
              placeholder="Driver name (optional)"
              placeholderTextColor="#64748B"
              value={regDriverName}
              onChangeText={setRegDriverName}
              autoCorrect={false}
              editable={!loading}
              onSubmitEditing={handleRegisterSubmit}
              returnKeyType="go"
            />

            {error ? <Text style={styles.error}>{error}</Text> : null}

            <TouchableOpacity style={styles.button} onPress={handleRegisterSubmit} disabled={loading}>
              {loading ? (
                <ActivityIndicator color="#F8FAFC" />
              ) : (
                <Text style={styles.buttonText}>Register &amp; Continue</Text>
              )}
            </TouchableOpacity>
          </>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F172A' },
  scroll: { flexGrow: 1, padding: 24, justifyContent: 'center' },
  badge: { fontSize: 48, textAlign: 'center', marginBottom: 12 },
  title: { fontSize: 22, fontWeight: '800', color: '#F8FAFC', textAlign: 'center', marginBottom: 18 },
  tabs: {
    flexDirection: 'row',
    backgroundColor: '#1E293B',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#334155',
    padding: 4,
    marginBottom: 18,
  },
  tab: { flex: 1, paddingVertical: 10, borderRadius: 9, alignItems: 'center' },
  tabActive: { backgroundColor: '#3B82F6' },
  tabText: { fontSize: 13, fontWeight: '700', color: '#94A3B8' },
  tabTextActive: { color: '#F8FAFC' },
  subtitle: { fontSize: 13, color: '#94A3B8', textAlign: 'center', marginBottom: 20, lineHeight: 18 },
  input: {
    backgroundColor: '#1E293B',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: '#F8FAFC',
    fontSize: 16,
    marginBottom: 12,
  },
  error: { color: '#EF4444', fontSize: 12, marginBottom: 12, textAlign: 'center' },
  button: { backgroundColor: '#3B82F6', borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  buttonText: { color: '#F8FAFC', fontWeight: '700', fontSize: 15 },
});
