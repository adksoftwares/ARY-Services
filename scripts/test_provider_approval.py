import urllib.request
import urllib.error
import json
import ssl
import sys

sys.stdout.reconfigure(encoding='utf-8')

ctx = ssl.create_default_context()
ctx.check_hostname = False
ctx.verify_mode = ssl.CERT_NONE

BASE_URL = "https://aryservices.adksoftwares.com/api"

def make_req(path, data=None, token=None, method="POST"):
    url = f"{BASE_URL}{path}"
    headers = {"Content-Type": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    body = json.dumps(data).encode("utf-8") if data is not None else None
    req = urllib.request.Request(url, data=body, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req, context=ctx, timeout=10) as resp:
            return json.loads(resp.read().decode("utf-8")), resp.status
    except urllib.error.HTTPError as e:
        err_body = e.read().decode("utf-8")
        return json.loads(err_body) if err_body.startswith("{") else {"error": err_body}, e.code

print("=== 1. Login as Super Admin ===")
admin_login, status = make_req("/auth/login", {
    "identifier": "arikarran14@gmail.com",
    "password": "Admin@123"
})
print(f"Admin Login Status: {status}")
assert status == 200, f"Admin login failed: {admin_login}"
admin_token = admin_login["token"]
print("Admin token obtained successfully!")

print("\n=== 2. Register New Service Provider ===")
test_provider_phone = "0771987654"
test_provider_email = "solartest.perera@example.local"
provider_reg, status = make_req("/auth/register", {
    "fullName": "Perera Solar & Electrical Pro",
    "phone": test_provider_phone,
    "email": test_provider_email,
    "password": "ProviderPass@123",
    "accountType": "provider",
    "location": "Kandy City, Central Province",
    "category": "electrical-repair",
    "categoryName": "Electrical Repair",
    "baseCharge": "3500",
    "nicNumber": "199214506789",
    "nsnNumber": "NSN-KANDY-2026-09",
    "operatingMode": "mobile"
})
print(f"Provider Registration Status: {status}")
print("Response:", provider_reg.get("message") or provider_reg.get("error"))
assert status == 200, f"Provider registration failed: {provider_reg}"
new_provider_id = provider_reg["user"]["id"]
print(f"Created provider user ID: {new_provider_id}")

print("\n=== 3. Verify Provider Cannot Log In While Status is Pending ===")
login_attempt, status = make_req("/auth/login", {
    "identifier": test_provider_phone,
    "password": "ProviderPass@123"
})
print(f"Pending Provider Login Attempt Status: {status}")
print("Response:", login_attempt)
assert status == 403, "Pending provider should not be allowed to log in before approval!"
print("Verified: Provider correctly blocked with 'pending' status!")

print("\n=== 4. Super Admin Fetches Role Applications Queue ===")
role_apps, status = make_req("/admin/role-applications", token=admin_token, method="GET")
print(f"Admin Role Applications Status: {status}")
matching = [a for a in role_apps.get("applications", []) if a["userId"] == new_provider_id]
print(f"Found in Applications Queue: {len(matching)} item(s)")
assert len(matching) > 0, "Provider application MUST appear in Admin Applications queue!"
app_details = matching[0]["application"]["details"]
print("Application Details verified:")
print(f"  Applicant: {matching[0]['fullName']}")
print(f"  Category: {app_details.get('categoryName')} ({app_details.get('category')})")
print(f"  NIC: {app_details.get('nicNumber')}")
print(f"  NSN: {app_details.get('nsnNumber')}")
print(f"  Operating Mode: {app_details.get('operatingMode')}")
print(f"  Base Charge: {app_details.get('baseCharge')}")

print("\n=== 5. Super Admin Approves the Provider Application ===")
approval, status = make_req(f"/admin/role-applications/{new_provider_id}/provider", {"status": "approved"}, token=admin_token, method="PATCH")
print(f"Admin Approval Status: {status}")
print("Approval Response:", approval)
assert status == 200, f"Approval failed: {approval}"

print("\n=== 6. Verify Approved Provider Can Now Log In Successfully ===")
approved_login, status = make_req("/auth/login", {
    "identifier": test_provider_phone,
    "password": "ProviderPass@123"
})
print(f"Approved Provider Login Status: {status}")
print("Welcome Message:", approved_login.get("message"))
assert status == 200, f"Approved provider login failed: {approved_login}"
print("Verified: Approved provider logged in successfully with token!")

print("\n=== 7. Cleanup: Delete Test Provider Account so Data is Pristine ===")
del_resp, status = make_req(f"/admin/users/{new_provider_id}", token=admin_token, method="DELETE")
print(f"Cleanup Status: {status}")
assert status == 200, f"Cleanup failed: {del_resp}"
print("Cleaned up test provider successfully!")

print("\n=======================================================")
print("ALL BACKEND & APPROVAL LIFECYCLE TESTS PASSED 100%!")
print("=======================================================")
