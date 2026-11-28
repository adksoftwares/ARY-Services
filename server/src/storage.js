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
if (process.env.NODE_ENV === 'production' && process.env.ADMIN_PASSWORD && Buffer.byteLength(process.env.ADMIN_PASSWORD) < 14) {
  throw new Error('ADMIN_PASSWORD must contain at least 14 characters in production.');
}
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
    id: 'user-provider-plumbing-secondary',
    passwordHash: process.env.NODE_ENV === 'production' ? undefined : hashPassword('SecondaryPlumbPass@123'),
    fullName: 'Reliable Plumbing Services',
    phone: '0775556677',
    email: 'secondary.plumb@example.local',
    location: 'Colombo 04',
    lat: 6.8855,
    lng: 79.8605,
    accountType: 'provider',
    status: 'active',
    category: 'plumbing',
    categoryName: 'Plumbing',
    baseCharge: 'LKR 1,600',
    rating: 4.7,
    reviewCount: 9,
    experienceYears: 3,
    createdAt: '2026-01-04T00:00:00.000Z'
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

export const defaultSeedDriver = process.env.NODE_ENV === 'production' ? null : {
  id: 'user-driver-saman',
  passwordHash: hashPassword('DriverPass@123'),
  fullName: 'Express Courier & Rider Saman',
  phone: '0778887766',
  email: 'saman.driver@example.local',
  location: 'Hospital Road, Batticaloa',
  accountType: 'driver',
  roles: ['customer', 'driver'],
  driverServices: ['ride', 'food_delivery', 'parcel_delivery'],
  status: 'active',
  isOnline: true,
  createdAt: '2026-01-01T00:00:00.000Z'
};

export const defaultUsers = [
  ...(defaultAdminUser ? [defaultAdminUser] : []),
  ...defaultSeedProviders,
  ...(defaultSeedDriver ? [defaultSeedDriver] : [])
];

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


// Execute a collection read-modify-write under one PostgreSQL transaction.
// The advisory transaction lock is shared across API instances, so a write cannot
// overwrite another instance's update after reading the same stale collection.
async function mutatePostgresArray(filePath, mutator) {
  if (!activePostgresPool) throw new Error('PostgreSQL storage is not configured.');
  const collection = path.basename(filePath, '.json');
  const client = await activePostgresPool.connect();
  try {
    await client.query('BEGIN');
    await client.query('SELECT pg_advisory_xact_lock(hashtext($1))', [collection]);
    const result = await client.query(
      'SELECT payload FROM ary_documents WHERE collection = $1 ORDER BY position ASC',
      [collection]
    );
    const current = result.rows.map(row => row.payload);
    const outcome = await mutator(current);
    const next = Array.isArray(outcome?.next) ? outcome.next : current;
    if (next !== current) {
      await client.query('DELETE FROM ary_documents WHERE collection = $1', [collection]);
      if (next.length) {
        const values = [];
        const placeholders = next.map((item, index) => {
          const offset = index * 4;
          values.push(collection, String(item.id ?? index), index, JSON.stringify(item));
          return `($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}::jsonb)`;
        });
        await client.query(
          `INSERT INTO ary_documents (collection, record_id, position, payload) VALUES ${placeholders.join(', ')}`,
          values
        );
      }
    }
    await client.query('COMMIT');
    return { data: next, value: outcome?.value };
  } catch (error) {
    await client.query('ROLLBACK').catch(() => {});
    throw error;
  } finally {
    client.release();
  }
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
        if (defaultAdminUser) {
          const adminIdx = parsed.findIndex(u => u.accountType === 'admin' || u.id === defaultAdminUser.id || u.email === defaultAdminUser.email);
          if (adminIdx >= 0) {
            parsed[adminIdx] = { ...parsed[adminIdx], ...defaultAdminUser };
          } else {
            parsed.unshift(defaultAdminUser);
          }
        }
        // Ensure demo catalog providers exist so local preview categories are populated
        for (const seedProv of defaultSeedProviders) {
          if (!parsed.some(u => u.id === seedProv.id)) {
            parsed.push(seedProv);
          }
        }
        if (defaultSeedDriver && !parsed.some(u => u.id === defaultSeedDriver.id)) {
          parsed.push(defaultSeedDriver);
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
    if (defaultAdminUser) {
      const adminIdx = users.findIndex(u => u.accountType === 'admin' || u.id === defaultAdminUser.id || u.email === defaultAdminUser.email);
      if (adminIdx >= 0) {
        users[adminIdx] = { ...users[adminIdx], ...defaultAdminUser };
      } else {
        users = [defaultAdminUser, ...users];
      }
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
  if (activePostgresPool) {
    return usersLock.acquire(async () => {
      const { data, value } = await mutatePostgresArray(usersFile, current => ({ next: [...current, newUser], value: newUser }));
      cachedUsers = data;
      return value;
    });
  }
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
  if (activePostgresPool) {
    return usersLock.acquire(async () => {
      const { data, value } = await mutatePostgresArray(usersFile, current => {
        const index = current.findIndex(user => user.id === id);
        if (index === -1) return { next: current, value: null };
        const next = [...current];
        const updated = typeof updater === 'function' ? updater(next[index]) : { ...next[index], ...updater };
        next[index] = updated;
        return { next, value: updated };
      });
      cachedUsers = data;
      return value;
    });
  }
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
  if (activePostgresPool) {
    return usersLock.acquire(async () => {
      const { data } = await mutatePostgresArray(usersFile, current => ({ next: current.filter(user => user.id !== id), value: true }));
      cachedUsers = data;
      return true;
    });
  }
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
  if (activePostgresPool) {
    return bookingsLock.acquire(async () => {
      const { data, value } = await mutatePostgresArray(bookingsFile, current => ({ next: [newBooking, ...current], value: newBooking }));
      cachedBookings = data;
      return value;
    });
  }
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
  if (activePostgresPool) {
    return bookingsLock.acquire(async () => {
      const { data, value } = await mutatePostgresArray(bookingsFile, current => {
        const index = current.findIndex(booking => booking.id === id);
        if (index === -1) return { next: current, value: null };
        const next = [...current];
        const updated = typeof updater === 'function' ? updater(next[index]) : { ...next[index], ...updater };
        next[index] = updated;
        return { next, value: updated };
      });
      cachedBookings = data;
      return value;
    });
  }
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
  if (activePostgresPool) {
    return reviewsLock.acquire(async () => {
      const { data, value } = await mutatePostgresArray(reviewsFile, current => ({ next: [newReview, ...current], value: newReview }));
      cachedReviews = data;
      if (newReview.providerId) {
        const providerReviews = data.filter(review => review.providerId === newReview.providerId);
        const totalScore = providerReviews.reduce((sum, review) => sum + Number(review.rating || 0), 0);
        const avgRating = providerReviews.length ? Number((totalScore / providerReviews.length).toFixed(1)) : 5.0;
        await updateUser(newReview.providerId, provider => {
          provider.rating = avgRating;
          provider.reviewCount = providerReviews.length;
          return provider;
        });
      }
      return value;
    });
  }
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
  if (activePostgresPool) {
    return ledgerLock.acquire(async () => {
      const { data, value } = await mutatePostgresArray(ledgerFile, current => ({ next: [...entries, ...current], value: entries }));
      cachedLedger = data;
      return value;
    });
  }
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

async function recordBalancedLedgerTransaction(transactionId, entries) {
  return ledgerLock.acquire(async () => {
    const apply = current => {
      if (!Array.isArray(entries) || entries.length < 2) throw new Error('Financial transactions require at least two entries.');
      const bookingId = entries[0]?.bookingId;
      const entryIds = new Set();
      for (const entry of entries) {
        const amount = Number(entry.amount);
        if (!Number.isSafeInteger(amount) || amount <= 0 || !['debit', 'credit'].includes(entry.type) ||
          !entry.account || !entry.id || !bookingId || entry.bookingId !== bookingId ||
          entry.currency !== 'LKR' || entry.transactionId !== transactionId || entryIds.has(entry.id)) {
          throw new Error('Invalid ledger entry.');
        }
        entryIds.add(entry.id);
      }
      const debits = entries.filter(entry => entry.type === 'debit').reduce((sum, entry) => sum + Number(entry.amount), 0);
      const credits = entries.filter(entry => entry.type === 'credit').reduce((sum, entry) => sum + Number(entry.amount), 0);
      if (debits !== credits) throw new Error('Financial transaction is unbalanced.');

      const existing = current.filter(entry => entry.transactionId === transactionId);
      if (existing.length) {
        if (existing.length !== entries.length) throw new Error('Incomplete transaction exists; reconciliation required.');
        const expected = new Map(entries.map(entry => [entry.id, JSON.stringify({
          bookingId: entry.bookingId, account: entry.account, type: entry.type,
          amount: Number(entry.amount), currency: entry.currency
        })]));
        const savedIds = new Set();
        for (const saved of existing) {
          const expectedPayload = expected.get(saved.id);
          const savedPayload = JSON.stringify({
            bookingId: saved.bookingId, account: saved.account, type: saved.type,
            amount: Number(saved.amount), currency: saved.currency
          });
          if (!expectedPayload || expectedPayload !== savedPayload || savedIds.has(saved.id)) {
            throw new Error('Idempotency key conflict: transaction payload differs from the original.');
          }
          savedIds.add(saved.id);
        }
        return { next: current, value: { transactionId, entries: existing, duplicate: true } };
      }

      const competingSettlement = current.find(entry =>
        entry.bookingId === bookingId && entry.account === 'vault:ary_escrow_holding' && entry.type === 'debit'
      );
      if (competingSettlement) throw new Error('Booking already has a different financial settlement recorded.');
      return { next: [...entries, ...current], value: { transactionId, entries, duplicate: false } };
    };

    if (activePostgresPool) {
      const { data, value } = await mutatePostgresArray(ledgerFile, apply);
      cachedLedger = data;
      return value;
    }
    const current = cachedLedger !== null ? cachedLedger : await (async () => {
      try { return await readJsonArray(ledgerFile); } catch { return []; }
    })();
    const { next, value } = apply(current);
    cachedLedger = next;
    await atomicWriteJson(ledgerFile, next);
    return value;
  });
}

export async function recordEscrowHold({ bookingId, customerId, amount }) {
  const value = Number(amount);
  if (!Number.isSafeInteger(value) || value <= 0) {
    throw new Error('Escrow amount must be a positive whole-number LKR amount.');
  }

  const timestamp = new Date().toISOString();
  const transactionId = `tx-hold-${bookingId}`;
  const entries = [
    {
      id: `entry-hold-${bookingId}-debit`,
      transactionId,
      bookingId,
      account: `gateway:payhere:customer:${customerId}`,
      type: 'debit',
      amount: value,
      currency: 'LKR',
      description: `Escrow hold authorized for booking #${bookingId.slice(-6)}`,
      timestamp
    },
    {
      id: `entry-hold-${bookingId}-credit`,
      transactionId,
      bookingId,
      account: 'vault:ary_escrow_holding',
      type: 'credit',
      amount: value,
      currency: 'LKR',
      description: `Escrow funds held for booking #${bookingId.slice(-6)}`,
      timestamp
    }
  ];
  return recordBalancedLedgerTransaction(transactionId, entries);
}

export async function recordEscrowRelease({ bookingId, providerId, amount, platformFee, providerPayout }) {
  const total = Number(amount);
  const fee = Number(platformFee);
  const payout = Number(providerPayout);
  if (
    !Number.isSafeInteger(total) || total <= 0 ||
    !Number.isSafeInteger(fee) || fee < 0 ||
    !Number.isSafeInteger(payout) || payout < 0 ||
    fee + payout !== total
  ) {
    throw new Error('Escrow release values must be whole-number LKR amounts and balance.');
  }

  const timestamp = new Date().toISOString();
  const transactionId = `tx-release-${bookingId}`;
  const entries = [
    {
      id: `entry-release-${bookingId}-vault`,
      transactionId,
      bookingId,
      account: 'vault:ary_escrow_holding',
      type: 'debit',
      amount: total,
      currency: 'LKR',
      description: `Escrow release for booking #${bookingId.slice(-6)}`,
      timestamp
    },
    {
      id: `entry-release-${bookingId}-provider`,
      transactionId,
      bookingId,
      account: `provider:${providerId}:wallet`,
      type: 'credit',
      amount: payout,
      currency: 'LKR',
      description: `Provider earnings for booking #${bookingId.slice(-6)}`,
      timestamp
    },
    {
      id: `entry-release-${bookingId}-fee`,
      transactionId,
      bookingId,
      account: 'platform:commission_revenue',
      type: 'credit',
      amount: fee,
      currency: 'LKR',
      description: `Platform commission for booking #${bookingId.slice(-6)}`,
      timestamp
    }
  ].filter(entry => entry.amount > 0);
  return recordBalancedLedgerTransaction(transactionId, entries);
}

export async function recordDisputeRefund({ bookingId, customerId, amount, reason = 'Customer dispute approved' }) {
  const value = Number(amount);
  if (!Number.isSafeInteger(value) || value <= 0) {
    throw new Error('Refund amount must be a positive whole-number LKR amount.');
  }

  const timestamp = new Date().toISOString();
  const transactionId = `tx-refund-${bookingId}`;
  const entries = [
    {
      id: `entry-refund-${bookingId}-vault`,
      transactionId,
      bookingId,
      account: 'vault:ary_escrow_holding',
      type: 'debit',
      amount: value,
      currency: 'LKR',
      description: `Escrow refund for booking #${bookingId.slice(-6)}: ${reason}`,
      timestamp
    },
    {
      id: `entry-refund-${bookingId}-customer`,
      transactionId,
      bookingId,
      account: `customer:${customerId}:wallet_refund`,
      type: 'credit',
      amount: value,
      currency: 'LKR',
      description: `Customer refund for booking #${bookingId.slice(-6)}`,
      timestamp
    }
  ];
  return recordBalancedLedgerTransaction(transactionId, entries);
}

export async function recordDisputeSplit({ bookingId, customerId, providerId, totalAmount, customerRefund, providerPayout, platformFee = 0 }) {
  const total = Number(totalAmount);
  const refund = Number(customerRefund);
  const payout = Number(providerPayout);
  const fee = Number(platformFee);
  if (
    ![total, refund, payout, fee].every(Number.isSafeInteger) ||
    total <= 0 || refund < 0 || payout < 0 || fee < 0 ||
    refund + payout + fee !== total
  ) {
    throw new Error('Settlement amounts must be whole-number LKR values and balance.');
  }

  const timestamp = new Date().toISOString();
  const transactionId = `tx-split-${bookingId}`;
  const entries = [
    {
      id: `entry-split-${bookingId}-vault`,
      transactionId,
      bookingId,
      account: 'vault:ary_escrow_holding',
      type: 'debit',
      amount: total,
      currency: 'LKR',
      description: `Dispute settlement for booking #${bookingId.slice(-6)}`,
      timestamp
    },
    {
      id: `entry-split-${bookingId}-customer`,
      transactionId,
      bookingId,
      account: `customer:${customerId}:wallet_refund`,
      type: 'credit',
      amount: refund,
      currency: 'LKR',
      description: `Dispute refund for booking #${bookingId.slice(-6)}`,
      timestamp
    },
    {
      id: `entry-split-${bookingId}-provider`,
      transactionId,
      bookingId,
      account: `provider:${providerId}:wallet`,
      type: 'credit',
      amount: payout,
      currency: 'LKR',
      description: `Dispute payout for booking #${bookingId.slice(-6)}`,
      timestamp
    },
    ...(fee > 0 ? [{
      id: `entry-split-${bookingId}-fee`,
      transactionId,
      bookingId,
      account: 'platform:commission_revenue',
      type: 'credit',
      amount: fee,
      currency: 'LKR',
      description: `Dispute platform fee for booking #${bookingId.slice(-6)}`,
      timestamp
    }] : [])
  ].filter(entry => entry.amount > 0);
  return recordBalancedLedgerTransaction(transactionId, entries);
}

export async function recordCallOutFeeCompensation({ bookingId, customerId, providerId, totalAmount, callOutFee = 500, customerRefund }) {
  const total = Number(totalAmount);
  const fee = Number(callOutFee);
  const refund = Number(customerRefund);
  if (
    ![total, fee, refund].every(Number.isSafeInteger) ||
    total <= 0 || fee < 0 || refund < 0 ||
    fee + refund !== total
  ) {
    throw new Error('Call-out fee and refund must be whole-number LKR amounts that balance.');
  }

  const timestamp = new Date().toISOString();
  const transactionId = `tx-callout-${bookingId}`;
  const entries = [
    {
      id: `entry-callout-${bookingId}-vault`,
      transactionId,
      bookingId,
      account: 'vault:ary_escrow_holding',
      type: 'debit',
      amount: total,
      currency: 'LKR',
      description: `Escrow release for cancelled booking #${bookingId.slice(-6)}`,
      timestamp
    },
    {
      id: `entry-callout-${bookingId}-provider`,
      transactionId,
      bookingId,
      account: `provider:${providerId}:wallet`,
      type: 'credit',
      amount: fee,
      currency: 'LKR',
      description: `Call-out compensation for booking #${bookingId.slice(-6)}`,
      timestamp
    },
    {
      id: `entry-callout-${bookingId}-customer`,
      transactionId,
      bookingId,
      account: `customer:${customerId}:wallet_refund`,
      type: 'credit',
      amount: refund,
      currency: 'LKR',
      description: `Remaining customer refund for booking #${bookingId.slice(-6)}`,
      timestamp
    }
  ].filter(entry => entry.amount > 0);
  return recordBalancedLedgerTransaction(transactionId, entries);
}

export async function recordPayoutSettlement({ batchId, providerId, amount, bankReference = '' }) {
  return ledgerLock.acquire(async () => {
    if (typeof batchId !== 'string' || !batchId.trim() || typeof providerId !== 'string' || !providerId.trim()) {
      throw new Error('Payout batch and provider identifiers are required.');
    }
    const payoutAmount = Number(amount);
    if (!Number.isSafeInteger(payoutAmount) || payoutAmount <= 0) throw new Error('Payout amount must be a positive whole-number LKR amount.');

    const apply = current => {
      const account = `provider:${providerId}:wallet`;
      const transactionId = `tx-payout-${batchId}`;
      const existing = current.filter(entry => entry.transactionId === transactionId);
      if (existing.length) {
        const expectedBankReference = bankReference ? `Bank reference ${bankReference}` : '';
        const validReplay = existing.length === 2 &&
          existing.some(entry => entry.account === account && entry.type === 'debit' && Number(entry.amount) === payoutAmount && String(entry.description || '').includes(`batch #${batchId.slice(-8)}`)) &&
          existing.some(entry => entry.account === 'bank:external_provider_settlement' && entry.type === 'credit' && Number(entry.amount) === payoutAmount && String(entry.description || '').includes(`provider #${providerId}`)) &&
          existing.every(entry => expectedBankReference
            ? String(entry.description || '').includes(expectedBankReference)
            : !String(entry.description || '').includes('Bank reference '));
        if (!validReplay) throw new Error('Payout idempotency key conflict: batch payload differs from the original.');
        return { next: current, value: { transactionId, entries: existing, duplicate: true } };
      }
      if (bankReference && current.some(entry => entry.account === account && String(entry.description || '').includes(`Bank reference ${bankReference}`))) {
        throw new Error('This bank transfer reference has already been recorded.');
      }
      const balance = current.filter(entry => entry.account === account)
        .reduce((total, entry) => total + (entry.type === 'credit' ? Number(entry.amount) : -Number(entry.amount)), 0);
      if (payoutAmount > balance) throw new Error('The payout amount is invalid or exceeds the current wallet balance.');

      const timestamp = new Date().toISOString();
      const entries = [
        {
          id: `entry-payout-${batchId}-debit`, transactionId, account, type: 'debit',
          amount: payoutAmount, currency: 'LKR',
          description: `Confirmed bank transfer batch #${batchId.slice(-8)}${bankReference ? ` | Bank reference ${bankReference}` : ''}`,
          timestamp
        },
        {
          id: `entry-payout-${batchId}-credit`, transactionId, account: 'bank:external_provider_settlement', type: 'credit',
          amount: payoutAmount, currency: 'LKR',
          description: `External bank transfer recorded for provider #${providerId}${bankReference ? ` | Bank reference ${bankReference}` : ''}`,
          timestamp
        }
      ];
      return { next: [...entries, ...current], value: { transactionId, entries, duplicate: false } };
    };

    if (activePostgresPool) {
      const { data, value } = await mutatePostgresArray(ledgerFile, apply);
      cachedLedger = data;
      return value;
    }
    const current = cachedLedger !== null ? cachedLedger : await (async () => {
      try { return await readJsonArray(ledgerFile); } catch { return []; }
    })();
    const { next, value } = apply(current);
    cachedLedger = next;
    await atomicWriteJson(ledgerFile, next);
    return value;
  });
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

      CREATE TABLE IF NOT EXISTS otp_rate_limits (
        phone_key CHAR(64) PRIMARY KEY,
        window_started_at BIGINT NOT NULL,
        send_count INT NOT NULL DEFAULT 0,
        last_sent_at BIGINT NOT NULL DEFAULT 0,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS otp_rate_limits_updated_at_idx ON otp_rate_limits (updated_at);

      CREATE TABLE IF NOT EXISTS otp_used_challenges (
        challenge_id VARCHAR(120) PRIMARY KEY,
        expires_at BIGINT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS otp_used_challenges_expires_idx ON otp_used_challenges (expires_at);
      CREATE INDEX IF NOT EXISTS ary_documents_collection_position_idx
        ON ary_documents (collection, position);
    `);
  } finally {
    client.release();
  }
}

let persistentStateQueue = Promise.resolve();

async function atomicWriteText(filePath, content) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  const tempPath = `${filePath}.tmp.${process.pid}.${crypto.randomUUID()}`;
  try {
    await fs.writeFile(tempPath, content, { encoding: 'utf-8', flag: 'wx' });
    try {
      await fs.rename(tempPath, filePath);
    } catch {
      // Windows file locking retry & copyFile fallback
      try {
        await new Promise(r => setTimeout(r, 60));
        await fs.rename(tempPath, filePath);
      } catch {
        await fs.copyFile(tempPath, filePath);
        await fs.unlink(tempPath).catch(() => {});
      }
    }
  } catch (error) {
    await fs.unlink(tempPath).catch(() => {});
    throw error;
  }
}

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
    await atomicWriteText(fallbackFile, JSON.stringify(value, null, 2));
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
    await atomicWriteText(fallbackFile, JSON.stringify(state, null, 2));
    return outcome;
  });
  persistentStateQueue = task.catch(() => {});
  return task;
}

// Mutate several JSONB-backed state collections in one transaction.
// Locks are acquired in stable order to avoid cross-collection deadlocks.
export async function recordAdminAuditEvent(event) {
  const fallbackFile = path.join(dataDir, 'admin-audit-logs.json');
  const record = {
    id: `audit-${crypto.randomUUID()}`,
    createdAt: new Date().toISOString(),
    actorId: String(event?.actorId || 'unknown').slice(0, 120),
    actorRole: String(event?.actorRole || 'unknown').slice(0, 40),
    action: String(event?.action || 'unknown').slice(0, 120),
    targetType: String(event?.targetType || 'unknown').slice(0, 80),
    targetId: String(event?.targetId || '').slice(0, 160),
    requestId: String(event?.requestId || '').slice(0, 100),
    details: event?.details && typeof event.details === 'object' && !Array.isArray(event.details) ? event.details : {}
  };
  await mutatePersistentState('admin_audit_logs', fallbackFile, [], records => {
    if (!Array.isArray(records)) throw new Error('Admin audit log storage is invalid.');
    records.unshift(record);
    if (records.length > 10000) records.length = 10000;
    return record;
  });
  return record;
}

export async function listAdminAuditEvents(limit = 100) {
  const fallbackFile = path.join(dataDir, 'admin-audit-logs.json');
  const records = await readPersistentState('admin_audit_logs', fallbackFile, []);
  return Array.isArray(records) ? records.slice(0, Math.max(1, Math.min(200, Number(limit) || 100))) : [];
}

export async function mutatePersistentStates(operations) {
  if (!Array.isArray(operations) || !operations.length) throw new Error('At least one state mutation is required.');
  const collections = new Set();
  for (const operation of operations) {
    if (!operation?.collection || typeof operation.mutator !== 'function' || !operation.fallbackFile) {
      throw new Error('Each state mutation requires a collection, fallback file and mutator.');
    }
    if (collections.has(operation.collection)) throw new Error('A collection may only be mutated once per transaction.');
    collections.add(operation.collection);
  }

  if (activePostgresPool) {
    const client = await activePostgresPool.connect();
    try {
      await client.query('BEGIN');
      const ordered = [...operations].sort((a, b) => a.collection.localeCompare(b.collection));
      for (const operation of ordered) {
        await client.query('SELECT pg_advisory_xact_lock(hashtext($1))', [operation.collection]);
      }
      const states = new Map();
      for (const operation of operations) {
        const result = await client.query(
          'SELECT payload FROM ary_documents WHERE collection = $1 AND record_id = $2 FOR UPDATE',
          [operation.collection, 'state']
        );
        states.set(operation.collection, result.rows[0]?.payload ?? structuredClone(operation.fallbackValue));
      }
      const outcomes = [];
      for (const operation of operations) {
        const state = states.get(operation.collection);
        outcomes.push(await operation.mutator(state));
      }
      for (const operation of operations) {
        await client.query(
          `INSERT INTO ary_documents (collection, record_id, position, payload, updated_at)
           VALUES ($1, $2, 0, $3::jsonb, NOW())
           ON CONFLICT (collection, record_id)
           DO UPDATE SET payload = EXCLUDED.payload, updated_at = NOW()`,
          [operation.collection, 'state', JSON.stringify(states.get(operation.collection))]
        );
      }
      await client.query('COMMIT');
      return outcomes;
    } catch (error) {
      await client.query('ROLLBACK').catch(() => {});
      throw error;
    } finally {
      client.release();
    }
  }

  const task = persistentStateQueue.then(async () => {
    const states = new Map();
    for (const operation of operations) {
      try { states.set(operation.collection, JSON.parse(await fs.readFile(operation.fallbackFile, 'utf-8'))); }
      catch { states.set(operation.collection, structuredClone(operation.fallbackValue)); }
    }
    const outcomes = [];
    for (const operation of operations) outcomes.push(await operation.mutator(states.get(operation.collection)));
    for (const operation of operations) {
      await atomicWriteText(operation.fallbackFile, JSON.stringify(states.get(operation.collection), null, 2));
    }
    return outcomes;
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
