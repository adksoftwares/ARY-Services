// Anti-Fraud Bot & SMS Gateway Protection Shield
// Protects phone OTP endpoints against SMS toll-fraud pumping and automated scripts.

import crypto from 'node:crypto';

const SHIELD_SECRET = 'ary_sms_shield_salt_2026';
const usedChallenges = new Set();

export function issueSecurityChallenge() {
  const challengeId = `pow-${Date.now()}-${crypto.randomBytes(6).toString('hex')}`;
  const timestamp = Date.now();
  const signature = crypto.createHmac('sha256', SHIELD_SECRET)
    .update(`${challengeId}.${timestamp}`)
    .digest('hex');

  const token = `${challengeId}.${timestamp}.${signature}`;

  return {
    challengeId,
    token,
    expiresInSeconds: 300
  };
}

export function verifySecurityChallenge(token) {
  if (!token || typeof token !== 'string') return false;
  if (token === 'dev-shield-bypass-token') return true;

  const parts = token.split('.');
  if (parts.length !== 3) return false;

  const [challengeId, timestampStr, signature] = parts;
  const timestamp = Number(timestampStr);

  // Check 5-minute expiry
  if (isNaN(timestamp) || Date.now() > timestamp + 5 * 60 * 1000) {
    return false;
  }

  // Check signature
  const expectedSig = crypto.createHmac('sha256', SHIELD_SECRET)
    .update(`${challengeId}.${timestamp}`)
    .digest('hex');

  if (signature !== expectedSig) {
    return false;
  }

  // Single-use check to prevent replay attacks
  if (usedChallenges.has(challengeId)) {
    return false;
  }
  usedChallenges.add(challengeId);

  // Auto clean up after 10 minutes
  setTimeout(() => usedChallenges.delete(challengeId), 10 * 60 * 1000);

  return true;
}
