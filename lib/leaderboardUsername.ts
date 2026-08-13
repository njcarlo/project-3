// Shared (client + server) username helpers for tournament player accounts.
// Firebase Auth needs an email to sign in with a password, so a chosen
// username is mapped to a stable synthetic email under a reserved domain.
// Firebase Auth's own "email already exists" check gives us free username
// uniqueness — no separate lookup collection needed.

const USERNAME_RE = /^[a-zA-Z0-9_]{3,24}$/;

export function isValidUsername(username: string): boolean {
  return USERNAME_RE.test(username);
}

export function usernameToEmail(username: string): string {
  return `${username.trim().toLowerCase()}@players.mezastar-collector.internal`;
}
