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
    for attempt in range(5):
        try:
            req = urllib.request.urlopen("http://localhost:9222/json", timeout=3)
            targets = json.loads(req.read().decode("utf-8"))
            if targets:
                break
        except Exception:
            print(f"  Retry connecting to /json ({attempt + 1}/5)...", flush=True)
            await asyncio.sleep(1.2)

    if not targets:
        print(f"No targets on /json for {pkg}")
        return None
    return await websockets.connect(targets[0]["webSocketDebuggerUrl"], max_size=10_000_000)

async def run_operations():
    print("=" * 70)
    print("🚀 ARY SERVICES — FULL LIFECYCLE DEEP DEMONSTRATION & LIVE UI AUDIT")
    print("Device: Samsung Galaxy (RFCY40K7QAN)")
    print("=" * 70, flush=True)

    adb("shell input keyevent KEYCODE_WAKEUP")
    adb("shell wm dismiss-keyguard")
    adb("reverse tcp:4000 tcp:4000")
    await asyncio.sleep(1)

    # =========================================================================
    # PART 1: GROCERY MARKETPLACE — ADD TO CART & CHECKOUT
    # =========================================================================
    print("\n" + "=" * 50)
    print("PART 1: CUSTOMER GROCERY MARKETPLACE & ORDERING")
    print("=" * 50, flush=True)

    cust_user = get_auth_user('0774577882', '123456')
    ws_c = await connect_app("com.aryservices.customer", "com.aryservices.customer/com.aryservices.customer.MainActivity")
    if not ws_c:
        print("Could not connect to customer app")
        return

    cur_user = await eval_js(ws_c, "localStorage.getItem('ary_user')")
    if not cur_user or '0774577882' not in cur_user:
        u_str = json.dumps(cust_user)
        await eval_js(ws_c, f"""
            localStorage.setItem('ary_user', JSON.stringify({u_str}));
            location.reload();
        """)
        await asyncio.sleep(2.5)
        await ws_c.close()
        ws_c = await connect_app("com.aryservices.customer", "com.aryservices.customer/com.aryservices.customer.MainActivity")

    # Navigate to Grocery Marketplace section
    print("[1.1] Scrolling smoothly to Grocery Marketplace...", flush=True)
    await eval_js(ws_c, """
        (() => {
            const g = document.getElementById('grocery-section');
            if (g) g.scrollIntoView({ behavior: 'smooth' });
        })()
    """)
    await asyncio.sleep(2.5)
    capture("live_22_grocery_catalog_styled.png")

    # Add 1x Keeri Samba Rice 5kg to Cart
    print("[1.2] Adding 'Keeri Samba Rice 5kg' to cart...", flush=True)
    await eval_js(ws_c, """
        (() => {
            const cards = Array.from(document.querySelectorAll('.product-item-card'));
            const riceCard = cards.find(c => c.textContent.includes('Keeri Samba'));
            if (riceCard) {
                const btns = riceCard.querySelectorAll('.qty-stepper-box button');
                if (btns.length >= 2) btns[1].click(); // Plus button
            }
        })()
    """)
    await asyncio.sleep(1.5)

    # Add 2x Watawala Ceylon Tea 400g to Cart
    print("[1.3] Adding 2x 'Watawala Ceylon Tea 400g' to cart...", flush=True)
    await eval_js(ws_c, """
        (() => {
            const cards = Array.from(document.querySelectorAll('.product-item-card'));
            const teaCard = cards.find(c => c.textContent.includes('Watawala'));
            if (teaCard) {
                const btns = teaCard.querySelectorAll('.qty-stepper-box button');
                if (btns.length >= 2) {
                    btns[1].click(); // +1
                    setTimeout(() => btns[1].click(), 500); // +2
                }
            }
        })()
    """)
    await asyncio.sleep(2.0)
    capture("live_23_grocery_cart_floating_styled.png")

    # Open Persistent Floating Cart Bar Checkout CTA
    print("[1.4] Tapping 'Review & Checkout' floating bar...", flush=True)
    await eval_js(ws_c, """
        (() => {
            const cta = document.querySelector('.persistent-cart-bar button, .cart-checkout-cta');
            if (cta) cta.click();
        })()
    """)
    await asyncio.sleep(2.0)
    capture("live_24_grocery_checkout_modal_styled.png")

    # Submit Grocery Order
    print("[1.5] Submitting Grocery Order with Delivery Address...", flush=True)
    await eval_js(ws_c, """
        (() => {
            const form = document.querySelector('.checkout-modal-form');
            if (form) {
                const inputs = form.querySelectorAll('input');
                if (inputs.length >= 2) {
                    const setVal = (el, val) => {
                        const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set;
                        if (setter) setter.call(el, val);
                        el.dispatchEvent(new Event('input', { bubbles: true }));
                    };
                    setVal(inputs[0], 'No. 45, Galle Road, Colombo 04');
                    setVal(inputs[1], '0774577882');
                }
                const placeBtn = Array.from(form.querySelectorAll('button')).find(b => b.textContent.includes('Place Cash on Delivery Order'));
                if (placeBtn) placeBtn.click();
            }
        })()
    """)
    print("  Waiting for backend confirmation...", flush=True)
    await asyncio.sleep(3.5)
    capture("live_25_grocery_order_placed_styled.png")

    # View Order in Customer 'My Orders' drawer
    print("[1.6] Opening Customer 'My Orders' Drawer...", flush=True)
    await eval_js(ws_c, """
        (() => {
            const btn = Array.from(document.querySelectorAll('.grocery-header-actions button')).find(b => b.textContent.includes('My Orders'));
            if (btn) btn.click();
        })()
    """)
    await asyncio.sleep(2.0)
    capture("live_25b_customer_my_orders_feed.png")
    await ws_c.close()

    # =========================================================================
    # PART 2: PROVIDER APP — GROCERY ORDER FULFILLMENT
    # =========================================================================
    print("\n" + "=" * 50)
    print("PART 2: PROVIDER APP — GROCERY ORDER FULFILLMENT")
    print("=" * 50, flush=True)

    fresh_user = get_auth_user('fresh.food@example.local', 'FreshPass@123')
    ws_p = await connect_app("com.aryservices.provider", "com.aryservices.provider/com.aryservices.provider.MainActivity")
    if ws_p:
        f_str = json.dumps(fresh_user)
        await eval_js(ws_p, f"""
            localStorage.setItem('ary_user', JSON.stringify({f_str}));
            location.reload();
        """)
        await asyncio.sleep(2.5)
        await ws_p.close()
        ws_p = await connect_app("com.aryservices.provider", "com.aryservices.provider/com.aryservices.provider.MainActivity")

        # Navigate to Grocery Orders tab
        print("[2.1] Navigating to Provider Grocery Orders...", flush=True)
        await eval_js(ws_p, """
            (() => {
                const tab = Array.from(document.querySelectorAll('.app-nav-item, button')).find(b => b.textContent.includes('Grocery Orders'));
                if (tab) tab.click();
            })()
        """)
        await asyncio.sleep(2.5)
        capture("live_26_provider_grocery_orders_styled.png")

        # Step 1: Pack order
        print("[2.2] Packing order (status -> packed)...", flush=True)
        await eval_js(ws_p, """
            (() => {
                const btn = Array.from(document.querySelectorAll('.order-action-btn, button')).find(b => b.textContent.includes('Pack') || b.textContent.includes('Mark Packed'));
                if (btn) btn.click();
            })()
        """)
        await asyncio.sleep(2.5)
        capture("live_27_grocery_order_packed_styled.png")

        # Step 2: Out for delivery
        print("[2.3] Dispatching order (status -> out_for_delivery)...", flush=True)
        await eval_js(ws_p, """
            (() => {
                const btn = Array.from(document.querySelectorAll('.order-action-btn, button')).find(b => b.textContent.includes('Dispatch') || b.textContent.includes('Out for Delivery'));
                if (btn) btn.click();
            })()
        """)
        await asyncio.sleep(2.5)
        capture("live_28_grocery_order_out_for_delivery_styled.png")

        # Step 3: Mark delivered
        print("[2.4] Completing delivery (status -> delivered)...", flush=True)
        await eval_js(ws_p, """
            (() => {
                const btn = Array.from(document.querySelectorAll('.order-action-btn, button')).find(b => b.textContent.includes('Delivered') || b.textContent.includes('Mark Delivered'));
                if (btn) btn.click();
            })()
        """)
        await asyncio.sleep(2.5)
        capture("live_29_grocery_order_delivered_styled.png")
        await ws_p.close()

    # =========================================================================
    # PART 3: MOBILITY RIDE DISPATCH & DRIVER PIN VERIFICATION
    # =========================================================================
    print("\n" + "=" * 50)
    print("PART 3: MOBILITY RIDE DISPATCH & DRIVER PIN HANDOFF")
    print("=" * 50, flush=True)

    ws_c3 = await connect_app("com.aryservices.customer", "com.aryservices.customer/com.aryservices.customer.MainActivity")
    if ws_c3:
        # Scroll to Mobility Services section
        print("[3.1] Scrolling to Mobility Fleet section...", flush=True)
        await eval_js(ws_c3, """
            (() => {
                const m = document.getElementById('mobility-services') || document.getElementById('mobility-section');
                if (m) m.scrollIntoView({ behavior: 'smooth' });
            })()
        """)
        await asyncio.sleep(2.0)

        # Select Ride mode tab
        print("[3.2] Selecting 'Ride Service' tab on SegmentedControl...", flush=True)
        await eval_js(ws_c3, """
            (() => {
                const rideBtn = Array.from(document.querySelectorAll('.ds-segmented-btn')).find(b => b.textContent.includes('Ride'));
                if (rideBtn) rideBtn.click();
            })()
        """)
        await asyncio.sleep(1.5)

        # Fill Ride Details
        print("[3.3] Entering Pickup & Destination locations...", flush=True)
        await eval_js(ws_c3, """
            (() => {
                const form = document.querySelector('.mobility-form-card');
                if (form) {
                    const inputs = form.querySelectorAll('input[type=\"text\"]');
                    if (inputs.length >= 2) {
                        const setVal = (el, val) => {
                            const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set;
                            if (setter) setter.call(el, val);
                            el.dispatchEvent(new Event('input', { bubbles: true }));
                        };
                        setVal(inputs[0], 'Colombo Fort Railway Station');
                        setVal(inputs[1], 'Galle Face Green, Colombo 03');
                    }
                }
            })()
        """)
        await asyncio.sleep(1.0)
        capture("live_30_customer_ride_form_styled.png")

        # Tap 'Request Ride Driver'
        print("[3.4] Tapping 'Request Ride Driver'...", flush=True)
        await eval_js(ws_c3, """
            (() => {
                const btn = Array.from(document.querySelectorAll('.mobility-form-card button')).find(b => b.textContent.includes('Request Ride Driver'));
                if (btn) btn.click();
            })()
        """)
        await asyncio.sleep(3.5)
        capture("live_31_customer_ride_broadcasted_styled.png")
        await ws_c3.close()

    # Now Driver (Kamal Perera) claims & completes the ride!
    print("\n[3.5] Launching Driver app (Kamal Perera)...", flush=True)
    driver_user = get_auth_user('0778899001', 'DriverPass@123')
    ws_d = await connect_app("com.aryservices.driver", "com.aryservices.driver/com.aryservices.driver.MainActivity")
    if ws_d:
        d_str = json.dumps(driver_user)
        await eval_js(ws_d, f"""
            localStorage.setItem('ary_user', JSON.stringify({d_str}));
            location.reload();
        """)
        await asyncio.sleep(2.5)
        await ws_d.close()
        ws_d = await connect_app("com.aryservices.driver", "com.aryservices.driver/com.aryservices.driver.MainActivity")

        # Scroll to Available Jobs
        print("[3.6] Viewing Available Jobs in area...", flush=True)
        await eval_js(ws_d, """
            (() => {
                const sec = document.querySelector('.driver-feed-section, .available-jobs-card');
                if (sec) sec.scrollIntoView({ behavior: 'smooth' });
            })()
        """)
        await asyncio.sleep(1.5)
        capture("live_32_driver_feed_ride_available_styled.png")

        # Claim the ride job
        print("[3.7] Driver accepts ride job...", flush=True)
        await eval_js(ws_d, """
            (() => {
                const claimBtn = Array.from(document.querySelectorAll('.driver-job-actions button, button')).find(b => b.textContent.includes('Accept Job') || b.textContent.includes('Claim'));
                if (claimBtn) claimBtn.click();
            })()
        """)
        await asyncio.sleep(3.0)
        capture("live_33_driver_job_claimed_styled.png")

        # Driver marks "Arrived at Pickup"
        print("[3.8] Driver taps 'Arrived at Pickup'...", flush=True)
        await eval_js(ws_d, """
            (() => {
                const arrivedBtn = Array.from(document.querySelectorAll('.active-trip-actions button, button')).find(b => b.textContent.includes('Arrived at Pickup') || b.textContent.includes('Arrived'));
                if (arrivedBtn) arrivedBtn.click();
            })()
        """)
        await asyncio.sleep(2.5)
        capture("live_34_driver_arrived_pickup_styled.png")

        # Driver taps 'Enter Pickup PIN'
        print("[3.9] Driver taps 'Enter Pickup PIN'...", flush=True)
        await eval_js(ws_d, """
            (() => {
                const pinBtn = Array.from(document.querySelectorAll('.active-trip-actions button, button')).find(b => b.textContent.includes('Enter Pickup PIN') || b.textContent.includes('Verify PIN') || b.textContent.includes('Start Trip'));
                if (pinBtn) pinBtn.click();
            })()
        """)
        await asyncio.sleep(2.0)
        capture("live_35_driver_pin_keypad_modal_styled.png")

        # Fetch actual PIN from backend
        req = urllib.request.Request('http://localhost:4000/api/driver-jobs', headers={'Authorization': 'Bearer ' + driver_user['token']})
        res = urllib.request.urlopen(req)
        jobs_data = json.loads(res.read().decode('utf-8')).get('jobs', [])
        active_job = next((j for j in jobs_data if j.get('status') in ['arrived', 'arrived_pickup', 'accepted']), None)
        job_pin = active_job.get('pickupPin') or active_job.get('verificationPin') or active_job.get('startPin') or '1234'
        print(f"  Verifying customer PIN: {job_pin}...", flush=True)

        for digit in str(job_pin):
            await eval_js(ws_d, f"""
                (() => {{
                    const btns = Array.from(document.querySelectorAll('button'));
                    const b = btns.find(btn => btn.textContent.trim() === '{digit}');
                    if (b) b.click();
                }})()
            """)
            await asyncio.sleep(0.3)

        await asyncio.sleep(1.0)
        # Click Verify PIN CTA inside modal
        await eval_js(ws_d, """
            (() => {
                const vBtn = Array.from(document.querySelectorAll('.ds-modal-footer button, button')).find(b => b.textContent.includes('Verify PIN') || b.textContent.includes('Confirm'));
                if (vBtn) vBtn.click();
            })()
        """)
        await asyncio.sleep(3.0)
        capture("live_36_driver_trip_in_progress_styled.png")

        # Driver completes ride
        print("[3.10] Driver taps 'Complete Ride'...", flush=True)
        await eval_js(ws_d, """
            (() => {
                const compBtn = Array.from(document.querySelectorAll('.active-trip-actions button, button')).find(b => b.textContent.includes('Complete Ride') || b.textContent.includes('Finish') || b.textContent.includes('Drop Off'));
                if (compBtn) compBtn.click();
            })()
        """)
        await asyncio.sleep(3.0)
        capture("live_37_driver_ride_completed_styled.png")
        await ws_d.close()

    print("\n" + "=" * 70)
    print("🎉 FULL LIFECYCLE DEEP DEMONSTRATION & AUDIT COMPLETE!")
    print("=" * 70, flush=True)

if __name__ == '__main__':
    asyncio.run(run_operations())
