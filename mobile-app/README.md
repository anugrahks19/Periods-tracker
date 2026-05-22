# 🌸 Bloom — Mobile App

This folder wraps the Bloom web app into a native Android/iOS app using **Capacitor**.

## Prerequisites

- [Node.js](https://nodejs.org/) (v18+)
- [Android Studio](https://developer.android.com/studio) (for Android)
- [Xcode](https://developer.apple.com/xcode/) (for iOS, Mac only)

## Quick Setup

```bash
# 1. Install dependencies
cd mobile-app
npm install

# 2. Initialize Capacitor (already done — skip if capacitor.config.json exists)
npx cap init Bloom com.bloom.tracker --web-dir www

# 3. Install Android platform
npm install @capacitor/android@6

# 4. Add Android platform
npx cap add android

# 5. Sync web files to native project (copies from parent dir → www → Android)
npm run cap:sync

# 6. Open in Android Studio
npx cap open android
```

## Updating After Code Changes

Whenever you edit HTML/CSS/JS in the main `Period tracker/` folder, re-sync:

```bash
cd mobile-app
npm run cap:sync
```

Then in Android Studio press **▶ Run** or rebuild the APK.

## Build APK

1. Open in Android Studio: `npx cap open android`
2. Wait for **Gradle sync** to finish (bottom-right corner)
3. In Android Studio: **Build → Build Bundle(s) / APK(s) → Build APK(s)**
4. The APK will be in `android/app/build/outputs/apk/debug/`

## Build iOS

1. `npm install @capacitor/ios@6`
2. `npx cap add ios`
3. `npm run cap:sync`
4. `npx cap open ios`
5. Build and run from Xcode

## Notifications

Notifications work differently on native vs browser:

| Feature | Browser (PWA) | Native App (APK) |
|---|---|---|
| Daily check-in reminder | Web Notifications API | Android OS scheduled notification |
| Period approaching alert | Web Notifications API | Android LocalNotifications |
| Permission | Browser popup | Android system permission dialog |

### What notifications will you get?

1. **🌸 Daily Check-in** — Fires at your configured time (default 8:00 PM) if you haven't logged today's entry yet. Reminds you to log mood, symptoms, etc.

2. **📅 Period Alert** — Fires 0–3 days before her predicted next period. Example: *"Her period may start in ~2 days. Time to stock up on her favorites! 💕"*

### Enabling on Android APK

1. Go to **Settings** in the app
2. Toggle **Enable Reminders** ON
3. Android will show a system permission dialog → tap **Allow**
4. Set your preferred reminder time
5. Toggle Daily/Period reminders on or off individually
