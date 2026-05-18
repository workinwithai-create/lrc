export const AUDIO_UPLOAD_BUCKET = 'lrc-audio-uploads';
export const MAX_AUDIO_BYTES = 25 * 1024 * 1024;

export function getSafeAudioExtension(fileName: string, mimeType: string) {
  const fromName = fileName.toLowerCase().match(/\.(mp3|wav|m4a|flac|ogg|aac|webm)$/)?.[1];
  if (fromName) return fromName;

  if (mimeType.includes('mpeg')) return 'mp3';
  if (mimeType.includes('wav')) return 'wav';
  if (mimeType.includes('mp4') || mimeType.includes('m4a')) return 'm4a';
  if (mimeType.includes('flac')) return 'flac';
  if (mimeType.includes('ogg')) return 'ogg';
  if (mimeType.includes('aac')) return 'aac';
  if (mimeType.includes('webm')) return 'webm';

  return 'audio';
}
