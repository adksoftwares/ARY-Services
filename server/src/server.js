import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import pg from 'pg';
import crypto from 'node:crypto';
import rateLimit from 'express-rate-limit';
import { findLiveUserForToken } from './sessionIdentity.js';

import {
  getUsers,
  addUser,
  updateUser,
  deleteUser,
  getBookings,
  addBooking,
  updateBooking,
  getReviews,
  addReview,
  getReviewsByProvider,
  getReviewByBooking,
  recordEscrowRelease,
  recordDisputeRefund,
  recordDisputeSplit,
  recordCallOutFeeCompensation,
  recordPayoutSettlement,
  getLedgerEntries,
  getLedgerByBooking,
  getWalletBalance,
  initStorage,
  initPostgresTables,
  setActivePostgresPool,
  verifyPassword,
  hashPassword
} from './storage.js';

import { sendOtp, verifyOtp, normalizePhone } from './otpService.js';
import { subscribeToEvents, broadcastEvent } from './eventHub.js';
import { calculateDistanceKm, estimateEtaMinutes, resolveCoordinatesFromLocation } from './geoService.js';
import { issueSecurityChallenge, verifySecurityChallenge } from './securityShield.js';
import { registerDriverServiceRoutes, createGroceryOrderDeliveryJob, cancelGroceryOrderDeliveryJob } from './driverServiceRoutes.js';
import { registerGroceryRoutes } from './groceryRoutes.js';
import { registerRoleAccessRoutes } from './roleAccessRoutes.js';
import { listNotifications, markNotificationRead, markAllNotificationsRead, persistEventNotifications } from './notificationService.js';

const PROVIDER_SERVICE_CATEGORIES = new Map([
  ['food-shops', 'Food Shops'],
  ['electrical-repair', 'Electrical Repair'],
  ['plumbing', 'Plumbing'],
  ['grocery-products', 'Grocery Products'],
  ['other-services', 'Other Services']
]);

const app = express();
const port = Number(process.env.PORT || 4000);

// Structured Request Correlation & Observability Middleware
app.use((req, res, next) => {
  const suppliedRequestId = typeof req.headers['x-request-id'] === 'string' ? req.headers['x-request-id'].trim() : '';
  req.id = /^[a-zA-Z0-9._-]{8,80}$/.test(suppliedRequestId) ? suppliedRequestId : crypto.randomUUID();
  res.setHeader('x-request-id', req.id);
  const startTime = Date.now();
  res.on('finish', () => {
    const durationMs = Date.now() - startTime;
    if (process.env.NODE_ENV !== 'test') {
      console.log(JSON.stringify({
        level: 'info',
        time: new Date().toISOString(),
        reqId: req.id,
        method: req.method,
        path: req.path,
        statusCode: res.statusCode,
        durationMs
      }));
    }
  });
  next();
});

const developmentOrigins = process.env.NODE_ENV === 'production' ? [] : [
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:5174',
  'http://127.0.0.1:5174'
];
const allowedOrigins = [
  ...developmentOrigins,
  ...(process.env.CLIENT_ORIGIN || '').split(',').map(value => value.trim()).filter(Boolean)
];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
    if (process.env.NODE_ENV !== 'production' && /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) {
      return callback(null, true);
    }
    return callback(new Error('Origin is not allowed by the ARY Services CORS policy.'));
  },
  credentials: true
}));
app.use(express.json({ limit: '1mb' }));

// Path normalizer: ensures Express routes with /api prefix match even if Vercel Services rewrite strips /api
app.use((req, _res, next) => {
  if (req.url && !req.url.startsWith('/api') && !req.url.startsWith('/healthz')) {
    req.url = '/api' + (req.url.startsWith('/') ? req.url : '/' + req.url);
  }
  next();
});

// Rate limiters for authentication endpoints to prevent brute-force attacks
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per 15 minutes
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many authentication attempts. Please try again after 15 minutes.' }
});

const otpLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 30, // Limit each IP to 30 OTP requests per 10 minutes
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many OTP requests from this network. Please try again later.' }
});

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET || Buffer.byteLength(JWT_SECRET) < 32) {
  throw new Error('JWT_SECRET must be configured with at least 32 characters.');
}

let pool;
if (process.env.NODE_ENV === 'production' && !process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is required in production; file storage is not durable.');
}

if (process.env.DATABASE_URL) {
  pool = new pg.Pool({
    connectionString: process.env.DATABASE_URL,
    max: Number(process.env.PG_POOL_MAX || 10),
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 10_000,
    ...(process.env.PGSSL === 'true' ? { ssl: { rejectUnauthorized: true } } : {})
  });
  setActivePostgresPool(pool);
  // Schema must exist before storage initialization performs any database reads.
  await initPostgresTables(pool);
}

// Token generation & verification using native Node.js crypto (HS256)
function generateToken(payload) {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const body = Buffer.from(JSON.stringify({ ...payload, exp: payload.exp || Date.now() + 90 * 24 * 60 * 60 * 1000 })).toString('base64url');
  const signature = crypto.createHmac('sha256', JWT_SECRET).update(`${header}.${body}`).digest('base64url');
  return `${header}.${body}.${signature}`;
}

function verifyToken(token) {
  if (!token || typeof token !== 'string') return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const [header, body, signature] = parts;
  const expectedSig = crypto.createHmac('sha256', JWT_SECRET).update(`${header}.${body}`).digest();
  let suppliedSig;
  try { suppliedSig = Buffer.from(signature, 'base64url'); } catch { return null; }
  if (suppliedSig.length !== expectedSig.length || !crypto.timingSafeEqual(suppliedSig, expectedSig)) return null;
  try {
    const decodedHeader = JSON.parse(Buffer.from(header, 'base64url').toString('utf-8'));
    if (decodedHeader.alg !== 'HS256' || decodedHeader.typ !== 'JWT') return null;
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf-8'));
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return null;
    if (!Number.isFinite(payload.exp) || payload.exp <= Date.now()) return null;
    const isRegistrationToken = payload.purpose === 'customer_registration';
    if (isRegistrationToken) {
      if (typeof payload.phone !== 'string' || !payload.phone.trim()) return null;
    } else if (typeof payload.id !== 'string' || !payload.id.trim()) {
      return null;
    }
    return payload;
  } catch {
    return null;
  }
}

// Authentication Middlewares with Real-Time Session Status Enforcement
async function requireAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Authentication required. Please sign in.' });
    }
    const token = authHeader.slice(7);
    const decoded = verifyToken(token);
    if (!decoded) {
      return res.status(401).json({ error: 'Invalid or expired session. Please sign in again.' });
    }

    // Real-time account active check (instant revocation on admin reject/suspend)
    const users = await getUsers();
    // The immutable account ID is the only identity key accepted from a signed token.
    // Falling back to phone/email can silently attach an old session to a different
    // account after a contact detail is changed or recycled.
    const liveUser = findLiveUserForToken(users, decoded);

    if (!liveUser) {
      return res.status(401).json({ error: 'User account no longer exists.' });
    }

    if (liveUser.status === 'rejected' || liveUser.status === 'suspended') {
      return res.status(403).json({ error: 'This account has been deactivated or rejected by the administration.' });
    }

    const availableRoles = [...new Set([...(liveUser.accountType === 'admin' ? [] : ['customer']), ...(Array.isArray(liveUser.roles) ? liveUser.roles : []), liveUser.accountType].filter(Boolean))];
    const activeRole = decoded.accountType || liveUser.accountType;
    if (!availableRoles.includes(activeRole)) {
      return res.status(403).json({ error: 'This role is not approved for your account.' });
    }

    req.user = {
      ...decoded,
      id: liveUser.id,
      phone: liveUser.phone || decoded.phone,
      email: liveUser.email || decoded.email,
      status: liveUser.status,
      accountType: decoded.accountType || liveUser.accountType,
      roles: [...new Set([...(liveUser.accountType === 'admin' ? [] : ['customer']), ...(Array.isArray(liveUser.roles) ? liveUser.roles : []), liveUser.accountType].filter(Boolean))],
      category: liveUser.category || null,
      categoryName: liveUser.categoryName || null,
      providerStatus: liveUser.providerStatus || null,
      approvedServices: Array.isArray(liveUser.approvedServices) ? liveUser.approvedServices : [],
      serviceRequests: Array.isArray(liveUser.serviceRequests) ? liveUser.serviceRequests : [],
      fullName: liveUser.fullName || decoded.fullName
    };
    next();
  } catch (err) {
    console.error('requireAuth error:', err);
    res.status(500).json({ error: 'Authentication check failed.' });
  }
}

async function requireAdmin(req, res, next) {
  await requireAuth(req, res, () => {
    if (req.user.accountType !== 'admin') {
      return res.status(403).json({ error: 'Access denied. Super Admin privileges required.' });
    }
    next();
  });
}

async function publishEvent(eventType, payload = {}) {
  broadcastEvent(eventType, payload);
  persistEventNotifications(eventType, payload).catch(error => {
    console.error('Notification persistence failed:', error);
  });
}

app.get('/api/notifications', requireAuth, async (req, res) => {
  try {
    const notifications = await listNotifications(req.user, req.query.limit);
    return res.json({ notifications, unreadCount: notifications.filter(item => !item.readAt).length });
  } catch {
    return res.status(500).json({ error: 'Could not load notifications.' });
  }
});

app.patch('/api/notifications/read-all', requireAuth, async (req, res) => {
  try { return res.json(await markAllNotificationsRead(req.user)); }
  catch { return res.status(500).json({ error: 'Could not update notifications.' }); }
});

app.patch('/api/notifications/:id/read', requireAuth, async (req, res) => {
  try {
    const notification = await markNotificationRead(req.user, req.params.id);
    if (!notification) return res.status(404).json({ error: 'Notification not found.' });
    return res.json({ notification });
  } catch {
    return res.status(500).json({ error: 'Could not update notification.' });
  }
});

registerDriverServiceRoutes(app, { requireAuth, requireAdmin, broadcastEvent: publishEvent, getBookings, getUsers });
registerRoleAccessRoutes(app, { requireAuth, requireAdmin, getUsers, updateUser, generateToken, broadcastEvent: publishEvent });
registerGroceryRoutes(app, { requireAuth, broadcastEvent: publishEvent, getUsers, createGroceryOrderDeliveryJob, cancelGroceryOrderDeliveryJob });

// Initialize atomic file storage on boot
await initStorage();

// Real-time Server-Sent Events (SSE) Dispatch Hub
app.post('/api/events-ticket', requireAuth, (req, res) => {
  const ticket = generateToken({ id: req.user.id, accountType: req.user.accountType, purpose: 'sse', exp: Date.now() + 5 * 60 * 1000 });
  res.setHeader('Cache-Control', 'no-store');
  return res.json({ ticket, expiresInSeconds: 300 });
});

app.get('/api/events', (req, res) => {
  const identity = verifyToken(String(req.query.ticket || ''));
  if (!identity || identity.purpose !== 'sse') return res.status(401).end();
  subscribeToEvents(req, res, { id: identity.id, role: identity.accountType, exp: identity.exp });
});

// Comprehensive Health & Kubernetes Readiness Probes
app.get('/api/health', async (_req, res) => {
  let database = 'not-configured';
  if (pool) {
    try {
      await pool.query('SELECT 1');
      database = 'connected';
    } catch {
      database = 'unavailable';
    }
  }
  res.json({
    status: 'ok',
    app: 'ARY Services API',
    database,
    storage: 'async-atomic-file-mutex',
    authSecurity: 'JWT-HS256',
    ledgerEngine: 'double-entry-journal'
  });
});

app.get('/api/healthz/liveness', (_req, res) => {
  res.json({ status: 'ok', uptime: process.uptime(), timestamp: Date.now() });
});

app.get('/api/healthz/readiness', async (_req, res) => {
  try {
    if (pool) await pool.query('SELECT 1');
    await initStorage();
    res.json({
      status: 'ready',
      storage: pool ? 'postgresql' : 'local-file-fallback',
      database: pool ? 'connected' : 'not-configured'
    });
  } catch {
    res.status(503).json({ status: 'not_ready', error: 'Storage health check failed.' });
  }
});

// Anti-Fraud Shield: Issue proof-of-work challenge token
app.get('/api/auth/shield/challenge', (_req, res) => {
  res.json(issueSecurityChallenge());
});

// OTP Auth: Send 6-digit OTP code to phone (protected by anti-fraud shield)
app.post('/api/auth/otp/send', otpLimiter, async (req, res) => {
  try {
    const { phone, shieldToken } = req.body;
    if (!phone) {
      return res.status(400).json({ error: 'Mobile phone number is required.' });
    }

    // Every OTP request must present a valid, single-use anti-abuse challenge.
    if (!shieldToken || !verifySecurityChallenge(shieldToken)) {
      return res.status(400).json({ error: 'Security verification failed. Please refresh the verification challenge and try again.' });
    }

    const result = await sendOtp(phone);
    if (!result.success) {
      return res.status(result.unavailable ? 503 : 429).json({ error: result.error, waitSeconds: result.waitSeconds });
    }

    res.json({
      status: 'ok',
      message: result.message,
      phone: result.phone,
      expiresInSeconds: result.expiresInSeconds,
      devCode: result.devCode
    });
  } catch (err) {
    console.error('Send OTP error:', err);
    res.status(500).json({ error: 'Could not send verification code. Please try again.' });
  }
});

// OTP Auth: Verify code and login / auto-register customer
app.post('/api/auth/otp/verify', authLimiter, async (req, res) => {
  try {
    const { phone, otp, registrationToken, fullName, location } = req.body;

    let cleanPhone = null;

    if (registrationToken) {
      const decoded = verifyToken(registrationToken);
      if (!decoded || decoded.purpose !== 'customer_registration' || !decoded.phone) {
        return res.status(400).json({ error: 'Registration session expired or invalid. Please request a new verification code.' });
      }
      cleanPhone = decoded.phone;
    } else {
      if (!phone || !otp) {
        return res.status(400).json({ error: 'Mobile phone number and 6-digit verification code are required.' });
      }

      const verification = await verifyOtp(phone, otp);
      if (!verification.valid) {
        return res.status(verification.unavailable ? 503 : 400).json({ error: verification.error });
      }

      cleanPhone = verification.phone;
    }

    const users = await getUsers();
    const existingUser = users.find(
      u => u.phone && normalizePhone(u.phone) === cleanPhone
    );

    if (existingUser) {
      if (existingUser.status === 'pending') {
        return res.status(403).json({
          error: existingUser.accountType === 'driver' ? 'Your Driver account is pending Admin approval. You will receive access once approved by the Super Admin.' : 'Your service provider account is pending Admin approval. You will receive access once approved by the Super Admin.',
          accountStatus: 'pending'
        });
      }
      if (existingUser.status === 'rejected' || existingUser.status === 'suspended') {
        return res.status(403).json({
          error: 'This account has been rejected or placed on the block list by administration.',
          accountStatus: 'rejected'
        });
      }

      const token = generateToken({
        id: existingUser.id,
        fullName: existingUser.fullName,
        phone: existingUser.phone,
        email: existingUser.email,
        accountType: existingUser.accountType
      });

      return res.json({
        status: 'ok',
        message: 'Phone verified successfully.',
        token,
        isNewUser: false,
        user: {
          id: existingUser.id,
          fullName: existingUser.fullName,
          phone: existingUser.phone,
          email: existingUser.email,
          location: existingUser.location || '',
          accountType: existingUser.accountType,
          roles: [...new Set([...(existingUser.accountType === 'admin' ? [] : ['customer']), ...(Array.isArray(existingUser.roles) ? existingUser.roles : []), existingUser.accountType].filter(Boolean))],
          roleApplications: existingUser.roleApplications || {},
          driverServices: existingUser.driverServices || [],
          status: existingUser.status,
          category: existingUser.category || null,
          categoryName: existingUser.categoryName || null,
          baseCharge: existingUser.baseCharge || null,
          token
        }
      });
    }

    // If customer is not yet registered:
    if (!fullName || !fullName.trim()) {
      const regToken = generateToken({
        phone: cleanPhone,
        purpose: 'customer_registration',
        exp: Date.now() + 5 * 60 * 1000
      });
      return res.json({
        status: 'ok',
        verified: true,
        needsRegistration: true,
        phone: cleanPhone,
        registrationToken: regToken,
        message: 'Phone verified. Please provide your full name to complete registration.'
      });
    }

    // Auto-create customer account
    const newCustomer = {
      id: 'user-' + Date.now(),
      fullName: fullName.trim(),
      phone: phone ? phone.trim() : cleanPhone,
      email: null,
      location: (location || 'Colombo').trim(),
      passwordHash: hashPassword(crypto.randomBytes(16).toString('hex')),
      accountType: 'customer',
      status: 'active',
      category: null,
      categoryName: null,
      baseCharge: null,
      rating: null,
      reviewCount: null,
      experienceYears: null,
      createdAt: new Date().toISOString()
    };

    await addUser(newCustomer);

    const token = generateToken({
      id: newCustomer.id,
      fullName: newCustomer.fullName,
      phone: newCustomer.phone,
      email: newCustomer.email,
      accountType: newCustomer.accountType
    });

    return res.json({
      status: 'ok',
      message: 'Account created and verified successfully.',
      token,
      isNewUser: true,
      user: {
        id: newCustomer.id,
        fullName: newCustomer.fullName,
        phone: newCustomer.phone,
        email: newCustomer.email,
        location: newCustomer.location,
        accountType: newCustomer.accountType,
        status: newCustomer.status,
        token
      }
    });
  } catch (err) {
    console.error('Verify OTP error:', err);
    res.status(500).json({ error: 'Verification failed. Please try again.' });
  }
});

// Authentication: Register
app.post('/api/auth/register', authLimiter, async (req, res) => {
  try {
    const {
      fullName,
      phone,
      email,
      password,
      accountType = 'customer',
      location = '',
      category = 'other-services',
      categoryName = 'General Services',
      baseCharge = 'LKR 1,500',
      nicNumber,
      nsnNumber,
      operatingMode,
      nicDocument,
      tradeCertificate,
      driverServices = []
    } = req.body;

    if (String(accountType).toLowerCase() === 'admin') {
      return res.status(403).json({ error: 'Admin accounts can only be provisioned by an existing authorized administrator.' });
    }
    const role = ['customer', 'provider', 'driver'].includes(accountType) ? accountType : 'customer';
    const cleanEmail = email ? email.trim().toLowerCase() : null;
    const cleanPhone = phone ? phone.trim() : (cleanEmail ? cleanEmail.split('@')[0] : '');
    const cleanLocation = (location || '').trim();
    const effectivePassword = password || (role === 'customer' ? crypto.randomBytes(32).toString('hex') : null);

    if (!fullName || (role === 'customer' && !cleanPhone) || !effectivePassword) {
      return res.status(400).json({
        error: role === 'customer'
          ? 'Name and mobile number are required.'
          : 'Full name, email/phone and password are required.'
      });
    }

    // Provider onboarding must capture the business operating model and NSN
    // before the application can enter the Admin approval queue.
    const cleanNsn = role === 'provider' ? String(nsnNumber || '').trim() : null;
    const cleanOperatingMode = role === 'provider' ? String(operatingMode || '').trim() : null;
    if (role === 'provider' && (!cleanNsn || cleanNsn.length > 40 || !['shop', 'online', 'mobile'].includes(cleanOperatingMode))) {
      return res.status(400).json({ error: 'Provider registration requires an NSN number and a valid operating mode (shop, online or mobile).' });
    }
    if (['provider', 'driver'].includes(role) && !String(nicNumber || '').trim()) {
      return res.status(400).json({ error: 'A National Identity Card number is required for Provider and Driver registration.' });
    }

    // Sri Lankan NIC verification for service providers
    let cleanNic = null;
    if (['provider', 'driver'].includes(role) && nicNumber) {
      const trimmedNic = String(nicNumber).trim().toUpperCase();
      const isValidNic = /^([0-9]{9}[VX]|[0-9]{12})$/.test(trimmedNic);
      if (!isValidNic) {
        return res.status(400).json({ error: 'Invalid Sri Lankan NIC number format. Must be 9 digits followed by V/X or 12 digits.' });
      }
      cleanNic = trimmedNic;
    }

    const cleanPhoneDigits = normalizePhone(cleanPhone);
    const users = await getUsers();

    if (cleanPhoneDigits) {
      const existingPhoneUser = users.find(
        u => u.phone && normalizePhone(u.phone) === cleanPhoneDigits
      );
      if (existingPhoneUser) {
        return res.status(409).json({
          error: 'This mobile number is already registered. Only 1 account is allowed per phone number.'
        });
      }
    }

    if (cleanEmail) {
      const existingEmailUser = users.find(
        u => u.email && u.email.toLowerCase() === cleanEmail
      );
      if (existingEmailUser) {
        return res.status(409).json({
          error: 'An account with this email address already exists.'
        });
      }
    }

    const selectedDriverServices = role === 'driver' && Array.isArray(driverServices) ? [...new Set(driverServices.filter(type => ['food_delivery', 'ride'].includes(type)))] : [];
    if (role === 'driver' && selectedDriverServices.length === 0) return res.status(400).json({ error: 'Select Ride Service, Food Delivery Service, or both.' });

    // Provider and driver accounts require Admin approval before activation
    const initialStatus = role === 'provider' ? 'pending' : 'active';

    const newUser = {
      id: 'user-' + Date.now(),
      fullName: fullName.trim(),
      phone: cleanPhone,
      email: cleanEmail,
      location: cleanLocation || 'Colombo',
      passwordHash: hashPassword(effectivePassword),
      accountType: role,
      status: initialStatus,
      driverServices: selectedDriverServices,
      category: role === 'provider' ? category : null,
      categoryName: role === 'provider' ? categoryName : null,
      baseCharge: role === 'provider' ? baseCharge : null,
      rating: role === 'provider' ? 4.9 : null,
      reviewCount: role === 'provider' ? 0 : null,
      experienceYears: role === 'provider' ? 3 : null,
      nicNumber: cleanNic,
      nsnNumber: cleanNsn,
      operatingMode: cleanOperatingMode,
      nicDocument: nicDocument || null,
      tradeCertificate: tradeCertificate || null,
      kycStatus: ['provider', 'driver'].includes(role) ? (cleanNic ? 'pending' : 'unverified') : 'verified',
      createdAt: new Date().toISOString()
    };

    await addUser(newUser);

    publishEvent('user:registered', {
      user: {
        id: newUser.id,
        fullName: newUser.fullName,
        accountType: newUser.accountType,
        roles: [...new Set([...(newUser.accountType === 'admin' ? [] : ['customer']), newUser.accountType])],
        roleApplications: {},
        status: newUser.status,
        nicNumber: cleanNic
      }
    });

    const token = generateToken({
      id: newUser.id,
      fullName: newUser.fullName,
      phone: newUser.phone,
      email: newUser.email,
      accountType: newUser.accountType
    });

    return res.json({
      status: 'ok',
      token,
      message: role === 'provider'
        ? 'Provider application submitted! Admin approval is required before your account becomes active.'
        : role === 'driver'
          ? 'Driver account created. Submit your selected driver services for Admin approval before accepting jobs.'
          : 'Account created successfully.',
      user: {
        id: newUser.id,
        fullName: newUser.fullName,
        phone: newUser.phone,
        email: newUser.email,
        location: newUser.location,
        accountType: newUser.accountType,
        roles: [newUser.accountType],
        roleApplications: {},
        status: newUser.status,
        category: newUser.category,
        driverServices: newUser.driverServices || [],
        categoryName: newUser.categoryName,
        baseCharge: newUser.baseCharge,
        token
      }
    });
  } catch (err) {
    console.error('Registration error:', err);
    res.status(500).json({ error: 'Registration failed. Please try again.' });
  }
});

// Authentication: Login
app.post('/api/auth/login', authLimiter, async (req, res) => {
  try {
    const { identifier, password } = req.body;

    if (!identifier) {
      return res.status(400).json({ error: 'Mobile number or email is required.' });
    }

    const cleanIdent = identifier.trim().toLowerCase();
    const cleanIdentDigits = normalizePhone(cleanIdent);

    const users = await getUsers();
    const user = users.find(
      u => (u.email && u.email.toLowerCase() === cleanIdent) || 
           (u.phone && normalizePhone(u.phone) === cleanIdentDigits)
    );

    if (user) {
      const isValid = Boolean(password && verifyPassword(password, user.passwordHash));

      if (isValid) {
        if (user.status === 'pending') {
          return res.status(403).json({
            error: 'Your service provider account is pending Admin approval. You will receive access once approved by the Super Admin.',
            accountStatus: 'pending'
          });
        }
        if (user.status === 'rejected' || user.status === 'suspended') {
          return res.status(403).json({
            error: 'This account has been rejected or placed on the block list by administration.',
            accountStatus: 'rejected'
          });
        }

        const token = generateToken({
          id: user.id,
          fullName: user.fullName,
          phone: user.phone,
          email: user.email,
          accountType: user.accountType
        });

        return res.json({
          status: 'ok',
          message: 'Login successful.',
          token,
          user: {
            id: user.id,
            fullName: user.fullName,
            phone: user.phone,
            email: user.email,
            location: user.location || '',
            accountType: user.accountType,
            roles: [...new Set([...(user.accountType === 'admin' ? [] : ['customer']), ...(Array.isArray(user.roles) ? user.roles : []), user.accountType].filter(Boolean))],
            roleApplications: user.roleApplications || {},
            driverServices: user.driverServices || [],
            status: user.status,
            category: user.category || null,
            driverServices: user.driverServices || [],
            categoryName: user.categoryName || null,
            baseCharge: user.baseCharge || null,
            token
          }
        });
      }
    }

    return res.status(401).json({ error: 'Invalid mobile number, email or password. Please check your credentials.' });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Login failed. Please try again.' });
  }
});

// Service categories endpoint
app.get('/api/service-categories', async (_req, res) => {
  res.json({
    items: [
      { id: 1, name: 'Food Shops', slug: 'food-shops', description: 'Fresh groceries, baked goods and snacks', icon: 'UtensilsCrossed', color: 'peach' },
      { id: 2, name: 'Electrical Repair', slug: 'electrical-repair', description: 'Fast diagnostics for lights, wiring and appliances', icon: 'Zap', color: 'yellow' },
      { id: 3, name: 'Plumbing', slug: 'plumbing', description: 'Repairs, fittings and leak maintenance', icon: 'Wrench', color: 'blue' },
      { id: 4, name: 'Other Services', slug: 'other-services', description: 'Carpentry, painting, AC and house help', icon: 'Sparkles', color: 'lilac' },
      { id: 5, name: 'Grocery Products', slug: 'grocery-products', description: 'Everyday grocery items and household essentials', icon: 'ShoppingBasket', color: 'green' }
    ],
    source: 'active'
  });
});

// Public / Customer: Get active verified service providers by category / location with Haversine Distance Sorting & Geofencing
app.get('/api/providers', async (req, res) => {
  try {
    const { category, query, location, lat, lng, radiusKm } = req.query;
    const users = await getUsers();

    let providers = users.filter(u => (u.accountType === 'provider' || (Array.isArray(u.roles) && u.roles.includes('provider'))) && (u.accountType === 'provider' ? u.status === 'active' : u.providerStatus === 'active'));

    if (category && category !== 'all') {
      providers = providers.filter(p => p.category === category || (p.categoryName && p.categoryName.toLowerCase().includes(category.toLowerCase())) || (Array.isArray(p.approvedServices) && p.approvedServices.some(service => service.categorySlug === category)));
    }

    if (query) {
      const q = query.toLowerCase();
      providers = providers.filter(p =>
        (p.fullName && p.fullName.toLowerCase().includes(q)) ||
        (p.location && p.location.toLowerCase().includes(q)) ||
        (p.categoryName && p.categoryName.toLowerCase().includes(q)) ||
        (Array.isArray(p.approvedServices) && p.approvedServices.some(service => (service.serviceName || '').toLowerCase().includes(q) || (service.description || '').toLowerCase().includes(q)))
      );
    }

    if (location) {
      const loc = location.toLowerCase();
      providers = providers.filter(p => p.location && p.location.toLowerCase().includes(loc));
    }

    const customerLat = lat ? Number(lat) : null;
    const customerLng = lng ? Number(lng) : null;

    const sanitized = providers.map(p => {
      let pLat = p.lat;
      let pLng = p.lng;
      if (!pLat || !pLng) {
        const resolved = resolveCoordinatesFromLocation(p.location);
        pLat = resolved.lat;
        pLng = resolved.lng;
      }

      let distanceKm = null;
      let etaMinutes = null;
      if (customerLat !== null && customerLng !== null && !isNaN(customerLat) && !isNaN(customerLng)) {
        distanceKm = calculateDistanceKm(customerLat, customerLng, pLat, pLng);
        etaMinutes = estimateEtaMinutes(distanceKm);
      }

      return {
        id: p.id,
        fullName: p.fullName,
        phone: p.phone,
        location: p.location || 'Local Area',
        lat: pLat,
        lng: pLng,
        distanceKm,
        etaMinutes,
        category: p.category || 'general',
        categoryName: p.categoryName || 'General Services',
        approvedServices: (Array.isArray(p.approvedServices) ? p.approvedServices : []).map(service => ({ categorySlug: service.categorySlug, categoryName: service.categoryName, serviceName: service.serviceName, description: service.description, baseCharge: service.baseCharge })),
        baseCharge: p.baseCharge || 'LKR 1,500',
        rating: p.rating !== undefined ? Number(p.rating) : 5.0,
        reviewCount: p.reviewCount !== undefined ? Number(p.reviewCount) : 0,
        experienceYears: p.experienceYears !== undefined ? Number(p.experienceYears) : 3
      };
    });

    // If customer coordinates provided, sort closest distance first and apply geofence radius
    let result = sanitized;
    if (customerLat !== null && customerLng !== null && !isNaN(customerLat) && !isNaN(customerLng)) {
      result.sort((a, b) => (a.distanceKm ?? 999) - (b.distanceKm ?? 999));
      if (radiusKm && radiusKm !== 'all') {
        const maxRadius = Number(radiusKm) || 25;
        result = result.filter(p => p.distanceKm !== null && p.distanceKm <= maxRadius);
      }
    }

    res.json({
      status: 'ok',
      total: result.length,
      providers: result
    });
  } catch (err) {
    console.error('Fetch providers error:', err);
    res.status(500).json({ error: 'Could not load service providers.' });
  }
});

// Provider: Update own business profile
app.patch('/api/providers/profile', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    if (req.user.accountType !== 'provider' || (req.user.status !== 'active' && req.user.providerStatus !== 'active')) {
      return res.status(403).json({ error: 'An active provider account is required.' });
    }
    const { baseCharge, location, experienceYears } = req.body || {};
    const cleanLocation = location === undefined ? undefined : String(location).trim().slice(0, 500);
    const years = experienceYears === undefined ? undefined : Number(experienceYears);
    const chargeText = baseCharge === undefined ? undefined : String(baseCharge).replace(/[^0-9.]/g, '');
    const charge = chargeText === undefined ? undefined : Number(chargeText);
    if (years !== undefined && (!Number.isInteger(years) || years < 0 || years > 60)) {
      return res.status(400).json({ error: 'Experience years must be a whole number between 0 and 60.' });
    }
    if (charge !== undefined && (!Number.isFinite(charge) || charge < 0 || charge > 10000000)) {
      return res.status(400).json({ error: 'Enter a valid service base charge.' });
    }
    const updated = await updateUser(userId, provider => {
      if (!provider || (provider.accountType !== 'provider' && !provider.roles?.includes('provider'))) return provider;
      if (baseCharge !== undefined) provider.baseCharge = 'LKR ' + charge.toLocaleString('en-LK');
      if (cleanLocation !== undefined) provider.location = cleanLocation;
      if (years !== undefined) provider.experienceYears = years;
      return provider;
    });

    if (!updated || (updated.accountType !== 'provider' && !updated.roles?.includes('provider'))) {
      return res.status(404).json({ error: 'Provider account not found.' });
    }

    res.json({
      status: 'ok',
      message: 'Provider profile updated successfully.',
      provider: {
        id: updated.id,
        fullName: updated.fullName,
        category: updated.category,
        categoryName: updated.categoryName,
        baseCharge: updated.baseCharge,
        location: updated.location
      }
    });
  } catch (err) {
    console.error('Update profile error:', err);
    res.status(500).json({ error: 'Could not update profile.' });
  }
});

// Provider requests approval before listing an additional service category.
app.post('/api/providers/services', requireAuth, async (req, res) => {
  try {
    if (req.user.accountType !== 'provider' || req.user.status !== 'active') return res.status(403).json({ error: 'An active provider account is required.' });
    const categorySlug = String(req.body?.categorySlug || '');
    const serviceName = String(req.body?.serviceName || '').trim().slice(0, 120);
    const description = String(req.body?.description || '').trim().slice(0, 1000);
    const amount = Number(req.body?.baseCharge);
    if (!PROVIDER_SERVICE_CATEGORIES.has(categorySlug) || !serviceName || serviceName.length < 2 || description.length < 10 ||
      !Number.isSafeInteger(amount) || amount < 1 || amount > 10000000) {
      return res.status(400).json({ error: 'Choose a valid category and provide a service name, at least 10 characters of description and a whole-number LKR price.' });
    }
    if (categorySlug === req.user.category) return res.status(409).json({ error: 'This is already your primary provider category.' });
    const requestId = crypto.randomUUID();
    const updated = await updateUser(req.user.id, user => {
      user.serviceRequests = Array.isArray(user.serviceRequests) ? user.serviceRequests : [];
      const duplicate = user.serviceRequests.some(item => item.categorySlug === categorySlug && item.serviceName.toLowerCase() === serviceName.toLowerCase() && ['pending', 'approved'].includes(item.status));
      if (duplicate) return user;
      user.serviceRequests.unshift({
        id: requestId, categorySlug, categoryName: PROVIDER_SERVICE_CATEGORIES.get(categorySlug),
        serviceName, description, baseCharge: amount, status: 'pending',
        requestedAt: new Date().toISOString()
      });
      return user;
    });
    const request = (updated?.serviceRequests || []).find(item => item.id === requestId);
    if (!request) return res.status(409).json({ error: 'A matching service request is already pending or approved.' });
    publishEvent('provider:service_request_created', { providerId: req.user.id, requestId: request.id });
    return res.status(201).json({ request, message: 'Additional service request sent to Admin for approval.' });
  } catch (error) {
    console.error('Provider service request error:', error);
    return res.status(500).json({ error: 'Could not submit additional service request.' });
  }
});

app.get('/api/providers/services/mine', requireAuth, async (req, res) => {
  if (req.user.accountType !== 'provider') return res.status(403).json({ error: 'Provider account required.' });
  const users = await getUsers();
  const provider = users.find(user => user.id === req.user.id);
  if (!provider) return res.status(404).json({ error: 'Provider account not found.' });
  return res.json({
    primaryCategory: { categorySlug: provider.category, categoryName: provider.categoryName },
    approvedServices: Array.isArray(provider.approvedServices) ? provider.approvedServices : [],
    requests: Array.isArray(provider.serviceRequests) ? provider.serviceRequests : []
  });
});

app.get('/api/admin/provider-service-requests', requireAdmin, async (_req, res) => {
  const users = await getUsers();
  const requests = users.flatMap(user => (Array.isArray(user.serviceRequests) ? user.serviceRequests : [])
    .filter(request => request.status === 'pending')
    .map(request => ({ ...request, providerId: user.id, providerName: user.fullName, providerLocation: user.location })));
  return res.json({ requests });
});

app.patch('/api/admin/provider-service-requests/:userId/:requestId', requireAdmin, async (req, res) => {
  const decision = String(req.body?.status || '');
  if (!['approved', 'rejected'].includes(decision)) return res.status(400).json({ error: 'Choose approved or rejected.' });
  const users = await getUsers();
  const target = users.find(user => user.id === req.params.userId);
  const request = target?.serviceRequests?.find(item => item.id === req.params.requestId);
  if (!target || !request || request.status !== 'pending') return res.status(404).json({ error: 'Pending service request not found.' });
  const updated = await updateUser(target.id, user => {
    const current = (user.serviceRequests || []).find(item => item.id === req.params.requestId);
    if (!current || current.status !== 'pending') return user;
    current.status = decision;
    current.reviewedAt = new Date().toISOString();
    current.reviewedBy = req.user.id;
    if (decision === 'approved') {
      user.approvedServices = Array.isArray(user.approvedServices) ? user.approvedServices : [];
      const exists = user.approvedServices.some(item => item.categorySlug === current.categorySlug && item.serviceName.toLowerCase() === current.serviceName.toLowerCase());
      if (!exists) user.approvedServices.push({
        id: current.id, categorySlug: current.categorySlug, categoryName: current.categoryName,
        serviceName: current.serviceName, description: current.description, baseCharge: current.baseCharge,
        approvedAt: current.reviewedAt
      });
    }
    return user;
  });
  const reviewed = updated?.serviceRequests?.find(item => item.id === req.params.requestId);
  publishEvent('provider:service_request_reviewed', { providerId: target.id, status: decision, requestId: req.params.requestId });
  return res.json({ request: reviewed, approvedServices: updated?.approvedServices || [] });
});

// Bookings: List bookings for current user (Customer, Provider, or Admin)
app.get('/api/bookings', requireAuth, async (req, res) => {
  try {
    const { id: userId, accountType } = req.user;
    const allBookings = await getBookings();

    let userBookings = [];
    if (accountType === 'admin') {
      userBookings = allBookings;
    } else if (accountType === 'provider') {
      // Only immutable account IDs grant access to assigned or broadcast jobs.
      const approvedCategories = new Set([req.user.category, ...(Array.isArray(req.user.approvedServices) ? req.user.approvedServices.map(service => service.categorySlug) : [])]);
      userBookings = allBookings.filter(b =>
        b.providerId === userId ||
        (b.status === 'broadcast_pool' && approvedCategories.has(b.categorySlug) && (!b.declinedBy || !b.declinedBy.includes(userId)))
      );
    } else {
      userBookings = allBookings.filter(b => b.customerId === userId);
    }

    // Sort newest first
    userBookings.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    // Enrich with review data if available
    const reviews = await getReviews();
    const reviewsByBooking = new Map(reviews.map(r => [r.bookingId, r]));
    const enrichedBookings = userBookings.map(b => ({
      ...b,
      review: reviewsByBooking.get(b.id) || null
    }));

    res.json({
      status: 'ok',
      total: enrichedBookings.length,
      bookings: enrichedBookings
    });
  } catch (err) {
    console.error('Fetch bookings error:', err);
    res.status(500).json({ error: 'Could not load bookings.' });
  }
});

// Bookings: Customer creates a new booking
app.post('/api/bookings', requireAuth, async (req, res) => {
  try {
    const customer = req.user;
    if (customer.accountType !== 'customer') return res.status(403).json({ error: 'Customer account required to create a service booking.' });
    const {
      providerId, categorySlug, serviceAddress, bookingDate, bookingTime, problemDescription
    } = req.body || {};
    const cleanAddress = String(serviceAddress || '').trim().slice(0, 500);
    const cleanProblem = String(problemDescription || '').trim().slice(0, 2000);
    const allowedTimes = ['Morning (9 AM - 12 PM)', 'Afternoon (1 PM - 5 PM)', 'Evening (5 PM - 8 PM)', 'Emergency (ASAP)'];
    const chosenDate = String(bookingDate || new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Colombo' }).format(new Date()));
    const parsedDate = new Date(chosenDate + 'T00:00:00Z');
    const localToday = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Colombo' }).format(new Date());
    if (!providerId || !cleanAddress || cleanProblem.length < 5 ||
      !/^\d{4}-\d{2}-\d{2}$/.test(chosenDate) || Number.isNaN(parsedDate.getTime()) ||
      parsedDate.toISOString().slice(0, 10) !== chosenDate || chosenDate < localToday ||
      !allowedTimes.includes(bookingTime || 'Morning (9 AM - 12 PM)')) {
      return res.status(400).json({ error: 'Enter a valid service address, a clear description, a future booking date and an available time slot.' });
    }

    const users = await getUsers();
    const provider = users.find(u => u.id === providerId && (u.accountType === 'provider' || (Array.isArray(u.roles) && u.roles.includes('provider'))) && (u.accountType === 'provider' ? u.status === 'active' : u.providerStatus === 'active') && (u.category === categorySlug || (Array.isArray(u.approvedServices) && u.approvedServices.some(service => service.categorySlug === categorySlug))));
    if (!provider) return res.status(404).json({ error: 'Selected approved service provider was not found.' });
    const selectedService = (provider.approvedServices || []).find(service => service.categorySlug === categorySlug);
    const selectedCharge = selectedService?.baseCharge ?? provider.baseCharge ?? '1500';

    // Escrow & Financial Commission Calculations (10% platform commission, 90% provider payout)
    const rawDigits = String(selectedCharge).replace(/[^0-9]/g, '');
    const baseAmount = parseInt(rawDigits, 10) || 1500;
    const platformFee = Math.round(baseAmount * 0.10);
    const providerPayout = baseAmount - platformFee;
    const paymentMethod = req.body.paymentMethod === 'escrow_online' ? 'escrow_online' : 'cash';
    if (paymentMethod === 'escrow_online') {
      return res.status(503).json({
        error: 'Online escrow is temporarily unavailable until the ARY PayHere merchant account and verified payment callback are configured. Please choose Direct Cash.'
      });
    }
    const paymentStatus = 'pending_cash';

    const newBooking = {
      id: 'book-' + crypto.randomUUID(),
      customerId: customer.id,
      customerName: customer.fullName || 'Customer',
      customerPhone: customer.phone,
      providerId: provider.id,
      providerName: provider.fullName,
      providerPhone: provider.phone,
      categorySlug: categorySlug || provider.category || 'general',
      categoryName: selectedService?.categoryName || (provider.category === categorySlug ? provider.categoryName : PROVIDER_SERVICE_CATEGORIES.get(categorySlug)) || 'General Services',
      serviceName: selectedService?.serviceName || provider.categoryName || 'General Service',
      serviceAddress: cleanAddress,
      bookingDate: chosenDate,
      bookingTime: bookingTime || 'Morning (9 AM - 12 PM)',
      problemDescription: cleanProblem,
      baseCharge: 'LKR ' + baseAmount.toLocaleString('en-LK'),
      baseAmount,
      platformFee,
      providerPayout,
      paymentMethod,
      paymentStatus,
      workmanshipGuarantee: true,
      status: 'requested', // 'requested' | 'accepted' | 'in_progress' | 'completed' | 'cancelled' | 'rejected'
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    await addBooking(newBooking);

    // Escrow ledger entries are written only after a verified payment-provider callback.

    // Instant Real-Time SSE Dispatch to Provider & Admins
    publishEvent('booking:created', {
      booking: newBooking,
      providerId: newBooking.providerId,
      providerPhone: newBooking.providerPhone,
      customerId: newBooking.customerId
    });

    res.json({
      status: 'ok',
      message: 'Booking request sent successfully! The service provider will review and contact you.',
      booking: newBooking
    });
  } catch (err) {
    console.error('Create booking error:', err);
    res.status(500).json({ error: 'Could not create booking.' });
  }
});

// Bookings: Update booking status (Accept / Reject / Complete / Cancel)
app.patch('/api/bookings/:id/status', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body; // 'accepted' | 'rejected' | 'in_progress' | 'completed' | 'cancelled'
    const { id: userId, accountType } = req.user;

    const validStatuses = ['accepted', 'rejected', 'in_progress', 'completed'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid booking status.' });
    }

    const bookings = await getBookings();
    const booking = bookings.find(b => b.id === id);

    if (!booking) {
      return res.status(404).json({ error: 'Booking not found.' });
    }

    // Role-based authorization for booking changes
    const isProviderMatch = booking.providerId === userId;
    if (accountType !== 'admin' && (accountType !== 'provider' || !isProviderMatch)) {
      return res.status(403).json({ error: 'Only the assigned provider or Admin can update service booking progress.' });
    }
    const allowedTransitions = {
      requested: ['accepted', 'rejected'],
      broadcast_pool: ['accepted', 'rejected'],
      accepted: ['in_progress', 'rejected'],
      in_progress: ['completed']
    };
    if (accountType !== 'admin' && !allowedTransitions[booking.status]?.includes(status)) {
      return res.status(409).json({ error: `Cannot move a ${booking.status} booking to ${status}.` });
    }

    const previousProviderId = booking.providerId;
    let releasedTx = null;
    const updated = await updateBooking(id, b => {
      // Cascading Dispatch: If contractor declines, cascade to broadcast pool so another contractor can claim it
      if (status === 'rejected') {
        b.status = 'broadcast_pool';
        if (b.providerId && !b.declinedBy?.includes(b.providerId)) b.declinedBy = [...(b.declinedBy || []), b.providerId];
        b.providerId = null;
        b.providerName = null;
        b.providerPhone = null;
        b.broadcastAt = new Date().toISOString();
      } else {
        b.status = status;
      }

      b.updatedAt = new Date().toISOString();
      if (status === 'completed') b.completedAt = b.updatedAt;

      // If service is marked completed and payment was held in escrow, automatically release payout
      if (status === 'completed' && b.paymentStatus === 'escrow_held') {
        b.paymentStatus = 'released_to_provider';
        releasedTx = {
          bookingId: id,
          providerId: b.providerId,
          amount: b.baseAmount || 1500,
          platformFee: b.platformFee || 150,
          providerPayout: b.providerPayout || 1350
        };
      }
      return b;
    });

    if (releasedTx) {
      await recordEscrowRelease(releasedTx);
    }

    // Real-Time SSE Dispatch
    publishEvent('booking:status_updated', {
      bookingId: id,
      status: updated.status,
      booking: updated,
      customerId: updated.customerId,
      providerId: previousProviderId
    });

    res.json({
      status: 'ok',
      message: status === 'rejected'
        ? 'Job declined and cascaded to the broadcast pool for nearby contractors.'
        : `Booking status updated to ${status}.`,
      booking: updated
    });
  } catch (err) {
    console.error('Update booking status error:', err);
    res.status(500).json({ error: 'Could not update booking status.' });
  }
});

// Provider sends a service quote; the customer explicitly accepts or declines it.
app.post('/api/bookings/:id/quote', requireAuth, async (req, res) => {
  try {
    const amount = Number(req.body?.amount);
    const description = String(req.body?.description || '').trim().slice(0, 1000);
    if (!Number.isSafeInteger(amount) || amount < 1 || amount > 10000000 || description.length < 5) {
      return res.status(400).json({ error: 'Enter a whole-number quote between LKR 1 and LKR 10,000,000 and a short description.' });
    }
    const bookings = await getBookings();
    const booking = bookings.find(item => item.id === req.params.id);
    if (!booking) return res.status(404).json({ error: 'Booking not found.' });
    if (req.user.accountType !== 'provider' || booking.providerId !== req.user.id) {
      return res.status(403).json({ error: 'Only the assigned provider can send a service quote.' });
    }
    if (!['requested', 'accepted'].includes(booking.status)) return res.status(409).json({ error: 'Quotes can only be sent for pending or accepted bookings.' });
    if (booking.quote?.status === 'accepted') return res.status(409).json({ error: 'The customer has already accepted this quote.' });
    const updated = await updateBooking(booking.id, current => {
      current.quote = {
        amount, currency: 'LKR', description, status: 'pending',
        quotedBy: req.user.id, quotedAt: new Date().toISOString(),
        validUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
      };
      current.updatedAt = new Date().toISOString();
      return current;
    });
    publishEvent('booking:quote_sent', { bookingId: booking.id, customerId: booking.customerId, providerId: booking.providerId, status: 'pending' });
    return res.json({ booking: updated, message: 'Service quote sent to the customer.' });
  } catch (error) {
    console.error('Create service quote error:', error);
    return res.status(500).json({ error: 'Could not send service quote.' });
  }
});

app.patch('/api/bookings/:id/quote', requireAuth, async (req, res) => {
  try {
    const decision = String(req.body?.decision || '');
    if (!['accept', 'reject'].includes(decision)) return res.status(400).json({ error: 'Choose accept or reject.' });
    const bookings = await getBookings();
    const booking = bookings.find(item => item.id === req.params.id);
    if (!booking) return res.status(404).json({ error: 'Booking not found.' });
    if (req.user.accountType !== 'customer' || booking.customerId !== req.user.id) {
      return res.status(403).json({ error: 'Only the booking customer can decide this quote.' });
    }
    if (!['requested', 'accepted'].includes(booking.status)) return res.status(409).json({ error: 'This booking is no longer eligible for quote acceptance.' });
    if (booking.quote?.status !== 'pending') return res.status(409).json({ error: 'There is no pending quote to decide.' });
    if (Date.parse(booking.quote.validUntil || '') <= Date.now()) return res.status(409).json({ error: 'This quote has expired. Ask the provider for a new quote.' });
    const updated = await updateBooking(booking.id, current => {
      current.quote.status = decision === 'accept' ? 'accepted' : 'rejected';
      current.quote.decidedAt = new Date().toISOString();
      current.quote.decidedBy = req.user.id;
      if (decision === 'accept') {
        current.baseAmount = current.quote.amount;
        current.baseCharge = 'LKR ' + current.quote.amount.toLocaleString('en-LK');
        current.platformFee = Math.round(current.baseAmount * 0.10);
        current.providerPayout = current.baseAmount - current.platformFee;
      }
      current.updatedAt = new Date().toISOString();
      return current;
    });
    publishEvent('booking:quote_decided', { bookingId: booking.id, customerId: booking.customerId, providerId: booking.providerId, status: updated.quote.status });
    return res.json({ booking: updated, message: decision === 'accept' ? 'Quote accepted. The agreed service amount is now recorded for cash settlement.' : 'Quote declined. You can ask the provider to revise it.' });
  } catch (error) {
    console.error('Quote decision error:', error);
    return res.status(500).json({ error: 'Could not update service quote.' });
  }
});

// Customer proposes a new booking date/time; provider or Admin confirms it.
app.post('/api/bookings/:id/reschedule', requireAuth, async (req, res) => {
  try {
    if (req.user.accountType !== 'customer') return res.status(403).json({ error: 'Customer account required.' });
    const { date, time, reason } = req.body || {};
    const allowedTimes = ['Morning (9 AM - 12 PM)', 'Afternoon (1 PM - 5 PM)', 'Evening (5 PM - 8 PM)', 'Emergency (ASAP)'];
    const parsed = new Date(String(date || '') + 'T00:00:00Z');
    const localToday = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Colombo' }).format(new Date());
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(date || '')) || Number.isNaN(parsed.getTime()) ||
      parsed.toISOString().slice(0, 10) !== date || date < localToday || !allowedTimes.includes(time)) {
      return res.status(400).json({ error: 'Choose a valid future date and an available time slot.' });
    }
    const bookings = await getBookings();
    const booking = bookings.find(item => item.id === req.params.id);
    if (!booking) return res.status(404).json({ error: 'Booking not found.' });
    if (booking.customerId !== req.user.id) return res.status(403).json({ error: 'You can only reschedule your own booking.' });
    if (!['requested', 'accepted'].includes(booking.status)) return res.status(409).json({ error: 'Only pending or accepted bookings can be rescheduled.' });
    if (booking.rescheduleRequest?.status === 'pending') return res.status(409).json({ error: 'A reschedule request is already awaiting provider response.' });
    const updated = await updateBooking(booking.id, current => {
      current.rescheduleRequest = {
        date, time, reason: String(reason || '').trim().slice(0, 300),
        status: 'pending', requestedAt: new Date().toISOString()
      };
      current.updatedAt = new Date().toISOString();
      return current;
    });
    publishEvent('booking:reschedule_requested', { bookingId: booking.id, customerId: booking.customerId, providerId: booking.providerId, status: 'pending' });
    return res.json({ booking: updated, message: 'Reschedule request sent to the service provider.' });
  } catch (error) {
    console.error('Reschedule request error:', error);
    return res.status(500).json({ error: 'Could not submit reschedule request.' });
  }
});

app.patch('/api/bookings/:id/reschedule', requireAuth, async (req, res) => {
  try {
    const decision = String(req.body?.decision || '');
    if (!['accept', 'reject'].includes(decision)) return res.status(400).json({ error: 'Choose accept or reject.' });
    const bookings = await getBookings();
    const booking = bookings.find(item => item.id === req.params.id);
    if (!booking) return res.status(404).json({ error: 'Booking not found.' });
    const isAdmin = req.user.accountType === 'admin';
    if (!isAdmin && (req.user.accountType !== 'provider' || booking.providerId !== req.user.id)) {
      return res.status(403).json({ error: 'Only the assigned provider or Admin can decide this request.' });
    }
    if (!['requested', 'accepted'].includes(booking.status)) return res.status(409).json({ error: 'This booking is no longer eligible for rescheduling.' });
    if (booking.rescheduleRequest?.status !== 'pending') return res.status(409).json({ error: 'No pending reschedule request exists.' });
    const updated = await updateBooking(booking.id, current => {
      const request = current.rescheduleRequest;
      if (decision === 'accept') {
        current.bookingDate = request.date;
        current.bookingTime = request.time;
      }
      current.rescheduleRequest = { ...request, status: decision === 'accept' ? 'accepted' : 'rejected', decidedAt: new Date().toISOString(), decidedBy: req.user.id };
      current.updatedAt = new Date().toISOString();
      return current;
    });
    publishEvent('booking:reschedule_decided', { bookingId: booking.id, customerId: booking.customerId, providerId: booking.providerId, status: updated.rescheduleRequest.status });
    return res.json({ booking: updated, message: decision === 'accept' ? 'New booking time confirmed.' : 'Reschedule request declined.' });
  } catch (error) {
    console.error('Reschedule decision error:', error);
    return res.status(500).json({ error: 'Could not update reschedule request.' });
  }
});

// Customer / Provider / Admin cancels a booking with technician call-out compensation rules
app.patch('/api/bookings/:id/cancel', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { id: userId, accountType } = req.user;
    const { reason } = req.body;

    const bookings = await getBookings();
    const booking = bookings.find(b => b.id === id);

    if (!booking) {
      return res.status(404).json({ error: 'Booking not found.' });
    }

    // Role-based authorization
    const isProviderMatch = booking.providerId === userId;
    const isCustomerMatch = booking.customerId === userId;

    if (accountType !== 'admin' && !isCustomerMatch && !isProviderMatch) {
      return res.status(403).json({ error: 'You are not authorized to cancel this booking.' });
    }

    if (['completed', 'cancelled', 'refunded', 'disputed', 'settled_split'].includes(booking.status)) {
      return res.status(400).json({ error: `Cannot cancel a booking that is already ${booking.status}.` });
    }

    let cancelMessage = 'Booking successfully cancelled.';
    let newPaymentStatus = 'cancelled';

    // If technician was already in progress (en route / on site) and payment was held in escrow:
    // Deduct LKR 500 technician call-out travel compensation fee and refund remainder to customer
    if (booking.status === 'in_progress' && booking.paymentStatus === 'escrow_held') {
      const totalAmount = booking.baseAmount || 1500;
      const callOutFee = Math.min(500, totalAmount);
      const customerRefund = totalAmount - callOutFee;

      await recordCallOutFeeCompensation({
        bookingId: id,
        customerId: booking.customerId,
        providerId: booking.providerId,
        totalAmount,
        callOutFee,
        customerRefund
      });

      newPaymentStatus = 'cancelled_callout_fee_paid';
      cancelMessage = `Booking cancelled. LKR ${callOutFee} call-out fee credited to provider for travel, LKR ${customerRefund} refunded to customer.`;
    } else if (booking.paymentStatus === 'escrow_held') {
      // 100% full refund if cancelled before technician started work
      const totalAmount = booking.baseAmount || 1500;
      await recordDisputeRefund({
        bookingId: id,
        customerId: booking.customerId,
        amount: totalAmount,
        reason: reason || 'Booking cancelled prior to service commencement'
      });
      newPaymentStatus = 'refunded_to_customer';
      cancelMessage = 'Booking cancelled. 100% full refund processed to customer.';
    }

    const updated = await updateBooking(id, b => {
      b.status = 'cancelled';
      b.paymentStatus = newPaymentStatus;
      b.cancelReason = reason || 'Cancelled by user';
      b.cancelledBy = userId;
      b.cancelledAt = new Date().toISOString();
      b.updatedAt = new Date().toISOString();
      return b;
    });

    publishEvent('booking:status_updated', {
      bookingId: id,
      status: 'cancelled',
      booking: updated
    });

    res.json({
      status: 'ok',
      message: cancelMessage,
      booking: updated
    });
  } catch (err) {
    console.error('Cancel booking error:', err);
    res.status(500).json({ error: 'Could not cancel booking.' });
  }
});

// Customer: Submit a dispute within 14-day warranty / guarantee
app.post('/api/bookings/:id/dispute', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { id: userId, accountType } = req.user;
    const reasonText = String(req.body?.reason || '').trim().slice(0, 1000);
    const evidenceText = String(req.body?.evidence || '').trim().slice(0, 4000);

    if (!reasonText) {
      return res.status(400).json({ error: 'A valid reason for the dispute is required.' });
    }

    const bookings = await getBookings();
    const booking = bookings.find(b => b.id === id);

    if (!booking) {
      return res.status(404).json({ error: 'Booking not found.' });
    }

    const isCustomerMatch = booking.customerId === userId;

    if (accountType !== 'admin' && !isCustomerMatch) {
      return res.status(403).json({ error: 'You are only authorized to dispute bookings under your own account.' });
    }

    if (booking.status !== 'completed') {
      return res.status(409).json({ error: 'A workmanship dispute can only be opened after the service is completed.' });
    }
    const completedAt = Date.parse(booking.completedAt || booking.updatedAt || booking.createdAt);
    if (!Number.isFinite(completedAt) || Date.now() - completedAt > 14 * 24 * 60 * 60 * 1000) {
      return res.status(409).json({ error: 'The 14-day workmanship dispute window has expired.' });
    }
    if (booking.status === 'disputed') return res.status(409).json({ error: 'A dispute is already open for this booking.' });

    const updated = await updateBooking(id, b => {
      b.status = 'disputed';
      b.paymentStatus = 'disputed_frozen';
      b.disputeReason = reasonText;
      b.disputeEvidence = evidenceText;
      b.disputedAt = new Date().toISOString();
      b.updatedAt = new Date().toISOString();
      return b;
    });

    publishEvent('booking:status_updated', {
      bookingId: id,
      status: 'disputed',
      booking: updated
    });

    res.json({
      status: 'ok',
      message: 'Dispute submitted successfully. Escrow funds have been frozen pending administrative review.',
      booking: updated
    });
  } catch (err) {
    console.error('Submit dispute error:', err);
    res.status(500).json({ error: 'Could not submit dispute.' });
  }
});

// Admin: Arbitrate a disputed booking (refund customer, release to provider, or 50/50 split)
app.post('/api/admin/bookings/:id/arbitrate', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { action, notes } = req.body; // 'refund_customer' | 'release_provider' | 'split_50_50'

    if (!['refund_customer', 'release_provider', 'split_50_50'].includes(action)) {
      return res.status(400).json({ error: "Invalid action. Must be 'refund_customer', 'release_provider', or 'split_50_50'." });
    }

    const bookings = await getBookings();
    const booking = bookings.find(b => b.id === id);

    if (!booking) {
      return res.status(404).json({ error: 'Booking not found.' });
    }

    const totalAmount = booking.baseAmount || 1500;
    let newStatus = 'completed';
    let newPaymentStatus = 'released_to_provider';

    if (action === 'refund_customer') {
      newStatus = 'refunded';
      newPaymentStatus = 'refunded_to_customer';
      await recordDisputeRefund({
        bookingId: id,
        customerId: booking.customerId,
        amount: totalAmount,
        reason: notes || 'Admin arbitration decision: Full refund to customer'
      });
    } else if (action === 'release_provider') {
      newStatus = 'completed';
      newPaymentStatus = 'released_to_provider';
      await recordEscrowRelease({
        bookingId: id,
        providerId: booking.providerId,
        amount: totalAmount,
        platformFee: booking.platformFee || 150,
        providerPayout: booking.providerPayout || 1350
      });
    } else if (action === 'split_50_50') {
      newStatus = 'settled_split';
      newPaymentStatus = 'partial_refund_split';
      const customerRefund = Math.round(totalAmount * 0.5);
      const providerPayout = Math.round(totalAmount * 0.4);
      const platformFee = totalAmount - customerRefund - providerPayout;
      await recordDisputeSplit({
        bookingId: id,
        customerId: booking.customerId,
        providerId: booking.providerId,
        totalAmount,
        customerRefund,
        providerPayout,
        platformFee
      });
    }

    const updated = await updateBooking(id, b => {
      b.status = newStatus;
      b.paymentStatus = newPaymentStatus;
      b.arbitrationNotes = notes || `Arbitrated decision: ${action}`;
      b.arbitratedAt = new Date().toISOString();
      b.arbitratedBy = req.user.id;
      b.updatedAt = new Date().toISOString();
      return b;
    });

    publishEvent('booking:status_updated', {
      bookingId: id,
      status: newStatus,
      booking: updated
    });

    res.json({
      status: 'ok',
      message: `Dispute arbitrated: ${action}`,
      action,
      booking: updated
    });
  } catch (err) {
    console.error('Arbitrate dispute error:', err);
    res.status(500).json({ error: 'Could not arbitrate dispute.' });
  }
});

// Admin: Trigger automated CEFT banking payout run
app.post('/api/admin/payouts/settle', requireAdmin, async (req, res) => {
  try {
    const minThreshold = Number(req.body.minThreshold) || 1000;
    const users = await getUsers();
    const providers = users.filter(u => (u.accountType === 'provider' && u.status === 'active') || (Array.isArray(u.roles) && u.roles.includes('provider') && u.providerStatus === 'active' && !['rejected','suspended'].includes(u.status)));

    const disbursements = [];
    for (const p of providers) {
      const balance = await getWalletBalance(`provider:${p.id}:wallet`);
      if (balance >= minThreshold) {
        disbursements.push({
          providerId: p.id,
          fullName: p.fullName,
          phone: p.phone,
          accountNumber: p.bankAccount || `CEFT-${p.phone}`,
          bankName: p.bankName || 'Commercial Bank of Ceylon',
          amount: balance,
          currency: 'LKR'
        });
      }
    }

    if (disbursements.length === 0) {
      return res.json({
        status: 'ok',
        message: `No active providers have an unsettled wallet balance exceeding LKR ${minThreshold.toLocaleString()}.`,
        providerCount: 0,
        totalPayoutAmount: 0,
        disbursements: []
      });
    }

    const batchId = `ceft-batch-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`;
    const totalPayoutAmount = disbursements.reduce((sum, d) => sum + d.amount, 0);
    const checksum = crypto.createHash('sha256')
      .update(batchId + JSON.stringify(disbursements))
      .digest('hex');

    for (const item of disbursements) {
      await recordPayoutSettlement({
        batchId,
        providerId: item.providerId,
        amount: item.amount
      });
    }

    res.json({
      status: 'ok',
      message: `Successfully generated CEFT bank settlement batch #${batchId}.`,
      batchId,
      checksum,
      providerCount: disbursements.length,
      totalPayoutAmount,
      disbursements
    });
  } catch (err) {
    console.error('Settle payouts error:', err);
    res.status(500).json({ error: 'Could not process payout settlement.' });
  }
});

// Cascading Dispatch: Verified provider claims a broadcast job
app.post('/api/bookings/:id/claim', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const provider = req.user;

    if (provider.accountType !== 'provider' || provider.status !== 'active') {
      return res.status(403).json({ error: 'Only verified service providers can claim broadcast jobs.' });
    }

    const bookings = await getBookings();
    const booking = bookings.find(b => b.id === id);

    if (!booking) {
      return res.status(404).json({ error: 'Booking request not found.' });
    }

    if (booking.status !== 'broadcast_pool' || booking.providerId) {
      return res.status(400).json({ error: 'This job is not currently open for broadcast claiming.' });
    }

    const approvedCategories = new Set([provider.category, ...(Array.isArray(provider.approvedServices) ? provider.approvedServices.map(service => service.categorySlug) : [])]);
    if (booking.categorySlug && !approvedCategories.has(booking.categorySlug)) {
      return res.status(403).json({ error: 'This broadcast job is outside your approved provider category.' });
    }
    if (Array.isArray(booking.declinedBy) && booking.declinedBy.includes(provider.id)) {
      return res.status(409).json({ error: 'You previously declined this broadcast job.' });
    }
    let claimed = false;
    const updated = await updateBooking(id, b => {
      if (b.status !== 'broadcast_pool' || b.providerId || (Array.isArray(b.declinedBy) && b.declinedBy.includes(provider.id))) return b;
      claimed = true;
      b.providerId = provider.id;
      b.providerName = provider.fullName;
      b.providerPhone = provider.phone;
      b.status = 'accepted';
      b.claimedAt = new Date().toISOString();
      b.updatedAt = new Date().toISOString();
      return b;
    });

    if (!claimed) return res.status(409).json({ error: 'This broadcast job has already been claimed or is no longer available.' });

    // Real-Time SSE Dispatch to customer and other contractors
    publishEvent('booking:status_updated', {
      bookingId: id,
      status: 'accepted',
      booking: updated
    });

    res.json({
      status: 'ok',
      message: 'You have successfully claimed this job! Customer has been notified.',
      booking: updated
    });
  } catch (err) {
    console.error('Claim broadcast job error:', err);
    res.status(500).json({ error: 'Could not claim job.' });
  }
});

// Reviews: Customer submits a review for a completed booking
app.post('/api/reviews', requireAuth, async (req, res) => {
  try {
    const { bookingId, rating, comment } = req.body || {};
    const customer = req.user;
    const parsedRating = Number(rating);
    const cleanComment = String(comment || '').trim().slice(0, 1000);

    if (customer.accountType !== 'customer') return res.status(403).json({ error: 'Customer account required to submit a review.' });
    if (!bookingId || !Number.isInteger(parsedRating) || parsedRating < 1 || parsedRating > 5) {
      return res.status(400).json({ error: 'Valid booking ID and rating between 1 and 5 stars are required.' });
    }

    const bookings = await getBookings();
    const booking = bookings.find(b => b.id === bookingId);

    if (!booking) {
      return res.status(404).json({ error: 'Booking not found.' });
    }

    // Verify customer ownership
    if (booking.customerId !== customer.id) {
      return res.status(403).json({ error: 'You can only review services booked under your account.' });
    }

    // Verify completed status
    if (booking.status !== 'completed') {
      return res.status(400).json({ error: 'Reviews can only be submitted after the service has been completed.' });
    }

    // Verify not already reviewed
    const existingReview = await getReviewByBooking(bookingId);
    if (existingReview) {
      return res.status(400).json({ error: 'A review has already been submitted for this booking.' });
    }

    const newReview = {
      id: 'rev-' + crypto.randomUUID(),
      bookingId,
      providerId: booking.providerId,
      providerName: booking.providerName,
      customerId: customer.id,
      customerName: customer.fullName || 'Verified Customer',
      rating: Math.round(parsedRating),
      comment: cleanComment,
      createdAt: new Date().toISOString()
    };

    await addReview(newReview);

    // Broadcast review event in real time
    publishEvent('review:submitted', {
      review: newReview,
      providerId: newReview.providerId
    });

    // Fetch refreshed provider to get updated aggregate rating
    const users = await getUsers();
    const updatedProvider = users.find(u => u.id === booking.providerId);

    res.status(201).json({
      status: 'ok',
      message: 'Thank you! Your verified rating and review have been published.',
      review: newReview,
      providerStats: {
        rating: updatedProvider?.rating || newReview.rating,
        reviewCount: updatedProvider?.reviewCount || 1
      }
    });
  } catch (err) {
    console.error('Submit review error:', err);
    res.status(500).json({ error: 'Could not submit review.' });
  }
});

// Reviews: Get all reviews for a specific provider
app.get('/api/reviews/provider/:providerId', async (req, res) => {
  try {
    const { providerId } = req.params;
    const reviews = await getReviewsByProvider(providerId);
    reviews.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    res.json({
      status: 'ok',
      total: reviews.length,
      reviews
    });
  } catch (err) {
    console.error('Fetch provider reviews error:', err);
    res.status(500).json({ error: 'Could not fetch provider reviews.' });
  }
});

// Reviews: Get review by booking ID
app.get('/api/reviews/booking/:bookingId', requireAuth, async (req, res) => {
  try {
    const { bookingId } = req.params;
    const booking = (await getBookings()).find(item => item.id === bookingId);
    if (!booking) return res.status(404).json({ error: 'Booking not found.' });
    if (req.user.accountType !== 'admin' && booking.customerId !== req.user.id && booking.providerId !== req.user.id) {
      return res.status(403).json({ error: 'You are not allowed to view this booking review.' });
    }
    const review = await getReviewByBooking(bookingId);
    if (!review) {
      return res.status(404).json({ error: 'No review found for this booking.' });
    }
    res.json({ status: 'ok', review });
  } catch (err) {
    res.status(500).json({ error: 'Could not fetch booking review.' });
  }
});

// Ledger & Wallet: Get current user wallet balance and immutable journal entries
app.get('/api/ledger/wallet', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const providerAccount = `provider:${userId}:wallet`;
    const walletBalance = await getWalletBalance(providerAccount);
    const allEntries = await getLedgerEntries();
    const myEntries = allEntries.filter(e => e.account.includes(userId) || (req.user.accountType === 'admin'));

    res.json({
      status: 'ok',
      walletBalance: Math.max(0, walletBalance),
      account: providerAccount,
      entries: myEntries
    });
  } catch (err) {
    console.error('Fetch wallet ledger error:', err);
    res.status(500).json({ error: 'Could not fetch ledger wallet.' });
  }
});

// Ledger: Get financial audit trail for a specific booking
app.get('/api/ledger/booking/:bookingId', requireAuth, async (req, res) => {
  try {
    const { bookingId } = req.params;
    const booking = (await getBookings()).find(item => item.id === bookingId);
    if (!booking) return res.status(404).json({ error: 'Booking not found.' });
    if (req.user.accountType !== 'admin' && booking.customerId !== req.user.id && booking.providerId !== req.user.id) {
      return res.status(403).json({ error: 'You are not allowed to view this booking ledger.' });
    }
    const entries = await getLedgerByBooking(bookingId);
    res.json({
      status: 'ok',
      bookingId,
      totalEntries: entries.length,
      entries
    });
  } catch (err) {
    res.status(500).json({ error: 'Could not fetch booking ledger.' });
  }
});

// Admin: Get all registered user accounts (PROTECTED BY REQUIRE_ADMIN)
app.get('/api/admin/users', requireAdmin, async (_req, res) => {
  try {
    const users = await getUsers();
    const sanitized = users.map(u => ({
      id: u.id,
      fullName: u.fullName,
      phone: u.phone,
      email: u.email,
      location: u.location || 'Not specified',
      accountType: u.accountType,
      roles: [...new Set([...(Array.isArray(u.roles) ? u.roles : []), u.accountType].filter(Boolean))],
      roleApplications: u.roleApplications || {},
      providerStatus: u.providerStatus || (u.accountType === 'provider' ? u.status : null),
      driverStatus: u.driverStatus || (u.accountType === 'driver' ? u.status : null),
      driverServices: u.driverServices || [],
      status: u.status || 'active',
      category: u.category || null,
      categoryName: u.categoryName || null,
      baseCharge: u.baseCharge || null,
      nicNumber: u.nicNumber || null,
      nicDocument: u.nicDocument || null,
      tradeCertificate: u.tradeCertificate || null,
      kycStatus: u.kycStatus || (u.accountType === 'provider' ? 'unverified' : 'verified'),
      createdAt: u.createdAt || new Date().toISOString()
    }));

    res.json({
      status: 'ok',
      total: sanitized.length,
      users: sanitized
    });
  } catch (err) {
    console.error('Fetch users error:', err);
    res.status(500).json({ error: 'Could not fetch accounts.' });
  }
});

// Admin: Update user status (approve / reject / activate) (PROTECTED BY REQUIRE_ADMIN)
app.patch('/api/admin/users/:id/status', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body; // 'active' | 'pending' | 'rejected'

    if (!['active', 'pending', 'rejected'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status value. Must be active, pending, or rejected.' });
    }

    const updated = await updateUser(id, u => {
      u.status = status;
      if (status === 'active' && ['provider', 'driver'].includes(u.accountType)) {
        u.kycStatus = 'verified';
      }
      return u;
    });

    if (!updated) {
      return res.status(404).json({ error: 'User not found.' });
    }

    // Broadcast user status change so client sessions update/revoke immediately
    publishEvent('user:status_changed', {
      userId: id,
      status
    });

    res.json({
      status: 'ok',
      message: status === 'active'
        ? 'Account approved and activated successfully.'
        : (status === 'rejected' ? 'Account rejected and moved to the Block List.' : 'Account status updated to pending.'),
      id,
      user: {
        id: updated.id,
        fullName: updated.fullName,
        email: updated.email,
        phone: updated.phone,
        accountType: updated.accountType,
        status: updated.status,
        kycStatus: updated.kycStatus
      },
      newStatus: status
    });
  } catch (err) {
    console.error('Status update error:', err);
    res.status(500).json({ error: 'Could not update user status.' });
  }
});

// Admin: Delete user (PROTECTED BY REQUIRE_ADMIN)
app.delete('/api/admin/users/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const users = await getUsers();
    const target = users.find(u => u.id === id);

    if (!target) {
      return res.status(404).json({ error: 'User not found.' });
    }

    if (target.email === 'arikarran14@gmail.com' || target.id === 'user-admin-arikarran') {
      return res.status(403).json({ error: 'Super Admin account cannot be deleted.' });
    }

    await deleteUser(id);

    res.json({ status: 'ok', message: 'Account removed successfully.' });
  } catch (err) {
    res.status(500).json({ error: 'Could not remove account.' });
  }
});

// Admin: Reset user password (PROTECTED BY REQUIRE_ADMIN)
app.post('/api/admin/users/:id/reset-password', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { newPassword } = req.body;

    if (!newPassword || typeof newPassword !== 'string' || newPassword.trim().length < 6) {
      return res.status(400).json({ error: 'New password must be at least 6 characters long.' });
    }

    const trimmedPassword = newPassword.trim();
    const newPasswordHash = hashPassword(trimmedPassword);

    const users = await getUsers();
    const target = users.find(u => u.id === id);

    if (!target) {
      return res.status(404).json({ error: 'User account not found.' });
    }

    await updateUser(id, u => {
      u.passwordHash = newPasswordHash;
      u.updatedAt = new Date().toISOString();
      return u;
    });

    if (pool) {
      await pool.query(
        'UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2',
        [newPasswordHash, id]
      ).catch(err => console.warn('Postgres password update warning:', err.message));
    }

    res.json({
      status: 'ok',
      message: `Password successfully updated for ${target.fullName}.`,
      userId: target.id,
      fullName: target.fullName,
      phone: target.phone,
      email: target.email,
      accountType: target.accountType
    });
  } catch (err) {
    console.error('Admin reset password error:', err);
    res.status(500).json({ error: 'Failed to reset user password.' });
  }
});

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error.' });
});

// Listen when executed standalone, via npm start, or in Vercel Services mode where PORT is defined
if (process.env.PORT || !process.env.VERCEL || (process.argv[1] && process.argv[1].includes('server.js'))) {
  app.listen(port, () => {
    console.log(`ARY Services API listening on port ${port}`);
  });
}

export default app;
export { app };
