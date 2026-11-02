import os
import sys
import time
import json
import re
import argparse
import subprocess
import urllib.request
import urllib.error

# Ensure UTF-8 output on Windows console
try:
    if hasattr(sys.stdout, 'reconfigure'):
        sys.stdout.reconfigure(encoding='utf-8')
    if hasattr(sys.stderr, 'reconfigure'):
        sys.stderr.reconfigure(encoding='utf-8')
except Exception:
    pass

# Auto-configure Java 21 from Android Studio JBR if available
JBR_PATHS = [
    r"C:\Program Files\Android\Android Studio\jbr",
    r"C:\Program Files\Android\jbr",
]
for jbr in JBR_PATHS:
    if os.path.exists(jbr) and os.path.exists(os.path.join(jbr, "bin", "java.exe")):
        os.environ["JAVA_HOME"] = jbr
        os.environ["PATH"] = os.path.join(jbr, "bin") + os.pathsep + os.environ.get("PATH", "")
        break

# ==============================================================================
# KNOWN ADK PROJECTS PRESETS
# ==============================================================================
PRESETS = {
    "1": {
        "name": "ARY Customer App (ARY Services)",
        "package": "com.aryservices.customer",
        "dir": r"D:\ARY Services\mobile\customer\android",
        "sync_cmd": "npm run build:mobile:customer",
        "build_cmd": "gradlew.bat assembleDebug",
        "apk_path": r"app\build\outputs\apk\debug\app-debug.apk"
    },
    "2": {
        "name": "ARY Driver App (ARY Driver)",
        "package": "com.aryservices.driver",
        "dir": r"D:\ARY Services\mobile\driver\android",
        "sync_cmd": "npm run build:mobile:driver",
        "build_cmd": "gradlew.bat assembleDebug",
        "apk_path": r"app\build\outputs\apk\debug\app-debug.apk"
    },
    "3": {
        "name": "ARY Provider App (ARY Provider)",
        "package": "com.aryservices.provider",
        "dir": r"D:\ARY Services\mobile\provider\android",
        "sync_cmd": "npm run build:mobile:provider",
        "build_cmd": "gradlew.bat assembleDebug",
        "apk_path": r"app\build\outputs\apk\debug\app-debug.apk"
    },
    "4": {
        "name": "Nila Cafe (Capacitor Android)",
        "package": "com.adksoftwares.nilacafe",
        "dir": r"D:\Nila cafe\client\android",
        "sync_cmd": None,
        "build_cmd": "gradlew.bat assembleDebug",
        "apk_path": r"app\build\outputs\apk\debug\app-debug.apk"
    },
    "5": {
        "name": "Samarakoon Agri Shop (Smart POS Lanka)",
        "package": "com.adk.smartposlanka",
        "dir": r"D:\Samarakoon Agri shop\android-app",
        "sync_cmd": None,
        "build_cmd": "gradlew.bat assembleDebug",
        "apk_path": r"app\build\outputs\apk\debug\app-debug.apk"
    }
}

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
GEMINI_MODEL = "gemini-2.5-flash"
MAX_ROUNDS = 5

def print_banner(text):
    print("\n" + "=" * 65)
    print(f" {text}")
    print("=" * 65)

def run_command(cmd, cwd=None):
    """கமாண்டுகளை இயக்கி stdout மற்றும் stderr எடுக்கும்"""
    result = subprocess.run(cmd, shell=True, capture_output=True, text=True, cwd=cwd)
    return result

def check_adb_device():
    """போன் USB Debugging மூலம் சரியாக இணைந்துள்ளதா எனச் சோதிக்கும்"""
    res = run_command("adb devices")
    lines = [l.strip() for l in res.stdout.splitlines() if l.strip()]
    devices = [l for l in lines[1:] if "\tdevice" in l]
    unauthorized = [l for l in lines[1:] if "\tunauthorized" in l]
    
    if unauthorized:
        print("⚠️ போனில் 'Allow USB Debugging' பாப்-அப் வந்துள்ளது! போன் திரையில் 'Always Allow' கொடுத்து OK செய்யவும்.")
        return False, "unauthorized"
    if not devices:
        print("❌ போன் இன்னும் இணைக்கப்படவில்லை! USB கேபிளை மாட்டி 'USB Debugging' ஆன் செய்யவும்.")
        return False, "no_device"
    
    device_id = devices[0].split("\t")[0]
    print(f"📱 இணைக்கப்பட்ட போன் அடையாளம்: {device_id}")
    return True, device_id

def setup_reverse_port_forwarding():
    """போனில் இருந்து கணினியின் API போர்ட்களை அணுக reverse port forwarding அமைக்கும்"""
    run_command("adb reverse tcp:4000 tcp:4000")
    run_command("adb reverse tcp:5173 tcp:5173")
    print("🌐 Reverse Port Forwarding அமைக்கப்பட்டது (Port 4000 & 5173)")

def wake_up_phone():
    """போன் திரையை ஆன் செய்து அன்லாக் செய்யும்"""
    run_command("adb shell input keyevent 224")  # Wakeup
    time.sleep(0.5)
    run_command("adb shell input keyevent 82")   # Unlock / Dismiss Keyguard
    time.sleep(0.5)

def clear_logs():
    run_command("adb logcat -c")

def launch_app_on_phone(package_name):
    """போனில் ஆப்பைத் திறந்து 2 வினாடிகள் காத்திருக்கும்"""
    print(f"🚀 போனில் ஆப் திறக்கப்படுகிறது ({package_name})...")
    wake_up_phone()
    run_command(f"adb shell monkey -p {package_name} -c android.intent.category.LAUNCHER 1")
    time.sleep(2.5)

def test_app(package_name, event_count=300):
    """Monkey Tool மூலம் போனில் ஆப்பை வேகமாக இயக்கி கிராஷ் பார்க்கிறது"""
    print(f"🐒 போனில் ஆப் ({package_name}) மீது {event_count} ரேண்டம் டச் டெஸ்ட் நடக்கிறது...")
    clear_logs()
    
    # Launch app first
    launch_app_on_phone(package_name)
    
    # Run monkey test
    test_result = run_command(f"adb shell monkey -p {package_name} --throttle 100 -v {event_count}")
    
    # Check crash logcat buffer
    log_dump = run_command("adb logcat -d -b crash").stdout
    
    has_crash = "FATAL EXCEPTION" in log_dump or "CRASH" in test_result.stdout or "Process: " in log_dump
    
    if has_crash:
        print("❌ ஆப்பில் பக் / கிராஷ் (Crash) கண்டுபிடிக்கப்பட்டது!")
        crash_content = log_dump if "FATAL EXCEPTION" in log_dump else test_result.stdout
        with open("crash_log.txt", "w", encoding="utf-8") as f:
            f.write(crash_content)
        return False, crash_content
    
    print("✅ எந்த கிராஷும் இல்லை! ஆப் போனில் பிழையின்றி சீராக இயங்குகிறது.")
    return True, None

def find_source_file_from_crash(crash_text, search_dir):
    """கிராஷ் லாக்கை படித்து எந்த ஃபைலில் எரர் உள்ளது என்பதைக் கண்டறியும்"""
    patterns = [
        r'\(([A-Za-z0-9_]+\.(?:kt|java|dart|js|jsx|ts|tsx)):(\d+)\)',
        r'at\s+.*\.([A-Za-z0-9_]+)\.[A-Za-z0-9_<>]+\(([A-Za-z0-9_]+\.(?:kt|java|dart)):(\d+)\)',
    ]
    
    found_files = []
    for line in crash_text.splitlines():
        for p in patterns:
            m = re.search(p, line)
            if m:
                filename = m.group(1)
                line_no = m.group(2) if len(m.groups()) >= 2 else "1"
                found_files.append((filename, line_no))
    
    # Search for this file path inside the project dir or src
    search_roots = [search_dir, r"D:\ARY Services\src", r"D:\ARY Services\server\src"]
    for fname, line_no in found_files:
        for s_root in search_roots:
            if not os.path.exists(s_root):
                continue
            for root, _, files in os.walk(s_root):
                if fname in files:
                    full_path = os.path.join(root, fname)
                    return full_path, line_no
                
    return None, None

def call_gemini_api(prompt):
    """Gemini 2.5 Flash API மூலம் தானாக கோடை திருத்த வைக்கிறது"""
    global GEMINI_API_KEY
    if not GEMINI_API_KEY:
        GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
    if not GEMINI_API_KEY:
        print("❌ GEMINI_API_KEY அமைக்கப்படவில்லை! $env:GEMINI_API_KEY செட் செய்யவும்.")
        return None

    url = f"https://generativelanguage.googleapis.com/v1beta/models/{GEMINI_MODEL}:generateContent?key={GEMINI_API_KEY}"
    
    headers = {"Content-Type": "application/json"}
    payload = {
        "contents": [{
            "parts": [{"text": prompt}]
        }],
        "generationConfig": {
            "temperature": 0.2
        }
    }
    
    data = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(url, data=data, headers=headers, method="POST")
    
    try:
        with urllib.request.urlopen(req, timeout=60) as response:
            res_data = json.loads(response.read().decode("utf-8"))
            return res_data["candidates"][0]["content"]["parts"][0]["text"]
    except urllib.error.HTTPError as e:
        error_msg = e.read().decode("utf-8")
        print(f"❌ Gemini API Error ({e.code}): {error_msg}")
        return None
    except Exception as e:
        print(f"❌ Gemini API Call Failed: {e}")
        return None

def fix_code_with_ai(crash_text, search_dir):
    """கிராஷ் லாக்கை AI-யிடம் கொடுத்து தானாக கோடைத் திருத்தி ஃபைலில் சேவ் செய்யும்"""
    print("🤖 AI (Gemini 2.5 Flash) எரரைப் படித்து கோடை திருத்துகிறது...")
    
    target_file, error_line = find_source_file_from_crash(crash_text, search_dir)
    
    file_content = ""
    if target_file and os.path.exists(target_file):
        print(f"🎯 பக் இருக்கும் ஃபைல் கண்டுபிடிக்கப்பட்டது: {target_file} (வரி: {error_line})")
        with open(target_file, "r", encoding="utf-8", errors="ignore") as f:
            file_content = f.read()
    else:
        print("ℹ️ குறிப்பிட்ட ஃபைல் நேரடியாகத் தெரியவில்லை. ப்ராஜெக்ட் அமைப்பை AI ஆய்வு செய்கிறது...")
    
    prompt = f"""You are an expert mobile app debugger.
A fatal crash occurred when testing the Android app on a real device with monkey testing.

CRASH LOG:
```
{crash_text[:4000]}
```

TARGET FILE: {target_file or 'Unknown'}
TARGET FILE CONTENT:
```
{file_content}
```

INSTRUCTIONS:
1. Analyze the exact cause of this crash (NullPointer, IndexOutOfBounds, View not found, Bad Intent, Uncaught Exception, etc.).
2. Fix the error in the target file.
3. Return ONLY the complete, corrected content of the target file inside a single code block ```code ... ```.
Do not include any conversational explanation before or after the code block.
"""

    response = call_gemini_api(prompt)
    if not response:
        print("⚠️ AI-யிடமிருந்து பதில் பெற முடியவில்லை.")
        return False
        
    code_match = re.search(r'```(?:[a-zA-Z0-9_-]+)?\s*([\s\S]*?)```', response)
    fixed_code = code_match.group(1).strip() if code_match else response.strip()
    
    if target_file and fixed_code:
        backup_path = target_file + ".bak"
        with open(backup_path, "w", encoding="utf-8") as f:
            f.write(file_content)
        print(f"💾 பழைய கோப்பு பேக்-அப் செய்யப்பட்டது: {backup_path}")
        
        with open(target_file, "w", encoding="utf-8") as f:
            f.write(fixed_code)
        print(f"✅ ஃபைல் வெற்றிகரமாகத் திருத்தப்பட்டது: {target_file}")
        return True
    else:
        print("⚠️ திருத்தப்பட வேண்டிய ஃபைலை நேரடியாக எழுத முடியவில்லை. AI பரிந்துரை:")
        print(response[:500])
        return False

def rebuild_and_install(proj_dir, build_cmd, apk_path, sync_cmd=None):
    """மாற்றிய கோடை மீண்டும் பில்ட் செய்து போனில் ஏற்றும்"""
    if sync_cmd:
        print(f"🔄 Web Bundle Sync செய்யப்படுகிறது ({sync_cmd})...")
        sync_res = run_command(sync_cmd, cwd=r"D:\ARY Services")
        if sync_res.returncode != 0:
            print("⚠️ Sync Warning:", sync_res.stderr or sync_res.stdout)

    print(f"🔨 புதிய பில்ட் தயாராகிறது ({build_cmd})...")
    build = run_command(build_cmd, cwd=proj_dir)
    if build.returncode != 0:
        print("⚠️ பில்ட் ஃபெயில் ஆகிவிட்டது! Build Error Log:")
        err = build.stderr[-1000:] if build.stderr else build.stdout[-1000:]
        print(err)
        with open("crash_log.txt", "w", encoding="utf-8") as f:
            f.write(err)
        fix_code_with_ai(err, proj_dir)
        return False

    full_apk_path = os.path.join(proj_dir, apk_path) if not os.path.isabs(apk_path) else apk_path
    if not os.path.exists(full_apk_path):
        # Search for any generated debug apk
        for r, _, f in os.walk(proj_dir):
            for file in f:
                if file.endswith("-debug.apk") or file.endswith(".apk"):
                    full_apk_path = os.path.join(r, file)
                    break

    print(f"📲 போனில் புதிய ஆப் இன்ஸ்டால் செய்யப்படுகிறது ({full_apk_path})...")
    install = run_command(f'adb install -r "{full_apk_path}"')
    if install.returncode == 0:
        print("✅ ஆப் போனில் வெற்றிகரமாக இன்ஸ்டால் செய்யப்பட்டது!")
        return True
    else:
        print(f"⚠️ இன்ஸ்டால் ஃபெயில்: {install.stderr or install.stdout}")
        return False

def run_test_loop_for_app(app_config):
    """ஒரு குறிப்பிட்ட ஆப்பிற்கு Auto-Fixer Loop-ஐ இயக்கும்"""
    pkg = app_config["package"]
    proj_dir = app_config["dir"]
    build_cmd = app_config["build_cmd"]
    apk_path = app_config["apk_path"]
    sync_cmd = app_config.get("sync_cmd")
    name = app_config["name"]

    print_banner(f"TESTING: {name} ({pkg})")
    
    # 1. Install latest build first
    full_apk_path = os.path.join(proj_dir, apk_path) if not os.path.isabs(apk_path) else apk_path
    if os.path.exists(full_apk_path):
        print(f"📲 போனில் ஆரம்ப இன்ஸ்டாலேஷன்: {name}...")
        run_command(f'adb install -r "{full_apk_path}"')

    for round_num in range(1, MAX_ROUNDS + 1):
        print_banner(f"{name} — சுழற்சி {round_num} / {MAX_ROUNDS}")
        
        # 1. Test app on phone
        is_stable, crash_log = test_app(pkg)
        
        if is_stable:
            print_banner(f"🎉 வாழ்த்துகள்! {name} எந்த ஒரு கிராஷும் இன்றி முழுமையாக சீராக இயங்குகிறது!")
            return True
            
        # 2. Fix code with AI
        fixed = fix_code_with_ai(crash_log, proj_dir)
        if not fixed:
            print("❌ AI கோடை மாற்ற இயலவில்லை. அடுத்த சுற்றுக்கு செல்கிறது...")
            
        # 3. Rebuild and install on phone
        rebuilt = rebuild_and_install(proj_dir, build_cmd, apk_path, sync_cmd=sync_cmd)
        if not rebuilt:
            print("⚠️ ரீபில்ட் தோல்வியுற்றது.")
            
        time.sleep(2)
        
    return False

def main():
    parser = argparse.ArgumentParser(description="ADK Mobile AI Auto-Fixer Loop")
    parser.add_argument("--package", help="App package name (e.g. com.aryservices.customer)")
    parser.add_argument("--dir", help="Project root directory where gradlew exists")
    parser.add_argument("--build-cmd", default="gradlew.bat assembleDebug", help="Build command")
    parser.add_argument("--apk", default=r"app\build\outputs\apk\debug\app-debug.apk", help="APK path")
    parser.add_argument("--all", action="store_true", help="Run automated testing for all ARY apps in sequence")
    args = parser.parse_args()

    print_banner("ADK MASTER MOBILE AUTO-FIXER (GEMINI 2.5 FLASH)")

    # Check adb device
    connected, device_info = check_adb_device()
    if not connected:
        print("\n👉 போனை USB மூலம் கணினியுடன் இணைத்துவிட்டு, மீண்டும் `python auto_fixer.py` இயக்கவும்.")
        sys.exit(1)

    # Port forwarding
    setup_reverse_port_forwarding()

    if args.all:
        print("\n🚀 ARY Services-இன் அனைத்து 3 ஆப்ஸ்களும் வரிசையாக டெஸ்ட் செய்யப்படுகின்றன...\n")
        for key in ["1", "2", "3"]:
            run_test_loop_for_app(PRESETS[key])
            time.sleep(3)
        print_banner("🏁 அனைத்து ARY Services ஆப்ஸ்களின் டெஸ்டிங் முடிவடைந்தது!")
        return

    # Select project configuration
    if args.package and args.dir:
        cfg = {
            "name": args.package,
            "package": args.package,
            "dir": args.dir,
            "build_cmd": args.build_cmd,
            "apk_path": args.apk,
            "sync_cmd": None
        }
        run_test_loop_for_app(cfg)
    else:
        print("கம்ப்யூட்டரில் கண்டறியப்பட்ட உங்கள் ஆப் திட்டங்கள்:")
        for k, v in PRESETS.items():
            print(f" [{k}] {v['name']} ({v['package']})")
        print(" [0] ARY Services அனைத்து 3 ஆப்ஸ்களையும் வரிசையாக டெஸ்ட் செய் (All 3 Apps)")
        print(" [6] வேறு ஒரு தனிப்பயன் ஆப் (Custom Package Name)")
        
        choice = input("\nஎந்த ஆப்பை டெஸ்ட் செய்ய வேண்டும்? (1/2/3/0/Custom, Default: 0): ").strip() or "0"
        
        if choice == "0":
            for key in ["1", "2", "3"]:
                run_test_loop_for_app(PRESETS[key])
                time.sleep(3)
            print_banner("🏁 அனைத்து ARY Services ஆப்ஸ்களின் டெஸ்டிங் முடிவடைந்தது!")
        elif choice in PRESETS:
            run_test_loop_for_app(PRESETS[choice])
        else:
            pkg = input("App Package Name (e.g. com.example.app): ").strip()
            proj_dir = input("Project Folder Path: ").strip()
            cfg = {
                "name": pkg,
                "package": pkg,
                "dir": proj_dir,
                "build_cmd": "gradlew.bat assembleDebug",
                "apk_path": r"app\build\outputs\apk\debug\app-debug.apk",
                "sync_cmd": None
            }
            run_test_loop_for_app(cfg)

if __name__ == "__main__":
    main()
