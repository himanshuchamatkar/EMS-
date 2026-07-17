import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, TouchableRipple } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useAppTheme } from '../hooks/useAppTheme';

interface Props {
  onPress: () => void;
}

/** The primary "Call 108 Emergency" action — a large tappable red card. */
export default function EmergencyCallCard({ onPress }: Props) {
  const theme = useAppTheme();

  return (
    <TouchableRipple
      onPress={onPress}
      borderless
      style={[styles.card, { backgroundColor: theme.colors.error }]}
      rippleColor="rgba(255,255,255,0.24)"
      accessibilityRole="button"
      accessibilityLabel="Call 108 Emergency"
      accessibilityHint="Opens your phone dialer to call the national emergency number."
    >
      <View style={styles.content}>
        <View style={styles.iconBadge}>
          <MaterialCommunityIcons name="alert-decagram-outline" size={30} color="#FFFFFF" />
        </View>
        <Text variant="headlineSmall" style={styles.title}>
          Call 108 Emergency
        </Text>
        <Text variant="bodyMedium" style={styles.subtitle}>
          Instant connection to local emergency services
        </Text>
      </View>
    </TouchableRipple>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 20, overflow: 'hidden' },
  content: { alignItems: 'center', paddingVertical: 26, paddingHorizontal: 20 },
  iconBadge: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  title: { color: '#FFFFFF', fontWeight: '800' },
  subtitle: { color: 'rgba(255,255,255,0.85)', marginTop: 4, textAlign: 'center' },
});
