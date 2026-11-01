import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const baseDataDir = path.join(__dirname, '..', 'data');
const dataDir = process.env.VERCEL ? path.join('/tmp', 'ary_data') : baseDataDir;
const usersFile = path.join(dataDir, 'users.json');
const bookingsFile = path.join(dataDir, 'bookings.json');
const reviewsFile = path.join(dataDir, 'reviews.json');
const ledgerFile = path.join(dataDir, 'ledger.json');

export function hashPassword(password) {
  const salt = crypto.randomBytes(16);
  const derived = crypto.scryptSync(String(password), salt, 64);
  return 'scrypt$' + salt.toString('hex') + '$' + derived.toString('hex');
}

export function verifyPassword(password, storedHash) {
  if (typeof password !== 'string' || typeof storedHash !== 'string' || !storedHash) return false;
  if (storedHash.startsWith('scrypt$')) {
    const parts = storedHash.split('$');
    const saltHex = parts[1];
    const hashHex = parts[2];
    if (!saltHex || !hashHex || !/^[a-f0-9]+$/i.test(saltHex) || !/^[a-f0-9]+$/i.test(hashHex)) return false;
    const salt = Buffer.from(saltHex, 'hex');
    const expected = Buffer.from(hashHex, 'hex');
    if (salt.length !== 16 || expected.length !== 64) return false;
    const actual = crypto.scryptSync(password, salt, expected.length);
    return crypto.timingSafeEqual(actual, expected);
  }
  if (!/^[a-f0-9]{64}$/i.test(storedHash)) return false;
  const legacy = crypto.pbkdf2Sync(password, 'ary_salt_2026', 1000, 32, 'sha256');
  const expected = Buffer.from(storedHash, 'hex');
  return legacy.length === expected.length && crypto.timingSafeEqual(legacy, expected);
}

// Admin bootstrap is opt-in and must be configured through deployment secrets.
export const defaultAdminUser = process.env.ADMIN_EMAIL && process.env.ADMIN_PASSWORD
  ? {
      id: 'ary-bootstrap-admin',
      fullName: process.env.ADMIN_NAME || 'ARY Super Admin',
      phone: process.env.ADMIN_PHONE || '',
      email: process.env.ADMIN_EMAIL.trim().toLowerCase(),
      location: 'ARY Headquarters',
      passwordHash: hashPassword(process.env.ADMIN_PASSWORD),
      accountType: 'admin',
      status: 'active',
      createdAt: new Date().toISOString()
    }
  : null;

export const defaultSeedProviders = process.env.NODE_ENV === 'production' ? [] : [
  {
    id: 'user-provider-kumar',
    passwordHash: process.env.NODE_ENV === 'production' ? undefined : hashPassword('KumarPass@123'),
    fullName: 'Master Electrician Kumar',
    phone: '0779998877',
    email: 'kumar.electric@example.local',
    location: 'Bambalapitiya, Colombo',
    lat: 6.8920,
    lng: 79.8560,
    accountType: 'provider',
    status: 'active',
    category: 'electrical-repair',
    categoryName: 'Electrical Repair',
    baseCharge: 'LKR 2,000',
    rating: 4.9,
    reviewCount: 18,
    experienceYears: 5,
    createdAt: '2026-01-02T00:00:00.000Z'
  },
  {
    id: 'user-provider-perera',
    passwordHash: process.env.NODE_ENV === 'production' ? undefined : hashPassword('PereraPass@123'),
    fullName: 'Perera Plumbing Experts',
    phone: '0772223344',
    email: 'perera.plumb@example.local',
    location: 'Colombo 03',
    lat: 6.8970,
    lng: 79.8550,
    accountType: 'provider',
    status: 'active',
    category: 'plumbing',
    categoryName: 'Plumbing',
    baseCharge: 'LKR 1,800',
    rating: 4.8,
    reviewCount: 14,
    experienceYears: 4,
    createdAt: '2026-01-03T00:00:00.000Z'
  },
  {
    id: 'user-provider-fresh',
    passwordHash: process.env.NODE_ENV === 'production' ? undefined : hashPassword('FreshPass@123'),
    fullName: 'Lanka Fresh Groceries',
    phone: '0773334455',
    email: 'fresh.food@example.local',
    location: 'Colombo 04',
    lat: 6.8850,
    lng: 79.8600,
    accountType: 'provider',
    status: 'active',
    category: 'food-shops',
    categoryName: 'Food Shops',
    baseCharge: 'LKR 500 delivery',
    rating: 5.0,
    reviewCount: 22,
    experienceYears: 6,
    createdAt: '2026-01-04T00:00:00.000Z'
  },
  {
    id: 'user-provider-quickfix',
    passwordHash: process.env.NODE_ENV === 'production' ? undefined : hashPassword('QuickPass@123'),
    fullName: 'QuickFix Carpentry & AC',
    phone: '0774445566',
    email: 'quickfix@example.local',
    location: 'Nugegoda, Colombo',
    lat: 6.8650,
    lng: 79.8990,
    accountType: 'provider',
    status: 'active',
    category: 'other-services',
    categoryName: 'Other Services',
    baseCharge: 'LKR 2,500',
    rating: 4.9,
    reviewCount: 16,
    experienceYears: 7,
    createdAt: '2026-01-05T00:00:00.000Z'
  }
];

export const defaultUsers = [...(defaultAdminUser ? [defaultAdminUser] : []), ...defaultSeedProviders];

class AsyncLock {
  constructor() {
    this.promise = Promise.resolve();
  }

  acquire(fn) {
    const next = this.promise.then(() => fn());
    this.promise = next.catch(() => {});
    return next;
  }
}

const usersLock = new AsyncLock();
const bookingsLock = new AsyncLock();
const reviewsLock = new AsyncLock();
const ledgerLock = new AsyncLock();

let cachedUsers = null;
let cachedBookings = null;
let cachedReviews = null;
let cachedLedger = null;

async function atomicWriteJson(filePath, data) {
  if (activePostgresPool) {
    const collection = path.basename(filePath, '.json');
    const client = await activePostgresPool.connect();
    try {
      await client.query('BEGIN');
      await client.query('SELECT pg_advisory_xact_lock(hashtext($1))', [collection]);
      await client.query('DELETE FROM ary_documents WHERE collection = $1', [collection]);
      if (Array.isArray(data) && data.length) {
        const values = [];
        const placeholders = data.map((item, index) => {
          const offset = index * 4;
          values.push(collection, String(item.id ?? index), index, JSON.stringify(item));
          return `($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}::jsonb)`;
        });
        await client.query(
          `INSERT INTO ary_documents (collection, record_id, position, payload) VALUES ${placeholders.join(', ')}`,
          values
        );
      }
      await client.query('COMMIT');
      return;
    } catch (error) {
      await client.query('ROLLBACK').catch(() => {});
      throw error;
    } finally {
      client.release();
    }
  }
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  const tempPath = `${filePath}.tmp.${Date.now()}.${Math.random().toString(36).slice(2)}`;
  const jsonStr = JSON.stringify(data, null, 2);
  await fs.writeFile(tempPath, jsonStr, 'utf-8');
  try {
    await fs.rename(tempPath, filePath);
  } catch {
    // Windows file locking retry & fallback
    try {
      await new Promise(r => setTimeout(r, 60));
      await fs.rename(tempPath, filePath);
    } catch {
      await fs.copyFile(tempPath, filePath);
      await fs.unlink(tempPath).catch(() => {});
    }
  }
}

async function readJsonArray(filePath) {
  if (activePostgresPool) {
    const collection = path.basename(filePath, '.json');
    const result = await activePostgresPool.query(
      'SELECT payload FROM ary_documents WHERE collection = $1 ORDER BY position ASC',
      [collection]
    );
    return result.rows.map(row => row.payload);
  }
  const raw = await fs.readFile(filePath, 'utf-8');
  const parsed = JSON.parse(raw);
  return Array.isArray(parsed) ? parsed : [];
}

export async function getUsers() {
  return usersLock.acquire(async () => {
    if (cachedUsers !== null && !activePostgresPool) {
      return [...cachedUsers];
    }
    try {
      await fs.mkdir(dataDir, { recursive: true });
      const parsed = await readJsonArray(usersFile);
      if (Array.isArray(parsed) && parsed.length > 0) {
        // Provision an Admin only when deployment credentials are explicitly configured.
        if (defaultAdminUser && !parsed.some(u => u.email === defaultAdminUser.email || u.id === defaultAdminUser.id)) {
          parsed.unshift(defaultAdminUser);
        }
        // Ensure demo catalog providers exist so local preview categories are populated
        for (const seedProv of defaultSeedProviders) {
          if (!parsed.some(u => u.id === seedProv.id)) {
            parsed.push(seedProv);
          }
        }
        cachedUsers = parsed;
        await atomicWriteJson(usersFile, cachedUsers);
        return [...cachedUsers];
      }
    } catch {
      // file not found or corrupted, initialize default seed
    }
    cachedUsers = [...defaultUsers];
    await atomicWriteJson(usersFile, cachedUsers);
    return [...cachedUsers];
  });
}

export async function saveUsers(users) {
  return usersLock.acquire(async () => {
    if (defaultAdminUser && !users.some(u => u.email === defaultAdminUser.email || u.id === defaultAdminUser.id)) {
      users = [defaultAdminUser, ...users];
    }
    cachedUsers = [...users];
    await atomicWriteJson(usersFile, cachedUsers);
    return [...cachedUsers];
  });
}

export async function findUser(predicate) {
  const users = await getUsers();
  return users.find(predicate) || null;
}

export async function addUser(newUser) {
  return usersLock.acquire(async () => {
    const current = activePostgresPool ? await readJsonArray(usersFile) : cachedUsers !== null ? cachedUsers : await (async () => {
      try {
        const parsed = await readJsonArray(usersFile);
        return Array.isArray(parsed) ? parsed : [...defaultUsers];
      } catch {
        return [...defaultUsers];
      }
    })();
    const next = [...current, newUser];
    cachedUsers = next;
    await atomicWriteJson(usersFile, next);
    return newUser;
  });
}

export async function updateUser(id, updater) {
  return usersLock.acquire(async () => {
    const current = activePostgresPool ? await readJsonArray(usersFile) : cachedUsers !== null ? cachedUsers : await (async () => {
      try {
        const parsed = await readJsonArray(usersFile);
        return Array.isArray(parsed) ? parsed : [...defaultUsers];
      } catch {
        return [...defaultUsers];
      }
    })();
    const index = current.findIndex(u => u.id === id);
    if (index === -1) return null;

    const updated = typeof updater === 'function' ? updater(current[index]) : { ...current[index], ...updater };
    current[index] = updated;
    cachedUsers = [...current];
    await atomicWriteJson(usersFile, current);
    return updated;
  });
}

export async function deleteUser(id) {
  return usersLock.acquire(async () => {
    const current = activePostgresPool ? await readJsonArray(usersFile) : cachedUsers !== null ? cachedUsers : await (async () => {
      try {
        const parsed = await readJsonArray(usersFile);
        return Array.isArray(parsed) ? parsed : [...defaultUsers];
      } catch {
        return [...defaultUsers];
      }
    })();
    const next = current.filter(u => u.id !== id);
    cachedUsers = next;
    await atomicWriteJson(usersFile, next);
    return true;
  });
}

export async function getBookings() {
  return bookingsLock.acquire(async () => {
    if (cachedBookings !== null && !activePostgresPool) {
      return [...cachedBookings];
    }
    try {
      await fs.mkdir(dataDir, { recursive: true });
      const parsed = await readJsonArray(bookingsFile);
      if (Array.isArray(parsed)) {
        cachedBookings = parsed;
        return [...cachedBookings];
      }
    } catch {
      // file not found or corrupted
    }
    cachedBookings = [];
    await atomicWriteJson(bookingsFile, cachedBookings);
    return [...cachedBookings];
  });
}

export async function saveBookings(bookings) {
  return bookingsLock.acquire(async () => {
    cachedBookings = [...bookings];
    await atomicWriteJson(bookingsFile, cachedBookings);
    return [...cachedBookings];
  });
}

export async function addBooking(newBooking) {
  return bookingsLock.acquire(async () => {
    const current = activePostgresPool ? await readJsonArray(bookingsFile) : cachedBookings !== null ? cachedBookings : await (async () => {
      try {
        return await readJsonArray(bookingsFile);
      } catch {
        return [];
      }
    })();
    const next = [newBooking, ...current];
    cachedBookings = next;
    await atomicWriteJson(bookingsFile, next);
    return newBooking;
  });
}

export async function updateBooking(id, updater) {
  return bookingsLock.acquire(async () => {
    const current = activePostgresPool ? await readJsonArray(bookingsFile) : cachedBookings !== null ? cachedBookings : await (async () => {
      try {
        return await readJsonArray(bookingsFile);
      } catch {
        return [];
      }
    })();
    const index = current.findIndex(b => b.id === id);
    if (index === -1) return null;

    const updated = typeof updater === 'function' ? updater(current[index]) : { ...current[index], ...updater };
    current[index] = updated;
    cachedBookings = [...current];
    await atomicWriteJson(bookingsFile, current);
    return updated;
  });
}

export async function getReviews() {
  return reviewsLock.acquire(async () => {
    if (cachedReviews !== null && !activePostgresPool) {
      return [...cachedReviews];
    }
    try {
      await fs.mkdir(dataDir, { recursive: true });
      const parsed = await readJsonArray(reviewsFile);
      if (Array.isArray(parsed)) {
        cachedReviews = parsed;
        return [...cachedReviews];
      }
    } catch {
      // file not found or corrupted
    }
    cachedReviews = [];
    await atomicWriteJson(reviewsFile, cachedReviews);
    return [...cachedReviews];
  });
}

export async function addReview(newReview) {
  return reviewsLock.acquire(async () => {
    const current = activePostgresPool ? await readJsonArray(reviewsFile) : cachedReviews !== null ? cachedReviews : await (async () => {
      try {
        return await readJsonArray(reviewsFile);
      } catch {
        return [];
      }
    })();

    const next = [newReview, ...current];
    cachedReviews = next;
    await atomicWriteJson(reviewsFile, next);

    // Dynamic rating recalculation for the provider
    if (newReview.providerId) {
      const providerReviews = next.filter(r => r.providerId === newReview.providerId);
      const totalScore = providerReviews.reduce((sum, r) => sum + Number(r.rating || 0), 0);
      const avgRating = providerReviews.length > 0 ? Number((totalScore / providerReviews.length).toFixed(1)) : 5.0;

      await updateUser(newReview.providerId, prov => {
        prov.rating = avgRating;
        prov.reviewCount = providerReviews.length;
        return prov;
      });
    }

    return newReview;
  });
}

export async function getReviewsByProvider(providerId) {
  const reviews = await getReviews();
  return reviews.filter(r => r.providerId === providerId);
}

export async function getReviewByBooking(bookingId) {
  const reviews = await getReviews();
  return reviews.find(r => r.bookingId === bookingId) || null;
}

// ---------------------------------------------------------------------
// Double-Entry Financial Ledger Engine (ACID & Audit-Compliant)
// ---------------------------------------------------------------------
export async function getLedgerEntries() {
  return ledgerLock.acquire(async () => {
    if (cachedLedger !== null && !activePostgresPool) {
      return [...cachedLedger];
    }
    try {
      await fs.mkdir(dataDir, { recursive: true });
      const parsed = await readJsonArray(ledgerFile);
      if (Array.isArray(parsed)) {
        cachedLedger = parsed;
        return [...cachedLedger];
      }
    } catch {}
    cachedLedger = [];
    await atomicWriteJson(ledgerFile, cachedLedger);
    return [...cachedLedger];
  });
}

export async function addLedgerEntries(entries) {
  return ledgerLock.acquire(async () => {
    const current = activePostgresPool ? await readJsonArray(ledgerFile) : cachedLedger !== null ? cachedLedger : await (async () => {
      try {
        return await readJsonArray(ledgerFile);
      } catch {
        return [];
      }
    })();

    const next = [...entries, ...current];
    cachedLedger = next;
    await atomicWriteJson(ledgerFile, next);
    return entries;
  });
}

export async function recordEscrowHold({ bookingId, customerId, amount }) {
  const timestamp = new Date().toISOString();
  const txId = `tx-hold-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  const entries = [
    {
      id: `entry-${Date.now()}-1`,
      transactionId: txId,
      bookingId,
      account: `gateway:payhere:customer:${customerId}`,
      type: 'debit',
      amount: Number(amount),
      currency: 'LKR',
      description: `Escrow hold authorized for booking #${bookingId.slice(-6)}`,
      timestamp
    },
    {
      id: `entry-${Date.now()}-2`,
      transactionId: txId,
      bookingId,
      account: 'vault:ary_escrow_holding',
      type: 'credit',
      amount: Number(amount),
      currency: 'LKR',
      description: `Escrow funds held in trust for booking #${bookingId.slice(-6)}`,
      timestamp
    }
  ];
  await addLedgerEntries(entries);
  return { transactionId: txId, entries };
}

export async function recordEscrowRelease({ bookingId, providerId, amount, platformFee, providerPayout }) {
  const timestamp = new Date().toISOString();
  const txId = `tx-rel-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  const entries = [
    {
      id: `entry-${Date.now()}-3`,
      transactionId: txId,
      bookingId,
      account: 'vault:ary_escrow_holding',
      type: 'debit',
      amount: Number(amount),
      currency: 'LKR',
      description: `Release escrow vault for completed booking #${bookingId.slice(-6)}`,
      timestamp
    },
    {
      id: `entry-${Date.now()}-4`,
      transactionId: txId,
      bookingId,
      account: `provider:${providerId}:wallet`,
      type: 'credit',
      amount: Number(providerPayout),
      currency: 'LKR',
      description: `Net earnings credited for booking #${bookingId.slice(-6)} (90%)`,
      timestamp
    },
    {
      id: `entry-${Date.now()}-5`,
      transactionId: txId,
      bookingId,
      account: 'platform:commission_revenue',
      type: 'credit',
      amount: Number(platformFee),
      currency: 'LKR',
      description: `Platform 10% commission retained for 14-Day ARY Guarantee (#${bookingId.slice(-6)})`,
      timestamp
    }
  ];
  await addLedgerEntries(entries);
  return { transactionId: txId, entries };
}

export async function recordDisputeRefund({ bookingId, customerId, amount, reason = 'Customer dispute approved' }) {
  const timestamp = new Date().toISOString();
  const txId = `tx-dispute-ref-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  const entries = [
    {
      id: `entry-${Date.now()}-ref1`,
      transactionId: txId,
      bookingId,
      account: 'vault:ary_escrow_holding',
      type: 'debit',
      amount: Number(amount),
      currency: 'LKR',
      description: `Escrow refund debited for disputed booking #${bookingId.slice(-6)} (${reason})`,
      timestamp
    },
    {
      id: `entry-${Date.now()}-ref2`,
      transactionId: txId,
      bookingId,
      account: `customer:${customerId}:wallet_refund`,
      type: 'credit',
      amount: Number(amount),
      currency: 'LKR',
      description: `Full refund credited to customer for booking #${bookingId.slice(-6)}`,
      timestamp
    }
  ];
  await addLedgerEntries(entries);
  return { transactionId: txId, entries };
}

export async function recordDisputeSplit({ bookingId, customerId, providerId, totalAmount, customerRefund, providerPayout, platformFee = 0 }) {
  const timestamp = new Date().toISOString();
  const txId = `tx-dispute-split-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  const entries = [
    {
      id: `entry-${Date.now()}-sp1`,
      transactionId: txId,
      bookingId,
      account: 'vault:ary_escrow_holding',
      type: 'debit',
      amount: Number(totalAmount),
      currency: 'LKR',
      description: `Dispute arbitration settlement for booking #${bookingId.slice(-6)}`,
      timestamp
    },
    {
      id: `entry-${Date.now()}-sp2`,
      transactionId: txId,
      bookingId,
      account: `customer:${customerId}:wallet_refund`,
      type: 'credit',
      amount: Number(customerRefund),
      currency: 'LKR',
      description: `Arbitrated 50% refund credited to customer for booking #${bookingId.slice(-6)}`,
      timestamp
    },
    {
      id: `entry-${Date.now()}-sp3`,
      transactionId: txId,
      bookingId,
      account: `provider:${providerId}:wallet`,
      type: 'credit',
      amount: Number(providerPayout),
      currency: 'LKR',
      description: `Arbitrated partial payout credited to provider for booking #${bookingId.slice(-6)}`,
      timestamp
    }
  ];

  if (platformFee > 0) {
    entries.push({
      id: `entry-${Date.now()}-sp4`,
      transactionId: txId,
      bookingId,
      account: 'platform:commission_revenue',
      type: 'credit',
      amount: Number(platformFee),
      currency: 'LKR',
      description: `Platform mediation fee retained for booking #${bookingId.slice(-6)}`,
      timestamp
    });
  }

  await addLedgerEntries(entries);
  return { transactionId: txId, entries };
}

export async function recordCallOutFeeCompensation({ bookingId, customerId, providerId, totalAmount, callOutFee = 500, customerRefund }) {
  const timestamp = new Date().toISOString();
  const txId = `tx-callout-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  const entries = [
    {
      id: `entry-${Date.now()}-co1`,
      transactionId: txId,
      bookingId,
      account: 'vault:ary_escrow_holding',
      type: 'debit',
      amount: Number(totalAmount),
      currency: 'LKR',
      description: `Escrow release for en route cancelled booking #${bookingId.slice(-6)}`,
      timestamp
    },
    {
      id: `entry-${Date.now()}-co2`,
      transactionId: txId,
      bookingId,
      account: `provider:${providerId}:wallet`,
      type: 'credit',
      amount: Number(callOutFee),
      currency: 'LKR',
      description: `Technician call-out travel compensation fee for cancelled booking #${bookingId.slice(-6)}`,
      timestamp
    },
    {
      id: `entry-${Date.now()}-co3`,
      transactionId: txId,
      bookingId,
      account: `customer:${customerId}:wallet_refund`,
      type: 'credit',
      amount: Number(customerRefund),
      currency: 'LKR',
      description: `Remaining escrow balance refunded to customer for booking #${bookingId.slice(-6)}`,
      timestamp
    }
  ];
  await addLedgerEntries(entries);
  return { transactionId: txId, entries };
}

export async function recordPayoutSettlement({ batchId, providerId, amount }) {
  const timestamp = new Date().toISOString();
  const txId = `tx-payout-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  const entries = [
    {
      id: `entry-${Date.now()}-po1`,
      transactionId: txId,
      account: `provider:${providerId}:wallet`,
      type: 'debit',
      amount: Number(amount),
      currency: 'LKR',
      description: `Bank CEFT payout disbursement batch #${batchId.slice(-8)}`,
      timestamp
    },
    {
      id: `entry-${Date.now()}-po2`,
      transactionId: txId,
      account: 'bank:commercial_bank_settlement',
      type: 'credit',
      amount: Number(amount),
      currency: 'LKR',
      description: `Commercial Bank of Ceylon automated electronic funds transfer for provider #${providerId}`,
      timestamp
    }
  ];
  await addLedgerEntries(entries);
  return { transactionId: txId, entries };
}

let activePostgresPool = null;

export function setActivePostgresPool(pool) {
  activePostgresPool = pool;
}

export async function initPostgresTables(pool) {
  if (!pool) return;
  activePostgresPool = pool;
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id VARCHAR(100) PRIMARY KEY,
        full_name VARCHAR(255) NOT NULL,
        phone VARCHAR(50),
        email VARCHAR(255),
        location VARCHAR(255),
        lat DOUBLE PRECISION,
        lng DOUBLE PRECISION,
        password_hash VARCHAR(255),
        account_type VARCHAR(50) NOT NULL,
        status VARCHAR(50) NOT NULL,
        category VARCHAR(100),
        category_name VARCHAR(255),
        base_charge VARCHAR(50),
        rating DOUBLE PRECISION DEFAULT 5.0,
        review_count INT DEFAULT 0,
        experience_years INT DEFAULT 3,
        nic_number VARCHAR(50),
        nic_doc TEXT,
        trade_cert TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS bookings (
        id VARCHAR(100) PRIMARY KEY,
        customer_id VARCHAR(100),
        customer_name VARCHAR(255),
        customer_phone VARCHAR(50),
        provider_id VARCHAR(100),
        provider_name VARCHAR(255),
        provider_phone VARCHAR(50),
        category_slug VARCHAR(100),
        category_name VARCHAR(255),
        booking_date VARCHAR(50),
        booking_time VARCHAR(50),
        service_address TEXT,
        problem_description TEXT,
        status VARCHAR(50) NOT NULL,
        payment_status VARCHAR(50),
        payment_method VARCHAR(50),
        base_amount INT,
        platform_fee INT,
        provider_payout INT,
        declined_by JSONB DEFAULT '[]'::jsonb,
        dispute_reason TEXT,
        dispute_evidence TEXT,
        disputed_at TIMESTAMP WITH TIME ZONE,
        arbitration_notes TEXT,
        arbitrated_at TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS reviews (
        id VARCHAR(100) PRIMARY KEY,
        booking_id VARCHAR(100),
        provider_id VARCHAR(100),
        customer_id VARCHAR(100),
        customer_name VARCHAR(255),
        rating INT NOT NULL,
        comment TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS ledger_entries (
        id VARCHAR(100) PRIMARY KEY,
        transaction_id VARCHAR(100) NOT NULL,
        booking_id VARCHAR(100),
        account VARCHAR(100) NOT NULL,
        type VARCHAR(20) NOT NULL,
        amount INT NOT NULL,
        currency VARCHAR(10) DEFAULT 'LKR',
        description TEXT,
        timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS ary_documents (
        collection VARCHAR(80) NOT NULL,
        record_id VARCHAR(160) NOT NULL,
        position BIGINT NOT NULL,
        payload JSONB NOT NULL,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        PRIMARY KEY (collection, record_id)
      );
      CREATE INDEX IF NOT EXISTS ary_documents_collection_position_idx
        ON ary_documents (collection, position);
    `);
  } finally {
    client.release();
  }
}

let persistentStateQueue = Promise.resolve();

export async function readPersistentState(collection, fallbackFile, fallbackValue = {}) {
  if (activePostgresPool) {
    const result = await activePostgresPool.query(
      'SELECT payload FROM ary_documents WHERE collection = $1 AND record_id = $2',
      [collection, 'state']
    );
    return result.rows[0]?.payload ?? structuredClone(fallbackValue);
  }
  try {
    return JSON.parse(await fs.readFile(fallbackFile, 'utf-8'));
  } catch {
    return structuredClone(fallbackValue);
  }
}

export async function writePersistentState(collection, fallbackFile, value) {
  if (activePostgresPool) {
    const client = await activePostgresPool.connect();
    try {
      await client.query('BEGIN');
      await client.query('SELECT pg_advisory_xact_lock(hashtext($1))', [collection]);
      await client.query(
        `INSERT INTO ary_documents (collection, record_id, position, payload, updated_at)
         VALUES ($1, $2, 0, $3::jsonb, NOW())
         ON CONFLICT (collection, record_id)
         DO UPDATE SET payload = EXCLUDED.payload, updated_at = NOW()`,
        [collection, 'state', JSON.stringify(value)]
      );
      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK').catch(() => {});
      throw error;
    } finally {
      client.release();
    }
    return value;
  }
  const task = persistentStateQueue.then(async () => {
    await fs.mkdir(path.dirname(fallbackFile), { recursive: true });
    await fs.writeFile(fallbackFile, JSON.stringify(value, null, 2), 'utf-8');
  });
  persistentStateQueue = task.catch(() => {});
  await task;
  return value;
}

export async function mutatePersistentState(collection, fallbackFile, fallbackValue, mutator) {
  if (activePostgresPool) {
    const client = await activePostgresPool.connect();
    try {
      await client.query('BEGIN');
      await client.query('SELECT pg_advisory_xact_lock(hashtext($1))', [collection]);
      const result = await client.query(
        'SELECT payload FROM ary_documents WHERE collection = $1 AND record_id = $2 FOR UPDATE',
        [collection, 'state']
      );
      const state = result.rows[0]?.payload ?? structuredClone(fallbackValue);
      const outcome = await mutator(state);
      await client.query(
        `INSERT INTO ary_documents (collection, record_id, position, payload, updated_at)
         VALUES ($1, $2, 0, $3::jsonb, NOW())
         ON CONFLICT (collection, record_id)
         DO UPDATE SET payload = EXCLUDED.payload, updated_at = NOW()`,
        [collection, 'state', JSON.stringify(state)]
      );
      await client.query('COMMIT');
      return outcome;
    } catch (error) {
      await client.query('ROLLBACK').catch(() => {});
      throw error;
    } finally {
      client.release();
    }
  }
  const task = persistentStateQueue.then(async () => {
    let state;
    try { state = JSON.parse(await fs.readFile(fallbackFile, 'utf-8')); }
    catch { state = structuredClone(fallbackValue); }
    const outcome = await mutator(state);
    await fs.mkdir(path.dirname(fallbackFile), { recursive: true });
    await fs.writeFile(fallbackFile, JSON.stringify(state, null, 2), 'utf-8');
    return outcome;
  });
  persistentStateQueue = task.catch(() => {});
  return task;
}

export async function getLedgerByBooking(bookingId) {
  const all = await getLedgerEntries();
  return all.filter(e => e.bookingId === bookingId);
}

export async function getWalletBalance(accountName) {
  const all = await getLedgerEntries();
  const credits = all.filter(e => e.account === accountName && e.type === 'credit').reduce((s, e) => s + e.amount, 0);
  const debits = all.filter(e => e.account === accountName && e.type === 'debit').reduce((s, e) => s + e.amount, 0);
  return credits - debits;
}

export async function initStorage() {
  await getUsers();
  await getBookings();
  await getReviews();
  await getLedgerEntries();
}
