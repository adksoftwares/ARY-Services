import assert from 'node:assert/strict';
import pg from 'pg';
import {
  setActivePostgresPool,
  initPostgresTables,
  initStorage,
  getUsers,
  addUser,
  updateUser,
  deleteUser,
  getBookings,
  addBooking,
  updateBooking,
  saveBookings,
  getReviews,
  addReview,
  getLedgerEntries,
  addLedgerEntries,
  getWalletBalance
} from '../src/storage.js';

if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required for the PostgreSQL storage integration test.');

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL, max: 3 });
const suffix = `pg-test-${Date.now()}`;

try {
  setActivePostgresPool(pool);
  await initPostgresTables(pool);
  await initStorage();

  const user = {
    id: `${suffix}-user`,
    fullName: 'PostgreSQL Integration Test',
    phone: '0770000000',
    email: `${suffix}@example.local`,
    accountType: 'customer',
    status: 'active'
  };
  await addUser(user);
  assert((await getUsers()).some(item => item.id === user.id), 'User should persist in PostgreSQL');
  await updateUser(user.id, current => ({ ...current, fullName: 'Updated PostgreSQL Test' }));
  assert.equal((await getUsers()).find(item => item.id === user.id).fullName, 'Updated PostgreSQL Test');

  const booking = {
    id: `${suffix}-booking`,
    customerId: user.id,
    providerId: 'test-provider',
    status: 'requested'
  };
  await addBooking(booking);
  await updateBooking(booking.id, { status: 'accepted' });
  assert.equal((await getBookings()).find(item => item.id === booking.id).status, 'accepted');

  const review = {
    id: `${suffix}-review`,
    bookingId: booking.id,
    providerId: 'test-provider',
    customerId: user.id,
    rating: 5,
    comment: 'PostgreSQL integration test'
  };
  await addReview(review);
  assert((await getReviews()).some(item => item.id === review.id), 'Review should persist in PostgreSQL');

  await addLedgerEntries([
    { id: `${suffix}-credit`, transactionId: suffix, account: `${suffix}-wallet`, type: 'credit', amount: 1000, currency: 'LKR' },
    { id: `${suffix}-debit`, transactionId: suffix, account: `${suffix}-wallet`, type: 'debit', amount: 250, currency: 'LKR' }
  ]);
  assert.equal(await getWalletBalance(`${suffix}-wallet`), 750, 'Ledger balance should be calculated from PostgreSQL records');

  await saveBookings((await getBookings()).filter(item => item.id !== booking.id));
  await deleteUser(user.id);
  console.log('PostgreSQL storage integration passed: users, bookings, reviews and ledger records persist through the database adapter.');
} finally {
  await pool.end();
}
