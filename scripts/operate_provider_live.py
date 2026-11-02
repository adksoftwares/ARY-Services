import subprocess
import time
import os

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
    print(f"Starting Live Provider App Automation on Phone {DEVICE}...")

    # Ensure device awake
    adb("shell input keyevent KEYCODE_WAKEUP")
    adb("shell wm dismiss-keyguard")
    time.sleep(0.5)

    # Reverse port
    adb("reverse tcp:4000 tcp:4000")

    # Install Provider APK
    print("Installing Provider APK...")
    adb(r'install -r "mobile/provider/android/app/build/outputs/apk/debug/app-debug.apk"')

    # Launch Provider App
    print("Launching Provider App...")
    adb("shell am force-stop com.aryservices.provider")
    time.sleep(1)
    adb("shell am start -n com.aryservices.provider/.MainActivity")
    time.sleep(3.5)

    # Step 1: Capture Provider Home
    print("Step 1: Provider App Loaded")
    capture("phone_provider_01_home.png")
    time.sleep(1.5)

    # Step 2: Tap Sign In (topbar button)
    print("Step 2: Tapping Provider Sign In...")
    adb("shell input tap 900 100")
    time.sleep(2)
    capture("phone_provider_02_modal.png")
    time.sleep(1)

    # Step 3: Enter Provider Credentials (0778867023 / 123456)
    print("Step 3: Entering Provider Phone 0778867023...")
    adb("shell input tap 500 590")
    time.sleep(0.5)
    adb("shell input text 0778867023")
    time.sleep(1)

    print("Entering Password 123456...")
    adb("shell input tap 500 830")
    time.sleep(0.5)
    adb("shell input text 123456")
    time.sleep(1)
    capture("phone_provider_03_credentials.png")
    time.sleep(1.5)

    # Step 4: Tap Sign In button
    print("Step 4: Tapping Sign In -> button...")
    adb("shell input tap 500 1000")
    time.sleep(3)

    # Dismiss Samsung Pass if present
    adb("shell input keyevent KEYCODE_BACK")
    time.sleep(1.5)
    capture("phone_provider_04_dashboard.png")
    time.sleep(1.5)

    # Step 5: Scroll Provider Portal
    print("Step 5: Scrolling Provider Portal...")
    adb("shell input swipe 540 1800 540 800 400")
    time.sleep(2)
    capture("phone_provider_05_scrolled.png")
    time.sleep(1)

    print("Provider App Live Automation complete!")

if __name__ == "__main__":
    main()
