import React from 'react';
import { View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useDriverSession } from '../hooks/useDriverSession';
import { useAppTheme } from '../hooks/useAppTheme';
import AppHeader from '../components/AppHeader';
import PlaceholderBody from '../components/PlaceholderBody';

/** Tab placeholder — active-incident detail isn't designed yet; offers still surface via the global IncidentOfferGate overlay. */
export default function IncidentScreen() {
  const theme = useAppTheme();
  const { identity, online, connected } = useDriverSession();

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      <AppHeader
        unitLabel={identity?.vehicleNumber ?? '—'}
        dutyLabel={online ? 'ON DUTY' : 'OFF DUTY'}
        dutyColor={online ? theme.good : theme.danger}
        connected={connected}
      />
      <PlaceholderBody icon={<Feather name="alert-triangle" size={26} color={theme.inkFaint} />} title="No active incident" subtitle="This screen isn't designed yet — incoming offers still appear as a full-screen alert." />
    </View>
  );
}
