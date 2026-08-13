import { redirect } from "next/navigation";

// Moved to /admin.
export default function LeaderboardAdminRedirect() {
  redirect("/admin");
}
