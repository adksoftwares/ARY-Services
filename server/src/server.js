import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import pg from 'pg';
import crypto from 'node:crypto';
import rateLimit from 'express-rate-limit';

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
  recordEscrowHold,
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
  hashPassword,
  defaultAdminUser
} from './storage.js';

import { sendOtp, verifyOtp, normalizePhone } from './otpService.js';
import { subscribeToEvents, broadcastEvent } from './eventHub.js';
import { calculateDistanceKm, estimateEtaMinutes, resolveCoordinatesFromLocation } from './geoService.js';
import { issueSecurityChallenge, verifySecurityChallenge } from './securityShield.js';

const app = express();
const port = Number(process.env.PORT || 4000);

// Structured Request Correlation & Observability Middleware
app.use((req, res, next) => {
  req.id = req.headers['x-request-id'] || `req-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
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
        path: req.originalUrl || req.url,
        statusCode: res.statusCode,
        durationMs
      }));
    }
  });
  next();
});

const allowedOrigins = [
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:5174',
  'http://127.0.0.1:5174',
  process.env.CLIENT_ORIGIN
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
    if (/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) return callback(null, true);
    callback(null, true);
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

const JWT_SECRET = process.env.JWT_SECRET || 'ary_super_secret_jwt_salt_2026';

let pool;
if (process.env.DATABASE_URL) {
  pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
  setActivePostgresPool(pool);
  initPostgresTables(pool).catch(err => {
    console.warn('PostgreSQL auto-schema initialization notice:', err.message);
  });
}

// Token generation & verification using native Node.js crypto (HS256)
function generateToken(payload) {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const body = Buffer.from(JSON.stringify({ ...payload, exp: Date.now() + 90 * 24 * 60 * 60 * 1000 })).toString('base64url');
  const signature = crypto.createHmac('sha256', JWT_SECRET).update(`${header}.${body}`).digest('base64url');
  return `${header}.${body}.${signature}`;
}

function verifyToken(token) {
  if (!token || typeof token !== 'string') return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const [header, body, signature] = parts;
  const expectedSig = crypto.createHmac('sha256', JWT_SECRET).update(`${header}.${body}`).digest('base64url');
  if (signature !== expectedSig) return null;
  try {
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf-8'));
    if (payload.exp && payload.exp < Date.now()) return null;
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
    const decodedPhoneDigits = decoded.phone ? normalizePhone(decoded.phone) : null;
    const liveUser = users.find(u =>
      u.id === decoded.id ||
      (decodedPhoneDigits && u.phone && normalizePhone(u.phone) === decodedPhoneDigits) ||
      (u.email && decoded.email && u.email.toLowerCase() === decoded.email.toLowerCase())
    );

    if (!liveUser) {
      return res.status(401).json({ error: 'User account no longer exists.' });
    }

    if (liveUser.status === 'rejected' || liveUser.status === 'suspended') {
      return res.status(403).json({ error: 'This account has been deactivated or rejected by the administration.' });
    }

    req.user = {
      ...decoded,
      id: liveUser.id,
      phone: liveUser.phone || decoded.phone,
      email: liveUser.email || decoded.email,
      status: liveUser.status,
      accountType: liveUser.accountType,
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

// Initialize atomic file storage on boot
await initStorage();

// Real-time Server-Sent Events (SSE) Dispatch Hub
app.get('/api/events', (req, res) => {
  subscribeToEvents(req, res);
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
    await initStorage();
    res.json({
      status: 'ready',
      storage: 'online',
      pool: pool ? 'connected' : 'file-fallback'
    });
  } catch (err) {
    res.status(503).json({ status: 'unhealthy', error: err.message });
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

    // Verify anti-bot security challenge if token provided
    if (shieldToken && !verifySecurityChallenge(shieldToken)) {
      return res.status(400).json({ error: 'Security verification failed. Please solve the security challenge.' });
    }

    const result = sendOtp(phone);
    if (!result.success) {
      return res.status(429).json({ error: result.error, waitSeconds: result.waitSeconds });
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

      const verification = verifyOtp(phone, otp);
      if (!verification.valid) {
        return res.status(400).json({ error: verification.error });
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
          error: 'Your service provider account is pending Admin approval. You will receive access once approved by the Super Admin.',
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
        purpose: 'customer_registration'
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
      nicDocument,
      tradeCertificate
    } = req.body;

    const role = ['customer', 'provider', 'admin'].includes(accountType) ? accountType : 'customer';
    const cleanEmail = email ? email.trim().toLowerCase() : null;
    const cleanPhone = phone ? phone.trim() : (cleanEmail ? cleanEmail.split('@')[0] : '');
    const cleanLocation = (location || '').trim();
    const effectivePassword = password || (role === 'customer' ? 'customer123' : null);

    if (!fullName || (role === 'customer' && !cleanPhone) || !effectivePassword) {
      return res.status(400).json({
        error: role === 'customer'
          ? 'Name and mobile number are required.'
          : 'Full name, email/phone and password are required.'
      });
    }

    // Sri Lankan NIC verification for service providers
    let cleanNic = null;
    if (role === 'provider' && nicNumber) {
      const trimmedNic = String(nicNumber).trim().toUpperCase();
      const isValidNic = /^([0-9]{9}[V|X]|[0-9]{12})$/.test(trimmedNic);
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

    // Service providers require admin verification and approval before becoming active
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
      category: role === 'provider' ? category : null,
      categoryName: role === 'provider' ? categoryName : null,
      baseCharge: role === 'provider' ? baseCharge : null,
      rating: role === 'provider' ? 4.9 : null,
      reviewCount: role === 'provider' ? 0 : null,
      experienceYears: role === 'provider' ? 3 : null,
      nicNumber: cleanNic,
      nicDocument: nicDocument || null,
      tradeCertificate: tradeCertificate || null,
      kycStatus: role === 'provider' ? (cleanNic ? 'pending' : 'unverified') : 'verified',
      createdAt: new Date().toISOString()
    };

    await addUser(newUser);

    broadcastEvent('user:registered', {
      user: {
        id: newUser.id,
        fullName: newUser.fullName,
        accountType: newUser.accountType,
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
        : 'Account created successfully.',
      user: {
        id: newUser.id,
        fullName: newUser.fullName,
        phone: newUser.phone,
        email: newUser.email,
        location: newUser.location,
        accountType: newUser.accountType,
        status: newUser.status,
        category: newUser.category,
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
            status: user.status,
            category: user.category || null,
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
      { id: 4, name: 'Other Services', slug: 'other-services', description: 'Carpentry, painting, AC and house help', icon: 'Sparkles', color: 'lilac' }
    ],
    source: 'active'
  });
});

// Public / Customer: Get active verified service providers by category / location with Haversine Distance Sorting & Geofencing
app.get('/api/providers', async (req, res) => {
  try {
    const { category, query, location, lat, lng, radiusKm } = req.query;
    const users = await getUsers();

    let providers = users.filter(u => u.accountType === 'provider' && u.status === 'active');

    if (category && category !== 'all') {
      providers = providers.filter(p => p.category === category || (p.categoryName && p.categoryName.toLowerCase().includes(category.toLowerCase())));
    }

    if (query) {
      const q = query.toLowerCase();
      providers = providers.filter(p =>
        (p.fullName && p.fullName.toLowerCase().includes(q)) ||
        (p.location && p.location.toLowerCase().includes(q)) ||
        (p.categoryName && p.categoryName.toLowerCase().includes(q))
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
        email: p.email,
        location: p.location || 'Local Area',
        lat: pLat,
        lng: pLng,
        distanceKm,
        etaMinutes,
        category: p.category || 'general',
        categoryName: p.categoryName || 'General Services',
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
    const { category, categoryName, baseCharge, location, experienceYears } = req.body;

    const updated = await updateUser(userId, (provider) => {
      if (!provider || provider.accountType !== 'provider') return provider;
      if (category) provider.category = category;
      if (categoryName) provider.categoryName = categoryName;
      if (baseCharge) provider.baseCharge = baseCharge;
      if (location) provider.location = location;
      if (experienceYears) provider.experienceYears = Number(experienceYears);
      return provider;
    });

    if (!updated || updated.accountType !== 'provider') {
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

// Bookings: List bookings for current user (Customer, Provider, or Admin)
app.get('/api/bookings', requireAuth, async (req, res) => {
  try {
    const { id: userId, accountType, phone } = req.user;
    const userPhoneDigits = phone ? normalizePhone(phone) : null;
    const allBookings = await getBookings();

    let userBookings = [];
    if (accountType === 'admin') {
      userBookings = allBookings;
    } else if (accountType === 'provider') {
      // Include directly assigned bookings (by providerId or matching phone) + unassigned cascading broadcast jobs matching category
      userBookings = allBookings.filter(b =>
        b.providerId === userId ||
        (userPhoneDigits && b.providerPhone && normalizePhone(b.providerPhone) === userPhoneDigits) ||
        (b.status === 'broadcast_pool' && (!b.declinedBy || (!b.declinedBy.includes(userId) && (!userPhoneDigits || !b.declinedBy.includes(userPhoneDigits)))))
      );
    } else {
      userBookings = allBookings.filter(b =>
        b.customerId === userId ||
        (userPhoneDigits && b.customerPhone && normalizePhone(b.customerPhone) === userPhoneDigits)
      );
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
    const {
      providerId,
      categorySlug,
      categoryName,
      serviceAddress,
      bookingDate,
      bookingTime,
      problemDescription
    } = req.body;

    if (!providerId || !serviceAddress || !problemDescription) {
      return res.status(400).json({ error: 'Provider, service address, and service description are required.' });
    }

    const users = await getUsers();
    const cleanProviderIdent = normalizePhone(providerId);
    const provider = users.find(u =>
      (u.id === providerId || (cleanProviderIdent && u.phone && normalizePhone(u.phone) === cleanProviderIdent)) &&
      u.accountType === 'provider'
    );

    if (!provider) {
      return res.status(404).json({ error: 'Selected service provider was not found.' });
    }

    // Escrow & Financial Commission Calculations (10% platform commission, 90% provider payout)
    const rawDigits = String(provider.baseCharge || '1500').replace(/[^0-9]/g, '');
    const baseAmount = parseInt(rawDigits, 10) || 1500;
    const platformFee = Math.round(baseAmount * 0.10);
    const providerPayout = baseAmount - platformFee;
    const paymentMethod = req.body.paymentMethod === 'cash' ? 'cash' : 'escrow_online';
    const paymentStatus = paymentMethod === 'escrow_online' ? 'escrow_held' : 'pending_cash';

    const newBooking = {
      id: 'book-' + Date.now(),
      customerId: customer.id,
      customerName: customer.fullName || 'Customer',
      customerPhone: customer.phone,
      providerId: provider.id,
      providerName: provider.fullName,
      providerPhone: provider.phone,
      categorySlug: categorySlug || provider.category || 'general',
      categoryName: categoryName || provider.categoryName || 'General Services',
      serviceAddress: serviceAddress.trim(),
      bookingDate: bookingDate || new Date().toISOString().split('T')[0],
      bookingTime: bookingTime || 'Morning (9 AM - 12 PM)',
      problemDescription: problemDescription.trim(),
      baseCharge: provider.baseCharge || 'LKR 1,500',
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

    // Record double-entry financial ledger transaction for online escrow
    if (paymentMethod === 'escrow_online') {
      await recordEscrowHold({
        bookingId: newBooking.id,
        customerId: customer.id,
        amount: baseAmount
      });
    }

    // Instant Real-Time SSE Dispatch to Provider & Admins
    broadcastEvent('booking:created', {
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
    const { id: userId, accountType, phone } = req.user;

    const validStatuses = ['requested', 'accepted', 'rejected', 'in_progress', 'completed', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid booking status.' });
    }

    const bookings = await getBookings();
    const booking = bookings.find(b => b.id === id);

    if (!booking) {
      return res.status(404).json({ error: 'Booking not found.' });
    }

    // Role-based authorization for booking changes
    const userPhoneDigits = phone ? normalizePhone(phone) : null;
    const isProviderMatch = booking.providerId === userId || (userPhoneDigits && booking.providerPhone && normalizePhone(booking.providerPhone) === userPhoneDigits);
    const isCustomerMatch = booking.customerId === userId || (userPhoneDigits && booking.customerPhone && normalizePhone(booking.customerPhone) === userPhoneDigits);

    if (accountType !== 'admin' && !isProviderMatch && !isCustomerMatch) {
      return res.status(403).json({ error: 'You are not authorized to update this booking.' });
    }

    let releasedTx = null;
    const updated = await updateBooking(id, b => {
      // Cascading Dispatch: If contractor declines, cascade to broadcast pool so another contractor can claim it
      if (status === 'rejected') {
        b.status = 'broadcast_pool';
        b.declinedBy = [...(b.declinedBy || []), b.providerId];
        b.broadcastAt = new Date().toISOString();
      } else {
        b.status = status;
      }

      b.updatedAt = new Date().toISOString();

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
    broadcastEvent('booking:status_updated', {
      bookingId: id,
      status: updated.status,
      booking: updated
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

// Customer / Provider / Admin cancels a booking with technician call-out compensation rules
app.patch('/api/bookings/:id/cancel', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { id: userId, accountType, phone } = req.user;
    const { reason } = req.body;

    const bookings = await getBookings();
    const booking = bookings.find(b => b.id === id);

    if (!booking) {
      return res.status(404).json({ error: 'Booking not found.' });
    }

    // Role-based authorization
    const userPhoneDigits = phone ? normalizePhone(phone) : null;
    const isProviderMatch = booking.providerId === userId || (userPhoneDigits && booking.providerPhone && normalizePhone(booking.providerPhone) === userPhoneDigits);
    const isCustomerMatch = booking.customerId === userId || (userPhoneDigits && booking.customerPhone && normalizePhone(booking.customerPhone) === userPhoneDigits);

    if (accountType !== 'admin' && !isCustomerMatch && !isProviderMatch) {
      return res.status(403).json({ error: 'You are not authorized to cancel this booking.' });
    }

    if (booking.status === 'completed' || booking.status === 'cancelled' || booking.status === 'refunded') {
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

    broadcastEvent('booking:status_updated', {
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
    const { id: userId, accountType, phone } = req.user;
    const { reason, evidence } = req.body;

    if (!reason || !reason.trim()) {
      return res.status(400).json({ error: 'A valid reason for the dispute is required.' });
    }

    const bookings = await getBookings();
    const booking = bookings.find(b => b.id === id);

    if (!booking) {
      return res.status(404).json({ error: 'Booking not found.' });
    }

    const userPhoneDigits = phone ? normalizePhone(phone) : null;
    const isCustomerMatch = booking.customerId === userId || (userPhoneDigits && booking.customerPhone && normalizePhone(booking.customerPhone) === userPhoneDigits);

    if (accountType !== 'admin' && !isCustomerMatch) {
      return res.status(403).json({ error: 'You are only authorized to dispute bookings under your own account.' });
    }

    if (booking.status === 'cancelled' || booking.status === 'refunded' || booking.status === 'settled_split') {
      return res.status(400).json({ error: `Cannot dispute a booking that is already ${booking.status}.` });
    }

    const updated = await updateBooking(id, b => {
      b.status = 'disputed';
      b.paymentStatus = 'disputed_frozen';
      b.disputeReason = reason.trim();
      b.disputeEvidence = evidence ? String(evidence) : '';
      b.disputedAt = new Date().toISOString();
      b.updatedAt = new Date().toISOString();
      return b;
    });

    broadcastEvent('booking:status_updated', {
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

    broadcastEvent('booking:status_updated', {
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
    const providers = users.filter(u => u.accountType === 'provider' && u.status === 'active');

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

    if (provider.accountType !== 'provider') {
      return res.status(403).json({ error: 'Only verified service providers can claim broadcast jobs.' });
    }

    const bookings = await getBookings();
    const booking = bookings.find(b => b.id === id);

    if (!booking) {
      return res.status(404).json({ error: 'Booking request not found.' });
    }

    if (booking.status !== 'broadcast_pool') {
      return res.status(400).json({ error: 'This job is not currently open for broadcast claiming.' });
    }

    const updated = await updateBooking(id, b => {
      b.providerId = provider.id;
      b.providerName = provider.fullName;
      b.providerPhone = provider.phone;
      b.status = 'accepted';
      b.claimedAt = new Date().toISOString();
      b.updatedAt = new Date().toISOString();
      return b;
    });

    // Real-Time SSE Dispatch to customer and other contractors
    broadcastEvent('booking:status_updated', {
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
    const { bookingId, rating, comment } = req.body;
    const customer = req.user;

    const parsedRating = Number(rating);
    if (!bookingId || !parsedRating || parsedRating < 1 || parsedRating > 5) {
      return res.status(400).json({ error: 'Valid booking ID and rating between 1 and 5 stars are required.' });
    }

    const bookings = await getBookings();
    const booking = bookings.find(b => b.id === bookingId);

    if (!booking) {
      return res.status(404).json({ error: 'Booking not found.' });
    }

    // Verify customer ownership
    if (booking.customerId !== customer.id && (!customer.phone || booking.customerPhone !== customer.phone)) {
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
      id: `rev-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      bookingId,
      providerId: booking.providerId,
      providerName: booking.providerName,
      customerId: customer.id,
      customerName: customer.fullName || 'Verified Customer',
      rating: Math.round(parsedRating),
      comment: String(comment || '').trim(),
      createdAt: new Date().toISOString()
    };

    await addReview(newReview);

    // Broadcast review event in real time
    broadcastEvent('review:submitted', {
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
      if (status === 'active' && u.accountType === 'provider') {
        u.kycStatus = 'verified';
      }
      return u;
    });

    if (!updated) {
      return res.status(404).json({ error: 'User not found.' });
    }

    // Broadcast user status change so client sessions update/revoke immediately
    broadcastEvent('user:status_changed', {
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
