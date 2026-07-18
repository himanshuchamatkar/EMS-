import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet, Linking } from 'react-native';
import { Feather } from '@expo/vector-icons';
import type { Emergency } from '../types';
import { useAppTheme } from '../hooks/useAppTheme';
import type { ThemeColors } from '../theme/colors';

interface Props {
  emergency: Emergency;
  /** 'large' for the full offer card, 'compact' for the tighter in-progress map card. */
  size?: 'large' | 'compact';
}

/**
 * Citizen-app reports can carry a Cloudinary photo/video/audio URL (see
 * backend/supabase/citizen_reports.sql) — admin-created incidents almost
 * never have these, so this renders nothing when none are present. Video/
 * audio just hand off to the device's default player via Linking; no
 * in-app player library was added for this.
 */
export default function IncidentMediaPreview({ emergency, size = 'large' }: Props) {
  const theme = useAppTheme();
  const styles = getStyles(theme);
  const { photo_url, video_url, audio_url, report_source } = emergency;

  if (!photo_url && !video_url && !audio_url) return null;

  const compact = size === 'compact';
  const openMedia = (url: string) => Linking.openURL(url);

  return (
    <View style={styles.wrap}>
      {report_source === 'citizen' ? (
        <View style={styles.sourceBadge}>
          <Feather name="user" size={10} color={theme.accentInk} />
          <Text style={styles.sourceText}>CITIZEN REPORT</Text>
        </View>
      ) : null}

      <View style={styles.row}>
        {photo_url ? (
          <TouchableOpacity onPress={() => openMedia(photo_url)} style={compact ? styles.thumbCompact : styles.thumbLarge}>
            <Image source={{ uri: photo_url }} style={StyleSheet.absoluteFillObject} resizeMode="cover" />
          </TouchableOpacity>
        ) : null}

        {video_url ? (
          <TouchableOpacity onPress={() => openMedia(video_url)} style={[styles.chip, compact && styles.chipCompact]}>
            <Feather name="video" size={compact ? 14 : 16} color={theme.accentInk} />
            {!compact ? <Text style={styles.chipText}>Video attached</Text> : null}
          </TouchableOpacity>
        ) : null}

        {audio_url ? (
          <TouchableOpacity onPress={() => openMedia(audio_url)} style={[styles.chip, compact && styles.chipCompact]}>
            <Feather name="mic" size={compact ? 14 : 16} color={theme.accentInk} />
            {!compact ? <Text style={styles.chipText}>Audio attached</Text> : null}
          </TouchableOpacity>
        ) : null}
      </View>
    </View>
  );
}

const getStyles = (theme: ThemeColors) =>
  StyleSheet.create({
    wrap: { gap: 8 },
    sourceBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      alignSelf: 'flex-start',
      gap: 5,
      backgroundColor: theme.accentSoft,
      borderRadius: 999,
      paddingHorizontal: 9,
      paddingVertical: 3,
    },
    sourceText: { fontSize: 10, fontWeight: '800', letterSpacing: 0.4, color: theme.accentInk },
    row: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
    thumbLarge: {
      width: 96,
      height: 96,
      borderRadius: 12,
      overflow: 'hidden',
      backgroundColor: theme.surfaceAlt,
      borderWidth: 1,
      borderColor: theme.border,
    },
    thumbCompact: {
      width: 44,
      height: 44,
      borderRadius: 8,
      overflow: 'hidden',
      backgroundColor: theme.surfaceAlt,
      borderWidth: 1,
      borderColor: theme.border,
    },
    chip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      backgroundColor: theme.surfaceAlt,
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: 10,
      paddingHorizontal: 10,
      paddingVertical: 8,
    },
    chipCompact: { width: 44, height: 44, justifyContent: 'center', paddingHorizontal: 0 },
    chipText: { fontSize: 12, fontWeight: '600', color: theme.inkMuted },
  });
