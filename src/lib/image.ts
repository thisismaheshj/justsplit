/**
 * Avatar photos are stored inline as data URLs on their row, and every member
 * row is read whenever a group opens. Every upload is downscaled and
 * re-encoded to a small square JPEG (~6-10KB at 192px) before it is stored.
 */
const MAX_DIMENSION = 192;
const QUALITY = 0.82;

/** Account photos are shown larger (profile header, menus), so keep more pixels. */
export const PROFILE_PHOTO_DIMENSION = 320;

export async function fileToAvatarDataUrl(file: File, maxDimension = MAX_DIMENSION): Promise<string> {
  if (!file.type.startsWith('image/')) {
    throw new Error('Please choose an image file');
  }

  const dataUrl = await readAsDataUrl(file);
  try {
    return await downscaleSquare(dataUrl, maxDimension);
  } catch {
    // Canvas unavailable (or a format the browser cannot decode) — only keep
    // the original if it is small enough to be safe.
    if (dataUrl.length > 200_000) throw new Error('That image is too large');
    return dataUrl;
  }
}

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error('Could not read that file'));
    reader.readAsDataURL(file);
  });
}

function downscaleSquare(dataUrl: string, maxDimension: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => {
      const side = Math.min(image.width, image.height);
      const size = Math.min(maxDimension, side);
      const canvas = document.createElement('canvas');
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Canvas unavailable'));
        return;
      }
      // Centre-crop to a square before scaling.
      ctx.drawImage(
        image,
        (image.width - side) / 2,
        (image.height - side) / 2,
        side,
        side,
        0,
        0,
        size,
        size,
      );
      resolve(canvas.toDataURL('image/jpeg', QUALITY));
    };
    image.onerror = () => reject(new Error('Could not decode that image'));
    image.src = dataUrl;
  });
}
