import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import type { AmbulanceStatus } from '../types';
import { useAppTheme } from '../hooks/useAppTheme';
import type { ThemeColors } from '../theme/colors';

const OPTIONS: { value: AmbulanceStatus; label: string; color: (t: ThemeColors) => string; icon: (color: string) => React.ReactNode }[] = [
  {
    value: 'Available',
    label: 'Available',
    color: (t) => t.good,
    icon: (color) => <Feather name="check-circle" size={15} color={color} />,
  },
  {
    value: 'Busy',
    label: 'Busy',
    color: (t) => t.danger,
    icon: (color) => <Feather name="clock" size={15} color={color} />,
  },
  {
    value: 'Maintenance',
    label: 'Maint.',
    color: (t) => t.warn,
    icon: (color) => <Feather name="tool" size={15} color={color} />,
  },
  {
    value: 'Offline',
    label: 'Offline',
    color: (t) => t.inkFaint,
    icon: (color) => <MaterialCommunityIcons name="weather-night" size={16} color={color} />,
  },
];

interface Props {
  value: AmbulanceStatus | null;
  updating: boolean;
  onChange: (status: AmbulanceStatus) => void;
}

/** Segmented "Vehicle Status" control — Available/Busy/Maintenance/Offline. */
export default function AmbulanceStatusSelector({ value, updating, onChange }: Props) {
  const theme = useAppTheme();
  const styles = getStyles(theme);

  return (
    <View style={styles.bar}>
      {OPTIONS.map((opt) => {
        const active = value === opt.value;
        const tint = active ? opt.color(theme) : theme.inkFaint;
        return (
          <TouchableOpacity
            key={opt.value}
            disabled={updating}
            onPress={() => onChange(opt.value)}
            style={[styles.segment, active && styles.segmentActive]}
          >
            {updating && active ? (
              <ActivityIndicator size="small" color={tint} />
            ) : (
              <>
                {opt.icon(tint)}
                <Text style={[styles.label, { color: tint }]}>{opt.label}</Text>
              </>
            )}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const getStyles = (theme: ThemeColors) =>
  StyleSheet.create({
    bar: {
      flexDirection: 'row',
      backgroundColor: theme.surfaceAlt,
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 12,
      padding: 4,
      gap: 4,
    },
    segment: { flex: 1, alignItems: 'center', gap: 4, paddingVertical: 9, borderRadius: 9 },
    segmentActive: { backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.borderStrong },
    label: { fontSize: 10.5, fontWeight: '700', letterSpacing: 0.2 },
  });
