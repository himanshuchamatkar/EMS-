import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { getNearbyMockHospitals, type RankedMockHospital } from '../data/mockHospitals';
import { useAppTheme } from '../hooks/useAppTheme';
import type { ThemeColors } from '../theme/colors';

interface Props {
  originLatitude: number;
  originLongitude: number;
  onSelect: (hospital: RankedMockHospital) => void;
}

/**
 * Ranked receiving-hospital list shown once a patient is onboarded. Backed
 * by placeholder data (see data/mockHospitals.ts) — there's no real
 * hospital-dashboard integration yet, so "ready to accept" is simulated
 * rather than a live signal.
 */
export default function HospitalListPanel({ originLatitude, originLongitude, onSelect }: Props) {
  const theme = useAppTheme();
  const styles = getStyles(theme);
  const hospitals = useMemo(() => getNearbyMockHospitals(originLatitude, originLongitude), [originLatitude, originLongitude]);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.sectionLabel}>NEARBY RECEIVING HOSPITALS</Text>
      <Text style={styles.sectionNote}>Ranked by readiness, then distance. Tap one to proceed.</Text>

      {hospitals.map((hospital, index) => (
        <TouchableOpacity key={hospital.id} style={styles.card} onPress={() => onSelect(hospital)}>
          {hospital.accepting ? (
            <View style={styles.readyBadge}>
              <Feather name="check-circle" size={11} color={theme.good} />
              <Text style={styles.readyBadgeText}>READY TO ACCEPT</Text>
            </View>
          ) : (
            <Text style={styles.rankLabel}>#{index + 1}</Text>
          )}

          <Text style={styles.name}>{hospital.name}</Text>
          <Text style={styles.traumaLevel}>{hospital.traumaLevel}</Text>

          <View style={styles.metaRow}>
            <View style={styles.metaItem}>
              <Feather name="navigation" size={13} color={theme.inkFaint} />
              <Text style={styles.metaText}>{hospital.distanceKm.toFixed(1)} km</Text>
            </View>
            <View style={styles.metaItem}>
              <MaterialCommunityIcons name="bed-outline" size={14} color={hospital.bedsAvailable > 0 ? theme.good : theme.danger} />
              <Text style={[styles.metaText, { color: hospital.bedsAvailable > 0 ? theme.good : theme.danger }]}>
                {hospital.bedsAvailable > 0 ? `${hospital.bedsAvailable} beds available` : 'No beds available'}
              </Text>
            </View>
          </View>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}

const getStyles = (theme: ThemeColors) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.bg },
    content: { padding: 20, gap: 12 },
    sectionLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 0.6, color: theme.inkFaint },
    sectionNote: { fontSize: 12.5, color: theme.inkMuted, marginTop: -6, marginBottom: 4 },

    card: {
      backgroundColor: theme.surface,
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 14,
      padding: 16,
      gap: 4,
    },
    readyBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      alignSelf: 'flex-start',
      gap: 5,
      backgroundColor: theme.goodSoft,
      borderRadius: 999,
      paddingHorizontal: 9,
      paddingVertical: 3,
      marginBottom: 4,
    },
    readyBadgeText: { fontSize: 10, fontWeight: '800', letterSpacing: 0.4, color: theme.good },
    rankLabel: { fontSize: 11, fontWeight: '700', color: theme.inkFaint, marginBottom: 4 },

    name: { fontSize: 15.5, fontWeight: '800', color: theme.ink },
    traumaLevel: { fontSize: 12, color: theme.accentInk, fontWeight: '600', marginTop: 1 },

    metaRow: { flexDirection: 'row', gap: 18, marginTop: 8 },
    metaItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
    metaText: { fontSize: 12, fontWeight: '600', color: theme.inkMuted },
  });
