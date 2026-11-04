import asyncio
import json
import os
import subprocess
import sys
import time
import urllib.request
import websockets

if sys.platform == 'win32':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass

DEVICE = "RFCY40K7QAN"
ARTIFACT_DIR = r"C:\Users\Arikarran\.gemini\antigravity\brain\9bee2e27-9cd7-4626-a971-888a6ce02660"

def adb(cmd):
    return subprocess.run(f"adb -s {DEVICE} {cmd}", shell=True, capture_output=True, text=True).stdout.strip()

def capture(name):
    out = os.path.join(ARTIFACT_DIR, name)
    adb("shell screencap -p /sdcard/temp_scr.png")
    adb(f'pull /sdcard/temp_scr.png "{out}"')
    print(f"  [SCREENSHOT] Saved: {name}", flush=True)
    return out

def get_auth_user(identifier, password):
    data = json.dumps({'identifier': identifier, 'password': password}).encode('utf-8')
    req = urllib.request.urlopen(urllib.request.Request('http://localhost:4000/api/auth/login', data=data, headers={'Content-Type': 'application/json'}))
    return json.loads(req.read().decode('utf-8')).get('user')

async def eval_js(ws, expr):
    msg_id = int(time.time() * 10000) % 100000
    await ws.send(json.dumps({
        "id": msg_id,
        "method": "Runtime.evaluate",
        "params": {
            "expression": expr,
            "awaitPromise": True,
            "returnByValue": True
        }
    }))
    while True:
        raw = await ws.recv()
        resp = json.loads(raw)
        if resp.get("id") == msg_id:
            res = resp.get("result", {})
            if "exceptionDetails" in res:
                print("    [JS EXCEPTION]:", res["exceptionDetails"].get("text", "Error"))
                return None
            return res.get("result", {}).get("value")

async def connect_app(pkg, activity):
    print(f"\n[LAUNCH] Starting {pkg} on screen...", flush=True)
    adb("shell input keyevent KEYCODE_WAKEUP")
    adb("shell wm dismiss-keyguard")
    adb(f"shell am start --user 0 -a android.intent.action.MAIN -c android.intent.category.LAUNCHER -n {activity}")
    await asyncio.sleep(3.5)

    pids = adb(f"shell pidof {pkg}").split()
    if not pids:
        print(f"Warning: no pid for {pkg}")
        return None

    adb("forward --remove tcp:9222")
    await asyncio.sleep(0.3)

    sock = f"webview_devtools_remote_{pids[-1]}"
    adb(f"forward tcp:9222 localabstract:{sock}")
    await asyncio.sleep(0.8)

    targets = None
    for attempt in range(4):
        try:
            req = urllib.request.urlopen("http://localhost:9222/json", timeout=3)
            targets = json.loads(req.read().decode("utf-8"))
            if targets:
                break
        except Exception as e:
            print(f"  Retry connecting to /json ({attempt + 1}/4)...", flush=True)
            await asyncio.sleep(1.2)

    if not targets:
        print(f"No targets on /json for {pkg}")
        return None
    return await websockets.connect(targets[0]["webSocketDebuggerUrl"], max_size=10_000_000)

async def run_master():
    print("=" * 65)
    print("🚀 ARY SERVICES — COMPREHENSIVE LIVE MOBILE SHOWCASE")
    print("Device: Samsung Galaxy (RFCY40K7QAN)")
    print("=" * 65, flush=True)

    # Ensure device is awake and reverse is active
    adb("shell input keyevent KEYCODE_WAKEUP")
    adb("shell wm dismiss-keyguard")
    adb("reverse tcp:4000 tcp:4000")
    await asyncio.sleep(1)

    # =========================================================================
    # STAGE 1: CUSTOMER APP — AUTHENTICATION & DISCOVERY
    # =========================================================================
    print("\n-------------------------------------------------------")
    print("STAGE 1: CUSTOMER APP — HOME & BOOKING FLOW")
    print("-------------------------------------------------------", flush=True)

    cust_user = get_auth_user('0774577882', '123456')
    print("Authenticated customer:", cust_user['fullName'], flush=True)

    ws_c = await connect_app("com.aryservices.customer", "com.aryservices.customer/com.aryservices.customer.MainActivity")
    if not ws_c:
        print("Failed to connect to customer app")
        return

    # Check / Inject customer user
    cur_user = await eval_js(ws_c, "localStorage.getItem('ary_user')")
    if not cur_user or '0774577882' not in cur_user:
        print("Injecting customer session...", flush=True)
        u_str = json.dumps(cust_user)
        await eval_js(ws_c, f"""
            localStorage.setItem('ary_user', JSON.stringify({u_str}));
            location.reload();
        """)
        await asyncio.sleep(2.5)
        await ws_c.close()
        ws_c = await connect_app("com.aryservices.customer", "com.aryservices.customer/com.aryservices.customer.MainActivity")

    # Navigate to Home Explore tab
    await eval_js(ws_c, """
        (() => {
            const exp = Array.from(document.querySelectorAll('.mob-nav-item, button')).find(b => b.textContent.includes('Explore'));
            if (exp) exp.click();
            window.scrollTo({ top: 0, behavior: 'instant' });
        })()
    """)
    await asyncio.sleep(1.5)
    capture("live_01_customer_home.png")

    # Test Language Switcher: Sinhala
    print("[1.1] Testing Language Switcher: Sinhala...", flush=True)
    await eval_js(ws_c, """
        (() => {
            const siBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('සිං'));
            if (siBtn) siBtn.click();
        })()
    """)
    await asyncio.sleep(1.2)
    capture("live_02_lang_sinhala.png")

    # Test Language Switcher: Tamil
    print("[1.2] Testing Language Switcher: Tamil...", flush=True)
    await eval_js(ws_c, """
        (() => {
            const taBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('தமி'));
            if (taBtn) taBtn.click();
        })()
    """)
    await asyncio.sleep(1.2)
    capture("live_03_lang_tamil.png")

    # Switch back to English
    print("[1.3] Returning to English...", flush=True)
    await eval_js(ws_c, """
        (() => {
            const enBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.trim() === 'EN');
            if (enBtn) enBtn.click();
        })()
    """)
    await asyncio.sleep(1.0)

    # Scroll down to Verified Service Providers
    print("[1.4] Scrolling to Verified Service Providers...", flush=True)
    await eval_js(ws_c, """
        (() => {
            const cat = document.getElementById('providers-catalog') || document.querySelector('.providers-section');
            if (cat) cat.scrollIntoView({ behavior: 'smooth' });
        })()
    """)
    await asyncio.sleep(2.0)
    capture("live_04_providers_list.png")

    # Open Booking Modal for Master Electrician Kumar
    print("[1.5] Tapping 'Book Now' on Master Electrician Kumar...", flush=True)
    await eval_js(ws_c, """
        (() => {
            const btn = Array.from(document.querySelectorAll('.book-provider-btn, button')).find(b => b.textContent.includes('Book Now'));
            if (btn) btn.click();
        })()
    """)
    await asyncio.sleep(2.0)
    capture("live_05_modal_step1.png")

    # Step 1: Type Problem Description
    print("[1.6] Step 1: Typing Problem Description into Wizard...", flush=True)
    await eval_js(ws_c, """
        (() => {
            const ta = document.querySelector('.booking-wizard-content textarea, textarea');
            if (ta) {
                const setter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set;
                setter.call(ta, 'Main circuit breaker tripping intermittently whenever air conditioner is powered on. Need full diagnostic and fuse repair.');
                ta.dispatchEvent(new Event('input', { bubbles: true }));
                return true;
            }
            return false;
        })()
    """)
    await asyncio.sleep(1.0)

    # Click Continue to Step 2
    print("[1.7] Clicking 'Continue' to Step 2 (Date & Time)...", flush=True)
    await eval_js(ws_c, """
        (() => {
            const btn = Array.from(document.querySelectorAll('.ds-modal-footer button, .wizard-next-btn, button')).find(b => b.textContent.includes('Continue'));
            if (btn) btn.click();
        })()
    """)
    await asyncio.sleep(1.5)
    capture("live_06_modal_step2.png")

    # Step 2: Choose Time Slot
    print("[1.8] Step 2: Selecting arrival window 'Morning (9 AM - 12 PM)'...", flush=True)
    await eval_js(ws_c, """
        (() => {
            const slots = Array.from(document.querySelectorAll('.time-slot-btn, button'));
            const morning = slots.find(s => s.textContent.includes('Morning'));
            if (morning) morning.click();
        })()
    """)
    await asyncio.sleep(1.0)

    # Click Continue to Step 3
    print("[1.9] Clicking 'Continue' to Step 3 (Address)...", flush=True)
    await eval_js(ws_c, """
        (() => {
            const btn = Array.from(document.querySelectorAll('.ds-modal-footer button, .wizard-next-btn, button')).find(b => b.textContent.includes('Continue'));
            if (btn) btn.click();
        })()
    """)
    await asyncio.sleep(1.5)
    capture("live_07_modal_step3.png")

    # Step 3: Enter Address
    print("[1.10] Step 3: Entering service address...", flush=True)
    await eval_js(ws_c, """
        (() => {
            const ta = document.querySelector('.booking-wizard-content textarea, textarea');
            if (ta) {
                const setter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set;
                setter.call(ta, 'No. 45, Galle Road, Bambalapitiya, Colombo 04');
                ta.dispatchEvent(new Event('input', { bubbles: true }));
                return true;
            }
            return false;
        })()
    """)
    await asyncio.sleep(1.0)

    # Click Continue to Step 4
    print("[1.11] Clicking 'Continue' to Step 4 (Review & Payment)...", flush=True)
    await eval_js(ws_c, """
        (() => {
            const btn = Array.from(document.querySelectorAll('.ds-modal-footer button, .wizard-next-btn, button')).find(b => b.textContent.includes('Continue'));
            if (btn) btn.click();
        })()
    """)
    await asyncio.sleep(1.5)
    capture("live_08_modal_step4.png")

    # Step 4: Confirm Booking Request
    print("[1.12] Step 4: Tapping 'Confirm Booking Request'...", flush=True)
    await eval_js(ws_c, """
        (() => {
            const confirmBtn = Array.from(document.querySelectorAll('.ds-modal-footer button, .wizard-next-btn, button')).find(b => b.textContent.includes('Confirm Booking'));
            if (confirmBtn) confirmBtn.click();
        })()
    """)
    print("  Waiting for backend confirmation...", flush=True)
    await asyncio.sleep(3.5)
    capture("live_09_modal_step5_success.png")

    # Step 5: Navigate to My Bookings
    print("[1.13] Tapping 'Go to My Bookings'...", flush=True)
    await eval_js(ws_c, """
        (() => {
            const btn = Array.from(document.querySelectorAll('.wizard-success-pane button, button')).find(b => b.textContent.includes('My Bookings'));
            if (btn) btn.click();
        })()
    """)
    await asyncio.sleep(2.5)
    capture("live_10_customer_my_bookings.png")
    await ws_c.close()

    # =========================================================================
    # STAGE 2: PROVIDER APP — ACCEPTANCE & STATUS LIFECYCLE
    # =========================================================================
    print("\n-------------------------------------------------------")
    print("STAGE 2: PROVIDER APP — ACCEPTANCE & COMPLETION")
    print("-------------------------------------------------------", flush=True)

    prov_user = get_auth_user('kumar.electric@example.local', 'KumarPass@123')
    print("Authenticated provider:", prov_user['fullName'], flush=True)

    ws_p = await connect_app("com.aryservices.provider", "com.aryservices.provider/com.aryservices.provider.MainActivity")
    if not ws_p:
        print("Failed to connect to provider app")
        return

    # Check / Inject provider session
    cur_p = await eval_js(ws_p, "localStorage.getItem('ary_user')")
    if not cur_p or 'kumar.electric' not in cur_p:
        print("Injecting provider session...", flush=True)
        p_str = json.dumps(prov_user)
        await eval_js(ws_p, f"""
            localStorage.setItem('ary_user', JSON.stringify({p_str}));
            location.reload();
        """)
        await asyncio.sleep(2.5)
        await ws_p.close()
        ws_p = await connect_app("com.aryservices.provider", "com.aryservices.provider/com.aryservices.provider.MainActivity")

    capture("live_11_provider_dashboard.png")

    # Switch to Jobs Tab
    print("[2.1] Navigating to Provider Jobs tab...", flush=True)
    await eval_js(ws_p, """
        (() => {
            const jobsTab = Array.from(document.querySelectorAll('.app-nav-item, .nav-tab-btn, button')).find(b => b.textContent.trim().startsWith('Jobs'));
            if (jobsTab) jobsTab.click();
        })()
    """)
    await asyncio.sleep(2.5)
    capture("live_12_provider_jobs_list.png")

    # 1. Accept Job
    print("[2.2] Tapping 'Accept Job'...", flush=True)
    await eval_js(ws_p, """
        (() => {
            const btn = Array.from(document.querySelectorAll('.job-actions-row button, button')).find(b => b.textContent.includes('Accept Job'));
            if (btn) btn.click();
        })()
    """)
    await asyncio.sleep(2.5)
    capture("live_13_provider_job_accepted.png")

    # 2. Start Job (In Progress)
    print("[2.3] Tapping 'Start Job'...", flush=True)
    await eval_js(ws_p, """
        (() => {
            const btn = Array.from(document.querySelectorAll('.job-actions-row button, button')).find(b => b.textContent.includes('Start Job'));
            if (btn) btn.click();
        })()
    """)
    await asyncio.sleep(2.5)
    capture("live_14_provider_job_in_progress.png")

    # 3. Mark as Finished (Completed)
    print("[2.4] Tapping 'Mark as Finished'...", flush=True)
    await eval_js(ws_p, """
        (() => {
            const btn = Array.from(document.querySelectorAll('.job-actions-row button, button')).find(b => b.textContent.includes('Mark as Finished') || b.textContent.includes('Mark Completed'));
            if (btn) btn.click();
        })()
    """)
    await asyncio.sleep(2.5)
    capture("live_15_provider_job_completed.png")

    # 4. View Wallet / Earnings Ledger
    print("[2.5] Switching to Earnings / Wallet tab...", flush=True)
    await eval_js(ws_p, """
        (() => {
            const tab = Array.from(document.querySelectorAll('.app-nav-item, button')).find(b => b.textContent.includes('Earnings') || b.textContent.includes('Wallet'));
            if (tab) tab.click();
        })()
    """)
    await asyncio.sleep(2.0)
    capture("live_16_provider_wallet.png")
    await ws_p.close()

    # =========================================================================
    # STAGE 3: DRIVER APP — GO ONLINE & GPS DISPATCH
    # =========================================================================
    print("\n-------------------------------------------------------")
    print("STAGE 3: DRIVER APP — GO ONLINE & GPS DISPATCH")
    print("-------------------------------------------------------", flush=True)

    driver_user = get_auth_user('0778899001', 'DriverPass@123')
    print("Authenticated driver:", driver_user['fullName'], flush=True)

    ws_d = await connect_app("com.aryservices.driver", "com.aryservices.driver/com.aryservices.driver.MainActivity")
    if ws_d:
        cur_d = await eval_js(ws_d, "localStorage.getItem('ary_user')")
        if not cur_d or '0778899001' not in cur_d:
            print("Injecting driver session...", flush=True)
            d_str = json.dumps(driver_user)
            await eval_js(ws_d, f"""
                localStorage.setItem('ary_user', JSON.stringify({d_str}));
                location.reload();
            """)
            await asyncio.sleep(2.5)
            await ws_d.close()
            ws_d = await connect_app("com.aryservices.driver", "com.aryservices.driver/com.aryservices.driver.MainActivity")

        capture("live_17_driver_home.png")

        # Toggle giant Online power button
        print("[3.1] Toggling Giant Online Power Switch...", flush=True)
        await eval_js(ws_d, """
            (() => {
                const btn = document.querySelector('.driver-giant-power-btn, button.giant-power-btn');
                if (btn) btn.click();
            })()
        """)
        await asyncio.sleep(2.5)
        capture("live_18_driver_online_ready.png")
        await ws_d.close()

    # =========================================================================
    # STAGE 4: CUSTOMER APP — VERIFY COMPLETED BOOKING & SUBMIT REVIEW
    # =========================================================================
    print("\n-------------------------------------------------------")
    print("STAGE 4: CUSTOMER APP — REVIEW SUBMISSION")
    print("-------------------------------------------------------", flush=True)

    ws_c2 = await connect_app("com.aryservices.customer", "com.aryservices.customer/com.aryservices.customer.MainActivity")
    if ws_c2:
        # Navigate to My Bookings
        await eval_js(ws_c2, """
            (() => {
                const tab = Array.from(document.querySelectorAll('.mob-nav-item, button')).find(b => b.textContent.includes('Bookings'));
                if (tab) tab.click();
            })()
        """)
        await asyncio.sleep(2.0)

        # Switch to Completed tab
        print("[4.1] Switching to Completed bookings tab...", flush=True)
        await eval_js(ws_c2, """
            (() => {
                const completedTab = Array.from(document.querySelectorAll('.ds-tab-button, button')).find(b => b.textContent.includes('Completed'));
                if (completedTab) completedTab.click();
            })()
        """)
        await asyncio.sleep(2.5)
        capture("live_19_customer_completed_tab.png")

        # Click Leave Review button
        print("[4.2] Tapping 'Leave Review' on Kumar's completed job...", flush=True)
        await eval_js(ws_c2, """
            (() => {
                const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Leave Review') || b.textContent.includes('Write Review'));
                if (btn) btn.click();
            })()
        """)
        await asyncio.sleep(2.0)
        capture("live_20_review_modal.png")

        # Submit 5-star review
        print("[4.3] Submitting 5-Star Review with positive feedback...", flush=True)
        await eval_js(ws_c2, """
            (() => {
                // Select 5 stars
                const stars = Array.from(document.querySelectorAll('.star-rating-btn, .review-star-btn, svg'));
                if (stars.length >= 5) {
                    stars[4].click();
                }
                const ta = document.querySelector('.review-modal-body textarea, textarea');
                if (ta) {
                    const setter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set;
                    setter.call(ta, 'Outstanding workmanship! Arrived promptly, diagnosed the AC circuit tripping issue quickly, and installed a safe new breaker. Very professional!');
                    ta.dispatchEvent(new Event('input', { bubbles: true }));
                }
                const submitBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Submit Review'));
                if (submitBtn) submitBtn.click();
            })()
        """)
        await asyncio.sleep(3.0)
        capture("live_21_review_submitted.png")
        await ws_c2.close()

    print("\n" + "=" * 65)
    print("🎉 ALL STAGES COMPLETED LIVE ON REAL MOBILE DEVICE!")
    print("=" * 65, flush=True)

if __name__ == '__main__':
    asyncio.run(run_master())
