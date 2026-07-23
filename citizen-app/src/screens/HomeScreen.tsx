import React, { useEffect, useRef, useState } from 'react';
import { View, ScrollView, StyleSheet, Alert, Linking, Modal, Text, Image, TouchableOpacity } from 'react-native';
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

  // Duplicate Check Modal State
  const [duplicateModalVisible, setDuplicateModalVisible] = useState(false);
  const [existingIncident, setExistingIncident] = useState<{
    id: string;
    photo_url: string | null;
    description: string;
  } | null>(null);
  const [pendingPayload, setPendingPayload] = useState<any | null>(null);

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

  const handleConfirmSameIncident = () => {
    setDuplicateModalVisible(false);
    setMedia(EMPTY_MEDIA);
    setPendingPayload(null);
    setExistingIncident(null);
    Alert.alert('Report Cancelled', 'Thank you! The existing report is already being handled.');
  };

  const handleConfirmDifferentIncident = async () => {
    if (!pendingPayload) return;
    setDuplicateModalVisible(false);
    setSubmitting(true);

    try {
      const response = await api.createEmergency({
        ...pendingPayload,
        ignoreDuplicate: true,
      });

      if (response.emergency) {
        setActiveEmergencyId(response.emergency.id);
        setMedia(EMPTY_MEDIA);
        Alert.alert('Report Submitted', 'Dispatch has received your report and is finding the nearest ambulance.');
      }
    } catch (err) {
      Alert.alert('Could not submit report', err instanceof Error ? err.message : 'Please try again.');
    } finally {
      setSubmitting(false);
      setPendingPayload(null);
      setExistingIncident(null);
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

      const payload = {
        latitude: location.latitude,
        longitude: location.longitude,
        priority: 'Critical' as const,
        description: describeAttachments(media),
        photo_url: photoUrl,
        video_url: videoUrl,
        audio_url: audioUrl,
        report_source: 'citizen' as const,
      };

      const response = await api.createEmergency(payload);

      if (response.duplicate) {
        setPendingPayload(payload);
        setExistingIncident(response.existingIncident || null);
        setDuplicateModalVisible(true);
        setSubmitting(false);
        return;
      }

      if (response.emergency) {
        setActiveEmergencyId(response.emergency.id);
        setMedia(EMPTY_MEDIA);
        Alert.alert('Report Submitted', 'Dispatch has received your report and is finding the nearest ambulance.');
      }
    } catch (err) {
      Alert.alert('Could not submit report', err instanceof Error ? err.message : 'Please try again.');
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

      {/* Duplicate Incident Modal */}
      <Modal
        visible={duplicateModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setDuplicateModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalCard, { backgroundColor: theme.colors.surface || '#12161F' }]}>
            <Text style={[styles.modalTitle, { color: theme.colors.onSurface || '#F5F7FA' }]}>
              Emergency Nearby
            </Text>
            
            <Text style={[styles.modalSubtitle, { color: theme.colors.onSurfaceVariant || '#8B96AB' }]}>
              A similar incident was reported nearby in the last 30 minutes. Is this the same incident?
            </Text>

            {existingIncident?.photo_url ? (
              <Image
                source={{ uri: existingIncident.photo_url }}
                style={styles.modalImage}
                resizeMode="cover"
              />
            ) : (
              <View style={styles.modalImagePlaceholder}>
                <Text style={styles.modalPlaceholderText}>No Photo Attached</Text>
              </View>
            )}

            <View style={styles.descriptionBox}>
              <Text style={styles.descriptionLabel}>Details Reported:</Text>
              <Text style={styles.descriptionText} numberOfLines={3}>
                {existingIncident?.description || 'Emergency incident reported.'}
              </Text>
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.btnConfirmSame]}
                onPress={handleConfirmSameIncident}
              >
                <Text style={styles.btnText}>Yes, Same Incident</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalButton, styles.btnConfirmDifferent]}
                onPress={handleConfirmDifferentIncident}
              >
                <Text style={styles.btnText}>No, New Incident</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { padding: 20, gap: 22, paddingBottom: 32 },
  mediaRow: { flexDirection: 'row', gap: 16, paddingHorizontal: 8 },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    width: '100%',
    maxWidth: 340,
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  modalSubtitle: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 16,
  },
  modalImage: {
    width: '100%',
    height: 180,
    borderRadius: 12,
    marginBottom: 12,
  },
  modalImagePlaceholder: {
    width: '100%',
    height: 120,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  modalPlaceholderText: {
    color: '#64748B',
    fontSize: 12,
  },
  descriptionBox: {
    width: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 8,
    padding: 10,
    marginBottom: 20,
  },
  descriptionLabel: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#64748B',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  descriptionText: {
    fontSize: 12,
    color: '#E2E8F0',
    lineHeight: 16,
  },
  modalActions: {
    width: '100%',
    flexDirection: 'column',
    gap: 10,
  },
  modalButton: {
    width: '100%',
    padding: 12,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  btnConfirmSame: {
    backgroundColor: '#10B981',
  },
  btnConfirmDifferent: {
    backgroundColor: '#EF4444',
  },
  btnText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 14,
  },
});
