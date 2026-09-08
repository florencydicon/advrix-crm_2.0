# Advrix CRM — Mobile Wrapper (Android + iOS)

A native wrapper around the **live web CRM** (`https://advrix-crm-2-0-tdd7-alpha.vercel.app`) built with [Capacitor](https://capacitorjs.com). Same login, same live 12s polling, same Neon database. **No web CRM code was changed.**

> **Auto-updates:** the app just loads the live web URL, so every web deployment shows up in the app automatically — Android never needs a reinstall. iOS TestFlight builds expire after ~90 days (Apple rule); web updates still flow live inside the app. When you next rebuild, bump `versionCode`/`MARKETING_VERSION`.

## Cloud build via GitHub Actions (recommended)
`.github/workflows/mobile-build.yml` builds on push to `mobile/**` or manually:
- **Android APK** on Ubuntu → artifact `advrix-crm-android-apk` (shareable via WhatsApp)
- **iOS IPA** on macOS → signed & uploaded straight to **TestFlight** when secrets exist, otherwise an unsigned archive is uploaded

### Required GitHub Secrets (for signed iOS / TestFlight)
Set them in GitHub → repo → **Settings → Secrets and variables → Actions**:
| Secret | Value |
|---|---|
| `APPLE_TEAM_ID` | Your Team ID (Apple Developer account) |
| `APPLE_CERT_P12_BASE64` | Distribution `.p12` → `base64 -w0 YourCert.p12` |
| `APPLE_CERT_P12_PASSWORD` | The `.p12` export password |
| `APPLE_PROVISIONING_PROFILE_B64` | App Store `.mobileprovision` → `base64 -w0 file.mobileprovision` |
| `ASC_API_KEY_ID` | App Store Connect API key ID |
| `ASC_API_KEY_ISSUER_ID` | API key issuer ID |
| `ASC_API_KEY_P8_BASE64` | `AuthKey_XXXX.p8` → `base64 -w0` |

Without secrets the workflow still runs: Android APK ✓, iOS unsigned archive ✓ (can’t be installed on iPhones).

## How to run the workflow
1. Push this commit (workflow exists in repo).
2. GitHub → **Actions** tab → **Mobile Build — Advrix CRM** → **Run workflow**.
3. Download the artifacts from the run page:
   - `advrix-crm-android-apk/app-debug.apk` → WhatsApp.
   - iOS: if signing secrets were set, the IPA is already in **App Store Connect → TestFlight** (add testers' emails there); otherwise download the archive.

## Manual build

### Android
```
mobile/
  capacitor.config.ts     -> app id/name + loads the production URL
  www/                    -> splash shell shown until the live app loads
  assets/                 -> source logo for icons (auto-generated)
  android/                -> native Android (Gradle) project
  ios/                    -> native Xcode project
```

## First-time sync (icon/URL changes)
```sh
npm install          # inside mobile/
npx cap sync         # copy www + config into both native projects
```

---

## Android — build an installable APK (share via WhatsApp)

You need on this PC: **Java JDK 17** and **Android SDK** (easiest: install [Android Studio](https://developer.android.com/studio), it sets both up).

### A) Debug APK (works everywhere, no signing key needed)
```sh
npx cap open android
```
Android Studio opens. Then either:
- Menu `Build → Build App Bundle(s)/APK(s) → Build APK(s)`
- or command line:
```sh
cd android
.\gradlew.bat assembleDebug
```
APK output:
```
android\app\build\outputs\apk\debug\app-debug.apk
```
Send that file on WhatsApp → tapper clicks → **Install** (allow "unknown sources") → done.

### B) Release APK (smaller, needs your keystore)
```sh
cd android
.\gradlew.bat assembleRelease
```
Output: `android\app\build\outputs\apk\release\app-release.apk`.
(Optional: add a signing keystore in `android/app/build.gradle`; without it the release APK is unsigned. For manual WhatsApp sharing, the **debug APK from step A is the simplest**.)

---

## iOS — build the IPA (requires a Mac with Xcode)

An `.ipa` **cannot** be installed by tapping a link — Apple blocks direct install. The manual-share route is **TestFlight**: you get an invite link and the user installs from TestFlight (no App Store listing needed).

1. Move the `mobile/ios` folder (whole `mobile/` repo copy) to a **Mac** with macOS + Xcode.
2. ```sh
   npm install
   npx cap sync ios
   npx cap open ios      # opens Xcode
   ```
3. In Xcode: select the **Advrix CRM** project → `Signing & Capabilities` → choose your **Apple Developer Team** (needs an Apple Developer account, $99/yr). Change `Bundle Identifier` to something unique, e.g. `com.advrix.crm` (or change in `capacitor.config.ts` before sync).
4. Menu `Product → Archive` → Organizer opens → select archive → **Distribute App → TestFlight** (or `Export` → produces an `.ipa` you can send for ad-hoc testing on registered devices).
5. In [App Store Connect](https://appstoreconnect.apple.com) → TestFlight → **add your team members' emails** → they install the free TestFlight app and tap your invite.

> Without a paid Apple Developer account you can only test on your **own** device (Free provisioning, 7-day re-sign) — not shared via WhatsApp.

---

## Versioning
App version lives in:
- Android: `android/app/build.gradle` → `versionCode` / `versionName`
- iOS: Xcode project → `Current Project Version` / `Marketing Version`