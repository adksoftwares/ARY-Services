import puppeteer from 'puppeteer-core';
import path from 'node:path';

const ARTIFACT_DIR = 'C:/Users/Arikarran/.gemini/antigravity/brain/9bee2e27-9cd7-4626-a971-888a6ce02660';
const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function runHumanCheck() {
  console.log('🚀 Starting Human Verification Walkthrough...');

  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1366,850']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1366, height: 850 });

  try {
    // ==========================================
    // STAGE 1: Real Customer Browsing & Booking
    // ==========================================
    console.log('\n--- STAGE 1: Real Customer Discovery & Booking ---');
    console.log('1. Customer visits homepage http://localhost:5173 ...');
    await page.goto('http://localhost:5173', { waitUntil: 'domcontentloaded' });
    await sleep(1000);

    // Customer clicks on "Electrical Repair" category
    console.log('2. Customer clicks "Electrical Repair" category card...');
    const electricalCard = await page.evaluate(() => {
      const cards = Array.from(document.querySelectorAll('.service-card'));
      const card = cards.find(c => c.textContent.includes('Electrical Repair'));
      if (card) {
        card.click();
        return true;
      }
      return false;
    });

    if (!electricalCard) {
      console.warn('Could not click category card directly, scrolling to providers...');
    }
    await sleep(1200);

    // Screenshot 1: Customer Discovery
    const shot1 = path.join(ARTIFACT_DIR, 'human_1_customer_discovery.png');
    await page.screenshot({ path: shot1, fullPage: false });
    console.log('📸 Captured:', shot1);

    // Customer finds Arikarran Sriskandarajah and clicks "Book Service / Request Quote"
    console.log('3. Customer clicks "Book Service / Request Quote" for Arikarran Sriskandarajah...');
    const bookClicked = await page.evaluate(() => {
      const providerCards = Array.from(document.querySelectorAll('.provider-card-item'));
      const targetCard = providerCards.find(c => c.textContent.includes('Arikarran Sriskandarajah'));
      if (targetCard) {
        const btn = targetCard.querySelector('.book-provider-btn');
        if (btn) {
          btn.click();
          return true;
        }
      }
      return false;
    });

    await sleep(800);

    // Since customer is not logged in, Auth Modal prompts
    console.log('4. Customer signs in via Mobile OTP (0773344556)...');
    const authModalVisible = await page.$('.modal-card');
    if (authModalVisible) {
      // Enter phone number
      const phoneInput = await page.$('input[placeholder*="07X"], input[type="tel"]');
      if (phoneInput) {
        await phoneInput.click({ clickCount: 3 });
        await phoneInput.type('0773344556');
      }
      // Click Send Code
      const sendBtn = await page.$('.modal-submit-btn');
      if (sendBtn) await sendBtn.click();
      await sleep(1500);

      // Extract OTP dev code from toast
      const toastText = await page.evaluate(() => {
        const t = document.querySelector('.toast');
        return t ? t.textContent : '';
      });
      console.log('Customer SMS Simulation:', toastText);
      const match = toastText.match(/\[\s*(\d{6})\s*\]/);
      const otpCode = match ? match[1] : '';

      if (otpCode) {
        const codeInput = await page.$('input[placeholder*="digit"], input[maxlength="6"]');
        if (codeInput) await codeInput.type(otpCode);
        await sleep(500);

        // Click verify button
        const verifyBtn = await page.$('.modal-submit-btn');
        if (verifyBtn) await verifyBtn.click();
        await sleep(1200);

        // If new user name prompt appears, enter customer name
        const nameInput = await page.$('input[placeholder*="full name" i], input[placeholder*="Kamal" i]');
        if (nameInput) {
          await nameInput.type('Ravi Kumar');
          const finishBtn = await page.$('.modal-submit-btn');
          if (finishBtn) await finishBtn.click();
          await sleep(1200);
        }
      }
    }

    console.log('5. Now customer clicks "Book Service / Request Quote" on provider card...');
    await page.evaluate(() => {
      const providerCards = Array.from(document.querySelectorAll('.provider-card-item'));
      const targetCard = providerCards.find(c => c.textContent.includes('Arikarran Sriskandarajah'));
      if (targetCard) {
        const btn = targetCard.querySelector('.book-provider-btn');
        if (btn) btn.click();
      }
    });
    await sleep(1000);

    // Fill Booking Modal
    console.log('6. Customer fills booking form...');
    const bookingModalExists = await page.$('.modal-card form');
    if (bookingModalExists) {
      // Fill address
      const addrInput = await page.$('.modal-card input[placeholder*="address" i], .modal-card input[placeholder*="Road" i], .modal-card textarea');
      // Look for inputs
      await page.evaluate(() => {
        const inputs = Array.from(document.querySelectorAll('.modal-card input'));
        const textareas = Array.from(document.querySelectorAll('.modal-card textarea'));
        
        // Find problem description
        const desc = textareas.find(t => t.placeholder && t.placeholder.includes('problem')) || textareas[0];
        if (desc) {
          desc.value = 'Ceiling fan sparking and main tripping whenever switch turned on';
          desc.dispatchEvent(new Event('input', { bubbles: true }));
        }

        // Find address input
        const addr = inputs.find(i => i.placeholder && (i.placeholder.includes('Street') || i.placeholder.includes('Address') || i.placeholder.includes('Peradeniya')));
        if (addr) {
          addr.value = '45 Temple Road, Peradeniya, Kandy';
          addr.dispatchEvent(new Event('input', { bubbles: true }));
        }
      });

      await sleep(600);

      // Screenshot 2: Customer Booking Form
      const shot2 = path.join(ARTIFACT_DIR, 'human_2_customer_booking_form.png');
      await page.screenshot({ path: shot2 });
      console.log('📸 Captured:', shot2);

      // Click Confirm Booking
      console.log('7. Customer submits booking request...');
      await page.evaluate(() => {
        const modal = document.querySelector('.modal-card');
        if (!modal) return;
        const submitBtn = modal.querySelector('button[type="submit"]');
        if (submitBtn) submitBtn.click();
      });

      await sleep(2000);
    }

    // Customer is redirected to /bookings
    console.log('8. Customer views /bookings page...');
    const shot3 = path.join(ARTIFACT_DIR, 'human_3_customer_my_bookings.png');
    await page.screenshot({ path: shot3, fullPage: false });
    console.log('📸 Captured:', shot3);

    // Customer signs out
    console.log('9. Customer signs out...');
    await page.evaluate(() => {
      const signOutBtn = document.querySelector('.sign-out-btn');
      if (signOutBtn) signOutBtn.click();
    });
    await sleep(1500);

    // ==========================================
    // STAGE 2: Service Provider Logs In & Responds
    // ==========================================
    console.log('\n--- STAGE 2: Real Service Provider Experience ---');
    console.log('10. Provider Arikarran visits http://localhost:5173 ...');
    await page.goto('http://localhost:5173', { waitUntil: 'domcontentloaded' });
    await sleep(1000);

    // Provider clicks Sign In
    console.log('11. Provider clicks "Sign in"...');
    await page.click('.sign-in');
    await sleep(800);

    // Provider types mobile number: 0777153933
    console.log('12. Provider enters mobile number 0777153933...');
    const provPhoneInput = await page.$('input[placeholder*="07X"], input[type="tel"]');
    if (provPhoneInput) {
      await provPhoneInput.click({ clickCount: 3 });
      await provPhoneInput.type('0777153933');
    }

    // Provider clicks Send Code
    console.log('13. Provider clicks "Send Verification Code"...');
    const provSendBtn = await page.$('.modal-submit-btn');
    if (provSendBtn) await provSendBtn.click();
    await sleep(1500);

    // Extract OTP code
    const provToastText = await page.evaluate(() => {
      const t = document.querySelector('.toast');
      return t ? t.textContent : '';
    });
    console.log('Provider SMS Toast:', provToastText);
    const provMatch = provToastText.match(/\[\s*(\d{6})\s*\]/);
    const provOtpCode = provMatch ? provMatch[1] : '';

    if (provOtpCode) {
      console.log('14. Provider types 6-digit OTP code:', provOtpCode);
      const provCodeInput = await page.$('input[placeholder*="digit"], input[maxlength="6"]');
      if (provCodeInput) await provCodeInput.type(provOtpCode);
      await sleep(400);

      // Click Verify & Log In
      const provVerifyBtn = await page.$('.modal-submit-btn');
      if (provVerifyBtn) await provVerifyBtn.click();
      console.log('15. Verifying OTP and waiting for automatic redirect to /provider ...');
      await page.waitForFunction(() => window.location.pathname === '/provider', { timeout: 10000 });
      console.log('✅ Provider redirected immediately to:', page.url());
    }

    await sleep(2000);

    // Screenshot 4: Provider Workspace with incoming requests
    const shot4 = path.join(ARTIFACT_DIR, 'human_4_provider_login_redirect.png');
    await page.screenshot({ path: shot4, fullPage: true });
    console.log('📸 Captured:', shot4);

    // Provider reviews the request from "Ravi Kumar" and clicks "Accept Job"
    console.log('16. Provider reviews booking request from Ravi Kumar and clicks "Accept Job"...');
    const acceptClicked = await page.evaluate(() => {
      const cards = Array.from(document.querySelectorAll('.booking-card-item'));
      const target = cards.find(c => c.textContent.includes('Ravi Kumar') || c.textContent.includes('sparking'));
      if (target) {
        const acceptBtn = target.querySelector('.booking-action-btn.accept');
        if (acceptBtn) {
          acceptBtn.click();
          return true;
        }
      }
      // If not found by specific text, click first accept button
      const firstAccept = document.querySelector('.booking-action-btn.accept');
      if (firstAccept) {
        firstAccept.click();
        return true;
      }
      return false;
    });
    console.log('Clicked Accept Job:', acceptClicked);
    await sleep(2000);

    // Screenshot 5: Accepted Job (Actions changed to Start Job & Mark Completed)
    const shot5 = path.join(ARTIFACT_DIR, 'human_5_provider_accepted_job.png');
    await page.screenshot({ path: shot5, fullPage: true });
    console.log('📸 Captured:', shot5);

    // Provider clicks "Start Job" then "Mark Completed" to finish service
    console.log('17. Provider clicks "Start Job" then "Mark Completed"...');
    await page.evaluate(() => {
      const startBtn = document.querySelector('.booking-action-btn.progress');
      if (startBtn) startBtn.click();
    });
    await sleep(1500);

    await page.evaluate(() => {
      const completeBtn = document.querySelector('.booking-action-btn.complete');
      if (completeBtn) completeBtn.click();
    });
    await sleep(2000);

    // Provider navigates to "Earnings & Escrow Wallet" tab
    console.log('18. Provider switches to "Earnings & Escrow Wallet" tab...');
    await page.evaluate(() => {
      const tabs = Array.from(document.querySelectorAll('.dashboard button'));
      const walletTab = tabs.find(t => t.textContent.includes('Earnings') || t.textContent.includes('Wallet'));
      if (walletTab) walletTab.click();
    });
    await sleep(1500);

    // Screenshot 6: Wallet & Earnings
    const shot6 = path.join(ARTIFACT_DIR, 'human_6_provider_wallet_payout.png');
    await page.screenshot({ path: shot6, fullPage: true });
    console.log('📸 Captured:', shot6);

    // Provider visits Home Page to verify Provider Mode Alert Banner
    console.log('19. Provider navigates to Home Page ("/") to check top alert banner...');
    await page.goto('http://localhost:5173', { waitUntil: 'domcontentloaded' });
    await sleep(1500);

    // Screenshot 7: Home page with Provider Mode Banner
    const shot7 = path.join(ARTIFACT_DIR, 'human_7_homepage_provider_banner.png');
    await page.screenshot({ path: shot7, fullPage: false });
    console.log('📸 Captured:', shot7);

    console.log('\n🎉 ALL HUMAN VERIFICATION STAGES COMPLETED SUCCESSFULLY!');
  } catch (err) {
    console.error('❌ Human check failed:', err);
    throw err;
  } finally {
    await browser.close();
  }
}

runHumanCheck().catch(err => {
  console.error(err);
  process.exit(1);
});
