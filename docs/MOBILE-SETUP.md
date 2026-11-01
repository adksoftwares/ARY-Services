# ARY Services — Native Mobile Apps Architecture (Android / iOS)

ARY Services provides **3 dedicated native mobile applications** built on top of the shared core logic using Capacitor:

1. **ARY Services (Customer App)**
   - Directory: [`mobile/customer/`](file:///d:/ARY%20Services/mobile/customer)
   - Android Package: `com.aryservices.customer`
   - Features: Service discovery, provider booking, ride requests, groceries marketplace, escrow checkout, reviews and warranty dispute.

2. **ARY Driver (Driver Partner App)**
   - Directory: [`mobile/driver/`](file:///d:/ARY%20Services/mobile/driver)
   - Android Package: `com.aryservices.driver`
   - Features: Ride-hailing & parcel delivery dispatch, live geolocation, real-time incoming job offers, 1-click claim, route status updates, driver earnings.

3. **ARY Provider (Partner & Shop App)**
   - Directory: [`mobile/provider/`](file:///d:/ARY%20Services/mobile/provider)
   - Android Package: `com.aryservices.provider`
   - Features: Service requests management, cascading dispatch alerts with audio chime, grocery & gas cylinder inventory stock control, double-entry wallet & CEFT payout ledger.

---

## 🛠️ Build & Sync Instructions

### 1. Build and Sync All 3 Mobile Apps in One Command
To compile the bundles and automatically sync them to all 3 native Android projects:
```bash
npm run build:mobile
```

### 2. Build and Sync an Individual App
```bash
# Customer app only
npm run build:mobile:customer

# Driver app only
npm run build:mobile:driver

# Provider app only
npm run build:mobile:provider
```

---

## 📱 Generating APKs / Opening in Android Studio

Each mobile application has its own native Android project folder:

### A. Customer App
```bash
cd mobile/customer
npx cap open android
```
*Or build the debug APK directly via command line:*
```bash
cd mobile/customer/android
.\gradlew.bat assembleDebug
```
*The output APK will be located at:* `mobile/customer/android/app/build/outputs/apk/debug/app-debug.apk`

### B. Driver App
```bash
cd mobile/driver
npx cap open android
```
*Or build debug APK:*
```bash
cd mobile/driver/android
.\gradlew.bat assembleDebug
```
*The output APK will be located at:* `mobile/driver/android/app/build/outputs/apk/debug/app-debug.apk`

### C. Provider App
```bash
cd mobile/provider
npx cap open android
```
*Or build debug APK:*
```bash
cd mobile/provider/android
.\gradlew.bat assembleDebug
```
*The output APK will be located at:* `mobile/provider/android/app/build/outputs/apk/debug/app-debug.apk`

---

## 🌐 Connecting Mobile Apps to the Backend

Mobile devices run in their own network environment. To ensure the mobile apps connect to your backend:

1. **Android Emulator:**
   - By default, in development mode, the mobile apps automatically connect to `http://10.0.2.2:4000/api` (the standard Android loopback to host PC's `localhost:4000`).

2. **Physical Device over Wi-Fi / LAN:**
   - Set the build-time environment variable to your computer's local network IP (e.g., `192.168.1.50`):
     ```bash
     $env:VITE_API_BASE="http://192.168.1.50:4000/api"
     npm run build:mobile
     ```
   - Alternatively, you can override the API URL dynamically inside the app's developer tools / console:
     ```javascript
     localStorage.setItem('ary_api_base', 'http://192.168.1.50:4000/api');
     ```

3. **Production Cloud Deployment:**
   - Build with your production domain:
     ```bash
     $env:VITE_API_BASE="https://api.aryservices.lk/api"
     npm run build:mobile
     ```
