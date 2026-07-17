import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useAppTheme } from '../hooks/useAppTheme';

interface Props {
  title: string;
  body: string;
}

/** Info card — used for the Community Guidelines notice on Home. */
export default function GuidelinesCard({ title, body }: Props) {
  const theme = useAppTheme();

  return (
    <View
      style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.outlineVariant }]}
      accessible
      accessibilityLabel={`${title}. ${body}`}
    >
      <View style={[styles.iconBadge, { backgroundColor: theme.colors.primaryContainer }]}>
        <Feather name="info" size={14} color={theme.colors.primary} />
      </View>
      <View style={styles.textCol}>
        <Text style={[styles.title, { color: theme.colors.onSurface }]}>{title}</Text>
        <Text style={[styles.body, { color: theme.colors.onSurfaceVariant }]}>{body}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    gap: 12,
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
  },
  iconBadge: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginTop: 2 },
  textCol: { flex: 1, gap: 4 },
  title: { fontSize: 14, fontWeight: '800' },
  body: { fontSize: 12.5, lineHeight: 18 },
});
