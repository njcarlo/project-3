// Server-only: this module reads passwords from the environment and must never
// be imported into a Client Component.
import {
  ADMIN_PASSWORD_HEADER,
  SUBMIT_PASSWORD_HEADER,
} from "@/lib/leaderboard";

// The live-leaderboard admin password. Configurable via env for real
// deployments; falls back to the shared default when unset.
const ADMIN_PASSWORD =
  process.env.LEADERBOARD_ADMIN_PASSWORD ?? "PogiSiJC";

// The submission password — share with confirmed players so they can submit,
// without granting admin access.
const SUBMIT_PASSWORD =
  process.env.LEADERBOARD_SUBMIT_PASSWORD ?? "PogiPlay";

/** Constant-time-ish comparison to avoid trivial timing leaks. */
function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

export function isValidAdminPassword(candidate: string | null | undefined): boolean {
  if (!candidate) return false;
  return safeEqual(candidate, ADMIN_PASSWORD);
}

/** Reads and validates the admin password from a request's headers. */
export function requestHasAdminAccess(req: Request): boolean {
  return isValidAdminPassword(req.headers.get(ADMIN_PASSWORD_HEADER));
}

export function isValidSubmitPassword(
  candidate: string | null | undefined
): boolean {
  if (!candidate) return false;
  // The admin password also works for submitting.
  return safeEqual(candidate, SUBMIT_PASSWORD) || safeEqual(candidate, ADMIN_PASSWORD);
}

/** Validates the submission password (or admin password) from headers. */
export function requestHasSubmitAccess(req: Request): boolean {
  return isValidSubmitPassword(req.headers.get(SUBMIT_PASSWORD_HEADER));
}
