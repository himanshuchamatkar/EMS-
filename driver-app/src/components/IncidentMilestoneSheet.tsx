import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useAppTheme } from '../hooks/useAppTheme';
import type { ThemeColors } from '../theme/colors';

interface Props {
  visible: boolean;
  onClose: () => void;
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  elapsedLabel: string;
  startedAt: number | null;
  buttonLabel: string;
  onConfirm: () => void;
  busy: boolean;
}

function formatElapsed(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

/** Bottom-sheet confirmation for a field milestone (patient onboarded / delivered), with a live on-scene timer. */
export default function IncidentMilestoneSheet({
  visible,
  onClose,
  icon,
  title,
  subtitle,
  elapsedLabel,
  startedAt,
  buttonLabel,
  onConfirm,
  busy,
}: Props) {
  const theme = useAppTheme();
  const styles = getStyles(theme);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!visible || !startedAt) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [visible, startedAt]);

  if (!visible) return null;

  return (
    <View style={styles.overlay}>
      <TouchableOpacity style={styles.scrim} activeOpacity={1} onPress={onClose} />
      <View style={styles.sheet}>
        <View style={styles.headerRow}>
          <View style={styles.headerIcon}>{icon}</View>
          <TouchableOpacity onPress={onClose} hitSlop={10} style={styles.closeBtn}>
            <Feather name="x" size={18} color={theme.inkFaint} />
          </TouchableOpacity>
        </View>

        <Text style={styles.title}>{title}</Text>
        <Text style={styles.subtitle}>{subtitle}</Text>

        <TouchableOpacity style={styles.button} onPress={onConfirm} disabled={busy}>
          {busy ? <ActivityIndicator color="#F8FAFC" /> : <Text style={styles.buttonText}>{buttonLabel}</Text>}
        </TouchableOpacity>

        {startedAt ? (
          <View style={styles.timerRow}>
            <Feather name="clock" size={13} color={theme.inkFaint} />
            <Text style={styles.timerLabel}>{elapsedLabel}</Text>
            <Text style={styles.timerValue}>{formatElapsed(now - startedAt)}</Text>
          </View>
        ) : null}
      </View>
    </View>
  );
}

const getStyles = (theme: ThemeColors) =>
  StyleSheet.create({
    overlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, justifyContent: 'flex-end', zIndex: 50, elevation: 50 },
    scrim: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(2,6,15,0.6)' },
    sheet: {
      backgroundColor: theme.surface,
      borderTopLeftRadius: 22,
      borderTopRightRadius: 22,
      borderWidth: 1,
      borderColor: theme.border,
      padding: 24,
      paddingBottom: 32,
      gap: 4,
    },
    headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 },
    headerIcon: {
      width: 40,
      height: 40,
      borderRadius: 12,
      backgroundColor: theme.accentSoft,
      alignItems: 'center',
      justifyContent: 'center',
    },
    closeBtn: { padding: 2 },
    title: { fontSize: 19, fontWeight: '800', color: theme.ink },
    subtitle: { fontSize: 13, color: theme.inkMuted, lineHeight: 19, marginTop: 2, marginBottom: 18 },
    button: { backgroundColor: theme.accent, borderRadius: 12, paddingVertical: 15, alignItems: 'center' },
    buttonText: { color: '#F8FAFC', fontWeight: '800', fontSize: 13.5, letterSpacing: 0.5 },
    timerRow: { flexDirection: 'row', alignItems: 'center', gap: 6, justifyContent: 'center', marginTop: 16 },
    timerLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 0.4, color: theme.inkFaint },
    timerValue: { fontSize: 12.5, fontWeight: '700', color: theme.warn, fontVariant: ['tabular-nums'] },
  });
