import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import type { AmbulanceStatus } from '../types';

const OPTIONS: { value: AmbulanceStatus; label: string; color: string; bg: string }[] = [
  { value: 'Available', label: 'Available', color: '#10B981', bg: 'rgba(16,185,129,0.14)' },
  { value: 'Busy', label: 'Busy', color: '#EF4444', bg: 'rgba(239,68,68,0.14)' },
  { value: 'Maintenance', label: 'Maintenance', color: '#F59E0B', bg: 'rgba(245,158,11,0.14)' },
  { value: 'Offline', label: 'Offline', color: '#94A3B8', bg: 'rgba(148,163,184,0.14)' },
];

interface Props {
  value: AmbulanceStatus | null;
  updating: boolean;
  onChange: (status: AmbulanceStatus) => void;
}

// Manual Available/Busy/Offline/Maintenance control — this used to live in the
// admin panel's ambulance sidebar; now that the panel is monitor-only, the
// driver app is the only place this can be set.
export default function AmbulanceStatusSelector({ value, updating, onChange }: Props) {
  return (
    <View style={styles.row}>
      {OPTIONS.map((opt) => {
        const active = value === opt.value;
        return (
          <TouchableOpacity
            key={opt.value}
            disabled={updating}
            onPress={() => onChange(opt.value)}
            style={[
              styles.pill,
              {
                borderColor: active ? opt.color : '#334155',
                backgroundColor: active ? opt.bg : 'transparent',
              },
            ]}
          >
            {updating && active ? (
              <ActivityIndicator size="small" color={opt.color} />
            ) : (
              <Text style={[styles.label, { color: active ? opt.color : '#94A3B8' }]}>{opt.label}</Text>
            )}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  pill: {
    flexGrow: 1,
    minWidth: '45%',
    borderWidth: 1.5,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
  },
  label: { fontSize: 12, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.4 },
});
