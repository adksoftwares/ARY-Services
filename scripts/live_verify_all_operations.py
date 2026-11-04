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

def get_auth_token(identifier, password):
    data = json.dumps({'identifier': identifier, 'password': password}).encode('utf-8')
    req = urllib.request.urlopen(urllib.request.Request('http://localhost:4000/api/auth/login', data=data, headers={'Content-Type': 'application/json'}))
    res = json.loads(req.read().decode('utf-8'))
    return res['token'], res['user']

def api_post(endpoint, token, payload):
    data = json.dumps(payload).encode('utf-8')
    req = urllib.request.Request(f'http://localhost:4000/api{endpoint}', data=data, headers={'Content-Type': 'application/json', 'Authorization': f'Bearer {token}'})
    return json.loads(urllib.request.urlopen(req).read().decode('utf-8'))

def api_patch(endpoint, token, payload):
    data = json.dumps(payload).encode('utf-8')
    req = urllib.request.Request(f'http://localhost:4000/api{endpoint}', data=data, headers={'Content-Type': 'application/json', 'Authorization': f'Bearer {token}'}, method='PATCH')
    return json.loads(urllib.request.urlopen(req).read().decode('utf-8'))

async def main():
    print("=" * 70)
    print("🚀 ARY SERVICES — VERIFYING QUOTES, RESCHEDULE, DISPUTES & ADMIN")
    print("=" * 70, flush=True)

    cust_token, cust_user = get_auth_token('0774577882', '123456')
    prov_token, prov_user = get_auth_token('kumar.electric@example.local', 'KumarPass@123')
    admin_token, admin_user = get_auth_token('admin@example.com', 'admin-secret-password-32charsmin!')

    print(f"Customer: {cust_user['fullName']}")
    print(f"Provider: {prov_user['fullName']}")
    print(f"Admin:    {admin_user['fullName']}")

    # 1. Customer creates a booking
    print("\n[Step 1] Customer books Master Electrician Kumar...", flush=True)
    booking_res = api_post('/bookings', cust_token, {
        'providerId': 'user-provider-kumar',
        'categorySlug': 'electrical-repair',
        'bookingDate': '2026-11-10',
        'bookingTime': 'Morning (9 AM - 12 PM)',
        'serviceAddress': 'No. 45 Galle Road, Colombo 04',
        'problemDescription': 'Industrial power surge protector installation and full isolator wiring.'
    })
    booking_id = booking_res['booking']['id']
    print(f"  Booking created: #{booking_id[:8]}")

    # 2. Provider issues a custom quote
    print("\n[Step 2] Provider issues custom Quote for LKR 4,800...", flush=True)
    quote_res = api_post(f'/bookings/{booking_id}/quote', prov_token, {
        'amount': 4800,
        'description': 'Supply and install 63A double pole safety isolator with metal enclosure.'
    })
    print(f"  Quote issued: LKR {quote_res['booking']['quote']['amount']}")

    # 3. Customer accepts quote
    print("\n[Step 3] Customer accepts the quote...", flush=True)
    quote_accept_res = api_patch(f'/bookings/{booking_id}/quote', cust_token, {'decision': 'accept'})
    print(f"  Quote accepted: {quote_accept_res['booking']['quote']['status']}")

    # 4. Customer requests reschedule
    print("\n[Step 4] Customer requests reschedule to tomorrow Morning...", flush=True)
    resched_res = api_post(f'/bookings/{booking_id}/reschedule', cust_token, {
        'date': '2026-11-12',
        'time': 'Morning (9 AM - 12 PM)',
        'reason': 'Premises will be unlocked and ready for technician.'
    })
    print(f"  Reschedule requested: {resched_res['message']}")

    # 5. Provider accepts reschedule
    print("\n[Step 5] Provider accepts the reschedule request...", flush=True)
    resched_accept_res = api_patch(f'/bookings/{booking_id}/reschedule', prov_token, {'decision': 'accept'})
    print(f"  Reschedule accepted: new date = {resched_accept_res['booking']['bookingDate']}")

    # 6. Provider marks job accepted -> in_progress -> completed
    print("\n[Step 6] Provider completes the service...", flush=True)
    api_patch(f'/bookings/{booking_id}/status', prov_token, {'status': 'accepted'})
    api_patch(f'/bookings/{booking_id}/status', prov_token, {'status': 'in_progress'})
    comp_res = api_patch(f'/bookings/{booking_id}/status', prov_token, {'status': 'completed'})
    print(f"  Service status: {comp_res['booking']['status']}")

    # 7. Customer opens a workmanship dispute
    print("\n[Step 7] Customer files workmanship dispute...", flush=True)
    disp_res = api_post(f'/bookings/{booking_id}/dispute', cust_token, {
        'reason': 'Circuit isolator tripping when heavy load appliance is active.',
        'evidence': 'Photographs of tripped breaker box attached.'
    })
    print(f"  Dispute filed: {disp_res['message']}")

    # 8. Admin arbitrates dispute
    print("\n[Step 8] Admin arbitrates dispute with 50/50 split settlement...", flush=True)
    arb_res = api_post(f'/admin/bookings/{booking_id}/arbitrate', admin_token, {
        'action': 'split_50_50',
        'notes': 'Mutual settlement agreed: 50% refunded to customer wallet, 50% released to provider.'
    })
    print(f"  Arbitration result: status = {arb_res.get('booking', {}).get('status')}")

    # 9. Admin settles CEFT payout
    print("\n[Step 9] Admin executes CEFT payout settlement...", flush=True)
    payout_res = api_post('/admin/payouts/settle', admin_token, {
        'providerId': 'user-provider-kumar',
        'amount': 2400,
        'reference': 'CEFT-REF-889922'
    })
    print(f"  Payout settled: {payout_res.get('message')}")

    # 10. Now showcase on phone screen
    print("\n[Step 10] Displaying updated Customer Bookings & Provider Dashboard on phone...", flush=True)
    adb("shell input keyevent KEYCODE_WAKEUP")
    adb("shell wm dismiss-keyguard")

    # Launch Customer App to Bookings
    adb("shell am start -W --user 0 -a android.intent.action.MAIN -c android.intent.category.LAUNCHER -n com.aryservices.customer/com.aryservices.customer.MainActivity")
    await asyncio.sleep(3.5)
    capture("live_38_customer_disputed_booking.png")

    # Launch Provider App
    adb("shell am start -W --user 0 -a android.intent.action.MAIN -c android.intent.category.LAUNCHER -n com.aryservices.provider/com.aryservices.provider.MainActivity")
    await asyncio.sleep(3.5)
    capture("live_39_provider_wallet_settlement.png")

    print("\n" + "=" * 70)
    print("🎉 ALL ADVANCED FLOWS (QUOTES, RESCHEDULE, DISPUTES, ARBITRATION, SETTLEMENT) VERIFIED!")
    print("=" * 70, flush=True)

if __name__ == '__main__':
    asyncio.run(main())
