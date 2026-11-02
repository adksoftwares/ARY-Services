import subprocess
import time
import os
import sys

DEVICE = "RFCY40K7QAN"
ARTIFACT_DIR = r"C:\Users\Arikarran\.gemini\antigravity\brain\9bee2e27-9cd7-4626-a971-888a6ce02660"

def adb(cmd):
    full_cmd = f'adb -s {DEVICE} {cmd}'
    res = subprocess.run(full_cmd, shell=True, capture_output=True, text=True)
    return res.stdout.strip()

def capture(filename):
    out_path = os.path.join(ARTIFACT_DIR, filename)
    adb("shell screencap -p /sdcard/temp_screen.png")
    adb(f'pull /sdcard/temp_screen.png "{out_path}"')
    print(f"Captured: {filename}")
    return out_path

def main():
    print(f"Starting Live Automation on Phone {DEVICE}...")

    # 1. Wake screen and ensure active
    adb("shell input keyevent KEYCODE_WAKEUP")
    adb("shell wm dismiss-keyguard")
    time.sleep(0.5)

    # 2. Reverse port forward
    adb("reverse tcp:4000 tcp:4000")
    print("Port forwarding tcp:4000 established.")

    # 3. Relaunch Customer App cleanly
    print("Launching Customer App...")
    adb("shell am force-stop com.aryservices.customer")
    time.sleep(1)
    adb("shell am start -n com.aryservices.customer/.MainActivity")
    time.sleep(3.5)

    # Step 1: Capture Home
    print("Step 1: Home Screen Loaded")
    capture("phone_step1_home.png")
    time.sleep(1.5)

    # Step 2: Tap Popular Chip "Electrical Repair"
    print("Step 2: Tapping Quick Filter Chip 'Electrical Repair' at (390, 1900)...")
    adb("shell input tap 390 1900")
    time.sleep(2)
    capture("phone_step2_filter_electrical.png")
    time.sleep(1)

    # Step 3: Scroll down to view services
    print("Step 3: Scrolling down smoothly to view services...")
    adb("shell input swipe 540 1800 540 900 400")
    time.sleep(2)
    capture("phone_step3_services_view.png")
    time.sleep(1)

    # Step 4: Open Sign In Modal from Bottom Nav
    print("Step 4: Tapping 'Sign In' on bottom navigation bar at (860, 2080)...")
    adb("shell input tap 860 2080")
    time.sleep(2.5)
    capture("phone_step4_signin_modal.png")
    time.sleep(1)

    # Step 5: Enter Phone and Password
    print("Step 5: Entering Mobile Number (0779956820)...")
    # Tap mobile field to be sure: (500, 590)
    adb("shell input tap 500 590")
    time.sleep(0.5)
    # Clear any existing text or type
    adb("shell input text 0779956820")
    time.sleep(1)

    print("Entering Password (Pass1234)...")
    # Tap password field at (500, 830)
    adb("shell input tap 500 830")
    time.sleep(0.5)
    adb("shell input text Pass1234")
    time.sleep(1)
    capture("phone_step5_credentials_entered.png")
    time.sleep(1.5)

    # Step 6: Tap Sign In button
    print("Step 6: Tapping 'Sign In ->' button at (500, 1000)...")
    adb("shell input tap 500 1000")
    time.sleep(3)

    # If Samsung Pass prompt appears, dismiss it by tapping Cancel at bottom
    # Cancel button is around (540, 890) or let's tap Cancel: in previous screenshot Cancel is at (540, 885)
    # Let's take screenshot first
    capture("phone_step6_login_result.png")
    time.sleep(1)

    # Dismiss Samsung Pass if present (tap Cancel around 540, 1880 or press BACK)
    adb("shell input keyevent KEYCODE_BACK")
    time.sleep(1.5)
    capture("phone_step6_logged_in.png")
    time.sleep(1)

    # Step 7: Tap "Rides & Food" tab on Bottom Nav at (615, 2080)
    print("Step 7: Tapping 'Rides & Food' tab at (615, 2080)...")
    adb("shell input tap 615 2080")
    time.sleep(2.5)
    capture("phone_step7_rides_food.png")
    time.sleep(1)

    # Step 8: Tap "Bookings" tab on Bottom Nav at (360, 2080)
    print("Step 8: Tapping 'Bookings' tab at (360, 2080)...")
    adb("shell input tap 360 2080")
    time.sleep(2.5)
    capture("phone_step8_bookings.png")
    time.sleep(1)

    # Step 9: Tap "Explore" tab on Bottom Nav at (135, 2080)
    print("Step 9: Returning to 'Explore' tab at (135, 2080)...")
    adb("shell input tap 135 2080")
    time.sleep(2)
    capture("phone_step9_explore_return.png")

    print("Live automation run completed successfully!")

if __name__ == "__main__":
    main()
