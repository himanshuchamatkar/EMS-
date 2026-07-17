import React from 'react';
import { View } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useDriverSession } from '../hooks/useDriverSession';
import { useAppTheme } from '../hooks/useAppTheme';
import AppHeader from '../components/AppHeader';
import PlaceholderBody from '../components/PlaceholderBody';

/** Tab placeholder — backend already has GET /dispatch/history, just needs a screen. */
export default function HistoryScreen() {
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
      <PlaceholderBody icon={<Feather name="clock" size={26} color={theme.inkFaint} />} title="No trip history yet" subtitle="This screen isn't designed yet — completed runs will appear here." />
    </View>
  );
}
