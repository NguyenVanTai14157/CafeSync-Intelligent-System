const DEPLOYED_API_URL = 'https://cafesync-intelligent-system-sntf.onrender.com';

export const API_URL = (process.env.EXPO_PUBLIC_API_URL || DEPLOYED_API_URL).replace(/\/$/, '');

export function getImageUrl(image?: string | null) {
  if (!image) return null;
  if (/^https?:\/\//i.test(image)) return image;
  return `${API_URL}/images/${encodeURIComponent(image)}`;
}

