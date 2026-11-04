import os
import subprocess
import sys
import time

if sys.platform == 'win32':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass

DEVICE = "RFCY40K7QAN"

def adb(cmd):
    return subprocess.run(f"adb -s {DEVICE} {cmd}", shell=True, capture_output=True, text=True).stdout.strip()

print("=" * 60)
print(f"[DAEMON] ARY ADB REVERSE BRIDGE ACTIVE FOR {DEVICE}")
print("=" * 60, flush=True)

adb("start-server")
time.sleep(1)

while True:
    try:
        revs = adb("reverse --list")
        if "4000" not in revs:
            adb("reverse tcp:4000 tcp:4000")
            print(f"[{time.strftime('%H:%M:%S')}] Established reverse: tcp:4000 -> tcp:4000", flush=True)
    except Exception as e:
        print(f"Error in adb bridge loop: {e}", flush=True)
    time.sleep(2)
