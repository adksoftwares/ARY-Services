import json
import os

def clean_data(base_dir="server/data"):
    # 1. users.json
    users_path = os.path.join(base_dir, "users.json")
    if os.path.exists(users_path):
        with open(users_path, "r", encoding="utf-8") as f:
            users = json.load(f)
        kept_users = [u for u in users if not u.get("id", "").startswith("user-1793")]
        with open(users_path, "w", encoding="utf-8") as f:
            json.dump(kept_users, f, indent=2, ensure_ascii=False)
        print(f"Cleaned users.json: kept {len(kept_users)} genuine accounts (removed {len(users) - len(kept_users)} test accounts)")

    # 2. bookings.json
    bookings_path = os.path.join(base_dir, "bookings.json")
    with open(bookings_path, "w", encoding="utf-8") as f:
        json.dump([], f, indent=2)
    print("Cleaned bookings.json: reset to []")

    # 3. grocery-orders.json
    orders_path = os.path.join(base_dir, "grocery-orders.json")
    with open(orders_path, "w", encoding="utf-8") as f:
        json.dump([], f, indent=2)
    print("Cleaned grocery-orders.json: reset to []")

    # 4. ledger.json
    ledger_path = os.path.join(base_dir, "ledger.json")
    with open(ledger_path, "w", encoding="utf-8") as f:
        json.dump([], f, indent=2)
    print("Cleaned ledger.json: reset to []")

    # 5. notifications.json
    notif_path = os.path.join(base_dir, "notifications.json")
    with open(notif_path, "w", encoding="utf-8") as f:
        json.dump([], f, indent=2)
    print("Cleaned notifications.json: reset to []")

    # 6. reviews.json
    rev_path = os.path.join(base_dir, "reviews.json")
    with open(rev_path, "w", encoding="utf-8") as f:
        json.dump([], f, indent=2)
    print("Cleaned reviews.json: reset to []")

    # 7. driver-services.json
    driver_path = os.path.join(base_dir, "driver-services.json")
    with open(driver_path, "w", encoding="utf-8") as f:
        json.dump({"applications": [], "jobs": [], "presence": {}}, f, indent=2)
    print("Cleaned driver-services.json: reset applications, jobs, presence to empty")

if __name__ == "__main__":
    clean_data()
