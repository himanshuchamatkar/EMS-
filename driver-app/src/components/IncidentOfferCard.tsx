import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import type { DispatchOffer } from '../types';
import type { AssignmentMode } from '../hooks/useIncidentOffer';

interface Props {
  offer: DispatchOffer;
  mode: AssignmentMode;
  busy: boolean;
  onAccept: () => void;
  onReject: () => void;
}

const PRIORITY_COLORS: Record<string, string> = {
  Critical: '#EF4444',
  High: '#F59E0B',
  Medium: '#EAB308',
  Low: '#3B82F6',
};

export default function IncidentOfferCard({ offer, mode, busy, onAccept, onReject }: Props) {
  const { emergency, distance } = offer;
  const priorityColor = PRIORITY_COLORS[emergency.priority] ?? '#3B82F6';
  const incidentId = emergency.id.slice(0, 8).toUpperCase();
  const isDirect = mode === 'direct';

  return (
    <View style={styles.overlay}>
      <View style={styles.card}>
        <Text style={styles.badge}>{isDirect ? '🚑 NEW ASSIGNMENT' : '🚨 NEW EMERGENCY'}</Text>
        {isDirect ? (
          <Text style={styles.assignmentLine}>You have been assigned to Incident #{incidentId}</Text>
        ) : null}

        <View style={[styles.priorityPill, { borderColor: priorityColor }]}>
          <Text style={[styles.priorityText, { color: priorityColor }]}>{emergency.priority} PRIORITY</Text>
        </View>

        <Text style={styles.incidentId}>Incident #{incidentId}</Text>
        {!isDirect ? <Text style={styles.distance}>{distance.toFixed(2)} km away</Text> : null}
        <Text style={styles.addressLabel}>Address</Text>
        <Text style={styles.description}>{emergency.description}</Text>

        <View style={styles.actions}>
          <TouchableOpacity style={styles.rejectBtn} onPress={onReject} disabled={busy}>
            <Text style={styles.rejectText}>{isDirect ? 'NO' : 'Reject'}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.acceptBtn} onPress={onAccept} disabled={busy}>
            {busy ? (
              <ActivityIndicator color="#052e19" />
            ) : (
              <Text style={styles.acceptText}>{isDirect ? 'YES' : 'Accept'}</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(2,6,15,0.92)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    zIndex: 999,
    elevation: 999,
  },
  card: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: '#1E293B',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#334155',
    padding: 24,
    gap: 12,
  },
  badge: { fontSize: 20, fontWeight: '800', color: '#F8FAFC', textAlign: 'center', marginBottom: 4 },
  assignmentLine: { fontSize: 14, color: '#CBD5E1', textAlign: 'center', fontWeight: '600', marginBottom: 4 },
  priorityPill: {
    alignSelf: 'center',
    borderWidth: 1.5,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 5,
  },
  priorityText: { fontSize: 12, fontWeight: '800', letterSpacing: 0.5 },
  incidentId: { fontSize: 12, color: '#64748B', textAlign: 'center', fontWeight: '700', letterSpacing: 0.5 },
  distance: { fontSize: 15, color: '#93C5FD', textAlign: 'center', fontWeight: '700' },
  addressLabel: { fontSize: 11, color: '#64748B', textAlign: 'center', fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 4, marginBottom: -6 },
  description: { fontSize: 14, color: '#CBD5E1', textAlign: 'center', lineHeight: 20, marginBottom: 8 },
  actions: { flexDirection: 'row', gap: 12, marginTop: 8 },
  rejectBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#EF4444',
    alignItems: 'center',
  },
  rejectText: { color: '#EF4444', fontWeight: '700', fontSize: 15 },
  acceptBtn: { flex: 1, paddingVertical: 14, borderRadius: 12, backgroundColor: '#10B981', alignItems: 'center' },
  acceptText: { color: '#052e19', fontWeight: '800', fontSize: 15 },
});
