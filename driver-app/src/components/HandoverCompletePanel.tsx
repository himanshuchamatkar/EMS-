import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons';
import type { Emergency } from '../types';
import type { MockHospital } from '../data/mockHospitals';
import { formatIncidentId } from '../utils/incidentId';
import { useAppTheme } from '../hooks/useAppTheme';
import type { ThemeColors } from '../theme/colors';

interface Props {
  emergency: Emergency;
  hospital: MockHospital | null;
  durationMinutes: number | null;
  onComplete: () => void;
}

/** Final summary shown after drop-off is confirmed — matches the "Handover Complete" mockup. */
export default function HandoverCompletePanel({ emergency, hospital, durationMinutes, onComplete }: Props) {
  const theme = useAppTheme();
  const styles = getStyles(theme);

  return (
    <View style={styles.container}>
      <View style={styles.hero}>
        <View style={styles.checkIcon}>
          <Feather name="check" size={26} color="#F8FAFC" />
        </View>
        <Text style={styles.title}>Handover Complete</Text>
        <Text style={styles.subtitle}>Patient successfully transferred to receiving facility.</Text>
      </View>

      <View style={styles.card}>
        <View style={styles.row}>
          <Text style={styles.rowLabel}>INCIDENT ID</Text>
          <Text style={styles.rowValue}>{formatIncidentId(emergency.id)}</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.row}>
          <Text style={styles.rowLabel}>DURATION</Text>
          <Text style={styles.rowValue}>{durationMinutes != null ? `${durationMinutes} MIN` : '—'}</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.row}>
          <Text style={styles.rowLabel}>DESTINATION</Text>
          <Text style={styles.rowValue}>{hospital?.name ?? '—'}</Text>
        </View>
      </View>

      <TouchableOpacity style={styles.button} onPress={onComplete}>
        <Feather name="check-circle" size={16} color="#F8FAFC" />
        <Text style={styles.buttonText}>COMPLETE INCIDENT</Text>
      </TouchableOpacity>
      <Text style={styles.footnote}>Marks incident completed and returns to Waiting State.</Text>
    </View>
  );
}

const getStyles = (theme: ThemeColors) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.bg, padding: 20, gap: 18, justifyContent: 'center' },
    hero: { alignItems: 'center', gap: 4 },
    checkIcon: {
      width: 56,
      height: 56,
      borderRadius: 16,
      backgroundColor: theme.accent,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 10,
    },
    title: { fontSize: 21, fontWeight: '800', color: theme.ink },
    subtitle: { fontSize: 13, color: theme.inkMuted, textAlign: 'center', maxWidth: 260, marginTop: 2 },

    card: {
      backgroundColor: theme.surface,
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 14,
      paddingHorizontal: 16,
    },
    row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 13 },
    rowLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 0.5, color: theme.inkFaint },
    rowValue: { fontSize: 14, fontWeight: '800', color: theme.ink, fontVariant: ['tabular-nums'] },
    divider: { height: 1, backgroundColor: theme.border },

    button: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      backgroundColor: theme.accent,
      borderRadius: 12,
      paddingVertical: 15,
    },
    buttonText: { color: '#F8FAFC', fontWeight: '800', fontSize: 13.5, letterSpacing: 0.4 },
    footnote: { fontSize: 11.5, color: theme.inkFaint, textAlign: 'center' },
  });
