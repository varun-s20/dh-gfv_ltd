/**
 * Shrink a phone photo in the browser before upload: long edge ≤ 2000px, JPEG ~82%.
 * HEIC/HEIF (iPhone) can't be decoded by most browsers, so those upload as-is;
 * the server accepts them and the team can open them on any modern device.
 */
const MAX_EDGE = 2000;
const QUALITY = 0.82;

export type Prepared = { blob: Blob; width?: number; height?: number; name: string };

export async function prepareImage(file: File): Promise<Prepared> {
  const isHeic = /heic|heif/i.test(file.type) || /\.(heic|heif)$/i.test(file.name);
  if (isHeic || typeof createImageBitmap !== "function") return { blob: file, name: file.name };

  try {
    const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
    const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
    const width = Math.round(bitmap.width * scale);
    const height = Math.round(bitmap.height * scale);

    let blob: Blob | null = null;
    if (typeof OffscreenCanvas !== "undefined") {
      const canvas = new OffscreenCanvas(width, height);
      canvas.getContext("2d")?.drawImage(bitmap, 0, 0, width, height);
      blob = await canvas.convertToBlob({ type: "image/jpeg", quality: QUALITY });
    } else {
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      canvas.getContext("2d")?.drawImage(bitmap, 0, 0, width, height);
      blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", QUALITY));
    }
    bitmap.close();
    if (!blob || blob.size >= file.size) return { blob: file, width, height, name: file.name };
    return { blob, width, height, name: file.name.replace(/\.[^.]+$/, "") + ".jpg" };
  } catch {
    return { blob: file, name: file.name };
  }
}
