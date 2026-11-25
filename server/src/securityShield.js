// Anti-fraud challenge signing for OTP endpoints.
// Configure OTP_SHIELD_SECRET with a unique random value of at least 32 characters.
import crypto from 'node:crypto';

const SHIELD_SECRET = process.env.OTP_SHIELD_SECRET;
if (!SHIELD_SECRET || Buffer.byteLength(SHIELD_SECRET) < 32) {
  throw new Error('OTP_SHIELD_SECRET must be configured with at least 32 characters.');
}

const usedChallenges = new Set();
let challengeStoragePool = null;

export function setSecurityChallengeStoragePool(pool) {
  challengeStoragePool = pool || null;
}
const CHALLENGE_TTL_MS = 5 * 60 * 1000;

export function issueSecurityChallenge() {
  const challengeId = `pow-${Date.now()}-${crypto.randomBytes(16).toString('hex')}`;
  const timestamp = Date.now();
  const signature = crypto.createHmac('sha256', SHIELD_SECRET)
    .update(`${challengeId}.${timestamp}`)
    .digest('hex');

  return {
    challengeId,
    token: `${challengeId}.${timestamp}.${signature}`,
    expiresInSeconds: CHALLENGE_TTL_MS / 1000
  };
}

export async function verifySecurityChallenge(token) {
  if (!token || typeof token !== 'string') return false;
  const parts = token.split('.');
  if (parts.length !== 3) return false;

  const [challengeId, timestampStr, signature] = parts;
  const timestamp = Number(timestampStr);
  if (!Number.isSafeInteger(timestamp) || Date.now() - timestamp > CHALLENGE_TTL_MS || timestamp > Date.now() + 30_000) {
    return false;
  }

  const expected = crypto.createHmac('sha256', SHIELD_SECRET)
    .update(`${challengeId}.${timestamp}`)
    .digest();
  let supplied;
  try { supplied = Buffer.from(signature, 'hex'); } catch { return false; }
  if (supplied.length !== expected.length || !crypto.timingSafeEqual(supplied, expected)) return false;

  if (challengeStoragePool) {
    const result = await challengeStoragePool.query(
      `INSERT INTO otp_used_challenges (challenge_id, expires_at)
       VALUES ($1, $2)
       ON CONFLICT (challenge_id) DO UPDATE
       SET expires_at = EXCLUDED.expires_at
       WHERE otp_used_challenges.expires_at < $3
       RETURNING challenge_id`,
      [challengeId, timestamp + CHALLENGE_TTL_MS, Date.now()]
    );
    return result.rowCount === 1;
  }
  if (usedChallenges.has(challengeId)) return false;
  usedChallenges.add(challengeId);
  setTimeout(() => usedChallenges.delete(challengeId), CHALLENGE_TTL_MS * 2).unref?.();
  return true;
}
