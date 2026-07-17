import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useAppTheme } from '../hooks/useAppTheme';

interface Props {
  enabled: boolean;
  caption: string;
  onPress: () => void;
}

/** The "Upload Incident Data" action — disabled-styled until at least one media slot is prepared. */
export default function UploadButton({ enabled, caption, onPress }: Props) {
  const theme = useAppTheme();

  return (
    <View style={styles.wrap}>
      <TouchableOpacity
        style={[
          styles.button,
          {
            borderColor: enabled ? theme.colors.primary : theme.colors.outline,
            borderStyle: enabled ? 'solid' : 'dashed',
            backgroundColor: enabled ? theme.colors.primaryContainer : theme.colors.surfaceVariant,
          },
        ]}
        onPress={onPress}
        disabled={!enabled}
        accessibilityRole="button"
        accessibilityLabel="Upload Incident Data"
        accessibilityState={{ disabled: !enabled }}
      >
        <Feather name="upload-cloud" size={17} color={enabled ? theme.colors.onPrimaryContainer : theme.colors.onSurfaceVariant} />
        <Text style={[styles.label, { color: enabled ? theme.colors.onPrimaryContainer : theme.colors.onSurfaceVariant }]}>
          Upload Incident Data
        </Text>
      </TouchableOpacity>
      <Text style={[styles.caption, { color: theme.colors.onSurfaceVariant }]}>{caption}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 8 },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 999,
    borderWidth: 1.5,
    paddingVertical: 14,
  },
  label: { fontSize: 13.5, fontWeight: '800' },
  caption: { fontSize: 11.5, textAlign: 'center' },
});
