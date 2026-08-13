// Server-only: gates the tournament admin dashboard.
import { verifyIdToken } from "@/lib/firebase/admin";

// Only these signed-in accounts may reach /admin (the tournament dashboard).
// Configurable via env (comma-separated) for real deployments; falls back to
// the organizer's email.
const ADMIN_EMAILS = new Set(
  (process.env.LEADERBOARD_ADMIN_EMAILS ?? "njcarlo@gmail.com")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean)
);

/** Verifies the request's Firebase ID token belongs to an allowed admin email. */
export async function requestHasAdminAccess(req: Request): Promise<boolean> {
  const decoded = await verifyIdToken(req.headers.get("authorization"));
  if (!decoded?.email) return false;
  return ADMIN_EMAILS.has(decoded.email.toLowerCase());
}
