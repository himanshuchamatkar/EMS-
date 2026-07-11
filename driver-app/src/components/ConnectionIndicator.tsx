import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function ConnectionIndicator({ connected }: { connected: boolean }) {
  return (
    <View style={styles.wrap}>
      <View style={[styles.dot, { backgroundColor: connected ? '#10B981' : '#EF4444' }]} />
      <Text style={styles.text}>{connected ? 'Socket Connected' : 'Socket Offline'}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  text: { fontSize: 11, color: '#94A3B8', fontWeight: '600' },
});
