import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useAppTheme } from '../hooks/useAppTheme';

interface Props {
  icon: React.ComponentProps<typeof Feather>['name'];
  label: string;
  prepared: boolean;
  onPress: () => void;
}

/**
 * One circular media-attachment slot (Photo / Video / Audio) on Home.
 * Phase 3 UI-only: toggles a local "prepared" state, no real capture wired
 * up yet — see HomeScreen.
 */
export default function MediaSlotButton({ icon, label, prepared, onPress }: Props) {
  const theme = useAppTheme();
  const tint = prepared ? theme.colors.primary : theme.colors.onSurfaceVariant;

  return (
    <TouchableOpacity
      style={styles.wrap}
      onPress={onPress}
      activeOpacity={0.75}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected: prepared }}
      accessibilityHint={prepared ? 'Prepared. Double tap to remove.' : 'Double tap to prepare for your report.'}
    >
      <View
        style={[
          styles.circle,
          {
            borderColor: prepared ? theme.colors.primary : theme.colors.outline,
            borderStyle: prepared ? 'solid' : 'dashed',
            backgroundColor: prepared ? theme.colors.primaryContainer : 'transparent',
          },
        ]}
      >
        <Feather name={icon} size={22} color={tint} />
        {prepared ? (
          <View style={[styles.checkBadge, { backgroundColor: theme.colors.primary }]}>
            <Feather name="check" size={10} color={theme.colors.onPrimary} />
          </View>
        ) : null}
      </View>
      <Text style={[styles.label, { color: tint }]}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', gap: 8, flex: 1 },
  circle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: { fontSize: 12.5, fontWeight: '700' },
});
