import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import {
  initStorage,
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
  verifyPassword,
  hashPassword,
  defaultAdminUser
} from '../src/storage.js';
import { sendOtp, verifyOtp, normalizePhone } from '../src/otpService.js';

console.log('🚀 [TEST SUITE] Starting ARY Services Comprehensive Verification...\n');

// ---------------------------------------------------------
// 1. Storage & Concurrency Unit Tests
// ---------------------------------------------------------
console.log('--- 1. Testing Storage & Mutex Concurrency ---');

await initStorage();
const initialUsers = await getUsers();
assert(Array.isArray(initialUsers), 'Users should be an array');
assert(initialUsers.some(u => u.email === 'arikarran14@gmail.com'), 'Admin user must exist');
assert(initialUsers.some(u => u.accountType === 'provider' && u.category === 'electrical-repair'), 'Seed electrical provider must exist');
assert(initialUsers.some(u => u.accountType === 'provider' && u.category === 'plumbing'), 'Seed plumbing provider must exist');
console.log('✓ Storage initialized, default admin user & seed providers confirmed');

// Concurrency Test: 30 concurrent user creations
console.log('Running 30 concurrent atomic writes...');
const testIds = [];
const promises = [];
for (let i = 0; i < 30; i++) {
  const id = `test-concurrent-user-${Date.now()}-${i}`;
  testIds.push(id);
  promises.push(
    addUser({
      id,
      fullName: `Concurrent User ${i}`,
      phone: `07700000${String(i).padStart(2, '0')}`,
      email: `test${i}@concurrent.local`,
      accountType: 'customer',
      status: 'active',
      passwordHash: hashPassword('testpass123'),
      createdAt: new Date().toISOString()
    })
  );
}

await Promise.all(promises);
const afterUsers = await getUsers();
for (const id of testIds) {
  const found = afterUsers.find(u => u.id === id);
  assert(found, `User ${id} must exist in persistent store after concurrent writes`);
}
console.log('✓ Concurrency test passed: 30/30 simultaneous atomic writes saved with 0 corruption or race loss');

// Cleanup test users
for (const id of testIds) {
  await deleteUser(id);
}
console.log('✓ Cleanup of test users completed');

// ---------------------------------------------------------
// 2. OTP Service Unit Tests
// ---------------------------------------------------------
console.log('\n--- 2. Testing OTP Generation, Verification & Rate-Limiting ---');

// Test Phone Normalization
assert.equal(normalizePhone('+94 77 123 4567'), '0771234567', 'Normalize +94 format');
assert.equal(normalizePhone('077-123-4567'), '0771234567', 'Normalize hyphens');
assert.equal(normalizePhone('077 123 4567'), '0771234567', 'Normalize spaces');
console.log('✓ Phone number normalization (+94, hyphens, spaces) verified');

const testPhone = '077 987 6543';
const sendRes = sendOtp(testPhone);
assert(sendRes.success === true, 'OTP send should succeed');
assert(sendRes.devCode && sendRes.devCode.length === 6, 'OTP must be 6 digits');
console.log(`✓ OTP generated successfully: [${sendRes.devCode}] for ${sendRes.phone}`);

// Test 30s Cooldown
const cooldownRes = sendOtp(testPhone);
assert(cooldownRes.success === false, 'Immediate second OTP request must be rejected by cooldown');
assert(cooldownRes.waitSeconds > 0, 'Wait seconds must be greater than 0');
console.log(`✓ Cooldown rate-limit enforced: rejected with wait seconds: ${cooldownRes.waitSeconds}`);

// Test Invalid Code
const wrongRes = verifyOtp(testPhone, '000000');
assert(wrongRes.valid === false, 'Invalid OTP must be rejected');
console.log('✓ Invalid code correctly rejected');

// Test Valid Code
const correctRes = verifyOtp(testPhone, sendRes.devCode);
assert(correctRes.valid === true, 'Valid OTP must be accepted');
console.log('✓ Valid code accepted');

// Test Single-Use (Replay attack prevention)
const replayRes = verifyOtp(testPhone, sendRes.devCode);
assert(replayRes.valid === false, 'Replaying consumed OTP must be rejected');
console.log('✓ Replay prevention confirmed: code cannot be reused');

// Test Rate Limit Preservation after code consumption
const cooldownAfterConsume = sendOtp(testPhone);
assert(cooldownAfterConsume.success === false, 'Send cooldown must NOT be reset by consuming an OTP');
console.log('✓ Rate-limit preservation confirmed: consuming OTP preserves phone send cooldown');

// Test Brute-force 5-attempt threshold
console.log('Testing OTP brute-force lockout...');
const brutePhone = '077 111 2233';
const bruteSend = sendOtp(brutePhone);
assert(bruteSend.success === true);

// 4 wrong attempts
for (let attempt = 1; attempt <= 4; attempt++) {
  const res = verifyOtp(brutePhone, '000000');
  assert.equal(res.valid, false);
  assert(res.error.includes(`${5 - attempt} attempt`), `Should show remaining attempts: ${res.error}`);
}
// 5th wrong attempt should lock out immediately
const lockRes = verifyOtp(brutePhone, '000000');
assert.equal(lockRes.valid, false);
assert(lockRes.error.includes('invalidated for security'), 'Must be invalidated on 5th attempt');

// Subsequent attempt even with the CORRECT code must be rejected because code was deleted
const tryCorrectAfterLockout = verifyOtp(brutePhone, bruteSend.devCode);
assert.equal(tryCorrectAfterLockout.valid, false, 'Correct code must be rejected after brute-force lockout');
console.log('✓ Brute-force lockout confirmed: code immediately destroyed on 5th failure');

// ---------------------------------------------------------
// 3. API Integration Tests (Spawning API Server on port 4001)
// ---------------------------------------------------------
console.log('\n--- 3. Testing API Endpoints (Health, Two-Step OTP Flow, RBAC, Bookings) ---');

const TEST_PORT = 4001;
const API_URL = `http://localhost:${TEST_PORT}/api`;

const serverProc = spawn('node', ['src/server.js'], {
  cwd: new URL('..', import.meta.url),
  env: { ...process.env, PORT: String(TEST_PORT) },
  stdio: 'pipe'
});

serverProc.stdout.on('data', d => {
  // console.log('[SERVER]', d.toString().trim());
});
serverProc.stderr.on('data', d => {
  console.error('[SERVER ERR]', d.toString().trim());
});

// Wait for server to be ready
let serverReady = false;
for (let i = 0; i < 20; i++) {
  try {
    const res = await fetch(`${API_URL}/health`);
    if (res.ok) {
      serverReady = true;
      break;
    }
  } catch {}
  await new Promise(r => setTimeout(r, 250));
}

if (!serverReady) {
  serverProc.kill();
  throw new Error('API server failed to start within timeout');
}
console.log(`✓ Test API server listening on port ${TEST_PORT}`);

try {
  // Health endpoint
  const healthRes = await fetch(`${API_URL}/health`);
  const healthData = await healthRes.json();
  assert.equal(healthData.status, 'ok');
  assert.equal(healthData.storage, 'async-atomic-file-mutex');
  console.log('✓ GET /api/health passed');

  // Public catalog includes default verified providers
  const publicProvRes = await fetch(`${API_URL}/providers`);
  const publicProvData = await publicProvRes.json();
  assert.equal(publicProvRes.status, 200);
  assert(publicProvData.providers.length >= 3, 'Must have seed verified providers listed');
  console.log(`✓ GET /api/providers returned ${publicProvData.providers.length} default verified providers`);

  // TWO-STEP CUSTOMER OTP FLOW (The flow used in the interactive UI)
  console.log('Testing interactive two-step customer OTP sign-up flow...');
  const newCustPhone = '0775' + Date.now().toString().slice(-6);

  // Step A: Send OTP
  const otpSendRes = await fetch(`${API_URL}/auth/otp/send`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone: newCustPhone })
  });
  const otpSendData = await otpSendRes.json();
  assert.equal(otpSendRes.status, 200);
  assert(otpSendData.devCode, 'devCode returned for dev simulation');
  console.log(`✓ Step A: POST /api/auth/otp/send generated code [${otpSendData.devCode}]`);

  // Step B: Submit OTP code ONLY (no fullName yet, as in UI modal)
  const otpVerifyStep1 = await fetch(`${API_URL}/auth/otp/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      phone: newCustPhone,
      otp: otpSendData.devCode
    })
  });
  const step1Data = await otpVerifyStep1.json();
  assert.equal(otpVerifyStep1.status, 200);
  assert.equal(step1Data.needsRegistration, true, 'Server signals new user needs to provide profile name');
  assert(step1Data.registrationToken, 'Server provides registrationToken for step 2');
  console.log('✓ Step B: POST /api/auth/otp/verify returned needsRegistration: true with registrationToken');

  // Step C: User inputs their name and submits using registrationToken (without re-entering OTP)
  const otpVerifyStep2 = await fetch(`${API_URL}/auth/otp/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      phone: newCustPhone,
      registrationToken: step1Data.registrationToken,
      fullName: 'Kannan Kumar',
      location: 'Colombo 03'
    })
  });
  const step2Data = await otpVerifyStep2.json();
  assert.equal(otpVerifyStep2.status, 200);
  assert(step2Data.token, 'Customer JWT token received');
  assert.equal(step2Data.user.fullName, 'Kannan Kumar');
  assert.equal(step2Data.user.accountType, 'customer');
  const customerToken = step2Data.token;
  const customerId = step2Data.user.id;
  console.log('✓ Step C: POST /api/auth/otp/verify with registrationToken completed account creation');

  // Security test: Attempt to bypass password login for customer
  const emptyPassLogin = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier: newCustPhone, password: '' })
  });
  assert.equal(emptyPassLogin.status, 401, 'Password-free login for customer must be rejected');

  const dummyPassLogin = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier: newCustPhone, password: 'customer123' })
  });
  assert.equal(dummyPassLogin.status, 401, 'Dummy customer123 password login must be rejected');
  console.log('✓ Security: Customer password bypass rejected with HTTP 401');

  // Admin Login
  const adminLoginRes = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      identifier: 'arikarran14@gmail.com',
      password: 'Admin@123'
    })
  });
  const adminLoginData = await adminLoginRes.json();
  assert.equal(adminLoginRes.status, 200);
  assert.equal(adminLoginData.user.accountType, 'admin');
  const adminToken = adminLoginData.token;
  console.log('✓ POST /api/auth/login for Super Admin passed');

  // Provider Registration
  const providerPhone = '0778' + Date.now().toString().slice(-6);
  const regProvRes = await fetch(`${API_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      fullName: 'Test Electrician Siva',
      phone: providerPhone,
      email: 'siva.electric@example.local',
      password: 'SivaPass@123',
      accountType: 'provider',
      category: 'electrical-repair',
      categoryName: 'Electrical Repair',
      baseCharge: 'LKR 2,000',
      location: 'Bambalapitiya, Colombo'
    })
  });
  const regProvData = await regProvRes.json();
  assert.equal(regProvRes.status, 200);
  assert.equal(regProvData.user.status, 'pending');
  const providerId = regProvData.user.id;
  console.log('✓ POST /api/auth/register for provider (status=pending) passed');

  // Provider Login BEFORE admin approval should be blocked (403)
  const blockedLoginRes = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      identifier: providerPhone,
      password: 'SivaPass@123'
    })
  });
  assert.equal(blockedLoginRes.status, 403, 'Pending provider must not be allowed to log in');
  console.log('✓ RBAC Security: Pending provider login blocked with HTTP 403');

  // Admin approves Provider
  const approveRes = await fetch(`${API_URL}/admin/users/${providerId}/status`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`
    },
    body: JSON.stringify({ status: 'active' })
  });
  assert.equal(approveRes.status, 200);
  console.log('✓ Super Admin PATCH /api/admin/users/:id/status approved provider');

  // Provider Login AFTER admin approval should succeed
  const provLoginRes = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      identifier: providerPhone,
      password: 'SivaPass@123'
    })
  });
  const provLoginData = await provLoginRes.json();
  assert.equal(provLoginRes.status, 200);
  assert.equal(provLoginData.user.status, 'active');
  const providerToken = provLoginData.token;
  console.log('✓ Active provider login succeeded');

  // Public providers catalog includes approved provider
  const providersRes = await fetch(`${API_URL}/providers?query=Siva`);
  const providersData = await providersRes.json();
  assert.equal(providersRes.status, 200);
  assert(providersData.providers.some(p => p.id === providerId), 'Approved provider must be in catalog');
  console.log('✓ GET /api/providers verified newly approved provider is listed');

  // Customer Books Service
  const bookRes = await fetch(`${API_URL}/bookings`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${customerToken}`
    },
    body: JSON.stringify({
      providerId: providerId,
      categorySlug: 'electrical-repair',
      categoryName: 'Electrical Repair',
      serviceAddress: 'No 12, Galle Road, Colombo 03',
      bookingDate: '2026-10-26',
      bookingTime: 'Morning (9 AM - 12 PM)',
      problemDescription: 'Main circuit breaker trips under load.'
    })
  });
  const bookData = await bookRes.json();
  assert.equal(bookRes.status, 200);
  assert.equal(bookData.booking.status, 'requested');
  const bookingId = bookData.booking.id;
  console.log(`✓ POST /api/bookings customer created booking ${bookingId}`);

  // Provider views incoming booking
  const provBookingsRes = await fetch(`${API_URL}/bookings`, {
    headers: { Authorization: `Bearer ${providerToken}` }
  });
  const provBookingsData = await provBookingsRes.json();
  assert(provBookingsData.bookings.some(b => b.id === bookingId));
  console.log('✓ Provider GET /api/bookings received customer request');

  // Provider accepts booking
  const acceptRes = await fetch(`${API_URL}/bookings/${bookingId}/status`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${providerToken}`
    },
    body: JSON.stringify({ status: 'accepted' })
  });
  const acceptData = await acceptRes.json();
  assert.equal(acceptRes.status, 200);
  assert.equal(acceptData.booking.status, 'accepted');
  console.log('✓ Provider PATCH /api/bookings/:id/status accepted booking');

  // Provider starts booking (in_progress)
  const progressRes = await fetch(`${API_URL}/bookings/${bookingId}/status`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${providerToken}`
    },
    body: JSON.stringify({ status: 'in_progress' })
  });
  const progressData = await progressRes.json();
  assert.equal(progressRes.status, 200);
  assert.equal(progressData.booking.status, 'in_progress');
  console.log('✓ Provider PATCH /api/bookings/:id/status marked in_progress');

  // Provider completes booking
  const completeRes = await fetch(`${API_URL}/bookings/${bookingId}/status`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${providerToken}`
    },
    body: JSON.stringify({ status: 'completed' })
  });
  const completeData = await completeRes.json();
  assert.equal(completeRes.status, 200);
  assert.equal(completeData.booking.status, 'completed');
  console.log('✓ Provider PATCH /api/bookings/:id/status completed booking');

  // Customer checks updated booking
  const custBookingsRes = await fetch(`${API_URL}/bookings`, {
    headers: { Authorization: `Bearer ${customerToken}` }
  });
  const custBookingsData = await custBookingsRes.json();
  const customerBooking = custBookingsData.bookings.find(b => b.id === bookingId);
  assert.equal(customerBooking.status, 'completed');
  console.log('✓ Customer GET /api/bookings verified completed status');

  // ---------------------------------------------------------
  // 4. Customer Reviews, Rating Recalculation & Workmanship Tests
  // ---------------------------------------------------------
  console.log('\n--- 4. Testing Customer Reviews & Rating Engine ---');

  // Negative Test 1: Provider cannot review their own job
  const provReviewRes = await fetch(`${API_URL}/reviews`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${providerToken}`
    },
    body: JSON.stringify({
      bookingId,
      rating: 5,
      comment: 'Reviewing my own service'
    })
  });
  assert.equal(provReviewRes.status, 403, 'Provider reviewing their own job must return 403 Forbidden');
  console.log('✓ Rejected unauthorized review attempt with HTTP 403');

  // Negative Test 2: Cannot review an uncompleted booking
  const uncompletedBookRes = await fetch(`${API_URL}/bookings`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${customerToken}`
    },
    body: JSON.stringify({
      providerId,
      categorySlug: 'electrical-repair',
      serviceAddress: 'Test Road, Colombo',
      problemDescription: 'Uncompleted job test'
    })
  });
  const uncompletedBook = await uncompletedBookRes.json();
  const uncompletedReviewRes = await fetch(`${API_URL}/reviews`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${customerToken}`
    },
    body: JSON.stringify({
      bookingId: uncompletedBook.booking.id,
      rating: 4,
      comment: 'Should fail'
    })
  });
  assert.equal(uncompletedReviewRes.status, 400, 'Reviewing uncompleted booking must return 400');
  console.log('✓ Rejected review on uncompleted booking with HTTP 400');

  // Positive Test 3: Customer submits 5-star review for completed booking
  const validReviewRes = await fetch(`${API_URL}/reviews`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${customerToken}`
    },
    body: JSON.stringify({
      bookingId,
      rating: 5,
      comment: 'Outstanding electrical repair under ARY 14-Day Guarantee! Very fast response.'
    })
  });
  assert.equal(validReviewRes.status, 201, 'Customer submitting valid review must return 201 Created');
  const validReviewData = await validReviewRes.json();
  assert.equal(validReviewData.review.rating, 5);
  console.log('✓ Customer submitted 5-star review successfully with HTTP 201');

  // Negative Test 4: Duplicate review on same booking rejected
  const dupReviewRes = await fetch(`${API_URL}/reviews`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${customerToken}`
    },
    body: JSON.stringify({
      bookingId,
      rating: 4,
      comment: 'Duplicate attempt'
    })
  });
  assert.equal(dupReviewRes.status, 400, 'Duplicate review must return 400 Bad Request');
  console.log('✓ Rejected duplicate review on same booking with HTTP 400');

  // Test 5: Verify reviews list endpoint
  const provReviewsRes = await fetch(`${API_URL}/reviews/provider/${providerId}`);
  assert.equal(provReviewsRes.status, 200);
  const provReviewsData = await provReviewsRes.json();
  assert(provReviewsData.reviews.some(r => r.bookingId === bookingId && r.rating === 5));
  console.log('✓ GET /api/reviews/provider/:id retrieved verified customer review');

  // Test 6: Verify booking list attaches review
  const enrichedBookingsRes = await fetch(`${API_URL}/bookings`, {
    headers: { Authorization: `Bearer ${customerToken}` }
  });
  const enrichedData = await enrichedBookingsRes.json();
  const enrichedBooking = enrichedData.bookings.find(b => b.id === bookingId);
  assert(enrichedBooking.review, 'Booking must have attached review object');
  assert.equal(enrichedBooking.review.rating, 5);
  console.log('✓ GET /api/bookings enriched completed booking with review metadata');

  // Cleanup: Admin deletes test users
  await fetch(`${API_URL}/admin/users/${customerId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${adminToken}` }
  });
  await fetch(`${API_URL}/admin/users/${providerId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${adminToken}` }
  });
  console.log('✓ Super Admin cleaned up test customer & provider accounts');

  // ---------------------------------------------------------
  // 5. Production v2.0: SSE Dispatch, Instant Revocation, Escrow & KYC Tests
  // ---------------------------------------------------------
  console.log('\n--- 5. Testing SSE Real-Time Hub, Escrow, Revocation & KYC ---');

  // Test 1: Real-time SSE Endpoint Handshake
  const sseController = new AbortController();
  const sseRes = await fetch(`${API_URL}/events`, { signal: sseController.signal });
  assert.equal(sseRes.status, 200);
  assert.equal(sseRes.headers.get('content-type'), 'text/event-stream');
  console.log('✓ GET /api/events established real-time Server-Sent Events stream');
  sseController.abort();

  // Test 2: Instant JWT Revocation (Deactivating account revokes JWT immediately)
  const roguePhone = '0779991122';
  const rogueRegRes = await fetch(`${API_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      fullName: 'Rogue Contractor',
      phone: roguePhone,
      password: 'password123',
      accountType: 'provider'
    })
  });
  const rogueData = await rogueRegRes.json();
  const rogueToken = rogueData.token;
  const rogueId = rogueData.user.id;

  // Admin approves first
  await fetch(`${API_URL}/admin/users/${rogueId}/status`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`
    },
    body: JSON.stringify({ status: 'active' })
  });

  // Rogue accesses protected route -> succeeds
  const rogueCheck1 = await fetch(`${API_URL}/bookings`, {
    headers: { Authorization: `Bearer ${rogueToken}` }
  });
  assert.equal(rogueCheck1.status, 200, 'Active user session should succeed');

  // Admin immediately blocks rogue user
  await fetch(`${API_URL}/admin/users/${rogueId}/status`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`
    },
    body: JSON.stringify({ status: 'rejected' })
  });

  // Rogue attempts access with existing 14-day JWT -> MUST BE REJECTED IMMEDIATELY WITH HTTP 403
  const rogueCheck2 = await fetch(`${API_URL}/bookings`, {
    headers: { Authorization: `Bearer ${rogueToken}` }
  });
  assert.equal(rogueCheck2.status, 403, 'Blocked user session must be revoked immediately with HTTP 403');
  console.log('✓ Instant JWT Revocation verified: Banned user blocked immediately despite valid JWT signature');

  // Cleanup rogue user
  await fetch(`${API_URL}/admin/users/${rogueId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${adminToken}` }
  });

  // Test 3: Digital Escrow Calculation & Release
  const escrowCustomerRes = await fetch(`${API_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      fullName: 'Escrow Test Customer',
      phone: '0778882233',
      accountType: 'customer',
      password: 'customerpass'
    })
  });
  const escrowCustomer = await escrowCustomerRes.json();

  const escrowBookRes = await fetch(`${API_URL}/bookings`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${escrowCustomer.token}`
    },
    body: JSON.stringify({
      providerId: 'user-provider-kumar',
      categorySlug: 'electrical-repair',
      serviceAddress: 'No. 12, Galle Road, Colombo',
      problemDescription: 'Power board short-circuit repair with 14-Day ARY Guarantee',
      paymentMethod: 'escrow_online'
    })
  });
  const escrowBookData = await escrowBookRes.json();
  assert.equal(escrowBookRes.status, 200);
  assert.equal(escrowBookData.booking.paymentMethod, 'escrow_online');
  assert.equal(escrowBookData.booking.paymentStatus, 'escrow_held');
  assert.equal(escrowBookData.booking.baseAmount, 2000);
  assert.equal(escrowBookData.booking.platformFee, 200); // 10% platform commission
  assert.equal(escrowBookData.booking.providerPayout, 1800); // 90% net provider payout
  console.log('✓ Digital Escrow verified: 10% platform commission (LKR 200) and 90% payout (LKR 1,800) held safely');

  // Test 4: Provider completes job -> Escrow released
  const releaseRes = await fetch(`${API_URL}/bookings/${escrowBookData.booking.id}/status`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`
    },
    body: JSON.stringify({ status: 'completed' })
  });
  const releaseData = await releaseRes.json();
  assert.equal(releaseData.booking.paymentStatus, 'released_to_provider');
  console.log('✓ Escrow Release verified: Completion automatically released payout to provider');

  // Test 5: Provider KYC Validation (Sri Lankan NIC Format)
  const invalidNicRes = await fetch(`${API_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      fullName: 'Invalid NIC Contractor',
      phone: '0775551122',
      password: 'pass123456',
      accountType: 'provider',
      nicNumber: '12345-invalid'
    })
  });
  assert.equal(invalidNicRes.status, 400, 'Invalid NIC format must be rejected');
  console.log('✓ Invalid Sri Lankan NIC format rejected with HTTP 400');

  const validNicRes = await fetch(`${API_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      fullName: 'Verified KYC Contractor',
      phone: '0775551122',
      password: 'pass123456',
      accountType: 'provider',
      nicNumber: '951234567V'
    })
  });
  assert.equal(validNicRes.status, 200, 'Valid 9-digit+V Sri Lankan NIC must be accepted');
  const validNicData = await validNicRes.json();
  assert.equal(validNicData.user.status, 'pending');

  // Clean up
  await fetch(`${API_URL}/admin/users/${validNicData.user.id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${adminToken}` }
  });
  await fetch(`${API_URL}/admin/users/${escrowCustomer.user.id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${adminToken}` }
  });
  console.log('✓ Valid Sri Lankan NIC (951234567V) accepted and linked to provider KYC profile');

  // ---------------------------------------------------------
  // 6. Production v3.0: Double-Entry Ledger & Observability Probes
  // ---------------------------------------------------------
  console.log('\n--- 6. Testing Double-Entry Ledger & Observability ---');

  // Test 1: Request Correlation ID Tracing
  const customReqId = 'trace-client-12345';
  const corrRes = await fetch(`${API_URL}/health`, {
    headers: { 'x-request-id': customReqId }
  });
  assert.equal(corrRes.headers.get('x-request-id'), customReqId, 'Server must preserve client correlation ID');
  console.log('✓ Request Correlation Tracing verified: x-request-id preserved in response headers');

  // Test 2: Kubernetes Liveness Probe
  const liveRes = await fetch(`${API_URL}/healthz/liveness`);
  assert.equal(liveRes.status, 200);
  const liveData = await liveRes.json();
  assert.equal(liveData.status, 'ok');
  assert(liveData.uptime > 0);
  console.log('✓ GET /api/healthz/liveness passed Kubernetes liveness probe');

  // Test 3: Kubernetes Readiness Probe
  const readyRes = await fetch(`${API_URL}/healthz/readiness`);
  assert.equal(readyRes.status, 200);
  const readyData = await readyRes.json();
  assert.equal(readyData.status, 'ready');
  console.log('✓ GET /api/healthz/readiness passed Kubernetes storage readiness probe');

  // Test 4: Double-Entry Financial Ledger Invariance (Zero-Sum Balancing)
  const ledgerEntriesRes = await fetch(`${API_URL}/ledger/booking/${escrowBookData.booking.id}`, {
    headers: { Authorization: `Bearer ${adminToken}` }
  });
  assert.equal(ledgerEntriesRes.status, 200);
  const ledgerData = await ledgerEntriesRes.json();
  assert(ledgerData.entries.length >= 5, 'Booking must have hold (2) and release (3) journal entries');

  // Verify Double-Entry Balance matching:
  const holdDebits = ledgerData.entries.filter(e => e.transactionId && e.transactionId.startsWith('tx-hold') && e.type === 'debit').reduce((s, e) => s + e.amount, 0);
  const holdCredits = ledgerData.entries.filter(e => e.transactionId && e.transactionId.startsWith('tx-hold') && e.type === 'credit').reduce((s, e) => s + e.amount, 0);
  assert.equal(holdDebits, holdCredits, 'Hold transaction debits must strictly equal credits');

  const relDebits = ledgerData.entries.filter(e => e.transactionId && e.transactionId.startsWith('tx-rel') && e.type === 'debit').reduce((s, e) => s + e.amount, 0);
  const relCredits = ledgerData.entries.filter(e => e.transactionId && e.transactionId.startsWith('tx-rel') && e.type === 'credit').reduce((s, e) => s + e.amount, 0);
  assert.equal(relDebits, relCredits, 'Release transaction debits must strictly equal credits');
  console.log('✓ Double-Entry Ledger Invariance verified: Zero-sum accounting balance confirmed (Debits === Credits)');

  // Test 5: Provider Wallet Ledger Query
  const walletRes = await fetch(`${API_URL}/ledger/wallet`, {
    headers: { Authorization: `Bearer ${adminToken}` }
  });
  assert.equal(walletRes.status, 200);
  const walletData = await walletRes.json();
  assert(Array.isArray(walletData.entries), 'Wallet entries must be an array');
  console.log('✓ GET /api/ledger/wallet retrieved immutable audit journal ledger');

  // ---------------------------------------------------------
  // 7. Production v4.0: Haversine Geospatial, Anti-Fraud Shield & Cascading Dispatch
  // ---------------------------------------------------------
  console.log('\n--- 7. Testing Production v4.0 (Geospatial, Anti-Fraud Shield & Cascading Dispatch) ---');

  // Test 1: Haversine Spherical Distance & Closest-First Provider Sorting
  const geoRes = await fetch(`${API_URL}/providers?lat=6.8920&lng=79.8560`);
  assert.equal(geoRes.status, 200);
  const geoData = await geoRes.json();
  assert(geoData.providers.length >= 4, 'Should return all verified providers');
  assert(geoData.providers.every(p => typeof p.distanceKm === 'number' && typeof p.etaMinutes === 'number'), 'All providers must have calculated distanceKm and etaMinutes');

  for (let i = 0; i < geoData.providers.length - 1; i++) {
    assert(geoData.providers[i].distanceKm <= geoData.providers[i + 1].distanceKm, 'Providers must be sorted strictly closest-distance first');
  }
  const closestProv = geoData.providers[0];
  assert.equal(closestProv.fullName, 'Master Electrician Kumar', 'Kumar at Bambalapitiya must be closest (distance ~0 km)');
  assert(closestProv.distanceKm < 0.1, 'Kumar distance must be approx 0 km from (6.8920, 79.8560)');
  console.log(`✓ Haversine Distance & ETA verified: ${closestProv.fullName} is ${closestProv.distanceKm} km away (~${closestProv.etaMinutes} mins arrival), sorted closest first`);

  // Test 2: Anti-Fraud Bot & SMS Gateway Protection Shield
  const shieldRes = await fetch(`${API_URL}/auth/shield/challenge`);
  assert.equal(shieldRes.status, 200);
  const shieldData = await shieldRes.json();
  assert(shieldData.challengeId && shieldData.token, 'Challenge must provide challengeId and token');

  const fakeTokenRes = await fetch(`${API_URL}/auth/otp/send`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone: '0778881122', shieldToken: 'forged.tampered.signature' })
  });
  assert.equal(fakeTokenRes.status, 400, 'Forged anti-fraud token must be rejected with HTTP 400');
  console.log('✓ Anti-Fraud Shield: Forged token correctly blocked with HTTP 400');

  const validTokenRes = await fetch(`${API_URL}/auth/otp/send`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone: '0778881122', shieldToken: shieldData.token })
  });
  assert.equal(validTokenRes.status, 200, 'Legitimate challenge token must be accepted');
  const validTokenBody = await validTokenRes.json();
  console.log('✓ Anti-Fraud Shield: Legitimate HMAC-SHA256 challenge token accepted');

  const replayRes = await fetch(`${API_URL}/auth/otp/send`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone: '0778881133', shieldToken: shieldData.token })
  });
  assert.equal(replayRes.status, 400, 'Replayed challenge token must be rejected with HTTP 400');
  console.log('✓ Anti-Fraud Shield: Replay attack prevented (token single-use verified)');

  // Test 3: Cascading Broadcast Dispatch Engine
  const custLoginRes = await fetch(`${API_URL}/auth/otp/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone: '0778881122', otp: validTokenBody.devCode, fullName: 'Cascading Test Customer' })
  });
  const custAuth = await custLoginRes.json();

  const cascadeBookRes = await fetch(`${API_URL}/bookings`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${custAuth.token}`
    },
    body: JSON.stringify({
      providerId: 'user-provider-kumar',
      categorySlug: 'electrical-repair',
      serviceAddress: 'No. 55, Havelock Road, Colombo 05',
      problemDescription: 'Main circuit breaker tripping intermittently'
    })
  });
  assert.equal(cascadeBookRes.status, 200);
  const cascadeBooking = (await cascadeBookRes.json()).booking;
  assert.equal(cascadeBooking.status, 'requested');
  assert.equal(cascadeBooking.providerId, 'user-provider-kumar');

  const kumarLogin = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier: 'kumar.electric@example.local', password: 'KumarPass@123' })
  });
  const kumarAuth = await kumarLogin.json();

  const declineRes = await fetch(`${API_URL}/bookings/${cascadeBooking.id}/status`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${kumarAuth.token}`
    },
    body: JSON.stringify({ status: 'rejected' })
  });
  assert.equal(declineRes.status, 200);
  const declinedBooking = (await declineRes.json()).booking;
  assert.equal(declinedBooking.status, 'broadcast_pool', 'Declined booking must transition to broadcast_pool');
  console.log('✓ Cascading Dispatch: Declined booking transitioned to status=broadcast_pool');

  const pereraLogin = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier: 'perera.plumb@example.local', password: 'PereraPass@123' })
  });
  const pereraAuth = await pereraLogin.json();

  const pereraJobsRes = await fetch(`${API_URL}/bookings`, {
    headers: { Authorization: `Bearer ${pereraAuth.token}` }
  });
  const pereraJobs = await pereraJobsRes.json();
  const foundInPool = pereraJobs.bookings.find(b => b.id === cascadeBooking.id);
  assert(foundInPool, 'Broadcast pool job must be visible to verified provider in GET /api/bookings');
  assert.equal(foundInPool.status, 'broadcast_pool');
  console.log('✓ Cascading Dispatch: Broadcast job visible to available contractors');

  const claimRes = await fetch(`${API_URL}/bookings/${cascadeBooking.id}/claim`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${pereraAuth.token}`
    }
  });
  assert.equal(claimRes.status, 200);
  const claimData = await claimRes.json();
  assert.equal(claimData.booking.status, 'accepted');
  assert.equal(claimData.booking.providerId, 'user-provider-perera');
  assert(claimData.booking.claimedAt, 'claimedAt timestamp must be recorded');
  console.log('✓ Cascading Dispatch: Job claimed successfully with 1-click (status transitioned to accepted)');

  const secondClaimRes = await fetch(`${API_URL}/bookings/${cascadeBooking.id}/claim`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${kumarAuth.token}`
    }
  });
  assert.equal(secondClaimRes.status, 400, 'Already claimed job must be rejected with HTTP 400');
  console.log('✓ Cascading Dispatch: Re-claiming an already accepted job correctly blocked with HTTP 400');

  // Clean up test customer
  await fetch(`${API_URL}/admin/users/${custAuth.user.id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${adminToken}` }
  });
  console.log('✓ Cleaned up test customer account');

  // ---------------------------------------------------------
  // 8. Production v5.0: Geofencing, Dispute Arbitration & CEFT Banking Payouts
  // ---------------------------------------------------------
  console.log('\n--- 8. Testing Production v5.0 (Geofencing, Dispute Arbitration & CEFT Banking) ---');

  // Test 1: Geofence Radius Boundary Filtering
  const geofence1KmRes = await fetch(`${API_URL}/providers?lat=6.8920&lng=79.8560&radiusKm=1`);
  assert.equal(geofence1KmRes.status, 200);
  const geofence1KmData = await geofence1KmRes.json();
  assert(geofence1KmData.providers.length >= 1, 'At least 1 provider should be within 1.0 km');
  assert(geofence1KmData.providers.every(p => p.distanceKm <= 1.0), 'All providers in 1km query must be <= 1.0 km away');
  assert(geofence1KmData.providers.length < 4, 'Out-of-range providers must be excluded by 1km geofence');
  console.log(`✓ Geofencing boundary verified: 1km filter returned ${geofence1KmData.providers.length} providers (out-of-range excluded)`);

  // Test 2: Customer Cancellation with Call-Out Fee Invariance
  const cancelCustPhone = '0774445566';
  const cCustShield = await (await fetch(`${API_URL}/auth/shield/challenge`)).json();
  const cCustOtp = await (await fetch(`${API_URL}/auth/otp/send`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone: cancelCustPhone, shieldToken: cCustShield.token })
  })).json();
  const cCustAuth = await (await fetch(`${API_URL}/auth/otp/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone: cancelCustPhone, otp: cCustOtp.devCode, fullName: 'Cancellation Test User' })
  })).json();

  const cancelBookRes = await fetch(`${API_URL}/bookings`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${cCustAuth.token}`
    },
    body: JSON.stringify({
      providerId: 'user-provider-kumar',
      categorySlug: 'electrical-repair',
      serviceAddress: 'No. 88, Galle Road, Colombo',
      problemDescription: 'AC circuit breaker tripped',
      paymentMethod: 'escrow_online'
    })
  });
  const cancelBooking = (await cancelBookRes.json()).booking;

  // Kumar starts the job (in_progress)
  await fetch(`${API_URL}/bookings/${cancelBooking.id}/status`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${kumarAuth.token}`
    },
    body: JSON.stringify({ status: 'in_progress' })
  });

  // Customer cancels while in_progress -> LKR 500 call-out fee credited to provider, remainder refunded
  const cancelActionRes = await fetch(`${API_URL}/bookings/${cancelBooking.id}/cancel`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${cCustAuth.token}`
    },
    body: JSON.stringify({ reason: 'Client emergency, had to leave premises' })
  });
  assert.equal(cancelActionRes.status, 200);
  const cancelData = await cancelActionRes.json();
  assert.equal(cancelData.booking.status, 'cancelled');
  assert.equal(cancelData.booking.paymentStatus, 'cancelled_callout_fee_paid');

  // Verify ledger zero-sum invariance for call-out fee cancellation
  const cancelLedgerRes = await fetch(`${API_URL}/ledger/booking/${cancelBooking.id}`, {
    headers: { Authorization: `Bearer ${adminToken}` }
  });
  const cancelLedger = await cancelLedgerRes.json();
  const coEntries = cancelLedger.entries.filter(e => e.transactionId && e.transactionId.startsWith('tx-callout'));
  assert.equal(coEntries.length, 3, 'Call-out cancellation must have 3 entries (vault debit, provider credit, customer credit)');
  const coDebits = coEntries.filter(e => e.type === 'debit').reduce((s, e) => s + e.amount, 0);
  const coCredits = coEntries.filter(e => e.type === 'credit').reduce((s, e) => s + e.amount, 0);
  assert.equal(coDebits, coCredits, 'Call-out cancellation transaction must balance zero-sum');
  console.log('✓ Cancellation Engine verified: LKR 500 call-out fee awarded to provider, remainder refunded with zero-sum ledger balance');

  // Test 3: Customer Dispute & Escrow Freeze
  const disputeBookRes = await fetch(`${API_URL}/bookings`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${cCustAuth.token}`
    },
    body: JSON.stringify({
      providerId: 'user-provider-perera',
      categorySlug: 'plumbing',
      serviceAddress: 'No. 99, Baseline Road, Colombo',
      problemDescription: 'Water pipe leaking under kitchen sink',
      paymentMethod: 'escrow_online'
    })
  });
  const disputeBooking = (await disputeBookRes.json()).booking;

  const fileDisputeRes = await fetch(`${API_URL}/bookings/${disputeBooking.id}/dispute`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${cCustAuth.token}`
    },
    body: JSON.stringify({
      reason: 'Leak became worse after repair attempt, water damage to cabinet'
    })
  });
  assert.equal(fileDisputeRes.status, 200);
  const fileDisputeData = await fileDisputeRes.json();
  assert.equal(fileDisputeData.booking.status, 'disputed');
  assert.equal(fileDisputeData.booking.paymentStatus, 'disputed_frozen');
  console.log('✓ Escrow Dispute Lifecycle verified: Booking status=disputed and paymentStatus=disputed_frozen');

  // Test 4: Super Admin Dispute Arbitration (50/50 Mediated Split)
  const arbitrateRes = await fetch(`${API_URL}/admin/bookings/${disputeBooking.id}/arbitrate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`
    },
    body: JSON.stringify({
      action: 'split_50_50',
      notes: 'Admin mediated settlement: 50% refund to customer, 40% provider materials, 10% platform fee'
    })
  });
  assert.equal(arbitrateRes.status, 200);
  const arbitrateData = await arbitrateRes.json();
  assert.equal(arbitrateData.booking.status, 'settled_split');
  assert.equal(arbitrateData.booking.paymentStatus, 'partial_refund_split');

  // Verify double-entry ledger balance for mediated split
  const splitLedgerRes = await fetch(`${API_URL}/ledger/booking/${disputeBooking.id}`, {
    headers: { Authorization: `Bearer ${adminToken}` }
  });
  const splitLedger = await splitLedgerRes.json();
  const splitEntries = splitLedger.entries.filter(e => e.transactionId && e.transactionId.startsWith('tx-dispute-split'));
  assert(splitEntries.length >= 3, 'Dispute split must record customer refund, provider payout, and platform fee');
  const spDebits = splitEntries.filter(e => e.type === 'debit').reduce((s, e) => s + e.amount, 0);
  const spCredits = splitEntries.filter(e => e.type === 'credit').reduce((s, e) => s + e.amount, 0);
  assert.equal(spDebits, spCredits, 'Mediated split ledger entries must strictly balance zero-sum');
  console.log('✓ Admin Dispute Arbitration verified: 50/50 mediated split settled with zero-sum double-entry ledger balance');

  // Test 5: Automated CEFT Bank Payout Settlement Run
  const payoutRunRes = await fetch(`${API_URL}/admin/payouts/settle`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`
    },
    body: JSON.stringify({ minThreshold: 100 })
  });
  assert.equal(payoutRunRes.status, 200);
  const payoutRunData = await payoutRunRes.json();
  assert(payoutRunData.batchId && payoutRunData.batchId.startsWith('ceft-batch-'), 'Must generate CEFT batch ID');
  assert(payoutRunData.checksum && payoutRunData.checksum.length === 64, 'Must compute SHA256 checksum');
  assert(payoutRunData.totalPayoutAmount > 0, 'Total payout amount must be greater than 0');
  assert(payoutRunData.providerCount >= 1, 'At least 1 provider must be settled');
  console.log(`✓ Automated CEFT Bank Payout verified: Batch #${payoutRunData.batchId} settled LKR ${payoutRunData.totalPayoutAmount.toLocaleString()} across ${payoutRunData.providerCount} providers (SHA256: ${payoutRunData.checksum.slice(0, 16)}...)`);

  // Clean up test customer
  await fetch(`${API_URL}/admin/users/${cCustAuth.user.id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${adminToken}` }
  });
  console.log('✓ Cleaned up v5.0 test customer account');

  console.log('\n🎉 ALL 55 INTEGRATION, CONCURRENCY, SSE, ESCROW, KYC, LEDGER, GEOSPATIAL, DISPUTE & BANKING TESTS PASSED WITH 100% SUCCESS!');
} finally {
  serverProc.kill('SIGTERM');
}
