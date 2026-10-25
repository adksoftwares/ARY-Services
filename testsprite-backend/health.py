import os
import requests

TARGET_URL = os.environ.get("TARGET_URL", "http://localhost:4000")

def test_health():
    res = requests.get(f"{TARGET_URL}/api/health", timeout=10)
    assert res.status_code == 200, f"Expected 200, got {res.status_code}"
    data = res.json()
    assert data.get("status") == "ok", f"Expected status ok, got {data.get('status')}"

if __name__ == "__main__":
    test_health()
    print("Health check passed.")
