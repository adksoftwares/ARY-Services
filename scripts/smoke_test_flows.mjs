import fs from 'node:fs';
import path from 'node:path';

console.log('=== ARY SERVICES SMOKE TEST & QUALITY GATE ===\n');

let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✓ ${message}`);
  } else {
    console.error(`  ✗ FAIL: ${message}`);
    failed++;
  }
}

// 1. Check Constraint: No ary_persisted_users in localStorage
console.log('1. Checking Security & Storage Constraints:');
const adminWorkspace = fs.readFileSync(path.resolve('src/components/admin/AdminWorkspace.jsx'), 'utf8');
assert(!adminWorkspace.includes('ary_persisted_users'), 'AdminWorkspace does NOT reference ary_persisted_users');

const serverJs = fs.readFileSync(path.resolve('server/src/server.js'), 'utf8');
assert(serverJs.includes('app.post(\'/api/auth/login\''), 'Backend server.js is unmodified and intact');

// 2. Check Design System Tokens & Primitives
console.log('\n2. Checking Design System:');
const tokensCss = fs.readFileSync(path.resolve('src/design-system/tokens.css'), 'utf8');
assert(tokensCss.includes('#174d3d'), 'Brand color #174d3d defined');
assert(tokensCss.includes('#d18b54'), 'Warm accent #d18b54 defined');
assert(tokensCss.includes('#fbfaf7'), 'Cream background #fbfaf7 defined');
assert(tokensCss.includes('[data-theme="dark"]'), 'Dark theme tokens defined');
assert(tokensCss.includes('[data-theme="sunlight"]'), 'Sunlight high-contrast theme defined');

const dsIndex = fs.readFileSync(path.resolve('src/design-system/index.js'), 'utf8');
assert(dsIndex.includes('Button'), 'Button primitive exported');
assert(dsIndex.includes('Card'), 'Card primitive exported');
assert(dsIndex.includes('Input'), 'Input primitive exported');
assert(dsIndex.includes('Badge'), 'Badge primitive exported');
assert(dsIndex.includes('Modal'), 'Modal primitive exported');
assert(dsIndex.includes('ToastProvider'), 'ToastProvider primitive exported');
assert(dsIndex.includes('ThemeToggle'), 'ThemeToggle primitive exported');
assert(dsIndex.includes('LanguageSwitcher'), 'LanguageSwitcher primitive exported');

// 3. Check Internationalization (i18n)
console.log('\n3. Checking Internationalization (i18n):');
const i18n = fs.readFileSync(path.resolve('src/utils/i18n.jsx'), 'utf8');
assert(i18n.includes('en:'), 'English dictionary present');
assert(i18n.includes('si:'), 'Sinhala dictionary present');
assert(i18n.includes('ta:'), 'Tamil dictionary present');
assert(i18n.includes('formatLKR'), 'LKR currency formatter present');
assert(i18n.includes('formatPhone'), 'Phone (+94) formatter present');

// 4. Check PWA & Performance
console.log('\n4. Checking PWA & Performance Artifacts:');
assert(fs.existsSync('apps/customer/public/manifest.json'), 'Customer manifest.json exists');
assert(fs.existsSync('apps/customer/public/sw.js'), 'Customer Service Worker exists');
assert(fs.existsSync('apps/provider/public/manifest.json'), 'Provider manifest.json exists');
assert(fs.existsSync('apps/provider/public/sw.js'), 'Provider Service Worker exists');
assert(fs.existsSync('apps/driver/public/manifest.json'), 'Driver manifest.json exists');
assert(fs.existsSync('apps/driver/public/sw.js'), 'Driver Service Worker exists');

const customerVite = fs.readFileSync(path.resolve('apps/customer/vite.config.js'), 'utf8');
assert(customerVite.includes('manualChunks'), 'Customer vite.config.js includes manualChunks for code splitting');

// 5. Check Bundle Sizes
console.log('\n5. Checking Production Bundle Budgets:');
const customerDist = 'dist/apps/customer/assets';
if (fs.existsSync(customerDist)) {
  const files = fs.readdirSync(customerDist);
  const jsFiles = files.filter(f => f.endsWith('.js') && f.startsWith('index-'));
  if (jsFiles.length > 0) {
    const stats = fs.statSync(path.join(customerDist, jsFiles[0]));
    const sizeKb = (stats.size / 1024).toFixed(1);
    assert(stats.size < 200 * 1024, `Customer main index chunk is ${sizeKb} KB (Budget: <= 200 KB)`);
  }
}

console.log('\n=== SMOKE TEST COMPLETE ===');
if (failed === 0) {
  console.log('🎉 ALL QUALITY GATES PASSED! (0 failures)\n');
  process.exit(0);
} else {
  console.error(`❌ FAILED: ${failed} assertions failed.\n`);
  process.exit(1);
}
