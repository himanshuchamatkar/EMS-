import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text } from 'react-native-paper';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { useAppTheme } from '../hooks/useAppTheme';

interface Props {
  locationLabel: string;
  onCallPress: () => void;
}

/** Top app bar — brand mark, current location, and the always-visible emergency call button. */
export default function AppHeader({ locationLabel, onCallPress }: Props) {
  const theme = useAppTheme();

  return (
    <View style={[styles.bar, { backgroundColor: theme.colors.primaryContainer }]}>
      <View style={styles.left}>
        <View style={styles.brandRow}>
          <MaterialCommunityIcons name="shield-check-outline" size={18} color={theme.colors.onPrimaryContainer} />
          <Text variant="titleMedium" style={[styles.brand, { color: theme.colors.onPrimaryContainer }]}>
            Citizen App
          </Text>
        </View>
        <View style={styles.locationRow}>
          <Feather name="map-pin" size={12} color={theme.colors.onPrimaryContainer} style={{ opacity: 0.8 }} />
          <Text
            variant="bodySmall"
            numberOfLines={1}
            style={[styles.location, { color: theme.colors.onPrimaryContainer }]}
          >
            {locationLabel}
          </Text>
        </View>
      </View>

      <TouchableOpacity
        style={[styles.callButton, { backgroundColor: theme.colors.error }]}
        onPress={onCallPress}
        accessibilityRole="button"
        accessibilityLabel="Call 108"
        accessibilityHint="Opens your phone dialer with the emergency number."
      >
        <Feather name="phone-call" size={13} color={theme.colors.onError} />
        <Text variant="labelMedium" style={[styles.callText, { color: theme.colors.onError }]}>
          Call 108
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  left: { flex: 1, gap: 4 },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  brand: { fontWeight: '800' },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  location: { opacity: 0.85, flexShrink: 1 },
  callButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  callText: { fontWeight: '800' },
});
