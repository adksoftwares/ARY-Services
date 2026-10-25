import crypto from 'node:crypto';

// Active OTP store: Key: cleanPhone -> { code, expiresAt, attempts }
const activeOtpStore = new Map();

// Rate limiting store: Key: cleanPhone -> { lastSentAt, windowStart, sendCount }
// Kept separate so consuming or invalidating an OTP does not reset cooldown/window limits
const rateLimitStore = new Map();

const OTP_TTL_MS = 5 * 60 * 1000; // 5 minutes
const SEND_COOLDOWN_MS = 10 * 1000; // 10 seconds
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000; // 10 minutes
const MAX_SENDS_PER_WINDOW = 5;
const MAX_VERIFICATION_ATTEMPTS = 5;

export function normalizePhone(phone) {
  if (!phone || typeof phone !== 'string') return '';
  // Normalize Sri Lankan phone numbers: convert +94 or 0094 to leading 0, strip non-digits
  const trimmed = phone.trim().replace(/^(\+94|0094)/, '0');
  return trimmed.replace(/\D/g, '');
}

export function sendOtp(phone) {
  const cleanPhone = normalizePhone(phone);
  if (!cleanPhone || cleanPhone.length < 8) {
    return {
      success: false,
      error: 'Please provide a valid mobile phone number.'
    };
  }

  const now = Date.now();
  let rateLimit = rateLimitStore.get(cleanPhone);

  if (rateLimit) {
    // Check 30s cooldown
    const elapsedSinceLast = now - rateLimit.lastSentAt;
    if (elapsedSinceLast < SEND_COOLDOWN_MS) {
      const waitSeconds = Math.ceil((SEND_COOLDOWN_MS - elapsedSinceLast) / 1000);
      return {
        success: false,
        error: `Please wait ${waitSeconds}s before requesting a new verification code.`,
        waitSeconds
      };
    }

    // Check 10-minute window rate limit
    if (now - rateLimit.windowStart < RATE_LIMIT_WINDOW_MS) {
      if (rateLimit.sendCount >= MAX_SENDS_PER_WINDOW) {
        return {
          success: false,
          error: 'Too many OTP requests for this phone number. Please wait a few minutes before trying again.'
        };
      }
      rateLimit.sendCount += 1;
      rateLimit.lastSentAt = now;
    } else {
      // Reset window
      rateLimit.windowStart = now;
      rateLimit.sendCount = 1;
      rateLimit.lastSentAt = now;
    }
  } else {
    rateLimit = {
      windowStart: now,
      sendCount: 1,
      lastSentAt: now
    };
    rateLimitStore.set(cleanPhone, rateLimit);
  }

  // Generate secure 6-digit code
  const code = crypto.randomInt(100000, 1000000).toString();

  activeOtpStore.set(cleanPhone, {
    code,
    expiresAt: now + OTP_TTL_MS,
    attempts: 0
  });

  console.log(`[SMS OTP Gateway Simulator] 📱 Sent 6-digit OTP [${code}] to phone: ${cleanPhone}`);

  return {
    success: true,
    message: `Verification code sent to ${phone}. Valid for 5 minutes.`,
    phone: cleanPhone,
    expiresInSeconds: 300,
    devCode: code // Exposed for development & local verification
  };
}

export function verifyOtp(phone, inputCode) {
  const cleanPhone = normalizePhone(phone);
  if (!cleanPhone) {
    return { valid: false, error: 'Mobile phone number is required.' };
  }

  if (!inputCode || typeof inputCode !== 'string' || inputCode.trim().length !== 6) {
    return { valid: false, error: 'Please enter a valid 6-digit code.' };
  }

  const record = activeOtpStore.get(cleanPhone);
  if (!record) {
    return {
      valid: false,
      error: 'No active verification code found for this phone number. Please request a new code.'
    };
  }

  const now = Date.now();
  if (now > record.expiresAt) {
    activeOtpStore.delete(cleanPhone);
    return {
      valid: false,
      error: 'Verification code has expired. Please request a new code.'
    };
  }

  if (record.attempts >= MAX_VERIFICATION_ATTEMPTS) {
    activeOtpStore.delete(cleanPhone);
    return {
      valid: false,
      error: 'Too many incorrect attempts. This code has been invalidated for security. Please request a new code.'
    };
  }

  const expectedBuffer = Buffer.from(record.code, 'utf-8');
  const actualBuffer = Buffer.from(inputCode.trim(), 'utf-8');

  const matches = expectedBuffer.length === actualBuffer.length &&
    crypto.timingSafeEqual(expectedBuffer, actualBuffer);

  if (!matches) {
    record.attempts += 1;
    if (record.attempts >= MAX_VERIFICATION_ATTEMPTS) {
      activeOtpStore.delete(cleanPhone);
      return {
        valid: false,
        error: 'Too many incorrect attempts. This code has been invalidated for security. Please request a new code.'
      };
    }
    const remaining = MAX_VERIFICATION_ATTEMPTS - record.attempts;
    return {
      valid: false,
      error: `Incorrect verification code. ${remaining} attempt${remaining === 1 ? '' : 's'} remaining.`
    };
  }

  // Verification succeeded - invalidate code so it cannot be re-used
  activeOtpStore.delete(cleanPhone);
  return {
    valid: true,
    phone: cleanPhone
  };
}

// Clean up expired records every 5 minutes
const cleanupInterval = setInterval(() => {
  const now = Date.now();
  for (const [phone, record] of activeOtpStore.entries()) {
    if (now > record.expiresAt) {
      activeOtpStore.delete(phone);
    }
  }
  for (const [phone, rateLimit] of rateLimitStore.entries()) {
    if (now - rateLimit.windowStart > RATE_LIMIT_WINDOW_MS) {
      rateLimitStore.delete(phone);
    }
  }
}, 5 * 60 * 1000);

if (cleanupInterval.unref) {
  cleanupInterval.unref();
}
