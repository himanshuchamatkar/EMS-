import Constants from 'expo-constants';

interface AppExtra {
  apiBaseUrl?: string;
  socketUrl?: string;
  cloudinaryCloudName?: string;
  cloudinaryUploadPreset?: string;
}

const extra = (Constants.expoConfig?.extra ?? {}) as AppExtra;

// Defaults only work for the web preview / iOS simulator. An Android emulator
// needs http://10.0.2.2:5000, and a physical device needs the dev machine's
// LAN IP (e.g. http://192.168.1.20:5000) — set both values under
// `expo.extra` in app.json to override. Same backend the driver app and
// admin panel use — see app.json for the deployed default.
const DEFAULT_HOST = 'http://localhost:5000';

export const SOCKET_URL = extra.socketUrl ?? DEFAULT_HOST;
export const API_BASE_URL = extra.apiBaseUrl ?? `${DEFAULT_HOST}/api`;

// Set both under expo.extra in app.json — see README for how to create an
// unsigned Cloudinary upload preset. Left as obvious placeholders on purpose
// so a misconfigured build fails loudly (see services/cloudinary.ts) instead
// of silently uploading nowhere.
export const CLOUDINARY_CLOUD_NAME = extra.cloudinaryCloudName ?? '';
export const CLOUDINARY_UPLOAD_PRESET = extra.cloudinaryUploadPreset ?? '';
