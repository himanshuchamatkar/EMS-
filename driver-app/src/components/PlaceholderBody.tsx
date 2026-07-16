import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useAppTheme } from '../hooks/useAppTheme';
import type { ThemeColors } from '../theme/colors';

interface Props {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
}

/** Shared centered empty-state for tabs that don't have a design yet. */
export default function PlaceholderBody({ icon, title, subtitle }: Props) {
  const theme = useAppTheme();
  const styles = getStyles(theme);

  return (
    <View style={styles.wrap}>
      <View style={styles.iconBox}>{icon}</View>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.subtitle}>{subtitle}</Text>
    </View>
  );
}

const getStyles = (theme: ThemeColors) =>
  StyleSheet.create({
    wrap: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 8 },
    iconBox: {
      width: 56,
      height: 56,
      borderRadius: 16,
      backgroundColor: theme.surfaceAlt,
      borderWidth: 1,
      borderColor: theme.border,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 6,
    },
    title: { fontSize: 15, fontWeight: '700', color: theme.ink },
    subtitle: { fontSize: 12.5, color: theme.inkFaint, textAlign: 'center', lineHeight: 18, maxWidth: 260 },
  });
