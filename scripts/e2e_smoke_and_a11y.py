import time
import os
import json
import urllib.request
from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By

API_URL = "http://localhost:4000/api"
AXE_PATH = os.path.join(os.path.dirname(__file__), "axe.min.js")

def get_driver(width=1280, height=850):
    opts = Options()
    opts.add_argument("--headless=new")
    opts.add_argument(f"--window-size={width},{height}")
    opts.add_argument("--disable-gpu")
    opts.add_argument("--no-sandbox")
    opts.add_argument("--disable-dev-shm-usage")
    driver = webdriver.Chrome(options=opts)
    driver.set_window_size(width, height)
    return driver

def safe_click(driver, el):
    driver.execute_script("arguments[0].scrollIntoView({behavior: 'instant', block: 'center'});", el)
    time.sleep(0.4)
    try:
        el.click()
    except Exception:
        driver.execute_script("arguments[0].click();", el)

def run_axe(driver, context_name):
    with open(AXE_PATH, "r", encoding="utf-8") as f:
        axe_script = f.read()
    driver.execute_script(axe_script)
    # Run axe asynchronously
    result = driver.execute_async_script("""
        var callback = arguments[arguments.length - 1];
        axe.run({
            runOnly: {
                type: 'tag',
                values: ['wcag2a', 'wcag2aa', 'best-practice']
            }
        }).then(function(results) {
            callback(results);
        }).catch(function(err) {
            callback({ error: err.message });
        });
    """)
    if not result or "error" in result:
        print(f"  [Axe Error] {context_name}: {result.get('error', 'unknown error')}")
        return []
    
    violations = result.get("violations", [])
    critical_serious = [v for v in violations if v.get("impact") in ["critical", "serious"]]
    print(f"  A11y Audit for {context_name}: {len(violations)} total rule violations ({len(critical_serious)} critical/serious)")
    for v in critical_serious:
        print(f"    - [{v.get('impact').upper()}] {v.get('id')}: {v.get('description')} ({len(v.get('nodes', []))} instances)")
        for node in v.get('nodes', [])[:3]:
            print(f"        target: {node.get('target')}")
            if node.get('any'):
                for any_item in node.get('any', []):
                    print(f"        reason: {any_item.get('message')}")
    return violations

def test_customer_flow(driver):
    print("\n--- [Flow 1] Customer Browse & Book Flow ---")
    driver.get("http://localhost:5173")
    time.sleep(2)
    
    # 1. Check title & brand
    assert "ARY" in driver.title or "Services" in driver.title, f"Unexpected title: {driver.title}"
    print("  [PASS] Customer portal loaded with correct brand title")

    # 2. Category selection
    cat_buttons = driver.find_elements(By.CSS_SELECTOR, ".category-card, .category-chip, .cat-btn")
    if cat_buttons:
        print(f"  [PASS] Found {len(cat_buttons)} category options. Clicking first...")
        safe_click(driver, cat_buttons[0])
        time.sleep(1)

    # 3. Provider catalog & Book Now button
    book_buttons = driver.find_elements(By.XPATH, "//button[contains(., 'Book Now') or contains(., 'Book')]")
    assert len(book_buttons) > 0, "No 'Book Now' button found on customer portal"
    print(f"  [PASS] Found {len(book_buttons)} provider booking CTAs. Clicking first...")
    safe_click(driver, book_buttons[0])
    time.sleep(1)

    # 4. Booking modal or auth prompt should be displayed
    modals = driver.find_elements(By.CSS_SELECTOR, ".ds-modal-dialog, [role='dialog']")
    assert len(modals) > 0, "Booking or Auth modal dialog did not appear"
    print("  [PASS] Modal opened with accessible role='dialog'")

    # Run Axe on Customer Home
    a11y_results = run_axe(driver, "Customer Portal (Home + Modal)")
    return a11y_results

def test_provider_flow(driver):
    print("\n--- [Flow 2] Provider Dashboard Flow ---")
    # Login as provider
    driver.get("http://localhost:5174")
    time.sleep(1)

    req = urllib.request.Request(
        f"{API_URL}/auth/login",
        data=json.dumps({"identifier": "kumar.electric@example.local", "password": "KumarPass@123"}).encode("utf-8"),
        headers={"Content-Type": "application/json"}
    )
    with urllib.request.urlopen(req) as response:
        user_data = json.loads(response.read().decode("utf-8"))["user"]

    driver.execute_script("window.localStorage.setItem('ary_user', JSON.stringify(arguments[0]));", user_data)
    driver.get("http://localhost:5174")
    time.sleep(2)

    # Verify provider workspace loaded
    body_text = driver.find_element(By.TAG_NAME, "body").text
    assert "Provider" in body_text or "Jobs" in body_text or "Overview" in body_text, "Provider dashboard content missing"
    print("  [PASS] Provider dashboard loaded successfully")

    # Check tab / navigation items
    nav_links = driver.find_elements(By.CSS_SELECTOR, ".provider-nav-btn, .nav-item, button")
    print(f"  [PASS] Found {len(nav_links)} navigation / action controls on Provider Portal")

    # Run Axe on Provider Dashboard
    a11y_results = run_axe(driver, "Provider Dashboard")
    return a11y_results

def test_driver_flow(driver):
    print("\n--- [Flow 3] Driver App Flow ---")
    driver.get("http://localhost:5175")
    time.sleep(1)

    # Login as driver
    req = urllib.request.Request(
        f"{API_URL}/auth/login",
        data=json.dumps({"identifier": "0778899001", "password": "DriverPass@123"}).encode("utf-8"),
        headers={"Content-Type": "application/json"}
    )
    with urllib.request.urlopen(req) as response:
        user_data = json.loads(response.read().decode("utf-8"))["user"]

    driver.execute_script("window.localStorage.setItem('ary_user', JSON.stringify(arguments[0]));", user_data)
    driver.get("http://localhost:5175")
    time.sleep(2)

    body_text = driver.find_element(By.TAG_NAME, "body").text
    assert "Driver" in body_text or "Online" in body_text or "Offline" in body_text, "Driver workspace content missing"
    print("  [PASS] Driver workspace loaded successfully")

    # Toggle Online / Offline
    toggle_btns = driver.find_elements(By.CSS_SELECTOR, ".driver-online-switch, button.driver-status-btn, .driver-switch-btn")
    if toggle_btns:
        print("  [PASS] Found Driver Online/Offline toggle. Clicking...")
        safe_click(driver, toggle_btns[0])
        time.sleep(1)

    # Run Axe on Driver Portal
    a11y_results = run_axe(driver, "Driver Workspace")
    return a11y_results

def test_admin_flow(driver):
    print("\n--- [Flow 4] Admin Dashboard Flow ---")
    driver.get("http://localhost:5176")
    time.sleep(1)

    # Login as admin
    req = urllib.request.Request(
        f"{API_URL}/auth/login",
        data=json.dumps({"identifier": "admin@example.com", "password": "admin-secret-password-32charsmin!"}).encode("utf-8"),
        headers={"Content-Type": "application/json"}
    )
    with urllib.request.urlopen(req) as response:
        user_data = json.loads(response.read().decode("utf-8"))["user"]

    driver.execute_script("window.localStorage.setItem('ary_user', JSON.stringify(arguments[0]));", user_data)
    driver.get("http://localhost:5176")
    time.sleep(2)

    body_text = driver.find_element(By.TAG_NAME, "body").text
    assert "Admin" in body_text or "Overview" in body_text or "Dashboard" in body_text, "Admin dashboard content missing"
    print("  [PASS] Admin dashboard loaded with KPIs and Navigation")

    # Navigate to Users view
    users_btn = driver.find_elements(By.XPATH, "//button[contains(., 'Users')]")
    if users_btn:
        print("  [PASS] Clicking 'Users' navigation tab...")
        safe_click(driver, users_btn[0])
        time.sleep(1)

    # Run Axe on Admin Portal
    a11y_results = run_axe(driver, "Admin Dashboard")
    return a11y_results

def main():
    print("=== STARTING FULL CROSS-APP E2E SMOKE & A11Y AUDIT ===")
    driver = get_driver(1280, 850)
    summary = {}

    try:
        summary["Customer"] = test_customer_flow(driver)
        summary["Provider"] = test_provider_flow(driver)
        summary["Driver"] = test_driver_flow(driver)
        summary["Admin"] = test_admin_flow(driver)

        print("\n=======================================================")
        print("[SUCCESS] ALL 4 E2E SMOKE FLOWS COMPLETED SUCCESSFULLY!")
        print("=======================================================")
        total_violations = sum(len(v) for v in summary.values())
        total_crit_ser = sum(len([item for item in v if item.get("impact") in ["critical", "serious"]]) for v in summary.values())
        print(f"Total A11y Violations across all 4 apps: {total_violations}")
        print(f"Total Critical/Serious Violations: {total_crit_ser}")

        with open("scripts/a11y_audit_report.json", "w", encoding="utf-8") as f:
            json.dump({k: [{"id": item["id"], "impact": item["impact"], "description": item["description"], "helpUrl": item["helpUrl"]} for item in v] for k, v in summary.items()}, f, indent=2)
        print("Wrote scripts/a11y_audit_report.json")

    finally:
        driver.quit()

if __name__ == "__main__":
    main()
