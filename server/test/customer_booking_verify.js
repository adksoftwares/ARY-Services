import puppeteer from 'puppeteer-core';
import path from 'node:path';

const ARTIFACT_DIR = 'C:/Users/Arikarran/.gemini/antigravity/brain/9bee2e27-9cd7-4626-a971-888a6ce02660';
const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function run() {
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1366, height: 850 });

  console.log('Navigating to http://localhost:5173 ...');
  await page.goto('http://localhost:5173', { waitUntil: 'domcontentloaded' });
  await sleep(800);

  // 1. Sign in as existing customer Kamal Silva (0771234567)
  console.log('Logging in as customer Kamal Silva (0771234567)...');
  await page.click('.sign-in');
  await sleep(500);

  const phoneInput = await page.$('input[placeholder*="07X"], input[type="tel"]');
  if (phoneInput) {
    await phoneInput.click({ clickCount: 3 });
    await phoneInput.type('0771234567');
  }

  const sendBtn = await page.$('.modal-submit-btn');
  if (sendBtn) await sendBtn.click();
  await sleep(1500);

  const toastText = await page.evaluate(() => {
    const t = document.querySelector('.toast');
    return t ? t.textContent : '';
  });
  console.log('Customer OTP Toast:', toastText);
  const match = toastText.match(/\[\s*(\d{6})\s*\]/);
  const otpCode = match ? match[1] : '';

  if (otpCode) {
    const codeInput = await page.$('input[placeholder*="digit"], input[maxlength="6"]');
    if (codeInput) await codeInput.type(otpCode);
    await sleep(400);

    const verifyBtn = await page.$('.modal-submit-btn');
    if (verifyBtn) await verifyBtn.click();
    await sleep(1500);
  }

  // 2. Select Electrical Repair
  console.log('Selecting Electrical Repair...');
  await page.evaluate(() => {
    const cards = Array.from(document.querySelectorAll('.service-card'));
    const card = cards.find(c => c.textContent.includes('Electrical Repair'));
    if (card) card.click();
  });
  await sleep(1000);

  // 3. Book Arikarran Sriskandarajah
  console.log('Clicking Book Service...');
  await page.evaluate(() => {
    const cards = Array.from(document.querySelectorAll('.provider-card-item'));
    const target = cards.find(c => c.textContent.includes('Arikarran Sriskandarajah'));
    if (target) {
      const btn = target.querySelector('.book-provider-btn');
      if (btn) btn.click();
    }
  });
  await sleep(1000);

  // Focus and type problem description using page.type
  console.log('Typing problem description using page.type...');
  const textarea = await page.$('.modal-card textarea');
  if (textarea) {
    await textarea.click();
    await textarea.type('Main distribution box MCB trip and burning smell from water heater');
  }

  const addrInput = await page.$('.modal-card input[placeholder*="address" i], .modal-card input[placeholder*="Street" i], .modal-card input[type="text"]');
  if (addrInput) {
    await addrInput.click({ clickCount: 3 });
    await addrInput.type('78 Flower Road, Colombo 07');
  }

  await sleep(500);

  // Submit booking
  console.log('Submitting booking...');
  const submitBtn = await page.$('.modal-card button[type="submit"]');
  if (submitBtn) await submitBtn.click();
  await sleep(2500);

  // Check URL is /bookings
  console.log('Current URL:', page.url());
  const shotBookings = path.join(ARTIFACT_DIR, 'human_customer_my_bookings_confirmed.png');
  await page.screenshot({ path: shotBookings, fullPage: true });
  console.log('Saved confirmed bookings screenshot:', shotBookings);

  await browser.close();
  console.log('Done!');
}

run().catch(console.error);
