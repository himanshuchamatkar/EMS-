import Constants from 'expo-constants';

interface AppExtra {
  apiBaseUrl?: string;
  socketUrl?: string;
}

const extra = (Constants.expoConfig?.extra ?? {}) as AppExtra;

// Defaults only work for the web preview / iOS simulator. An Android emulator
// needs http://10.0.2.2:5000, and a physical device needs the dev machine's
// LAN IP (e.g. http://192.168.1.20:5000) — set both values under
// `expo.extra` in app.json to override.
const DEFAULT_HOST = 'http://localhost:5000';

export const SOCKET_URL = extra.socketUrl ?? DEFAULT_HOST;
export const API_BASE_URL = extra.apiBaseUrl ?? `${DEFAULT_HOST}/api`;
