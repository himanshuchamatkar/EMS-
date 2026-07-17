import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';
import { useAppTheme } from '../hooks/useAppTheme';

interface Props {
  active: boolean;
  label?: string;
}

/** Small status pill — "Active Location Tracking" on Home. */
export default function TrackingBadge({ active, label }: Props) {
  const theme = useAppTheme();
  const text = label ?? (active ? 'Active Location Tracking' : 'Location Tracking Off');

  return (
    <View
      style={[
        styles.pill,
        { backgroundColor: active ? theme.colors.primaryContainer : theme.colors.surfaceVariant },
      ]}
      accessible
      accessibilityLabel={text}
    >
      <View
        style={[styles.dot, { backgroundColor: active ? theme.colors.primary : theme.colors.onSurfaceVariant }]}
      />
      <Text
        variant="labelSmall"
        style={{ color: active ? theme.colors.onPrimaryContainer : theme.colors.onSurfaceVariant, fontWeight: '700' }}
      >
        {text}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  dot: { width: 6, height: 6, borderRadius: 3 },
});
