import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import type { DispatchOffer, EmergencyPriority } from '../types';
import type { AssignmentMode } from '../hooks/useIncidentOffer';
import { useDriverSession } from '../hooks/useDriverSession';
import { useReverseGeocode } from '../hooks/useReverseGeocode';
import { useAppTheme } from '../hooks/useAppTheme';
import type { ThemeColors } from '../theme/colors';
import { calculateDistanceKm, estimateEtaMinutes } from '../utils/distance';

interface Props {
  offer: DispatchOffer;
  mode: AssignmentMode;
  busy: boolean;
  onAccept: () => void;
  onReject: () => void;
}

const PRIORITY_STYLE: Record<EmergencyPriority, { bg: (t: ThemeColors) => string; icon: 'alert-triangle' | 'alert-circle' }> = {
  Critical: { bg: (t) => t.danger, icon: 'alert-triangle' },
  High: { bg: () => '#F59E0B', icon: 'alert-triangle' },
  Medium: { bg: () => '#EAB308', icon: 'alert-circle' },
  Low: { bg: (t) => t.accent, icon: 'alert-circle' },
};

export default function IncidentOfferCard({ offer, mode, busy, onAccept, onReject }: Props) {
  const theme = useAppTheme();
  const styles = getStyles(theme);
  const { coords } = useDriverSession();
  const { emergency } = offer;
  const isDirect = mode === 'direct';
  const incidentId = emergency.id.slice(0, 8).toUpperCase();

  const { label: placeName } = useReverseGeocode(emergency.latitude, emergency.longitude);

  const distanceKm = coords ? calculateDistanceKm(coords.latitude, coords.longitude, emergency.latitude, emergency.longitude) : null;
  const speedKmh = coords?.speed != null && coords.speed >= 0 ? coords.speed * 3.6 : null;
  const etaMinutes = distanceKm != null ? estimateEtaMinutes(distanceKm, speedKmh) : null;

  const priority = PRIORITY_STYLE[emergency.priority] ?? PRIORITY_STYLE.Low;

  return (
    <View style={styles.overlay}>
      <View style={styles.card}>
        <View style={[styles.priorityBanner, { backgroundColor: priority.bg(theme) }]}>
          <Feather name={priority.icon} size={15} color="#FFFFFF" />
          <Text style={styles.priorityText}>{emergency.priority.toUpperCase()}</Text>
        </View>

        {isDirect ? <Text style={styles.assignmentLine}>You have been assigned to Incident #{incidentId}</Text> : null}

        <View style={styles.descRow}>
          <MaterialCommunityIcons name="hospital-box-outline" size={16} color={theme.danger} />
          <Text style={styles.description} numberOfLines={2}>
            {emergency.description}
          </Text>
        </View>
        <Text style={styles.placeName} numberOfLines={1}>
          {placeName ?? `${emergency.latitude.toFixed(4)}, ${emergency.longitude.toFixed(4)}`}
        </Text>

        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>DISTANCE</Text>
            <View style={styles.statValueRow}>
              <Feather name="navigation" size={13} color={theme.accentInk} />
              <Text style={styles.statValue}>{distanceKm != null ? `${distanceKm.toFixed(1)} km` : '—'}</Text>
            </View>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>ETA</Text>
            <View style={styles.statValueRow}>
              <Feather name="clock" size={13} color={theme.accentInk} />
              <Text style={styles.statValue}>{etaMinutes != null ? `${etaMinutes} mins` : '—'}</Text>
            </View>
          </View>
        </View>

        <View style={styles.actions}>
          <TouchableOpacity style={styles.acceptBtn} onPress={onAccept} disabled={busy}>
            {busy ? (
              <ActivityIndicator color="#F8FAFC" />
            ) : (
              <>
                <Feather name="check-circle" size={16} color="#F8FAFC" />
                <Text style={styles.acceptText}>{isDirect ? 'YES' : 'ACCEPT'}</Text>
              </>
            )}
          </TouchableOpacity>
          <TouchableOpacity style={styles.rejectBtn} onPress={onReject} disabled={busy}>
            <Feather name="x-circle" size={16} color={theme.danger} />
            <Text style={styles.rejectText}>{isDirect ? 'NO' : 'REJECT'}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const getStyles = (theme: ThemeColors) =>
  StyleSheet.create({
    overlay: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(2,6,15,0.72)',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 20,
      zIndex: 999,
      elevation: 999,
    },
    card: {
      width: '100%',
      maxWidth: 420,
      backgroundColor: theme.surface,
      borderRadius: 20,
      borderWidth: 1,
      borderColor: theme.border,
      padding: 20,
      gap: 14,
    },
    priorityBanner: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      borderRadius: 12,
      paddingVertical: 12,
    },
    priorityText: { fontSize: 14, fontWeight: '800', letterSpacing: 0.6, color: '#FFFFFF' },
    assignmentLine: { fontSize: 13, color: theme.inkMuted, textAlign: 'center', fontWeight: '600' },

    descRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
    description: { flex: 1, fontSize: 13, color: theme.danger, fontWeight: '700', lineHeight: 18 },
    placeName: { fontSize: 19, fontWeight: '800', color: theme.ink, marginTop: -6 },

    statsRow: { flexDirection: 'row', gap: 12 },
    statBox: {
      flex: 1,
      backgroundColor: theme.accentSoft,
      borderRadius: 12,
      paddingVertical: 10,
      paddingHorizontal: 12,
      gap: 4,
    },
    statLabel: { fontSize: 10, fontWeight: '700', letterSpacing: 0.5, color: theme.accentInk },
    statValueRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    statValue: { fontSize: 15, fontWeight: '800', color: theme.ink },

    actions: { gap: 10, marginTop: 2 },
    acceptBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      backgroundColor: theme.accent,
      borderRadius: 12,
      paddingVertical: 15,
    },
    acceptText: { color: '#F8FAFC', fontWeight: '800', fontSize: 14, letterSpacing: 0.5 },
    rejectBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      borderRadius: 12,
      paddingVertical: 15,
      borderWidth: 1.5,
      borderColor: theme.danger,
    },
    rejectText: { color: theme.danger, fontWeight: '800', fontSize: 14, letterSpacing: 0.5 },
  });
