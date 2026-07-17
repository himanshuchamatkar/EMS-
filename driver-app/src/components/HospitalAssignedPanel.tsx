import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Linking } from 'react-native';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import type { MockHospital } from '../data/mockHospitals';
import { LEAFLET_MAP_HTML } from '../assets/leafletMap';
import { useAppTheme } from '../hooks/useAppTheme';
import type { ThemeColors } from '../theme/colors';
import type { TrackedCoords } from '../hooks/useLocationTracking';

interface Props {
  hospital: MockHospital;
  coords: TrackedCoords | null;
  distanceKm: number | null;
  etaMinutes: number | null;
  onStartNavigation: () => void;
}

/** Confirmation screen once a hospital is selected — matches the "Hospital Assigned" mockup. */
export default function HospitalAssignedPanel({ hospital, coords, distanceKm, etaMinutes, onStartNavigation }: Props) {
  const theme = useAppTheme();
  const styles = getStyles(theme);
  const webViewRef = useRef<WebView>(null);
  const mapReadyRef = useRef(false);

  const pushToMap = () => {
    if (!webViewRef.current || !mapReadyRef.current || !coords) return;
    webViewRef.current.postMessage(
      JSON.stringify({
        ambulance: { latitude: coords.latitude, longitude: coords.longitude },
        emergency: { latitude: hospital.latitude, longitude: hospital.longitude, description: hospital.name },
      })
    );
  };

  useEffect(() => {
    pushToMap();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [coords, hospital]);

  const handleMessage = (event: WebViewMessageEvent) => {
    if (event.nativeEvent.data === 'ready') {
      mapReadyRef.current = true;
      pushToMap();
    }
  };

  const handleCallHospital = () => {
    Linking.openURL(`tel:${hospital.phone}`);
  };

  return (
    <View style={styles.container}>
      <View style={styles.hero}>
        <View style={styles.checkIcon}>
          <Feather name="check" size={22} color={theme.accent} />
        </View>
        <Text style={styles.title}>Hospital Assigned</Text>
        <Text style={styles.subtitle}>
          <Text style={styles.hospitalNameInline}>{hospital.name}</Text> has accepted the patient.
        </Text>
      </View>

      <View style={styles.mapWrap}>
        <WebView
          ref={webViewRef}
          source={{ html: LEAFLET_MAP_HTML }}
          style={styles.map}
          onMessage={handleMessage}
          javaScriptEnabled
          originWhitelist={['*']}
        />
        <View style={styles.chipRow}>
          <View style={styles.chip}>
            <Feather name="navigation" size={11} color={theme.ink} />
            <Text style={styles.chipText}>{distanceKm != null ? `${distanceKm.toFixed(1)} km` : '—'}</Text>
          </View>
          <View style={styles.chip}>
            <Feather name="clock" size={11} color={theme.ink} />
            <Text style={styles.chipText}>{etaMinutes != null ? `${etaMinutes} min` : '—'}</Text>
          </View>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.name}>{hospital.name}</Text>
        <Text style={styles.traumaLevel}>{hospital.traumaLevel}</Text>

        <View style={styles.row}>
          <Feather name="map-pin" size={14} color={theme.inkFaint} />
          <Text style={styles.rowText}>{hospital.address}</Text>
        </View>
        <View style={styles.row}>
          <MaterialCommunityIcons name="bed-outline" size={15} color={hospital.bedsAvailable > 0 ? theme.good : theme.danger} />
          <Text style={[styles.rowText, { color: hospital.bedsAvailable > 0 ? theme.good : theme.danger, fontWeight: '700' }]}>
            Emergency Beds · {hospital.bedsAvailable > 0 ? `${hospital.bedsAvailable} Available` : 'None available'}
          </Text>
        </View>
      </View>

      <TouchableOpacity style={styles.primaryButton} onPress={onStartNavigation}>
        <Feather name="navigation" size={16} color="#F8FAFC" />
        <Text style={styles.primaryButtonText}>START NAVIGATION</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.ghostButton} onPress={handleCallHospital}>
        <Feather name="phone" size={15} color={theme.accentInk} />
        <Text style={styles.ghostButtonText}>CALL HOSPITAL</Text>
      </TouchableOpacity>
    </View>
  );
}

const getStyles = (theme: ThemeColors) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.bg, padding: 20, gap: 16 },
    hero: { alignItems: 'center', gap: 4, paddingVertical: 4 },
    checkIcon: {
      width: 46,
      height: 46,
      borderRadius: 23,
      backgroundColor: theme.accentSoft,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 6,
    },
    title: { fontSize: 20, fontWeight: '800', color: theme.ink },
    subtitle: { fontSize: 13, color: theme.inkMuted, textAlign: 'center' },
    hospitalNameInline: { color: theme.accentInk, fontWeight: '700' },

    mapWrap: { height: 170, borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: theme.border },
    map: { flex: 1 },
    chipRow: { position: 'absolute', top: 10, right: 10, gap: 6 },
    chip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      backgroundColor: 'rgba(15,23,42,0.85)',
      borderRadius: 8,
      paddingHorizontal: 8,
      paddingVertical: 5,
    },
    chipText: { fontSize: 11, fontWeight: '700', color: '#F8FAFC' },

    card: {
      backgroundColor: theme.surface,
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 14,
      padding: 16,
      gap: 8,
    },
    name: { fontSize: 16, fontWeight: '800', color: theme.ink },
    traumaLevel: { fontSize: 12, fontWeight: '600', color: theme.accentInk, marginTop: -4, marginBottom: 4 },
    row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    rowText: { fontSize: 13, color: theme.inkMuted },

    primaryButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      backgroundColor: theme.accent,
      borderRadius: 12,
      paddingVertical: 15,
    },
    primaryButtonText: { color: '#F8FAFC', fontWeight: '800', fontSize: 13.5, letterSpacing: 0.4 },
    ghostButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      borderRadius: 12,
      paddingVertical: 14,
      borderWidth: 1,
      borderColor: theme.border,
    },
    ghostButtonText: { color: theme.accentInk, fontWeight: '800', fontSize: 13, letterSpacing: 0.4 },
  });
