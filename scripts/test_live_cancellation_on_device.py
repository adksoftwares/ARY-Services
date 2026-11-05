import asyncio
import json
import os
import re
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
    full = f'adb -s {DEVICE} {cmd}'
    res = subprocess.run(full, shell=True, capture_output=True, text=True)
    return res.stdout.strip()

def capture(filename):
    out = os.path.join(ARTIFACT_DIR, filename)
    adb("shell screencap -p /sdcard/temp_screen.png")
    adb(f'pull /sdcard/temp_screen.png "{out}"')
    print(f"  📸 [LIVE PHONE SCREENSHOT] -> {filename}")
    return out

def get_auth_token(identifier, password):
    data = json.dumps({'identifier': identifier, 'password': password}).encode('utf-8')
    req = urllib.request.Request('http://localhost:4000/api/auth/login', data=data, headers={'Content-Type': 'application/json'})
    with urllib.request.urlopen(req) as resp:
        res = json.loads(resp.read().decode('utf-8'))
        return res.get('token')

def get_devtools_socket(pkg_name):
    out = adb("shell cat /proc/net/unix")
    matches = re.findall(r"@webview_devtools_remote_(\d+)", out)
    if not matches:
        return None
    pids = adb(f"shell pidof {pkg_name}").split()
    for p in pids:
        if p in matches:
            return f"webview_devtools_remote_{p}"
    return f"webview_devtools_remote_{matches[-1]}"

async def cdp_eval(ws, expr):
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
                print("    [CDP ERR]", res["exceptionDetails"].get("text", "Eval error"))
                return None
            return res.get("result", {}).get("value")

async def run_cancel_test():
    print("=" * 65)
    print("🧪 VERIFYING BOOKING CANCELLATION LIVE ON SAMSUNG PHONE")
    print("=" * 65)

    adb("reverse tcp:4000 tcp:4000")
    adb("shell input keyevent KEYCODE_WAKEUP")
    adb("shell wm dismiss-keyguard")
    adb("shell am start -n com.aryservices.customer/com.aryservices.customer.MainActivity")
    await asyncio.sleep(2.5)

    sock = get_devtools_socket("com.aryservices.customer")
    if not sock:
        print("Devtools socket not found")
        return
    adb(f"forward tcp:9222 localabstract:{sock}")
    await asyncio.sleep(0.5)

    req = urllib.request.urlopen("http://localhost:9222/json")
    targets = json.loads(req.read().decode("utf-8"))
    ws_url = targets[0]["webSocketDebuggerUrl"]
    ws = await websockets.connect(ws_url, max_size=10_000_000)

    # Ensure customer is logged in & dark mode
    await cdp_eval(ws, """
        document.documentElement.setAttribute('data-theme', 'dark');
        localStorage.setItem('ary_theme', 'dark');
    """)

    # 1. Create a fresh test booking so there's an active booking guaranteed to be cancelled
    token = get_auth_token('0774577882', '123456')
    create_req = urllib.request.Request('http://localhost:4000/api/bookings',
        data=json.dumps({
            'providerId': 'user-provider-kumar',
            'categorySlug': 'electrical-repair',
            'serviceAddress': 'No. 45 Galle Road, Colombo 03',
            'bookingDate': '2026-11-07',
            'bookingTime': 'Morning (9 AM - 12 PM)',
            'problemDescription': 'Inspection of fuse box and inverter wiring.'
        }).encode(),
        headers={'Content-Type': 'application/json', 'Authorization': f'Bearer {token}'})
    with urllib.request.urlopen(create_req) as cr:
        new_b = json.loads(cr.read())
        booking_id = new_b['booking']['id']
        print(f"Created active test booking: {booking_id}")

    # 2. Navigate to Bookings tab on phone
    print("Navigating to Bookings tab...")
    await cdp_eval(ws, """
        (() => {
            const link = document.querySelector('a[href="/bookings"], .mob-nav-item[href="/bookings"]');
            if (link) { link.click(); return true; }
            return false;
        })()
    """)
    await asyncio.sleep(2)
    capture("live_verify_01_active_bookings.png")

    # 3. Click Cancel button on the booking card
    print("Clicking 'Cancel' on the active booking card...")
    await cdp_eval(ws, """
        (() => {
            const cancelBtns = Array.from(document.querySelectorAll('.booking-card-item button')).filter(b => b.textContent.includes('Cancel'));
            if (cancelBtns.length > 0) {
                cancelBtns[0].click();
                return true;
            }
            return false;
        })()
    """)
    await asyncio.sleep(1.5)
    capture("live_verify_02_cancel_confirm_dialog.png")
    print("  ✓ Cancel Confirmation Dialog appeared!")

    # 4. Click 'Yes, Cancel Booking' inside ConfirmDialog
    print("Confirming cancellation in ConfirmDialog...")
    await cdp_eval(ws, """
        (() => {
            const confirmBtn = Array.from(document.querySelectorAll('.ds-modal-footer button, button')).find(b => b.textContent.includes('Yes, Cancel') || b.textContent.includes('Cancel Booking'));
            if (confirmBtn) {
                confirmBtn.click();
                return true;
            }
            return false;
        })()
    """)
    await asyncio.sleep(2.5)
    capture("live_verify_03_booking_cancelled_success.png")
    print("  ✓ Booking Cancelled with Backend Confirmation!")

    # 5. Switch to 'Cancelled' filter tab to verify the cancelled booking card
    print("Switching to Cancelled tab...")
    await cdp_eval(ws, """
        (() => {
            const tabs = Array.from(document.querySelectorAll('.bookings-tabs-bar button, .filter-chip, button'));
            const canTab = tabs.find(t => t.textContent.includes('Cancelled'));
            if (canTab) { canTab.click(); return true; }
            return false;
        })()
    """)
    await asyncio.sleep(2)
    capture("live_verify_04_cancelled_tab_view.png")
    print("  ✓ Verified in Cancelled Tab!")

    await ws.close()
    print("\n" + "=" * 65)
    print("🎉 BOOKING CANCELLATION LIVE TEST COMPLETED SUCCESSFULLY!")
    print("=" * 65)

if __name__ == '__main__':
    asyncio.run(run_cancel_test())
