import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../navigation/types';
import { useDriverSession } from '../hooks/useDriverSession';
import { calculateDistanceKm } from '../utils/distance';
import { LEAFLET_MAP_HTML } from '../assets/leafletMap';
import { api } from '../services/api';

type Props = NativeStackScreenProps<RootStackParamList, 'Navigation'>;

export default function NavigationScreen({ route, navigation }: Props) {
  const { emergency } = route.params;
  const { coords, identity } = useDriverSession();
  const webViewRef = useRef<WebView>(null);
  const mapReadyRef = useRef(false);
  const [submitting, setSubmitting] = useState(false);
  const [stage, setStage] = useState<'toScene' | 'toHospital'>(
    emergency.status === 'VICTIM_PICKED' ? 'toHospital' : 'toScene'
  );

  const liveDistance = coords
    ? calculateDistanceKm(coords.latitude, coords.longitude, emergency.latitude, emergency.longitude)
    : null;

  const pushToMap = () => {
    if (!webViewRef.current || !mapReadyRef.current || !coords) return;
    const payload = JSON.stringify({
      ambulance: { latitude: coords.latitude, longitude: coords.longitude },
      emergency: {
        latitude: emergency.latitude,
        longitude: emergency.longitude,
        description: emergency.description,
      },
    });
    webViewRef.current.postMessage(payload);
  };

  useEffect(() => {
    pushToMap();
    // pushToMap reads refs directly; only re-run when coords actually change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [coords]);

  const handleMessage = (event: WebViewMessageEvent) => {
    if (event.nativeEvent.data === 'ready') {
      mapReadyRef.current = true;
      pushToMap();
    }
  };

  // Driver-initiated confirmation that the victim is on board. Sets the
  // incident's status to VICTIM_PICKED with a pickup timestamp; the
  // ambulance stays Busy (still en route to the hospital) and the admin
  // panel updates live over the existing Socket.IO connection. Advances
  // this screen to the drop-off stage instead of navigating away.
  const submitVictimPickedUp = async () => {
    if (!identity) return;
    setSubmitting(true);
    try {
      await api.pickupVictim(emergency.id, identity.ambulanceId);
      setStage('toHospital');
    } catch (err) {
      Alert.alert('Could not confirm pickup', err instanceof Error ? err.message : 'Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleVictimPickedUp = () => {
    Alert.alert('Confirm pickup', 'Have you picked up the victim?', [
      { text: 'Not yet', style: 'cancel' },
      { text: 'Yes, picked up', style: 'default', onPress: submitVictimPickedUp },
    ]);
  };

  // Driver-initiated confirmation that the victim was dropped at the
  // hospital. Terminal step — resolves the incident and frees the ambulance
  // back to Available, then returns the driver to the Home screen.
  const submitDroppedAtHospital = async () => {
    if (!identity) return;
    setSubmitting(true);
    try {
      await api.dropAtHospital(emergency.id, identity.ambulanceId);
      navigation.replace('Home');
    } catch (err) {
      Alert.alert('Could not confirm drop-off', err instanceof Error ? err.message : 'Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDroppedAtHospital = () => {
    Alert.alert('Confirm drop-off', 'Have you dropped the victim at the hospital? This will complete the incident and free the ambulance.', [
      { text: 'Not yet', style: 'cancel' },
      { text: 'Yes, dropped off', style: 'default', onPress: submitDroppedAtHospital },
    ]);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.navigate('Home')} hitSlop={10}>
          <Text style={styles.back}>‹ Back</Text>
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>{stage === 'toHospital' ? 'To hospital' : 'En route'}</Text>
          <Text style={styles.subtitle} numberOfLines={1}>
            {emergency.description}
          </Text>
        </View>
        {liveDistance != null ? <Text style={styles.distance}>{liveDistance.toFixed(2)} km</Text> : null}
      </View>

      <WebView
        ref={webViewRef}
        source={{ html: LEAFLET_MAP_HTML }}
        style={styles.map}
        onMessage={handleMessage}
        javaScriptEnabled
        originWhitelist={['*']}
      />

      {stage === 'toScene' ? (
        <TouchableOpacity style={styles.arriveBtn} onPress={handleVictimPickedUp} disabled={submitting}>
          {submitting ? <ActivityIndicator color="#052e19" /> : <Text style={styles.arriveText}>PICK UP VICTIM</Text>}
        </TouchableOpacity>
      ) : (
        <TouchableOpacity style={styles.dropBtn} onPress={handleDroppedAtHospital} disabled={submitting}>
          {submitting ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.dropText}>🏥 DROP AT HOSPITAL</Text>}
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0F172A' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  back: { color: '#3B82F6', fontSize: 14, fontWeight: '700' },
  title: { fontSize: 16, fontWeight: '800', color: '#F8FAFC' },
  subtitle: { fontSize: 12, color: '#94A3B8', marginTop: 2 },
  distance: { fontSize: 15, fontWeight: '800', color: '#3B82F6' },
  map: { flex: 1 },
  arriveBtn: {
    margin: 16,
    backgroundColor: '#10B981',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  arriveText: { color: '#052e19', fontWeight: '800', fontSize: 15 },
  dropBtn: {
    margin: 16,
    backgroundColor: '#2563EB',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  dropText: { color: '#FFFFFF', fontWeight: '800', fontSize: 15 },
});
