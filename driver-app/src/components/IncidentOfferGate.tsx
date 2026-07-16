import React from 'react';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useDriverSession } from '../hooks/useDriverSession';
import { useIncidentOffer } from '../hooks/useIncidentOffer';
import { useActiveIncident } from '../hooks/useActiveIncident';
import IncidentOfferCard from './IncidentOfferCard';
import type { RootStackParamList } from '../navigation/types';

/**
 * Mounted once at the app root, alongside (not inside) the navigator, so an
 * incoming assignment — whether a Live-mode `dispatch:offer` or a direct
 * `dispatch:assigned` (Simulation auto-assign / admin manual assign, see
 * useIncidentOffer) — shows as a full-screen card no matter which screen the
 * driver is currently on. On accept, the incident becomes the app-wide
 * "active incident" (see useActiveIncident) and the driver is dropped on the
 * Map tab, which renders the live view for it.
 */
export default function IncidentOfferGate() {
  const { identity, online, socket } = useDriverSession();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { offer, mode, busy, accept, reject } = useIncidentOffer(socket, identity?.ambulanceId ?? null);
  const { startIncident } = useActiveIncident();

  if (!online || !offer) return null;

  const handleAccept = async () => {
    const ok = await accept();
    if (ok) {
      startIncident(offer.emergency);
      navigation.navigate('Main', { screen: 'Map' });
    }
  };

  return <IncidentOfferCard offer={offer} mode={mode} busy={busy} onAccept={handleAccept} onReject={reject} />;
}
