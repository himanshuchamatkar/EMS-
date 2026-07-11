import AsyncStorage from '@react-native-async-storage/async-storage';
import type { DriverIdentity } from '../types';

const IDENTITY_KEY = 'smart-ems.driverIdentity';

export async function saveDriverIdentity(identity: DriverIdentity): Promise<void> {
  await AsyncStorage.setItem(IDENTITY_KEY, JSON.stringify(identity));
}

export async function getDriverIdentity(): Promise<DriverIdentity | null> {
  const raw = await AsyncStorage.getItem(IDENTITY_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as DriverIdentity;
  } catch {
    return null;
  }
}

export async function clearDriverIdentity(): Promise<void> {
  await AsyncStorage.removeItem(IDENTITY_KEY);
}
