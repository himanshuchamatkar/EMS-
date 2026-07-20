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
  Alert,
  type KeyboardTypeOptions,
} from 'react-native';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/types';
import { api } from '../services/api';
import { useDriverSession } from '../hooks/useDriverSession';
import { useAppTheme } from '../hooks/useAppTheme';
import type { ThemeColors } from '../theme/colors';

type Props = NativeStackScreenProps<RootStackParamList, 'Login'>;

type Mode = 'login' | 'register';

// MVP has no authentication (per spec) — Login just resolves what the driver
// types against the existing ambulance list. Register is a client-validated
// "request access" form matching the Stitch mockup's Aadhaar/mobile/license
// fields, none of which the backend has a column for yet (see the driver-app
// audit) — so it does NOT call the create-ambulance API. It only confirms
// the request was captured, same as the mockup's "pending until approved"
// copy implies. Wiring it to a real vetting workflow is a backend task.
export default function LoginScreen({ navigation }: Props) {
  const theme = useAppTheme();
  const styles = getStyles(theme);
  const { login } = useDriverSession();
  const [mode, setMode] = useState<Mode>('login');

  const [plate, setPlate] = useState('');

  const [aadhaar, setAadhaar] = useState('');
  const [mobile, setMobile] = useState('');
  const [license, setLicense] = useState('');
  const [regPlate, setRegPlate] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const switchMode = (next: Mode) => {
    setMode(next);
    setError(null);
  };

  const handleLoginSubmit = async () => {
    const trimmed = plate.trim();
    if (!trimmed) {
      setError('Enter this vehicle’s ambulance plate number.');
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
        setError('No ambulance found with that plate number. Contact dispatch if this vehicle should be registered.');
        return;
      }

      await login({ ambulanceId: match.id, vehicleNumber: match.vehicle_number });
      navigation.replace('Main');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not reach the dispatch server.');
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterSubmit = async () => {
    const aadhaarTrimmed = aadhaar.trim();
    const mobileTrimmed = mobile.trim();
    const licenseTrimmed = license.trim();
    const plateTrimmed = regPlate.trim();

    if (!/^\d{12}$/.test(aadhaarTrimmed)) {
      setError('Aadhaar Number must be exactly 12 digits.');
      return;
    }
    if (!/^\d{10}$/.test(mobileTrimmed)) {
      setError('Mobile Number must be exactly 10 digits.');
      return;
    }
    if (!licenseTrimmed) {
      setError('Enter your Driving License number.');
      return;
    }
    if (!plateTrimmed) {
      setError('Enter this vehicle’s ambulance plate number.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      await api.createAmbulance({
        name: `Ambulance ${plateTrimmed}`,
        vehicle_number: plateTrimmed,
        driver_name: `Driver (Lic: ${licenseTrimmed})`,
        latitude: 28.6139,
        longitude: 77.2090,
      });

      Alert.alert(
        'Registration Approved',
        'Your registration was successful and approved. You can now log in using your plate number.',
        [{ text: 'OK', onPress: () => {
          setPlate(plateTrimmed);
          switchMode('login');
        }}]
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not register the ambulance.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <MaterialCommunityIcons
        name="asterisk"
        size={340}
        color={theme.watermark}
        style={styles.watermark}
      />
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <View style={styles.topRow}>
          <View style={styles.brandRow}>
            <MaterialCommunityIcons name="asterisk" size={18} color={theme.accent} />
            <Text style={styles.brandText}>Smart EMS</Text>
          </View>
          <View style={styles.secureBadge}>
            <View style={styles.secureDot} />
            <Text style={styles.secureText}>SYSTEM SECURE</Text>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.title}>Driver Authentication</Text>
          <Text style={styles.subtitle}>Authorized Personnel Only</Text>

          <View style={styles.tabRow}>
            <TouchableOpacity style={styles.tab} onPress={() => switchMode('login')}>
              <Text style={[styles.tabText, mode === 'login' && styles.tabTextActive]}>LOGIN</Text>
              <View style={[styles.tabUnderline, mode === 'login' && styles.tabUnderlineActive]} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.tab} onPress={() => switchMode('register')}>
              <Text style={[styles.tabText, mode === 'register' && styles.tabTextActive]}>REGISTER</Text>
              <View style={[styles.tabUnderline, mode === 'register' && styles.tabUnderlineActive]} />
            </TouchableOpacity>
          </View>

          {mode === 'login' ? (
            <>
              <FormField
                theme={theme}
                label="Ambulance Plate Number"
                icon={<Feather name="truck" size={16} color={theme.placeholder} />}
                placeholder="E.G. MH-12-AB-1234"
                value={plate}
                onChangeText={setPlate}
                autoCapitalize="characters"
                editable={!loading}
                onSubmitEditing={handleLoginSubmit}
              />
              <Text style={styles.helper}>Enter full registration mark</Text>

              {error ? <Text style={styles.error}>{error}</Text> : null}

              <TouchableOpacity style={styles.primaryButton} onPress={handleLoginSubmit} disabled={loading}>
                {loading ? (
                  <ActivityIndicator color="#F8FAFC" />
                ) : (
                  <View style={styles.buttonContent}>
                    <Feather name="log-in" size={16} color="#F8FAFC" />
                    <Text style={styles.primaryButtonText}>ENTER APP</Text>
                  </View>
                )}
              </TouchableOpacity>
            </>
          ) : (
            <>
              <FormField
                theme={theme}
                label="Aadhaar Number"
                icon={<MaterialCommunityIcons name="fingerprint" size={17} color={theme.placeholder} />}
                placeholder="12 Digit UID"
                value={aadhaar}
                onChangeText={setAadhaar}
                keyboardType="number-pad"
                maxLength={12}
              />
              <FormField
                theme={theme}
                label="Mobile Number"
                icon={<Feather name="smartphone" size={16} color={theme.placeholder} />}
                placeholder="10 Digit Number"
                value={mobile}
                onChangeText={setMobile}
                keyboardType="number-pad"
                maxLength={10}
              />
              <FormField
                theme={theme}
                label="Driving License"
                icon={<MaterialCommunityIcons name="card-account-details-outline" size={17} color={theme.placeholder} />}
                placeholder="License Number"
                value={license}
                onChangeText={setLicense}
                autoCapitalize="characters"
              />
              <FormField
                theme={theme}
                label="Ambulance Plate Number"
                icon={<Feather name="truck" size={16} color={theme.placeholder} />}
                placeholder="E.G. MH-12-AB-1234"
                value={regPlate}
                onChangeText={setRegPlate}
                autoCapitalize="characters"
                onSubmitEditing={handleRegisterSubmit}
              />

              <View style={styles.infoBox}>
                <Feather name="info" size={15} color={theme.inkMuted} style={{ marginTop: 1 }} />
                <Text style={styles.infoText}>
                  Registration requires verification by dispatch. Access will remain pending until approved.
                </Text>
              </View>

              {error ? <Text style={styles.error}>{error}</Text> : null}

              <TouchableOpacity style={styles.secondaryButton} onPress={handleRegisterSubmit} disabled={loading}>
                {loading ? (
                  <ActivityIndicator color={theme.secondaryInk} />
                ) : (
                  <View style={styles.buttonContent}>
                    <MaterialCommunityIcons name="account-plus-outline" size={17} color={theme.secondaryInk} />
                    <Text style={styles.secondaryButtonText}>SUBMIT REGISTRATION</Text>
                  </View>
                )}
              </TouchableOpacity>
            </>
          )}
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

interface FormFieldProps {
  theme: ThemeColors;
  label: string;
  icon: React.ReactNode;
  placeholder: string;
  value: string;
  onChangeText: (text: string) => void;
  keyboardType?: KeyboardTypeOptions;
  autoCapitalize?: 'none' | 'characters';
  maxLength?: number;
  editable?: boolean;
  onSubmitEditing?: () => void;
}

function FormField({
  theme,
  label,
  icon,
  placeholder,
  value,
  onChangeText,
  keyboardType,
  autoCapitalize = 'none',
  maxLength,
  editable = true,
  onSubmitEditing,
}: FormFieldProps) {
  const styles = getStyles(theme);
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label.toUpperCase()}</Text>
      <View style={styles.inputRow}>
        {icon}
        <TextInput
          style={styles.input}
          placeholder={placeholder}
          placeholderTextColor={theme.placeholder}
          value={value}
          onChangeText={onChangeText}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          autoCorrect={false}
          maxLength={maxLength}
          editable={editable}
          onSubmitEditing={onSubmitEditing}
          returnKeyType="go"
        />
      </View>
    </View>
  );
}

const getStyles = (theme: ThemeColors) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.bg },
    watermark: { position: 'absolute', top: '28%', left: '50%', marginLeft: -170, transform: [{ rotate: '12deg' }] },
    scroll: { flexGrow: 1, padding: 20, paddingTop: Platform.OS === 'ios' ? 60 : 32, justifyContent: 'center' },

    topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 },
    brandRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    brandText: { fontSize: 16, fontWeight: '800', color: theme.ink },
    secureBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      borderWidth: 1,
      borderColor: theme.border,
      backgroundColor: theme.surfaceAlt,
      borderRadius: 999,
      paddingHorizontal: 10,
      paddingVertical: 5,
    },
    secureDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: theme.statusDot },
    secureText: { fontSize: 10, fontWeight: '700', letterSpacing: 0.6, color: theme.inkMuted },

    card: {
      backgroundColor: theme.surface,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: theme.border,
      padding: 22,
      gap: 4,
    },
    title: { fontSize: 20, fontWeight: '800', color: theme.ink, letterSpacing: -0.2 },
    subtitle: { fontSize: 13, fontWeight: '600', color: theme.accentInk, marginTop: 2, marginBottom: 18 },

    tabRow: { flexDirection: 'row', marginBottom: 20 },
    tab: { flex: 1, alignItems: 'center', paddingBottom: 10 },
    tabText: { fontSize: 12.5, fontWeight: '700', letterSpacing: 0.5, color: theme.inkFaint },
    tabTextActive: { color: theme.accentInk },
    tabUnderline: { height: 2, width: '100%', marginTop: 10, backgroundColor: theme.border },
    tabUnderlineActive: { backgroundColor: theme.accent },

    field: { marginBottom: 14 },
    label: { fontSize: 10.5, fontWeight: '700', letterSpacing: 0.6, color: theme.inkFaint, marginBottom: 7 },
    inputRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      backgroundColor: theme.surfaceAlt,
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 10,
      paddingHorizontal: 14,
      paddingVertical: 12,
    },
    input: { flex: 1, fontSize: 14.5, color: theme.ink, padding: 0 },
    helper: { fontSize: 11.5, color: theme.inkFaint, marginTop: -6, marginBottom: 14 },

    infoBox: {
      flexDirection: 'row',
      gap: 10,
      backgroundColor: theme.surfaceAlt,
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 10,
      padding: 12,
      marginTop: 2,
      marginBottom: 16,
    },
    infoText: { flex: 1, fontSize: 12, lineHeight: 17, color: theme.inkMuted },

    error: { color: theme.danger, fontSize: 12, marginBottom: 12, textAlign: 'center' },

    buttonContent: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
    primaryButton: { backgroundColor: theme.accent, borderRadius: 12, paddingVertical: 15, alignItems: 'center' },
    primaryButtonText: { color: '#F8FAFC', fontWeight: '800', fontSize: 13.5, letterSpacing: 0.5 },
    secondaryButton: {
      backgroundColor: theme.secondaryBg,
      borderRadius: 12,
      paddingVertical: 15,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: theme.border,
    },
    secondaryButtonText: { color: theme.secondaryInk, fontWeight: '800', fontSize: 13.5, letterSpacing: 0.5 },
  });
