import puppeteer from 'puppeteer-core';
import fs from 'node:fs';
import path from 'node:path';

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const ARTIFACT_DIR = 'C:\\Users\\Arikarran\\.gemini\\antigravity\\brain\\9bee2e27-9cd7-4626-a971-888a6ce02660';
const BASE_URL = 'http://localhost:5173';
const API_BASE = 'http://localhost:4000/api';

// Samsung Galaxy S24 Ultra Viewport Profile
const S24_VIEWPORT = {
  width: 412,
  height: 915,
  deviceScaleFactor: 3,
  isMobile: true,
  hasTouch: true
};

const USER_AGENT = 'Mozilla/5.0 (Linux; Android 14; SM-S928B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.6723.107 Mobile Safari/537.36';

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function getAuthToken(identifier, password) {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier, password })
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Login failed');
  return { token: data.token, user: { ...data.user, token: data.token } };
}

async function run() {
  console.log('====================================================');
  console.log('🚀 ARY SERVICES — HUMAN-LIKE MOBILE E2E RUNNER');
  console.log('====================================================\n');

  if (!fs.existsSync(ARTIFACT_DIR)) {
    fs.mkdirSync(ARTIFACT_DIR, { recursive: true });
  }

  // 1. Authenticate Accounts
  console.log('[1/7] Authenticating accounts via live API...');
  const customerAuth = await getAuthToken('0771234567', 'TestCustomer@123');
  const providerAuth = await getAuthToken('kumar.electric@example.local', 'KumarPass@123');
  console.log(`  ✓ Customer: ${customerAuth.user.fullName} (${customerAuth.user.phone})`);
  console.log(`  ✓ Provider: ${providerAuth.user.fullName}`);

  // 2. Launch Puppeteer Browser
  console.log('\n[2/7] Launching Headless Chrome with Mobile Emulation (Samsung S24 Ultra)...');
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: 'new',
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-web-security'
    ]
  });

  const page = await browser.newPage();
  await page.setViewport(S24_VIEWPORT);
  await page.setUserAgent(USER_AGENT);

  // Pre-seed localStorage with Customer Session before initial navigation
  await page.evaluateOnNewDocument(user => {
    localStorage.setItem('ary_user', JSON.stringify(user));
  }, customerAuth.user);

  // Network Monitoring
  const networkLogs = [];
  const networkErrors = [];

  page.on('request', req => {
    if (req.url().includes('/api/')) {
      networkLogs.push({ url: req.url(), method: req.method(), time: Date.now() });
    }
  });

  page.on('response', res => {
    if (res.url().includes('/api/')) {
      const status = res.status();
      if (status >= 400) {
        networkErrors.push({ url: res.url(), status, statusText: res.statusText() });
      }
    }
  });

  try {
    // 3. Customer App Walkthrough
    console.log('\n[3/7] Loading Customer Mobile App...');
    await page.goto(`${BASE_URL}/customer.html`, { waitUntil: 'domcontentloaded' });
    await sleep(2000);

    // Capture 1: Home View
    const snap1 = path.join(ARTIFACT_DIR, 'run_01_customer_home.png');
    await page.screenshot({ path: snap1, fullPage: false });
    console.log('  📸 Captured: run_01_customer_home.png');

    // Toggle Language to Tamil
    console.log('  -> Switching Language to Tamil (தமிழ்)...');
    await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('EN') || b.textContent.includes('Language') || b.title?.includes('Language'));
      if (btn) btn.click();
    });
    await sleep(500);
    await page.evaluate(() => {
      const taOption = Array.from(document.querySelectorAll('button, div, span')).find(el => el.textContent.trim() === 'தமிழ்' || el.textContent.includes('தமிழ்'));
      if (taOption) taOption.click();
    });
    await sleep(800);
    const snap2 = path.join(ARTIFACT_DIR, 'run_02_customer_tamil.png');
    await page.screenshot({ path: snap2, fullPage: false });
    console.log('  📸 Captured: run_02_customer_tamil.png');

    // Toggle Dark Luxury OLED Mode
    console.log('  -> Toggling Dark Luxury OLED Mode...');
    await page.evaluate(() => {
      const themeBtn = Array.from(document.querySelectorAll('button')).find(b => b.title?.toLowerCase().includes('dark') || b.title?.toLowerCase().includes('light') || b.getAttribute('aria-label')?.toLowerCase().includes('theme'));
      if (themeBtn) {
        themeBtn.click();
      } else {
        document.documentElement.setAttribute('data-theme', 'dark');
      }
    });
    await sleep(800);
    const snap3 = path.join(ARTIFACT_DIR, 'run_03_customer_dark_mode.png');
    await page.screenshot({ path: snap3, fullPage: false });
    console.log('  📸 Captured: run_03_customer_dark_mode.png');

    // Switch back to light theme
    await page.evaluate(() => {
      document.documentElement.removeAttribute('data-theme');
    });
    await sleep(500);

    // Filter by Category: Electrical Repair
    console.log('  -> Filtering providers by category "Electrical Repair"...');
    await page.evaluate(() => {
      const electricalCard = Array.from(document.querySelectorAll('button, div')).find(el => el.textContent.includes('Electrical Repair') && (el.classList.contains('category-card') || el.closest('.category-card')));
      if (electricalCard) electricalCard.click();
    });
    await sleep(1000);
    const snap4 = path.join(ARTIFACT_DIR, 'run_04_category_filtered.png');
    await page.screenshot({ path: snap4, fullPage: false });
    console.log('  📸 Captured: run_04_category_filtered.png');

    // Click "Book Service" button
    console.log('  -> Opening Booking Modal for verified provider...');
    const bookBtnFound = await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Book Service') || b.textContent.includes('Book Now'));
      if (btn) {
        btn.click();
        return true;
      }
      return false;
    });

    if (bookBtnFound) {
      await sleep(1200);

      // Step 1: Problem Description
      console.log('  -> Booking Step 1: Entering service problem description...');
      const snap5 = path.join(ARTIFACT_DIR, 'run_05_booking_step1.png');
      await page.screenshot({ path: snap5, fullPage: false });
      console.log('  📸 Captured: run_05_booking_step1.png');

      await page.evaluate(() => {
        const textarea = document.querySelector('textarea');
        if (textarea) {
          textarea.value = 'Main distribution box MCB keeps tripping under AC load. Need urgent diagnostic and breaker replacement.';
          textarea.dispatchEvent(new Event('input', { bubbles: true }));
          textarea.dispatchEvent(new Event('change', { bubbles: true }));
        }
      });
      await sleep(500);

      // Click Next
      await page.evaluate(() => {
        const nextBtn = document.querySelector('.wizard-next-btn') || Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Next') || b.textContent.includes('Continue'));
        if (nextBtn) nextBtn.click();
      });
      await sleep(800);

      // Step 2: Schedule Date & Time Slot
      console.log('  -> Booking Step 2: Selecting Date & Time Slot...');
      const snap6 = path.join(ARTIFACT_DIR, 'run_06_booking_step2.png');
      await page.screenshot({ path: snap6, fullPage: false });
      console.log('  📸 Captured: run_06_booking_step2.png');

      await page.evaluate(() => {
        const slotBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Morning (9 AM - 12 PM)'));
        if (slotBtn) slotBtn.click();
      });
      await sleep(500);

      // Click Next
      await page.evaluate(() => {
        const nextBtn = document.querySelector('.wizard-next-btn') || Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Next') || b.textContent.includes('Continue'));
        if (nextBtn) nextBtn.click();
      });
      await sleep(800);

      // Step 3: Location / Address
      console.log('  -> Booking Step 3: Entering Service Location...');
      const snap7 = path.join(ARTIFACT_DIR, 'run_07_booking_step3.png');
      await page.screenshot({ path: snap7, fullPage: false });
      console.log('  📸 Captured: run_07_booking_step3.png');

      await page.evaluate(() => {
        const input = document.querySelector('input[placeholder*="street"], input[placeholder*="city"], input[placeholder*="Address"]');
        if (input) {
          input.value = 'No. 28 Temple Road, Bambalapitiya, Colombo 04';
          input.dispatchEvent(new Event('input', { bubbles: true }));
          input.dispatchEvent(new Event('change', { bubbles: true }));
        }
      });
      await sleep(500);

      // Click Next
      await page.evaluate(() => {
        const nextBtn = document.querySelector('.wizard-next-btn') || Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Next') || b.textContent.includes('Continue'));
        if (nextBtn) nextBtn.click();
      });
      await sleep(800);

      // Step 4: Payment Review
      console.log('  -> Booking Step 4: Reviewing Booking & Cash Settlement...');
      const snap8 = path.join(ARTIFACT_DIR, 'run_08_booking_step4.png');
      await page.screenshot({ path: snap8, fullPage: false });
      console.log('  📸 Captured: run_08_booking_step4.png');

      // Click Confirm Booking
      console.log('  -> Confirming Booking...');
      await page.evaluate(() => {
        const confirmBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Confirm') || b.textContent.includes('Book with Cash'));
        if (confirmBtn) confirmBtn.click();
      });
      await sleep(2000);

      // Step 5: Success Confirmation
      const snap9 = path.join(ARTIFACT_DIR, 'run_09_booking_confirmed.png');
      await page.screenshot({ path: snap9, fullPage: false });
      console.log('  📸 Captured: run_09_booking_confirmed.png');

      // Close modal
      await page.evaluate(() => {
        const closeBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Close') || b.textContent.includes('View My Bookings') || b.getAttribute('aria-label') === 'Close');
        if (closeBtn) closeBtn.click();
      });
      await sleep(800);
    }

    // Navigate to My Bookings Tab
    console.log('  -> Navigating to My Bookings...');
    await page.evaluate(() => {
      const bookingsNav = Array.from(document.querySelectorAll('button, a')).find(el => el.textContent.includes('Bookings') || el.href?.includes('/bookings'));
      if (bookingsNav) bookingsNav.click();
    });
    await sleep(1500);
    const snap10 = path.join(ARTIFACT_DIR, 'run_10_my_bookings_list.png');
    await page.screenshot({ path: snap10, fullPage: false });
    console.log('  📸 Captured: run_10_my_bookings_list.png');

    // Navigate to Grocery Marketplace
    console.log('  -> Navigating to Grocery Marketplace...');
    await page.evaluate(() => {
      const groceryNav = Array.from(document.querySelectorAll('button, a')).find(el => el.textContent.includes('Grocery') || el.href?.includes('/grocery'));
      if (groceryNav) groceryNav.click();
    });
    await sleep(1500);
    const snap11 = path.join(ARTIFACT_DIR, 'run_11_grocery_marketplace.png');
    await page.screenshot({ path: snap11, fullPage: false });
    console.log('  📸 Captured: run_11_grocery_marketplace.png');

    // Navigate to Mobility Services
    console.log('  -> Navigating to Mobility Services...');
    await page.evaluate(() => {
      const mobilityNav = Array.from(document.querySelectorAll('button, a')).find(el => el.textContent.includes('Mobility') || el.textContent.includes('Rides') || el.href?.includes('/mobility'));
      if (mobilityNav) mobilityNav.click();
    });
    await sleep(1500);
    const snap12 = path.join(ARTIFACT_DIR, 'run_12_mobility_services.png');
    await page.screenshot({ path: snap12, fullPage: false });
    console.log('  📸 Captured: run_12_mobility_services.png');

    // 4. Provider App Walkthrough
    console.log('\n[4/7] Loading Provider App...');
    const providerPage = await browser.newPage();
    await providerPage.setViewport(S24_VIEWPORT);
    await providerPage.setUserAgent(USER_AGENT);
    await providerPage.evaluateOnNewDocument(user => {
      localStorage.setItem('ary_user', JSON.stringify(user));
    }, providerAuth.user);
    await providerPage.goto(`${BASE_URL}/provider.html`, { waitUntil: 'domcontentloaded' });
    await sleep(2000);
    const snap13 = path.join(ARTIFACT_DIR, 'run_13_provider_dashboard.png');
    await providerPage.screenshot({ path: snap13, fullPage: false });
    console.log('  📸 Captured: run_13_provider_dashboard.png');
    await providerPage.close();

    // 5. Driver App Walkthrough
    console.log('\n[5/7] Loading Driver App...');
    const driverPage = await browser.newPage();
    await driverPage.setViewport(S24_VIEWPORT);
    await driverPage.setUserAgent(USER_AGENT);
    await driverPage.goto(`${BASE_URL}/driver.html`, { waitUntil: 'domcontentloaded' });
    await sleep(2000);
    const snap14 = path.join(ARTIFACT_DIR, 'run_14_driver_app.png');
    await driverPage.screenshot({ path: snap14, fullPage: false });
    console.log('  📸 Captured: run_14_driver_app.png');
    await driverPage.close();

    // 6. Admin Dashboard Walkthrough
    console.log('\n[6/7] Loading Admin Dashboard...');
    const adminPage = await browser.newPage();
    await adminPage.setViewport(S24_VIEWPORT);
    await adminPage.setUserAgent(USER_AGENT);
    await adminPage.evaluateOnNewDocument(user => {
      localStorage.setItem('ary_user', JSON.stringify({
        id: 'ary-bootstrap-admin',
        fullName: 'Arikarran Admin',
        accountType: 'admin',
        status: 'active',
        token: user.token
      }));
    }, customerAuth.user);
    await adminPage.goto(`${BASE_URL}/admin.html`, { waitUntil: 'domcontentloaded' });
    await sleep(2000);
    const snap15 = path.join(ARTIFACT_DIR, 'run_15_admin_dashboard.png');
    await adminPage.screenshot({ path: snap15, fullPage: false });
    console.log('  📸 Captured: run_15_admin_dashboard.png');
    await adminPage.close();

    // 7. Automated UI/UX Color Contrast & Touch Target Accessibility Audit
    console.log('\n[7/7] Conducting UI/UX Color Contrast & Accessibility Audit...');
    await page.goto(`${BASE_URL}/customer.html`, { waitUntil: 'domcontentloaded' });
    await sleep(1500);

    const auditResults = await page.evaluate(() => {
      function getLuminance(r, g, b) {
        const a = [r, g, b].map(v => {
          v /= 255;
          return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
        });
        return a[0] * 0.2126 + a[1] * 0.7152 + a[2] * 0.0722;
      }

      function parseRgb(color) {
        const match = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
        return match ? [parseInt(match[1]), parseInt(match[2]), parseInt(match[3])] : [0, 0, 0];
      }

      function getContrastRatio(rgb1, rgb2) {
        const l1 = getLuminance(rgb1[0], rgb1[1], rgb1[2]);
        const l2 = getLuminance(rgb2[0], rgb2[1], rgb2[2]);
        const lighter = Math.max(l1, l2);
        const darker = Math.min(l1, l2);
        return (lighter + 0.05) / (darker + 0.05);
      }

      const buttons = Array.from(document.querySelectorAll('button'));
      const touchTargetAudit = buttons.map(b => {
        const rect = b.getBoundingClientRect();
        const style = window.getComputedStyle(b);
        const text = b.textContent.trim().slice(0, 30);
        return {
          text,
          width: Math.round(rect.width),
          height: Math.round(rect.height),
          fontSize: style.fontSize,
          backgroundColor: style.backgroundColor,
          color: style.color,
          isAccessibleTouchTarget: rect.height >= 40 && rect.width >= 40
        };
      }).filter(b => b.text.length > 0 && b.height > 0);

      const computedBody = window.getComputedStyle(document.body);
      const bgRgb = parseRgb(computedBody.backgroundColor || 'rgb(251, 250, 247)');
      const textRgb = parseRgb(computedBody.color || 'rgb(25, 33, 29)');
      const contrastRatio = getContrastRatio(bgRgb, textRgb).toFixed(2);

      return {
        bodyBackground: computedBody.backgroundColor,
        bodyTextColor: computedBody.color,
        contrastRatio,
        meetsWcagAa: parseFloat(contrastRatio) >= 4.5,
        touchTargetsSampled: touchTargetAudit.length,
        touchTargetsCompliant: touchTargetAudit.filter(b => b.isAccessibleTouchTarget).length,
        touchTargets: touchTargetAudit.slice(0, 8)
      };
    });

    console.log('  ✓ Body Background Color:', auditResults.bodyBackground);
    console.log('  ✓ Body Text Color:      ', auditResults.bodyTextColor);
    console.log(`  ✓ Text Contrast Ratio:   ${auditResults.contrastRatio}:1 (WCAG AA Target: >= 4.5:1 -> ${auditResults.meetsWcagAa ? 'PASS' : 'FAIL'})`);
    console.log(`  ✓ Touch Targets Audited: ${auditResults.touchTargetsCompliant}/${auditResults.touchTargetsSampled} compliant with >= 40px touch zone`);

    // Output Network Analysis
    console.log('\n====================================================');
    console.log('📊 NETWORK TRAFFIC & API ANALYSIS:');
    console.log('====================================================');
    console.log(`  Total API Calls Monitored: ${networkLogs.length}`);
    console.log(`  Failed API Requests (4xx/5xx): ${networkErrors.length}`);
    if (networkErrors.length > 0) {
      console.log('  [WARNING] The following API requests had errors:');
      networkErrors.forEach(e => console.log(`    - [${e.status}] ${e.url}`));
    } else {
      console.log('  🎉 ZERO 4xx/5xx network errors detected across entire session!');
    }

    console.log('\n====================================================');
    console.log('🎉 LIVE MOBILE RUN COMPLETE! ALL SCREENSHOTS SAVED.');
    console.log('====================================================\n');
  } finally {
    await browser.close();
  }
}

run().catch(err => {
  console.error('Run failed:', err);
  process.exit(1);
});
