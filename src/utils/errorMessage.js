/**
 * Translates technical / raw network exceptions (such as "Failed to fetch",
 * "NetworkError", CORS rejections, or offline states) into clear, friendly,
 * user-facing messages.
 */
export function getFriendlyErrorMessage(err, fallback = 'An unexpected error occurred. Please try again.') {
  if (!err) return fallback;

  const raw = typeof err === 'string'
    ? err
    : (err.message || (err.error && typeof err.error === 'string' ? err.error : fallback));

  if (!raw || typeof raw !== 'string') return fallback;

  // Intercept any variant of JavaScript fetch network errors
  if (/failed to fetch|network\s*error|networkrequestfailed|load failed|net::err|aborted|connection refused/i.test(raw)) {
    return 'Unable to connect to ARY Services server. Please check your internet connection and try again.';
  }

  // Intercept CORS / policy errors
  if (/cors policy|cross-origin|access-control/i.test(raw)) {
    return 'Connection was interrupted. Connecting to backup server, please try again.';
  }

  return raw;
}
