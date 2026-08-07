// Maps Firebase Auth error codes to friendly, user-facing messages.
export function authErrorMessage(err: unknown): string {
  const code =
    typeof err === "object" && err !== null && "code" in err
      ? String((err as { code: unknown }).code)
      : "";

  switch (code) {
    case "auth/invalid-credential":
    case "auth/wrong-password":
    case "auth/user-not-found":
      return "Incorrect email or password.";
    case "auth/invalid-email":
      return "Please enter a valid email address.";
    case "auth/email-already-in-use":
      return "That email is already registered — try signing in instead.";
    case "auth/weak-password":
      return "Password should be at least 6 characters.";
    case "auth/too-many-requests":
      return "Too many attempts. Please wait a moment and try again.";
    case "auth/network-request-failed":
      return "Network error. Check your connection and try again.";
    case "auth/popup-closed-by-user":
    case "auth/cancelled-popup-request":
    case "auth/user-cancelled":
      return "Sign-in was cancelled.";
    case "auth/operation-not-allowed":
      return "This sign-in method isn't enabled for the app. (Admin: enable it in Firebase Authentication.)";
    case "auth/unauthorized-domain":
      return "This site isn't authorized for sign-in yet. (Admin: add this domain under Firebase Authentication → Settings → Authorized domains.)";
    default:
      return err instanceof Error && err.message
        ? err.message
        : "Something went wrong. Please try again.";
  }
}
