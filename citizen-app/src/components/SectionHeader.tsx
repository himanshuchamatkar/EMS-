import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';
import { useAppTheme } from '../hooks/useAppTheme';

interface Props {
  title: string;
  trailing?: React.ReactNode;
}

/** Section label with an optional trailing element (e.g. a status badge). */
export default function SectionHeader({ title, trailing }: Props) {
  const theme = useAppTheme();
  return (
    <View style={styles.row}>
      <Text variant="titleMedium" style={{ color: theme.colors.onBackground, fontWeight: '800' }}>
        {title}
      </Text>
      {trailing}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
});
