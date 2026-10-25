import os
import requests

TARGET_URL = os.environ.get("TARGET_URL", "http://localhost:4000")

def test_service_categories():
    res = requests.get(f"{TARGET_URL}/api/service-categories", timeout=10)
    assert res.status_code == 200, f"Expected 200, got {res.status_code}"
    categories = res.json()
    assert isinstance(categories, list), "Expected categories to be a list"
    assert len(categories) > 0, "Expected non-empty categories list"

if __name__ == "__main__":
    test_service_categories()
    print("Categories check passed.")
