# Advrix CRM — Mobile Wrapper (Android + iOS)

A native wrapper around the **live web CRM** (`https://advrix-crm-2-0-tdd7-alpha.vercel.app`) built with [Capacitor](https://capacitorjs.com). Same login, same live 12s polling, same Neon database. **No web CRM code was changed.**

## Folder layout
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