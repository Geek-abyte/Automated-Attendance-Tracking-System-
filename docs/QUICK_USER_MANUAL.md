# Quick User Manual

This guide explains how to operate the Automated Attendance Tracking System across Admin, Mobile, and ESP32 Scanner.

## 1) Admin Web App (Event setup and monitoring)

1. Open the Admin website (Vercel deployment) and sign in.
2. Create an event: Events → New → enter name, date/time, and (optional) location → Create.
3. Activate an event: Events → toggle Activate on the event you want to scan for.
4. View attendance: Events → select an event → see Attendance records and summaries. Use Reports for recent events overview.

Notes
- Ensure the admin app is configured with NEXT_PUBLIC_CONVEX_URL pointing to your deployed Convex backend.
- Only one active event should be scanned at a time per scanner location.

## 2) Mobile App (Student broadcasting / identification)

1. Install the mobile app (Expo/Android build) on each student device.
2. Sign in or register with name and email. A BLE UUID is generated per user.
3. During an active event, the app broadcasts the user’s BLE UUID (Android) or shows a QR fallback (iOS, if BLE advertising restricted).
4. Keep Bluetooth enabled and the app running in the background or foreground during the event.

Notes
- Set EXPO_PUBLIC_CONVEX_URL in the mobile app build to the same Convex URL as the admin.
- Android: BLE advertising is automatic when an event is active. iOS: use QR fallback as instructed.

## 3) ESP32 Scanner (In-room device scanning)

1. Power the ESP32 scanner and wait for Wi-Fi connection (green indicators/messages).
2. Select event: use UP/DOWN buttons to highlight the correct event, then press ENTER.
3. Start scanning: blue LED indicates active scanning. The display shows detected users and check-in results.
4. If network is unavailable, records are stored locally and auto-synced when the connection returns.

Notes
- Update the scanner `config.json` with Wi-Fi credentials, `backend_url` (Convex HTTP URL), and `api_key` before use.
- Keep the scanner within typical BLE range of participants.

## Basic Troubleshooting

- No events visible on scanner: confirm event is created and Activated in Admin, and the scanner points to the correct backend URL.
- Students not detected: ensure Android devices have Bluetooth ON and the app installed/logged in; for iOS, use the QR fallback.
- Admin shows no attendance: verify the scanner is connected to Wi-Fi and the correct API key is set; check Reports/Events pages for updates.

## Environment Configuration Summary

- Admin: set `NEXT_PUBLIC_CONVEX_URL=https://<your-deployment>.convex.cloud`
- Mobile: set `EXPO_PUBLIC_CONVEX_URL=https://<your-deployment>.convex.cloud`
- ESP32: set `backend_url` in `ESP32_Scanner_TFT/config.json` to `https://<your-deployment>.convex.cloud/http`




