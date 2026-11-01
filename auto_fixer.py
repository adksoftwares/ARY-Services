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

# ==============================================================================
# KNOWN ADK PROJECTS PRESETS
# ==============================================================================
PRESETS = {
    "1": {
        "name": "Nila Cafe (Capacitor Android)",
        "package": "com.adksoftwares.nilacafe",
        "dir": r"D:\Nila cafe\client\android",
        "build_cmd": "gradlew.bat assembleDebug",
        "apk_path": r"app\build\outputs\apk\debug\app-debug.apk"
    },
    "2": {
        "name": "Samarakoon Agri Shop (Smart POS Lanka)",
        "package": "com.adk.smartposlanka",
        "dir": r"D:\Samarakoon Agri shop\android-app",
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
        print("⚠️ போனில் 'Allow USB Debugging' பாப்-அப் வந்துள்ளது! போன் திரையில் 'Allow' கொடுக்கவும்.")
        return False, "unauthorized"
    if not devices:
        print("❌ போன் இன்னும் இணைக்கப்படவில்லை! USB கேபிளை மாட்டி 'USB Debugging' ஆன் செய்யவும்.")
        return False, "no_device"
    
    device_id = devices[0].split("\t")[0]
    print(f"📱 இணைக்கப்பட்ட போன்: {device_id}")
    return True, device_id

def clear_logs():
    run_command("adb logcat -c")

def test_app(package_name):
    """Monkey Tool மூலம் போனில் ஆப்பை 500 முறை வேகமாக இயக்கி கிராஷ் பார்க்கிறது"""
    print(f"🐒 போனில் ஆப் ({package_name}) தானாக டெஸ்ட் செய்யப்படுகிறது...")
    clear_logs()
    
    # Run monkey test (500 random touch/scroll events)
    test_result = run_command(f"adb shell monkey -p {package_name} --throttle 100 -v 500")
    
    # Check crash logcat buffer
    log_dump = run_command("adb logcat -d -b crash").stdout
    
    has_crash = "FATAL EXCEPTION" in log_dump or "CRASH" in test_result.stdout or "Process: " in log_dump
    
    if has_crash:
        print("❌ ஆப்பில் பக் / கிராஷ் (Crash) கண்டுபிடிக்கப்பட்டது!")
        crash_content = log_dump if "FATAL EXCEPTION" in log_dump else test_result.stdout
        with open("crash_log.txt", "w", encoding="utf-8") as f:
            f.write(crash_content)
        return False, crash_content
    
    print("✅ எந்த கிராஷும் இல்லை! ஆப் போனில் சீராக இயங்குகிறது.")
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
    
    # Search for this file path inside the project dir
    for fname, line_no in found_files:
        for root, _, files in os.walk(search_dir):
            if fname in files:
                full_path = os.path.join(root, fname)
                return full_path, line_no
                
    return None, None

def call_gemini_api(prompt):
    """Gemini 2.5 Flash API மூலம் தானாக கோடை திருத்த வைக்கிறது"""
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

def rebuild_and_install(proj_dir, build_cmd, apk_path):
    """மாற்றிய கோடை மீண்டும் பில்ட் செய்து போனில் ஏற்றும்"""
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

def main():
    parser = argparse.ArgumentParser(description="ADK Mobile AI Auto-Fixer Loop")
    parser.add_argument("--package", help="App package name (e.g. com.adksoftwares.nilacafe)")
    parser.add_argument("--dir", help="Project root directory where gradlew exists")
    parser.add_argument("--build-cmd", default="gradlew.bat assembleDebug", help="Build command")
    parser.add_argument("--apk", default=r"app\build\outputs\apk\debug\app-debug.apk", help="APK path")
    args = parser.parse_args()

    print_banner("ADK MASTER MOBILE AUTO-FIXER (GEMINI 2.5 FLASH)")

    # Select project configuration
    if args.package and args.dir:
        pkg = args.package
        proj_dir = args.dir
        build_cmd = args.build_cmd
        apk_path = args.apk
    else:
        print("கம்ப்யூட்டரில் கண்டறியப்பட்ட உங்கள் ஆப் திட்டங்கள்:")
        for k, v in PRESETS.items():
            print(f" [{k}] {v['name']} ({v['package']})")
        print(" [3] வேறு ஒரு தனிப்பயன் ஆப் (Custom Package Name)")
        
        choice = input("\nஎந்த ஆப்பை டெஸ்ட் செய்ய வேண்டும்? (1/2/3, Default: 1): ").strip() or "1"
        if choice in PRESETS:
            cfg = PRESETS[choice]
            pkg = cfg["package"]
            proj_dir = cfg["dir"]
            build_cmd = cfg["build_cmd"]
            apk_path = cfg["apk_path"]
        else:
            pkg = input("App Package Name (e.g. com.example.app): ").strip()
            proj_dir = input("Project Folder Path: ").strip()
            build_cmd = "gradlew.bat assembleDebug"
            apk_path = r"app\build\outputs\apk\debug\app-debug.apk"

    print(f"\n📌 ஆப் பேக்கேஜ்: {pkg}")
    print(f"📌 ப்ராஜெக்ட் ஃபோல்டர்: {proj_dir}")
    print(f"📌 AI மாடல்: {GEMINI_MODEL}")
    
    # Check adb device
    connected, device_info = check_adb_device()
    if not connected:
        print("\n👉 போனை USB மூலம் கணினியுடன் இணைத்துவிட்டு, மீண்டும் `python auto_fixer.py` இயக்கவும்.")
        sys.exit(1)
        
    for round_num in range(1, MAX_ROUNDS + 1):
        print_banner(f"சுழற்சி {round_num} / {MAX_ROUNDS}")
        
        # 1. Test app on phone
        is_stable, crash_log = test_app(pkg)
        
        if is_stable:
            print_banner("🎉 வாழ்த்துகள்! ஆப் எந்த ஒரு கிராஷும் இன்றி முழுமையாக சீராக இயங்குகிறது!")
            break
            
        # 2. Fix code with AI
        fixed = fix_code_with_ai(crash_log, proj_dir)
        if not fixed:
            print("❌ AI கோடை மாற்ற இயலவில்லை. அடுத்த சுற்றுக்கு செல்கிறது...")
            
        # 3. Rebuild and install on phone
        rebuilt = rebuild_and_install(proj_dir, build_cmd, apk_path)
        if not rebuilt:
            print("⚠️ ரீபில்ட் தோல்வியுற்றது.")
            
        time.sleep(2)

if __name__ == "__main__":
    main()
