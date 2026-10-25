import puppeteer from 'puppeteer-core';
import path from 'node:path';

async function main() {
  const browser = await puppeteer.launch({
    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 900 });

  console.log('Navigating to http://localhost:5173 ...');
  await page.goto('http://localhost:5173', { waitUntil: 'domcontentloaded' });
  await new Promise(r => setTimeout(r, 800));

  console.log('Opening Sign In modal...');
  await page.click('.sign-in');
  await new Promise(r => setTimeout(r, 500));

  console.log('Typing mobile number 0777153933 ...');
  const phoneInput = await page.$('input[placeholder*="07X"], input[type="tel"]');
  if (phoneInput) {
    await phoneInput.click({ clickCount: 3 });
    await phoneInput.type('0777153933');
  }

  // Click Send Code button
  console.log('Clicking Send Code button...');
  const sendBtn = await page.waitForSelector('.modal-submit-btn');
  await sendBtn.click();
  await new Promise(r => setTimeout(r, 1200));

  // Extract simulated OTP Code from toast
  const toastText = await page.evaluate(() => {
    const t = document.querySelector('.toast');
    return t ? t.textContent : '';
  });
  console.log('Toast text:', toastText);
  const match = toastText.match(/\[\s*(\d{6})\s*\]/);
  const otpCode = match ? match[1] : '';
  console.log('Extracted OTP Code:', otpCode);

  if (otpCode) {
    const codeInput = await page.$('input[placeholder*="digit"], input[maxlength="6"]');
    if (codeInput) {
      await codeInput.type(otpCode);
    }
    await new Promise(r => setTimeout(r, 400));

    // Submit OTP verify
    const verifyBtn = await page.$('.modal-submit-btn');
    if (verifyBtn) {
      await verifyBtn.click();
    }

    console.log('Waiting for redirect to /provider ...');
    await page.waitForFunction(() => window.location.pathname === '/provider', { timeout: 10000 });
    console.log('Current URL is now:', page.url());

    // Wait for bookings cards
    await new Promise(r => setTimeout(r, 1500));

    const artifactDir = 'C:/Users/Arikarran/.gemini/antigravity/brain/9bee2e27-9cd7-4626-a971-888a6ce02660';
    const providerScreenPath = path.join(artifactDir, 'provider_workspace_customer_requests.png');
    await page.screenshot({ path: providerScreenPath, fullPage: true });
    console.log('Saved screenshot of Provider Workspace:', providerScreenPath);

    // Now go to homepage / and verify the provider banner
    await page.goto('http://localhost:5173', { waitUntil: 'domcontentloaded' });
    await new Promise(r => setTimeout(r, 1200));
    const homeScreenPath = path.join(artifactDir, 'provider_home_banner.png');
    await page.screenshot({ path: homeScreenPath });
    console.log('Saved screenshot of Homepage with Provider Banner:', homeScreenPath);

    console.log('✅ UI Verification Successfully Completed!');
  } else {
    console.error('Could not extract OTP simulation code');
  }

  await browser.close();
}

main().catch(err => {
  console.error('Error in UI test:', err);
  process.exit(1);
});
