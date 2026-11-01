import crypto from 'node:crypto';

const activeOtpStore = new Map();
const rateLimitStore = new Map();
const OTP_TTL_MS = 5 * 60 * 1000;
const SEND_COOLDOWN_MS = 10 * 1000;
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;
const MAX_SENDS_PER_WINDOW = 5;
const MAX_VERIFICATION_ATTEMPTS = 5;

const isProduction = process.env.NODE_ENV === 'production';
const twilioConfig = {
  accountSid: process.env.TWILIO_ACCOUNT_SID,
  authToken: process.env.TWILIO_AUTH_TOKEN,
  verifyServiceSid: process.env.TWILIO_VERIFY_SERVICE_SID
};
const hasTwilioVerify = Object.values(twilioConfig).every(Boolean);

export function normalizePhone(phone) {
  if (!phone || typeof phone !== 'string') return '';
  const trimmed = phone.trim().replace(/^(\\+94|0094)/, '0');
  return trimmed.replace(/\\D/g, '');
}

function toE164(phone) {
  const clean = normalizePhone(phone);
  if (/^0\\d{9}$/.test(clean)) return `+94${clean.slice(1)}`;
  return '';
}

function rateLimitPhone(cleanPhone) {
  const now = Date.now();
  let record = rateLimitStore.get(cleanPhone);
  if (record) {
    if (now - record.lastSentAt < SEND_COOLDOWN_MS) {
      const waitSeconds = Math.ceil((SEND_COOLDOWN_MS - (now - record.lastSentAt)) / 1000);
      return { success: false, error: `Please wait ${waitSeconds}s before requesting a new verification code.`, waitSeconds };
    }
    if (now - record.windowStart < RATE_LIMIT_WINDOW_MS) {
      if (record.sendCount >= MAX_SENDS_PER_WINDOW) {
        return { success: false, error: 'Too many OTP requests for this phone number. Please wait before trying again.' };
      }
      record.sendCount += 1;
      record.lastSentAt = now;
    } else {
      record.windowStart = now;
      record.sendCount = 1;
      record.lastSentAt = now;
    }
  } else {
    record = { windowStart: now, sendCount: 1, lastSentAt: now };
    rateLimitStore.set(cleanPhone, record);
  }
  return { success: true };
}

async function twilioRequest(endpoint, params) {
  const url = `https://verify.twilio.com/v2/Services/${twilioConfig.verifyServiceSid}/Verifications${endpoint}`;
  const auth = Buffer.from(`${twilioConfig.accountSid}:${twilioConfig.authToken}`).toString('base64');
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: new URLSearchParams(params)
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(payload.message || 'SMS verification provider rejected the request.');
    error.status = response.status;
    throw error;
  }
  return payload;
}

export async function sendOtp(phone) {
  const cleanPhone = normalizePhone(phone);
  const e164 = toE164(phone);
  if (!cleanPhone || !e164) {
    return { success: false, error: 'Enter a valid Sri Lankan mobile number, for example 0771234567.' };
  }

  const limited = rateLimitPhone(cleanPhone);
  if (!limited.success) return limited;

  if (isProduction) {
    if (!hasTwilioVerify) {
      return { success: false, unavailable: true, error: 'SMS verification is not configured. Please contact support.' };
    }
    try {
      const result = await twilioRequest('', { To: e164, Channel: 'sms' });
      if (result.status !== 'pending') throw new Error('SMS verification request was not accepted.');
      return {
        success: true,
        message: `Verification code sent to ${e164}. Valid for 5 minutes.`,
        phone: cleanPhone,
        expiresInSeconds: 300
      };
    } catch (error) {
      console.error('Twilio Verify send failed:', error.message);
      return { success: false, unavailable: true, error: 'Could not deliver the verification SMS. Please try again later.' };
    }
  }

  const now = Date.now();
  const code = crypto.randomInt(100000, 1000000).toString();
  activeOtpStore.set(cleanPhone, { code, expiresAt: now + OTP_TTL_MS, attempts: 0 });
  console.info(`[SMS OTP development simulator] Code generated for ${cleanPhone}.`);
  return {
    success: true,
    message: `Verification code sent to ${phone}. Valid for 5 minutes.`,
    phone: cleanPhone,
    expiresInSeconds: 300,
    devCode: code
  };
}

export async function verifyOtp(phone, inputCode) {
  const cleanPhone = normalizePhone(phone);
  const e164 = toE164(phone);
  if (!cleanPhone || !e164) return { valid: false, error: 'A valid Sri Lankan mobile phone number is required.' };
  if (!inputCode || typeof inputCode !== 'string' || !/^\\d{6}$/.test(inputCode.trim())) {
    return { valid: false, error: 'Please enter a valid 6-digit code.' };
  }

  if (isProduction) {
    if (!hasTwilioVerify) return { valid: false, unavailable: true, error: 'SMS verification is not configured. Please contact support.' };
    try {
      const result = await twilioRequest('/VerificationCheck', { To: e164, Code: inputCode.trim() });
      if (result.status === 'approved' && result.valid === true) return { valid: true, phone: cleanPhone };
      return { valid: false, error: 'Incorrect or expired verification code. Please request a new code.' };
    } catch (error) {
      console.error('Twilio Verify check failed:', error.message);
      return { valid: false, unavailable: true, error: 'Could not verify the SMS code right now. Please try again.' };
    }
  }

  const record = activeOtpStore.get(cleanPhone);
  if (!record) return { valid: false, error: 'No active verification code found. Please request a new code.' };
  if (Date.now() > record.expiresAt) {
    activeOtpStore.delete(cleanPhone);
    return { valid: false, error: 'Verification code has expired. Please request a new code.' };
  }
  if (record.attempts >= MAX_VERIFICATION_ATTEMPTS) {
    activeOtpStore.delete(cleanPhone);
    return { valid: false, error: 'Too many incorrect attempts. Please request a new code.' };
  }

  const expected = Buffer.from(record.code);
  const actual = Buffer.from(inputCode.trim());
  const matches = expected.length === actual.length && crypto.timingSafeEqual(expected, actual);
  if (!matches) {
    record.attempts += 1;
    if (record.attempts >= MAX_VERIFICATION_ATTEMPTS) {
      activeOtpStore.delete(cleanPhone);
      return { valid: false, error: 'Too many incorrect attempts. Please request a new code.' };
    }
    return { valid: false, error: `Incorrect verification code. ${MAX_VERIFICATION_ATTEMPTS - record.attempts} attempts remaining.` };
  }

  activeOtpStore.delete(cleanPhone);
  return { valid: true, phone: cleanPhone };
}

const cleanupInterval = setInterval(() => {
  const now = Date.now();
  for (const [phone, record] of activeOtpStore) if (now > record.expiresAt) activeOtpStore.delete(phone);
  for (const [phone, record] of rateLimitStore) if (now - record.windowStart > RATE_LIMIT_WINDOW_MS) rateLimitStore.delete(phone);
}, 5 * 60 * 1000);
cleanupInterval.unref?.();
