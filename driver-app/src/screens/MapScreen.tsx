import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { useDriverSession } from '../hooks/useDriverSession';
import { useActiveIncident } from '../hooks/useActiveIncident';
import { useAppTheme } from '../hooks/useAppTheme';
import type { ThemeColors } from '../theme/colors';
import { calculateDistanceKm, estimateEtaMinutes } from '../utils/distance';
import { LEAFLET_MAP_HTML } from '../assets/leafletMap';
import AppHeader from '../components/AppHeader';
import PlaceholderBody from '../components/PlaceholderBody';
import IncidentMilestoneSheet from '../components/IncidentMilestoneSheet';
import HospitalListPanel from '../components/HospitalListPanel';
import HospitalAssignedPanel from '../components/HospitalAssignedPanel';
import HandoverCompletePanel from '../components/HandoverCompletePanel';
import IncidentMediaPreview from '../components/IncidentMediaPreview';

/**
 * Live view for the ambulance's active incident — lives inside the Map tab
 * (not a modal stack route) so the tab bar stays usable while a driver is
 * en route. Renders the empty-state placeholder when there's nothing active.
 */
export default function MapScreen() {
  const theme = useAppTheme();
  const styles = getStyles(theme);
  const { identity, online, connected, coords } = useDriverSession();
  const {
    emergency,
    stage,
    sceneArrivedAt,
    hospitalArrivedAt,
    selectedHospital,
    hospitalNavigationStarted,
    handoverDurationMinutes,
    markArrivedAtScene,
    markArrivedAtHospital,
    confirmPickup,
    confirmDropoff,
    selectHospital,
    startHospitalNavigation,
    completeIncident,
  } = useActiveIncident();

  const webViewRef = useRef<WebView>(null);
  const mapReadyRef = useRef(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (stage === 'arrivedAtScene' || stage === 'arrivedAtHospital') setSheetOpen(true);
  }, [stage]);

  const isToHospitalLeg = stage === 'toHospital' || stage === 'arrivedAtHospital';
  // Once pickup is confirmed the destination switches from the incident scene
  // to whichever hospital the driver picked on the Nearby Hospitals list.
  const destination = isToHospitalLeg && selectedHospital
    ? { latitude: selectedHospital.latitude, longitude: selectedHospital.longitude, label: selectedHospital.name }
    : emergency
      ? { latitude: emergency.latitude, longitude: emergency.longitude, label: emergency.description }
      : null;

  const pushToMap = () => {
    if (!webViewRef.current || !mapReadyRef.current || !coords || !destination) return;
    const payload = JSON.stringify({
      ambulance: { latitude: coords.latitude, longitude: coords.longitude },
      emergency: { latitude: destination.latitude, longitude: destination.longitude, description: destination.label },
    });
    webViewRef.current.postMessage(payload);
  };

  useEffect(() => {
    pushToMap();
    // pushToMap reads refs directly; only re-run when coords/destination actually change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [coords, destination?.latitude, destination?.longitude]);

  const handleMessage = (event: WebViewMessageEvent) => {
    if (event.nativeEvent.data === 'ready') {
      mapReadyRef.current = true;
      pushToMap();
    }
  };

  const handleRecenter = () => {
    webViewRef.current?.postMessage(JSON.stringify({ command: 'recenter' }));
  };

  const header = (extra?: React.ReactNode) => (
    <AppHeader
      unitLabel={identity?.vehicleNumber ?? '—'}
      dutyLabel={online ? 'ON DUTY' : 'OFF DUTY'}
      dutyColor={online ? theme.good : theme.danger}
      connected={connected}
      rightExtra={extra}
    />
  );

  if (!emergency) {
    return (
      <View style={styles.container}>
        {header()}
        <PlaceholderBody
          icon={<Feather name="map" size={26} color={theme.inkFaint} />}
          title="No active incident"
          subtitle="The live map appears here once you accept an incident."
        />
      </View>
    );
  }

  if (stage === 'handoverComplete') {
    return (
      <View style={styles.container}>
        {header()}
        <HandoverCompletePanel
          emergency={emergency}
          hospital={selectedHospital}
          durationMinutes={handoverDurationMinutes}
          onComplete={completeIncident}
        />
      </View>
    );
  }

  // Pickup confirmed but no receiving hospital chosen yet — show the ranked list.
  if (stage === 'toHospital' && !selectedHospital) {
    return (
      <View style={styles.container}>
        {header()}
        <HospitalListPanel originLatitude={emergency.latitude} originLongitude={emergency.longitude} onSelect={selectHospital} />
      </View>
    );
  }

  // Hospital chosen but the driver hasn't started that leg yet — confirmation screen.
  if (stage === 'toHospital' && selectedHospital && !hospitalNavigationStarted) {
    const distanceKm = coords ? calculateDistanceKm(coords.latitude, coords.longitude, selectedHospital.latitude, selectedHospital.longitude) : null;
    const speedKmh = coords?.speed != null && coords.speed >= 0 ? coords.speed * 3.6 : null;
    const etaMinutes = distanceKm != null ? estimateEtaMinutes(distanceKm, speedKmh) : null;

    return (
      <View style={styles.container}>
        {header()}
        <HospitalAssignedPanel
          hospital={selectedHospital}
          coords={coords}
          distanceKm={distanceKm}
          etaMinutes={etaMinutes}
          onStartNavigation={startHospitalNavigation}
        />
      </View>
    );
  }

  const distanceKm = coords && destination ? calculateDistanceKm(coords.latitude, coords.longitude, destination.latitude, destination.longitude) : null;
  const speedKmh = coords?.speed != null && coords.speed >= 0 ? coords.speed * 3.6 : null;
  const etaMinutes = distanceKm != null ? estimateEtaMinutes(distanceKm, speedKmh) : null;
  const incidentId = emergency.id.slice(0, 8).toUpperCase();

  const runAction = async (action: () => Promise<boolean>) => {
    if (!identity) return;
    setBusy(true);
    const ok = await action();
    setBusy(false);
    if (ok) setSheetOpen(false);
  };

  const isEnRoute = stage === 'toScene' || stage === 'toHospital';

  return (
    <View style={styles.container}>
      {header(
        <TouchableOpacity onPress={handleRecenter} hitSlop={8}>
          <Feather name="crosshair" size={18} color={theme.accentInk} />
        </TouchableOpacity>
      )}

      <WebView
        ref={webViewRef}
        source={{ html: LEAFLET_MAP_HTML }}
        style={styles.map}
        onMessage={handleMessage}
        javaScriptEnabled
        originWhitelist={['*']}
      />

      <View style={styles.card}>
        <View style={styles.dragHandle} />
        <View style={styles.addressRow}>
          <Feather name="map-pin" size={16} color={theme.accentInk} />
          <View style={{ flex: 1 }}>
            <Text style={styles.address} numberOfLines={1}>
              {destination?.label}
            </Text>
            <Text style={styles.incidentId}>Incident #{incidentId} · {isToHospitalLeg ? 'To hospital' : 'To scene'}</Text>
          </View>
        </View>

        <IncidentMediaPreview emergency={emergency} size="compact" />

        {isEnRoute ? (
          <>
            <View style={styles.statsRow}>
              <View style={styles.statCol}>
                <Text style={styles.statLabel}>ETA</Text>
                <Text style={styles.statValue}>{etaMinutes != null ? `${etaMinutes} MIN` : '—'}</Text>
              </View>
              <View style={[styles.statCol, styles.statColDivider]}>
                <Text style={styles.statLabel}>DIST</Text>
                <Text style={styles.statValue}>{distanceKm != null ? `${distanceKm.toFixed(1)} km` : '—'}</Text>
              </View>
              <View style={[styles.statCol, styles.statColDivider]}>
                <Text style={styles.statLabel}>SPEED</Text>
                <Text style={styles.statValue}>{speedKmh != null ? `${Math.round(speedKmh)} km/h` : '—'}</Text>
              </View>
            </View>

            <TouchableOpacity
              style={styles.arrivedButton}
              onPress={isToHospitalLeg ? markArrivedAtHospital : markArrivedAtScene}
            >
              {isToHospitalLeg ? (
                <MaterialCommunityIcons name="hospital-building" size={16} color="#F8FAFC" />
              ) : (
                <Feather name="map-pin" size={16} color="#F8FAFC" />
              )}
              <Text style={styles.primaryButtonText}>{isToHospitalLeg ? 'ARRIVED AT HOSPITAL' : 'ARRIVED AT INCIDENT'}</Text>
            </TouchableOpacity>
          </>
        ) : (
          <TouchableOpacity style={styles.primaryButton} onPress={() => setSheetOpen(true)}>
            {busy ? (
              <ActivityIndicator color="#F8FAFC" />
            ) : (
              <>
                <Feather name="check-circle" size={16} color="#F8FAFC" />
                <Text style={styles.primaryButtonText}>
                  {stage === 'arrivedAtScene' ? 'CONFIRM PATIENT ONBOARDED' : 'CONFIRM PATIENT DELIVERED'}
                </Text>
              </>
            )}
          </TouchableOpacity>
        )}
      </View>

      <IncidentMilestoneSheet
        visible={sheetOpen && (stage === 'arrivedAtScene' || stage === 'arrivedAtHospital')}
        onClose={() => setSheetOpen(false)}
        icon={
          stage === 'arrivedAtScene' ? (
            <MaterialCommunityIcons name="account-plus-outline" size={20} color={theme.accent} />
          ) : (
            <MaterialCommunityIcons name="account-arrow-right-outline" size={20} color={theme.accent} />
          )
        }
        title={stage === 'arrivedAtScene' ? 'Patient Onboarded?' : 'Patient Delivered?'}
        subtitle={
          stage === 'arrivedAtScene'
            ? 'Confirm patient is secured in the vehicle and ready for transport.'
            : 'Confirm patient has been handed off to hospital staff.'
        }
        elapsedLabel={stage === 'arrivedAtScene' ? 'TIME ON SCENE' : 'TIME AT HOSPITAL'}
        startedAt={stage === 'arrivedAtScene' ? sceneArrivedAt : hospitalArrivedAt}
        buttonLabel={stage === 'arrivedAtScene' ? 'PICK UP PATIENT' : 'DROP OFF PATIENT'}
        onConfirm={() =>
          runAction(() =>
            stage === 'arrivedAtScene' ? confirmPickup(identity!.ambulanceId) : confirmDropoff(identity!.ambulanceId)
          )
        }
        busy={busy}
      />
    </View>
  );
}

const getStyles = (theme: ThemeColors) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.bg },
    map: { flex: 1 },
    card: {
      backgroundColor: theme.surface,
      borderTopLeftRadius: 22,
      borderTopRightRadius: 22,
      borderWidth: 1,
      borderColor: theme.border,
      padding: 20,
      gap: 16,
      marginTop: -22,
    },
    // Visual affordance only — the sheet doesn't actually support drag-to-resize yet.
    dragHandle: { width: 36, height: 4, borderRadius: 2, backgroundColor: theme.borderStrong, alignSelf: 'center', marginBottom: -4 },
    addressRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
    address: { fontSize: 15.5, fontWeight: '800', color: theme.ink },
    incidentId: { fontSize: 11.5, color: theme.inkFaint, marginTop: 2, fontWeight: '600' },

    statsRow: { flexDirection: 'row' },
    statCol: { flex: 1, alignItems: 'center', gap: 3 },
    statColDivider: { borderLeftWidth: 1, borderLeftColor: theme.border },
    statLabel: { fontSize: 10, fontWeight: '700', letterSpacing: 0.6, color: theme.inkFaint },
    statValue: { fontSize: 15, fontWeight: '800', color: theme.ink, fontVariant: ['tabular-nums'] },

    primaryButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      backgroundColor: theme.accent,
      borderRadius: 12,
      paddingVertical: 15,
    },
    primaryButtonText: { color: '#F8FAFC', fontWeight: '800', fontSize: 13, letterSpacing: 0.4 },
    arrivedButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      backgroundColor: theme.danger,
      borderRadius: 12,
      paddingVertical: 15,
    },
  });
