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

  await page.goto('http://localhost:5173', { waitUntil: 'domcontentloaded' });
  await sleep(600);

  // Provider signs in with 0777153933
  await page.click('.sign-in');
  await sleep(400);

  const phoneInput = await page.$('input[placeholder*="07X"], input[type="tel"]');
  if (phoneInput) {
    await phoneInput.click({ clickCount: 3 });
    await phoneInput.type('0777153933');
  }

  const sendBtn = await page.$('.modal-submit-btn');
  if (sendBtn) await sendBtn.click();
  await sleep(1500);

  const toastText = await page.evaluate(() => {
    const t = document.querySelector('.toast');
    return t ? t.textContent : '';
  });
  const match = toastText.match(/\[\s*(\d{6})\s*\]/);
  const otpCode = match ? match[1] : '';

  if (otpCode) {
    const codeInput = await page.$('input[placeholder*="digit"], input[maxlength="6"]');
    if (codeInput) await codeInput.type(otpCode);
    await sleep(400);

    const verifyBtn = await page.$('.modal-submit-btn');
    if (verifyBtn) await verifyBtn.click();
    await page.waitForFunction(() => window.location.pathname === '/provider', { timeout: 10000 });
  }

  await sleep(2000);

  const shotProvider = path.join(ARTIFACT_DIR, 'human_provider_workspace_live_latest.png');
  await page.screenshot({ path: shotProvider, fullPage: true });
  console.log('Saved latest provider workspace screenshot:', shotProvider);

  await browser.close();
}

run().catch(console.error);
