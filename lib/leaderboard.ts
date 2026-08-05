// Live leaderboard: participants submit an entry (name + a photo/video and a
// selfie); an admin reviews submissions in a password-gated dashboard and sets
// a score that drives the public live leaderboard.
//
// All reads/writes go through /api/leaderboard/* Route Handlers backed by the
// Firebase Admin SDK, so the underlying Firestore collection and Storage path
// stay locked down (Admin SDK bypasses security rules) and the admin password
// is only ever checked server-side.

export type LeaderboardStatus = "pending" | "scored";

export type LeaderboardMediaType = "image" | "video";

export interface LeaderboardSubmission {
  id: string;
  name: string;
  // The participant's entry media (a photo or a short video).
  mediaUrl: string;
  mediaType: LeaderboardMediaType;
  // A selfie, used to verify the entry belongs to the named participant.
  selfieUrl: string;
  // Score set by the admin. null until reviewed/scored.
  score: number | null;
  status: LeaderboardStatus;
  createdAt: number;
  updatedAt: number;
}

export const LEADERBOARD_COLLECTION = "leaderboardSubmissions";

// Header the client sends the admin password in.
export const ADMIN_PASSWORD_HEADER = "x-leaderboard-password";

// Upload limits. Videos are naturally larger than photos.
export const MAX_MEDIA_BYTES = 50 * 1024 * 1024; // 50 MB
export const MAX_SELFIE_BYTES = 10 * 1024 * 1024; // 10 MB
