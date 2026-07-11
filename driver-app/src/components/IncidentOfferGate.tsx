import React from 'react';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useDriverSession } from '../hooks/useDriverSession';
import { useIncidentOffer } from '../hooks/useIncidentOffer';
import IncidentOfferCard from './IncidentOfferCard';
import type { RootStackParamList } from '../navigation/types';

/**
 * Mounted once at the app root, alongside (not inside) the navigator, so an
 * incoming assignment — whether a Live-mode `dispatch:offer` or a direct
 * `dispatch:assigned` (Simulation auto-assign / admin manual assign, see
 * useIncidentOffer) — shows as a full-screen card no matter which screen the
 * driver is currently on.
 */
export default function IncidentOfferGate() {
  const { identity, online, socket } = useDriverSession();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { offer, mode, busy, accept, reject } = useIncidentOffer(socket, identity?.ambulanceId ?? null);

  if (!online || !offer) return null;

  const handleAccept = async () => {
    const ok = await accept();
    if (ok) {
      navigation.navigate('Navigation', { emergency: offer.emergency });
    }
  };

  return <IncidentOfferCard offer={offer} mode={mode} busy={busy} onAccept={handleAccept} onReject={reject} />;
}
