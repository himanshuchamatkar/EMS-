import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { useAppTheme } from '../hooks/useAppTheme';
import type { ThemeColors } from '../theme/colors';

interface Props {
  unitLabel: string;
  dutyLabel: string;
  dutyColor?: string;
  connected: boolean;
  /** No Settings/Profile screen exists yet — long-press the unit title to sign out. */
  onTitleLongPress?: () => void;
  /** Screen-specific action (e.g. Map's recenter button), rendered right of the connectivity icon. */
  rightExtra?: React.ReactNode;
}

export default function AppHeader({ unitLabel, dutyLabel, dutyColor, connected, onTitleLongPress, rightExtra }: Props) {
  const theme = useAppTheme();
  const styles = getStyles(theme);

  return (
    <View style={styles.row}>
      <MaterialCommunityIcons name="asterisk" size={18} color={theme.accent} />

      <TouchableOpacity style={styles.titleBlock} onLongPress={onTitleLongPress} activeOpacity={onTitleLongPress ? 0.6 : 1}>
        <Text style={styles.unit}>{unitLabel}</Text>
        <Text style={[styles.duty, { color: dutyColor ?? theme.danger }]}>{dutyLabel}</Text>
      </TouchableOpacity>

      <View style={styles.rightGroup}>
        <Feather name={connected ? 'wifi' : 'wifi-off'} size={18} color={connected ? theme.accentInk : theme.inkFaint} />
        {rightExtra}
      </View>
    </View>
  );
}

const getStyles = (theme: ThemeColors) =>
  StyleSheet.create({
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 20,
      paddingTop: 14,
      paddingBottom: 14,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
      backgroundColor: theme.bg,
    },
    rightGroup: { flexDirection: 'row', alignItems: 'center', gap: 14 },
    titleBlock: { alignItems: 'center' },
    unit: { fontSize: 15, fontWeight: '800', color: theme.ink, letterSpacing: 0.5 },
    duty: { fontSize: 10, fontWeight: '700', letterSpacing: 1, marginTop: 2 },
  });
