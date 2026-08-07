// Client-side image downscaling + re-encoding, run before upload to keep
// Firebase Storage usage and bandwidth low. Non-images (e.g. videos) and
// anything that can't be decoded are returned unchanged.

export interface CompressOptions {
  // Longest edge, in pixels, the output is scaled down to fit.
  maxDim?: number;
  // JPEG quality, 0..1.
  quality?: number;
}

export async function compressImage(
  file: File,
  opts: CompressOptions = {}
): Promise<File> {
  // Only compress raster images. Leave videos, GIFs (may be animated), and
  // SVGs untouched.
  if (!file.type.startsWith("image/")) return file;
  if (file.type === "image/gif" || file.type === "image/svg+xml") return file;
  if (typeof document === "undefined" || typeof createImageBitmap !== "function")
    return file;

  const { maxDim = 1920, quality = 0.82 } = opts;

  let bitmap: ImageBitmap;
  try {
    // `from-image` applies EXIF orientation so photos aren't rotated.
    bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    return file;
  }

  const scale = Math.min(1, maxDim / Math.max(bitmap.width, bitmap.height));
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    bitmap.close();
    return file;
  }
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/jpeg", quality)
  );
  if (!blob || blob.size >= file.size) return file; // no gain — keep original

  const name = file.name.replace(/\.[^.]+$/, "") + ".jpg";
  return new File([blob], name, { type: "image/jpeg", lastModified: Date.now() });
}
