/**
 * Resolve a signed session to its original account.
 *
 * Contact details are mutable and may be reassigned; they must never be used
 * to rebind an existing token to another account.
 */
export function findLiveUserForToken(users, decoded) {
  if (!Array.isArray(users) || !decoded || typeof decoded.id !== 'string' || !decoded.id.trim()) {
    return null;
  }
  return users.find((user) => user?.id === decoded.id) || null;
}
