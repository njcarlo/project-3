import { adminStorage } from "@/lib/firebase/admin";

/**
 * Uploads a file to Firebase Storage under the leaderboard/ prefix using the
 * Admin SDK and returns a public URL for display.
 */
export async function uploadLeaderboardFile(
  file: File,
  submissionId: string,
  kind: "media" | "selfie"
): Promise<string> {
  const bucket = adminStorage.bucket();
  const ext = extensionFor(file.name, file.type);
  const path = `leaderboard/${submissionId}/${kind}${ext}`;
  const object = bucket.file(path);

  const buffer = Buffer.from(await file.arrayBuffer());
  await object.save(buffer, {
    contentType: file.type || "application/octet-stream",
    resumable: false,
    metadata: { cacheControl: "public, max-age=31536000" },
  });
  await object.makePublic();

  return `https://storage.googleapis.com/${bucket.name}/${encodeURI(path)}`;
}

function extensionFor(fileName: string, mimeType: string): string {
  const fromName = fileName.includes(".")
    ? fileName.slice(fileName.lastIndexOf(".")).toLowerCase()
    : "";
  if (fromName && /^\.[a-z0-9]{1,5}$/.test(fromName)) return fromName;

  // Fall back to a sensible extension from the MIME type.
  const map: Record<string, string> = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
    "image/gif": ".gif",
    "video/mp4": ".mp4",
    "video/quicktime": ".mov",
    "video/webm": ".webm",
  };
  return map[mimeType] ?? "";
}
