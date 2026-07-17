import React, { useEffect, useRef, useState } from 'react';
import { View, ScrollView, StyleSheet, Alert, Linking } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Audio } from 'expo-av';
import { useAppTheme } from '../hooks/useAppTheme';
import { useCurrentLocation } from '../hooks/useCurrentLocation';
import { useIncidentTracking } from '../hooks/useIncidentTracking';
import { uploadToCloudinary } from '../services/cloudinary';
import { api } from '../services/api';
import type { CapturedMedia, MediaKind, PreparedMediaState } from '../types';
import AppHeader from '../components/AppHeader';
import EmergencyCallCard from '../components/EmergencyCallCard';
import SectionHeader from '../components/SectionHeader';
import TrackingBadge from '../components/TrackingBadge';
import MediaSlotButton from '../components/MediaSlotButton';
import UploadButton from '../components/UploadButton';
import GuidelinesCard from '../components/GuidelinesCard';

const EMERGENCY_NUMBER = '108';
const VIDEO_MAX_DURATION_SECONDS = 30;

type MediaState = Record<MediaKind, CapturedMedia | null>;
const EMPTY_MEDIA: MediaState = { photo: null, video: null, audio: null };

function describeAttachments(media: MediaState): string {
  const kinds = (Object.keys(media) as MediaKind[]).filter((k) => media[k] !== null);
  if (kinds.length === 0) return 'Citizen-reported emergency via mobile app.';
  return `Citizen-reported emergency via mobile app (${kinds.join(', ')} attached).`;
}

/**
 * Pixel-matched to the Stitch "Citizen App" Home reference, now wired for
 * real submission: real GPS, real camera/mic capture, real Cloudinary
 * upload, and a real POST to the same backend endpoint the admin panel's
 * Create Incident panel uses — so a citizen report goes through the actual
 * dispatch engine and reaches driver-app exactly like an admin-created one.
 */
export default function HomeScreen() {
  const theme = useAppTheme();
  const location = useCurrentLocation();
  const [media, setMedia] = useState<MediaState>(EMPTY_MEDIA);
  const [recordingAudio, setRecordingAudio] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [activeEmergencyId, setActiveEmergencyId] = useState<string | null>(null);
  const recordingRef = useRef<Audio.Recording | null>(null);
  const lastAmbulanceIdRef = useRef<string | null>(null);
  const lastStatusRef = useRef<string | null>(null);

  const tracking = useIncidentTracking(activeEmergencyId);

  // Surface real-time status as Alerts for now — there's no Stitch reference
  // for a dedicated tracking screen yet (see conversation notes).
  useEffect(() => {
    if (!activeEmergencyId) return;

    if (tracking.assignedAmbulance && tracking.assignedAmbulance.id !== lastAmbulanceIdRef.current) {
      lastAmbulanceIdRef.current = tracking.assignedAmbulance.id;
      Alert.alert(
        'Ambulance Assigned',
        `${tracking.assignedAmbulance.name} (${tracking.assignedAmbulance.vehicle_number}) has been assigned and is on the way.`
      );
    }

    if (tracking.status === 'Resolved' && lastStatusRef.current !== 'Resolved') {
      lastStatusRef.current = 'Resolved';
      Alert.alert('Emergency Resolved', 'This report has been marked resolved. Stay safe.');
      setActiveEmergencyId(null);
      lastAmbulanceIdRef.current = null;
    } else if (tracking.status) {
      lastStatusRef.current = tracking.status;
    }
  }, [tracking.status, tracking.assignedAmbulance, activeEmergencyId]);

  const preparedState: PreparedMediaState = {
    photo: media.photo !== null,
    video: media.video !== null,
    audio: media.audio !== null,
  };
  const uploadEnabled = Object.values(preparedState).some(Boolean) && !submitting;

  const handleCall108 = () => {
    Linking.openURL(`tel:${EMERGENCY_NUMBER}`);
  };

  const handlePhotoSlot = async () => {
    if (media.photo) {
      setMedia((m) => ({ ...m, photo: null }));
      return;
    }
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (permission.status !== 'granted') {
      Alert.alert('Camera access needed', 'Enable camera access in Settings to attach a photo.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({ mediaTypes: 'images', quality: 0.7 });
    if (!result.canceled && result.assets[0]) {
      setMedia((m) => ({ ...m, photo: { localUri: result.assets[0].uri, uploading: false, remoteUrl: null } }));
    }
  };

  const handleVideoSlot = async () => {
    if (media.video) {
      setMedia((m) => ({ ...m, video: null }));
      return;
    }
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (permission.status !== 'granted') {
      Alert.alert('Camera access needed', 'Enable camera access in Settings to attach a video.');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: 'videos',
      videoMaxDuration: VIDEO_MAX_DURATION_SECONDS,
      quality: 0.6,
    });
    if (!result.canceled && result.assets[0]) {
      setMedia((m) => ({ ...m, video: { localUri: result.assets[0].uri, uploading: false, remoteUrl: null } }));
    }
  };

  const handleAudioSlot = async () => {
    if (media.audio && !recordingAudio) {
      setMedia((m) => ({ ...m, audio: null }));
      return;
    }

    if (!recordingAudio) {
      const permission = await Audio.requestPermissionsAsync();
      if (permission.status !== 'granted') {
        Alert.alert('Microphone access needed', 'Enable microphone access in Settings to record audio.');
        return;
      }
      await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
      const { recording } = await Audio.Recording.createAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
      recordingRef.current = recording;
      setRecordingAudio(true);
      return;
    }

    const recording = recordingRef.current;
    recordingRef.current = null;
    setRecordingAudio(false);
    if (!recording) return;
    await recording.stopAndUnloadAsync();
    const uri = recording.getURI();
    if (uri) {
      setMedia((m) => ({ ...m, audio: { localUri: uri, uploading: false, remoteUrl: null } }));
    }
  };

  const handleUpload = async () => {
    if (!uploadEnabled) return;

    if (location.latitude == null || location.longitude == null) {
      Alert.alert('Location not ready', 'Still locating you — try again in a moment.');
      return;
    }

    setSubmitting(true);
    try {
      const [photoUrl, videoUrl, audioUrl] = await Promise.all([
        media.photo ? uploadToCloudinary(media.photo.localUri, 'image') : Promise.resolve(null),
        media.video ? uploadToCloudinary(media.video.localUri, 'video') : Promise.resolve(null),
        media.audio ? uploadToCloudinary(media.audio.localUri, 'video') : Promise.resolve(null),
      ]);

      const response = await api.createEmergency({
        latitude: location.latitude,
        longitude: location.longitude,
        priority: 'Critical',
        description: describeAttachments(media),
        photo_url: photoUrl,
        video_url: videoUrl,
        audio_url: audioUrl,
        report_source: 'citizen',
      });

      setActiveEmergencyId(response.emergency.id);
      setMedia(EMPTY_MEDIA);
      Alert.alert('Report Submitted', 'Dispatch has received your report and is finding the nearest ambulance.');
    } catch (err) {
      Alert.alert('Could not submit report', err instanceof Error ? err.message : 'Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <AppHeader locationLabel={location.label} onCallPress={handleCall108} />

      <ScrollView contentContainerStyle={styles.scroll}>
        <EmergencyCallCard onPress={handleCall108} />

        <SectionHeader
          title="Report Incident"
          trailing={<TrackingBadge active={location.granted && !location.loading} />}
        />

        <View style={styles.mediaRow}>
          <MediaSlotButton icon="camera" label="Photo" prepared={preparedState.photo} onPress={handlePhotoSlot} />
          <MediaSlotButton icon="video" label="Video" prepared={preparedState.video} onPress={handleVideoSlot} />
          <MediaSlotButton
            icon={recordingAudio ? 'square' : 'mic'}
            label={recordingAudio ? 'Stop' : 'Audio'}
            prepared={preparedState.audio || recordingAudio}
            onPress={handleAudioSlot}
          />
        </View>

        <UploadButton
          enabled={uploadEnabled}
          caption={
            submitting
              ? 'Uploading and submitting…'
              : activeEmergencyId
                ? 'Report active — tracking for ambulance assignment.'
                : 'Data will be sent to the nearest response center.'
          }
          onPress={handleUpload}
        />

        <GuidelinesCard
          title="Community Guidelines"
          body="Reporting false incidents is a punishable offense. Use this app only for genuine emergencies."
        />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { padding: 20, gap: 22, paddingBottom: 32 },
  mediaRow: { flexDirection: 'row', gap: 16, paddingHorizontal: 8 },
});
