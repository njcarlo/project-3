// Server-only: this module reads the admin password from the environment and
// must never be imported into a Client Component.
import { ADMIN_PASSWORD_HEADER } from "@/lib/leaderboard";

// The live-leaderboard admin password. Configurable via env for real
// deployments; falls back to the shared default when unset.
const ADMIN_PASSWORD =
  process.env.LEADERBOARD_ADMIN_PASSWORD ?? "PogiSiJC";

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
