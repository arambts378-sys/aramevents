/**
 * Validates file buffer magic bytes against permitted image formats.
 * Allows only JPEG, PNG, and WebP.
 */
export function detectSafeImageFormat(
  buffer: Buffer
): { valid: true; mime: string; ext: string } | { valid: false; reason: string } {
  if (!buffer || buffer.length < 12) {
    return { valid: false, reason: 'File is too small to be a valid image.' };
  }

  // 1. JPEG: FF D8 FF
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return { valid: true, mime: 'image/jpeg', ext: 'jpg' };
  }

  // 2. PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    return { valid: true, mime: 'image/png', ext: 'png' };
  }

  // 3. WebP: 'RIFF' at 0..3 and 'WEBP' at 8..11
  const riff = buffer.toString('ascii', 0, 4);
  const webp = buffer.toString('ascii', 8, 12);
  if (riff === 'RIFF' && webp === 'WEBP') {
    return { valid: true, mime: 'image/webp', ext: 'webp' };
  }

  return {
    valid: false,
    reason: 'Invalid file signature. Only JPEG, PNG, and WebP images are supported.',
  };
}
