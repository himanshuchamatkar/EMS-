import { CLOUDINARY_CLOUD_NAME, CLOUDINARY_UPLOAD_PRESET } from '../utils/config';

export type CloudinaryResourceType = 'image' | 'video';

interface CloudinaryUploadResponse {
  secure_url: string;
}

function isConfigured(): boolean {
  return (
    CLOUDINARY_CLOUD_NAME.length > 0 &&
    !CLOUDINARY_CLOUD_NAME.startsWith('REPLACE_WITH') &&
    CLOUDINARY_UPLOAD_PRESET.length > 0 &&
    !CLOUDINARY_UPLOAD_PRESET.startsWith('REPLACE_WITH')
  );
}

/**
 * Uploads a locally-captured file straight to Cloudinary using an unsigned
 * upload preset — no API secret in the app, no backend round trip for the
 * upload itself (see app.json `expo.extra.cloudinaryCloudName/UploadPreset`
 * and README for how to create the preset). Cloudinary's "video" resource
 * type also handles plain audio files, so audio recordings upload the same
 * way as video.
 */
export async function uploadToCloudinary(localUri: string, resourceType: CloudinaryResourceType): Promise<string> {
  if (!isConfigured()) {
    throw new Error(
      'Cloudinary is not configured yet — set cloudinaryCloudName and cloudinaryUploadPreset under expo.extra in app.json.'
    );
  }

  const filename = localUri.split('/').pop() ?? `upload-${Date.now()}`;
  const extensionMatch = /\.(\w+)$/.exec(filename);
  const extension = extensionMatch ? extensionMatch[1] : resourceType === 'image' ? 'jpg' : 'mp4';
  const mimeType = resourceType === 'image' ? `image/${extension}` : `video/${extension}`;

  const formData = new FormData();
  // React Native's fetch accepts this {uri, name, type} shape for multipart
  // file fields — it is not a real Blob/File, but RN's FormData polyfill
  // knows how to stream it from the local file URI.
  formData.append('file', { uri: localUri, name: filename, type: mimeType } as unknown as Blob);
  formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);

  const response = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/${resourceType}/upload`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new Error(`Cloudinary upload failed (${response.status}): ${body || 'unknown error'}`);
  }

  const data = (await response.json()) as CloudinaryUploadResponse;
  return data.secure_url;
}
