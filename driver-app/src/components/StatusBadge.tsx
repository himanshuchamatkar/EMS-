import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function StatusBadge({ online }: { online: boolean }) {
  return (
    <View style={[styles.badge, online ? styles.online : styles.offline]}>
      <View style={[styles.dot, { backgroundColor: online ? '#10B981' : '#94A3B8' }]} />
      <Text style={[styles.text, { color: online ? '#10B981' : '#94A3B8' }]}>
        {online ? 'ONLINE' : 'OFFLINE'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    borderWidth: 1,
    gap: 6,
  },
  online: { backgroundColor: 'rgba(16,185,129,0.12)', borderColor: 'rgba(16,185,129,0.35)' },
  offline: { backgroundColor: 'rgba(148,163,184,0.12)', borderColor: 'rgba(148,163,184,0.3)' },
  dot: { width: 7, height: 7, borderRadius: 4 },
  text: { fontSize: 11, fontWeight: '800', letterSpacing: 0.5 },
});
