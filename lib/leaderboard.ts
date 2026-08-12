// Live leaderboard: participants submit an entry (name + a photo/video and a
// selfie); an admin reviews submissions in a password-gated dashboard and sets
// a score that drives the public live leaderboard.
//
// All reads/writes go through /api/leaderboard/* Route Handlers backed by the
// Firebase Admin SDK, so the underlying Firestore collection and Storage path
// stay locked down (Admin SDK bypasses security rules) and the admin password
// is only ever checked server-side.

export type LeaderboardStatus = "pending" | "scored";

// Each tournament run is a "batch". New submissions are tagged with the
// currently active batch; the leaderboard can be viewed per batch.
export const DEFAULT_BATCH = "Batch 1";
export const LEADERBOARD_CONFIG_COLLECTION = "leaderboardConfig";
export const LEADERBOARD_CONFIG_DOC = "state";

export type LeaderboardMediaType = "image" | "video";

export interface LeaderboardSubmission {
  id: string;
  name: string;
  // Which tournament run this entry belongs to.
  batch: string;
  // The participant's entry media (a photo or a short video). Optional — may
  // be empty if the participant only uploaded a selfie.
  mediaUrl: string;
  mediaType: LeaderboardMediaType | null;
  // A selfie, used to verify the entry belongs to the named participant.
  // Optional, but a submission must include at least a selfie or entry media.
  selfieUrl: string;
  // A photo of the participant's Trainer ID QR (physical card or screenshot),
  // used by the admin to verify the trainer account.
  qrUrl: string;
  // Score set by the admin. null until reviewed/scored.
  score: number | null;
  status: LeaderboardStatus;
  createdAt: number;
  updatedAt: number;
}

export const LEADERBOARD_COLLECTION = "leaderboardSubmissions";

// The fixed roster of participants. Submissions must pick a name from this
// list (enforced on both the client and the server).
export const PARTICIPANTS = [
  "Kean",
  "Dwane",
  "Neil",
  "Jec",
  "Angel",
  "Koro",
  "Jim",
  "Lloyd",
  "Aljay",
  "Jessa",
  "Kiel",
  "Nho Mer",
  "Klyde Go",
  "Kiel Go",
  "Matthew",
  "James",
  "Allyson",
  "Pirate",
  "Conlan",
  "Rivian",
  "Enzo",
  "Louie",
  "Lester",
  "Thea",
  "Adrian",
  "Dan Sherwin",
  "Dominic",
  "Smooth",
  "Rus",
  "Kyle",
] as const;

export function isValidParticipant(name: string): boolean {
  return (PARTICIPANTS as readonly string[]).includes(name);
}

// Header the client sends the admin password in.
export const ADMIN_PASSWORD_HEADER = "x-leaderboard-password";

// Upload limits. Videos are naturally larger than photos.
//
// Submissions are POSTed as multipart form data to a Route Handler running on
// Firebase App Hosting (Cloud Run), which rejects any request body larger than
// ~32 MB over HTTP/1. A submission carries three files (entry media, selfie,
// and Trainer ID QR), so the caps are sized so their combined worst case stays
// safely under that limit and users get a clean in-app error instead of an
// opaque 413 from the platform.
export const MAX_MEDIA_BYTES = 16 * 1024 * 1024; // 16 MB
export const MAX_SELFIE_BYTES = 6 * 1024 * 1024; // 6 MB
export const MAX_QR_BYTES = 6 * 1024 * 1024; // 6 MB
