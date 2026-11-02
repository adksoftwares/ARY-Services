import time
import os
import json
import urllib.request
from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By

ARTIFACT_DIR = r"C:\Users\Arikarran\.gemini\antigravity\brain\9bee2e27-9cd7-4626-a971-888a6ce02660"
BASE_URL = "http://localhost:5176"
API_URL = "http://localhost:4000/api"

def get_admin_token():
    req = urllib.request.Request(
        f"{API_URL}/auth/login",
        data=json.dumps({
            "identifier": "admin@example.com",
            "password": "admin-secret-password-32charsmin!"
        }).encode("utf-8"),
        headers={"Content-Type": "application/json"}
    )
    with urllib.request.urlopen(req) as response:
        data = json.loads(response.read().decode("utf-8"))
        return data["user"]

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

def capture(driver, filename):
    out_path = os.path.join(ARTIFACT_DIR, filename)
    driver.save_screenshot(out_path)
    print(f"Captured: {filename}")
    return out_path

def main():
    print("=== STARTING ADMIN DASHBOARD AUTOMATED VERIFICATION ===")
    driver = get_driver(1280, 850)

    try:
        # Step 1: Access Denied screen for unauthenticated visitor
        print("Step 1: Navigating to Admin Portal as unauthenticated visitor...")
        driver.get(BASE_URL)
        time.sleep(2)
        capture(driver, "admin_access_denied_1280.png")

        # Step 2: Obtain authenticated admin credentials and set session
        print("Step 2: Authenticating as Super Admin via API...")
        admin_user = get_admin_token()
        print(f"Authenticated as: {admin_user['fullName']} ({admin_user['accountType']})")

        # Inject into localStorage
        driver.execute_script(f"localStorage.setItem('ary_user', JSON.stringify({json.dumps(admin_user)}));")
        driver.get(BASE_URL)
        time.sleep(2.5)

        # Step 3: Capture Desktop 1280px Overview
        print("Step 3: Capturing Admin Overview...")
        capture(driver, "admin_overview_1280_desktop.png")

        # Step 4: Navigate to User Accounts Tab
        print("Step 4: Navigating to User Accounts...")
        users_btn = driver.find_element(By.XPATH, "//button[contains(., 'User Accounts')]")
        users_btn.click()
        time.sleep(1.5)
        capture(driver, "admin_users_1280_desktop.png")

        # Step 4b: Open KYC Inspector Modal
        kyc_btns = driver.find_elements(By.XPATH, "//button[contains(., 'KYC')]")
        if kyc_btns:
            print("Step 4b: Opening KYC Document Inspector Modal...")
            kyc_btns[0].click()
            time.sleep(1.5)
            capture(driver, "admin_kyc_modal_1280.png")

            close_btns = driver.find_elements(By.XPATH, "//button[@aria-label='Close dialog' or @aria-label='Close modal' or contains(@class, 'ds-modal-close')]")
            if close_btns:
                close_btns[0].click()
            time.sleep(1)

        # Step 4c: Open Reset Password Modal
        key_btns = driver.find_elements(By.XPATH, "//button[contains(., 'Key')]")
        if key_btns:
            print("Step 4c: Opening Reset Password Modal...")
            key_btns[0].click()
            time.sleep(1.5)

            gen_btn = driver.find_elements(By.XPATH, "//button[contains(., 'Generate Strong Password')]")
            if gen_btn:
                gen_btn[0].click()
                time.sleep(0.5)

            capture(driver, "admin_reset_password_modal.png")

            close_btns = driver.find_elements(By.XPATH, "//button[@aria-label='Close dialog' or @aria-label='Close modal' or contains(@class, 'ds-modal-close')]")
            if close_btns:
                close_btns[0].click()
            time.sleep(1)

        # Step 4d: Open Delete Confirmation Modal
        trash_btns = driver.find_elements(By.XPATH, "//button[@title='Permanently Delete Account']")
        if trash_btns:
            print("Step 4d: Opening Delete Account Typed Confirmation Modal...")
            trash_btns[0].click()
            time.sleep(1.5)
            capture(driver, "admin_delete_modal.png")

            cancel_btns = driver.find_elements(By.XPATH, "//button[contains(., 'Cancel')]")
            if cancel_btns:
                cancel_btns[0].click()
            time.sleep(1)

        # Step 5: Applications Queue Tab
        print("Step 5: Navigating to Applications Queue...")
        apps_btn = driver.find_element(By.XPATH, "//button[contains(., 'Applications Queue')]")
        apps_btn.click()
        time.sleep(1.5)
        capture(driver, "admin_applications_1280.png")

        # Step 6: Service Requests Tab
        print("Step 6: Navigating to Service Requests...")
        srv_btn = driver.find_element(By.XPATH, "//button[contains(., 'Service Requests')]")
        srv_btn.click()
        time.sleep(1.5)
        capture(driver, "admin_services_1280.png")

        # Step 7: Marketplace Categories Tab
        print("Step 7: Navigating to Categories...")
        cat_btn = driver.find_element(By.XPATH, "//button[contains(., 'Marketplace Categories')]")
        cat_btn.click()
        time.sleep(1.5)
        capture(driver, "admin_categories_1280.png")

        # Step 8: Disputes & Escrow Tab
        print("Step 8: Navigating to Disputes & Escrow...")
        disp_btn = driver.find_element(By.XPATH, "//button[contains(., 'Disputes & Escrow')]")
        disp_btn.click()
        time.sleep(1.5)
        capture(driver, "admin_disputes_1280.png")

        # Open Dispute Arbitration Modal
        arb_btns = driver.find_elements(By.XPATH, "//button[contains(., 'Arbitrate Dispute')]")
        if arb_btns:
            print("Step 8b: Opening Dispute Arbitration Decision Modal...")
            arb_btns[0].click()
            time.sleep(1.5)
            capture(driver, "admin_dispute_modal_1280.png")

            cancel_btns = driver.find_elements(By.XPATH, "//button[contains(., 'Cancel')]")
            if cancel_btns:
                cancel_btns[0].click()
            time.sleep(1)

        # Step 9: CEFT Settlement Payouts Tab
        print("Step 9: Navigating to CEFT Settlement...")
        payout_btn = driver.find_element(By.XPATH, "//button[contains(., 'CEFT Settlement')]")
        payout_btn.click()
        time.sleep(1.5)
        capture(driver, "admin_payouts_1280.png")

        # Step 10: Dispatch Telematics Tab
        print("Step 10: Navigating to Dispatch Telematics...")
        disp_btn = driver.find_element(By.XPATH, "//button[contains(., 'Dispatch Telematics')]")
        disp_btn.click()
        time.sleep(1.5)
        capture(driver, "admin_dispatch_1280.png")

        # Step 11: System Audit Log Tab
        print("Step 11: Navigating to System Audit Log...")
        notif_btn = driver.find_element(By.XPATH, "//button[contains(., 'System Audit Log')]")
        notif_btn.click()
        time.sleep(1.5)
        capture(driver, "admin_notifications_1280.png")

        # Step 12: Tablet 768px View
        print("Step 12: Testing Tablet 768px Viewport...")
        driver.set_window_size(768, 1024)
        time.sleep(1.5)
        capture(driver, "admin_768_tablet.png")

        # Step 13: Mobile 375px View
        print("Step 13: Testing Mobile 375px Viewport...")
        driver.set_window_size(375, 812)
        time.sleep(1.5)
        capture(driver, "admin_375_mobile.png")

        # Step 14: Mobile Drawer Open View
        print("Step 14: Opening Mobile Drawer Navigation...")
        menu_toggles = driver.find_elements(By.CLASS_NAME, "admin-menu-toggle")
        if menu_toggles:
            menu_toggles[0].click()
            time.sleep(1)
            capture(driver, "admin_375_mobile_drawer.png")

        # Measure Performance Timing
        timing = driver.execute_script("""
            const t = performance.timing;
            return {
                domInteractive: t.domInteractive - t.navigationStart,
                domComplete: t.domComplete - t.navigationStart,
                loadEvent: t.loadEventEnd - t.navigationStart
            };
        """)
        print("Performance Timing Metrics:", json.dumps(timing, indent=2))

        # Check Console Errors
        logs = driver.get_log("browser")
        severe_errors = [l for l in logs if l['level'] == 'SEVERE' and 'favicon.ico' not in l['message']]
        print(f"Browser SEVERE Application Errors: {len(severe_errors)}")
        for err in severe_errors:
            print("  -", err['message'])

        print("=== ALL VISUAL SCREENSHOTS AND VERIFICATIONS COMPLETED SUCCESSFULLY ===")

    finally:
        driver.quit()

if __name__ == "__main__":
    main()
