import puppeteer from 'puppeteer-core';
import path from 'node:path';

const ARTIFACT_DIR = 'C:/Users/Arikarran/.gemini/antigravity/brain/9bee2e27-9cd7-4626-a971-888a6ce02660';
const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

async function run() {
  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1366, height: 850 });

  await page.goto('http://localhost:5173', { waitUntil: 'domcontentloaded' });
  await new Promise(r => setTimeout(r, 1200));

  // Scroll to bottom
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await new Promise(r => setTimeout(r, 600));

  // Screenshot footer
  const footerEl = await page.$('.site-footer');
  if (footerEl) {
    const shotPath = path.join(ARTIFACT_DIR, 'footer_adk_signature.png');
    await footerEl.screenshot({ path: shotPath });
    console.log('Saved footer screenshot:', shotPath);
  }

  // Also full page screenshot
  const fullShot = path.join(ARTIFACT_DIR, 'homepage_with_footer.png');
  await page.screenshot({ path: fullShot, fullPage: false });
  console.log('Saved full screenshot:', fullShot);

  await browser.close();
}

run().catch(console.error);
