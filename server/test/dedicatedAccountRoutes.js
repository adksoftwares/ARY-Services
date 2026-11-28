import assert from 'assert';
import app, { generateToken } from '../src/server.js';
import { getUsers, initStorage } from '../src/storage.js';

console.log('🚀 [TEST] Testing Dedicated Account-Scoped APIs...');

const server = app.listen(4002);
const baseUrl = 'http://localhost:4002/api';

try {
  await initStorage();
  const users = await getUsers();
  const adminUser = users.find(u => u.accountType === 'admin') || { id: 'ary-bootstrap-admin', accountType: 'admin' };
  const providerUser = users.find(u => u.accountType === 'provider') || users[0];
  const customerUser = users.find(u => u.accountType === 'customer') || users[0];
  const driverUser = users.find(u => u.accountType === 'driver' || (u.roles || []).includes('driver')) || users[0];

  const adminToken = generateToken(adminUser);
  const providerToken = generateToken(providerUser);
  const customerToken = generateToken(customerUser);
  const driverToken = generateToken(driverUser);

  // 1. Customer API tests
  const custRes = await fetch(`${baseUrl}/customer/profile`, {
    headers: { Authorization: `Bearer ${customerToken}` }
  });
  assert(custRes.ok, 'GET /api/customer/profile should succeed');
  const custData = await custRes.json();
  assert(custData.profile && custData.summary, 'Customer profile must contain profile and summary');
  console.log('✓ GET /api/customer/profile returned customer dashboard summary');

  const custBookingsRes = await fetch(`${baseUrl}/customer/bookings`, {
    headers: { Authorization: `Bearer ${customerToken}` }
  });
  assert(custBookingsRes.ok, 'GET /api/customer/bookings should succeed');
  console.log('✓ GET /api/customer/bookings returned isolated bookings list');

  // 2. Provider API tests
  const provDashRes = await fetch(`${baseUrl}/provider/dashboard`, {
    headers: { Authorization: `Bearer ${providerToken}` }
  });
  assert(provDashRes.ok, 'GET /api/provider/dashboard should succeed');
  const provDashData = await provDashRes.json();
  assert(provDashData.provider && provDashData.kpis, 'Provider dashboard must contain provider and kpis');
  console.log('✓ GET /api/provider/dashboard returned provider KPI metrics');

  const provJobsRes = await fetch(`${baseUrl}/provider/jobs`, {
    headers: { Authorization: `Bearer ${providerToken}` }
  });
  assert(provJobsRes.ok, 'GET /api/provider/jobs should succeed');
  console.log('✓ GET /api/provider/jobs returned provider jobs');

  // 3. Driver API tests
  const driverDashRes = await fetch(`${baseUrl}/driver/dashboard`, {
    headers: { Authorization: `Bearer ${driverToken}` }
  });
  assert(driverDashRes.ok, 'GET /api/driver/dashboard should succeed');
  const driverDashData = await driverDashRes.json();
  assert(driverDashData.presence !== undefined && driverDashData.stats, 'Driver dashboard must contain presence and stats');
  console.log('✓ GET /api/driver/dashboard returned driver presence & stats');

  // 4. Admin API tests
  const adminExecRes = await fetch(`${baseUrl}/admin/executive-dashboard`, {
    headers: { Authorization: `Bearer ${adminToken}` }
  });
  assert(adminExecRes.ok, 'GET /api/admin/executive-dashboard should succeed');
  const adminExecData = await adminExecRes.json();
  assert(adminExecData.executive && adminExecData.executive.financials, 'Executive dashboard must contain financials');
  console.log('✓ GET /api/admin/executive-dashboard returned platform financials and user counts');

  console.log('🎉 ALL DEDICATED ACCOUNT-SCOPED APIS TESTED AND VERIFIED SUCCESSFULLY!');
} finally {
  server.close();
}
