import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';
import { Feather } from '@expo/vector-icons';
import { useAppTheme } from '../hooks/useAppTheme';

interface Props {
  icon: React.ComponentProps<typeof Feather>['name'];
  title: string;
}

/**
 * Holding screen for tabs whose Stitch reference hasn't arrived yet — this
 * app is being built screen by screen against a design system, not stubbed
 * wholesale (see Home for the pixel-matched implementation).
 */
export default function ComingSoonScreen({ icon, title }: Props) {
  const theme = useAppTheme();
  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={[styles.iconBox, { backgroundColor: theme.colors.surfaceVariant }]}>
        <Feather name={icon} size={26} color={theme.colors.onSurfaceVariant} />
      </View>
      <Text variant="titleMedium" style={{ color: theme.colors.onSurface, marginTop: 14 }}>
        {title}
      </Text>
      <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: 4 }}>
        Coming in the next design pass.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  iconBox: { width: 56, height: 56, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
});
