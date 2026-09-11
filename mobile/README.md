# Advrix CRM — Mobile Wrapper (Android)

A native Android wrapper around the **live web CRM** (`https://advrix-crm-2-0-tdd7-alpha.vercel.app`) built with [Capacitor](https://capacitorjs.com). Same login, same live 12s polling, same Neon database. **No web CRM code was changed.**

> **Auto-updates:** the app just loads the live web URL, so every web deployment shows up in the app automatically — Android never needs a reinstall.

## Cloud build via GitHub Actions (recommended)
`.github/workflows/mobile-build.yml` builds the **Android APK** on push to `mobile/**` or manually:
- Android **debug APK** on Ubuntu → artifact `advrix-crm-android-apk` (shareable via WhatsApp)

## How to run the workflow
1. Push a change under `mobile/` (or run manually: GitHub → **Actions** tab → **Mobile Build — Advrix CRM** → **Run workflow**).
2. Download the artifact from the run page: `advrix-crm-android-apk/app-debug.apk` → WhatsApp.

## Manual build

```
mobile/
  capacitor.config.ts     -> app id/name + loads the production URL
  www/                    -> splash shell shown until the live app loads
  assets/                 -> source logo for icons (auto-generated)
  android/                -> native Android (Gradle) project
```

## First-time sync (icon/URL changes)
```sh
npm install          # inside mobile/
npx cap sync android
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

## Versioning
App version lives in `android/app/build.gradle` → `versionCode` / `versionName`.