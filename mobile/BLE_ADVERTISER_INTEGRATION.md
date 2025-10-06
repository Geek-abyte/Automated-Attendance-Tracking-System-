# BLE Advertiser Integration Guide

## Overview

This mobile app now uses **`react-native-ble-advertiser`** for Bluetooth Low Energy (BLE) advertising on Android devices. This is a well-established React Native module that provides robust BLE advertising capabilities.

## What Changed

### Before
- Custom native modules (`BleAdvertising` and `BluetoothClassic`)
- Manual Java/Kotlin implementation
- Required custom package registration

### After
- Using `react-native-ble-advertiser` npm package
- No custom native code needed
- Auto-linked through React Native
- Better maintained and more reliable

## Installation

The package is already installed via npm:

```bash
npm install react-native-ble-advertiser
npm install --save-dev patch-package
```

### Important: Patch Required

The `react-native-ble-advertiser` module has an outdated `compileSdkVersion` that needs to be patched. We use `patch-package` to automatically apply this fix.

**The patch is already created** at `/mobile/patches/react-native-ble-advertiser+0.0.17.patch` and will be applied automatically after `npm install` via the `postinstall` script.

## How It Works

### 1. Initialization

On app startup, the `BluetoothContext` checks if BLE advertising is supported:

```typescript
// Initialize BLE Advertiser
BleAdvertiser.setCompanyId(0x0000); // Use standard company ID

// Test if advertising works
const isSupported = await new Promise<boolean>((resolve) => {
  BleAdvertiser.start()
    .then(() => {
      BleAdvertiser.stop();
      resolve(true);
    })
    .catch(() => {
      resolve(false);
    });
});
```

### 2. Starting Advertising

When a user joins an event, the app broadcasts their BLE UUID:

```typescript
BleAdvertiser.broadcast(bleUuid, [], {
  advertiseMode: BleAdvertiser.ADVERTISE_MODE_LOW_LATENCY,
  txPowerLevel: BleAdvertiser.ADVERTISE_TX_POWER_HIGH,
  connectable: false,
  includeDeviceName: false,
  includeTxPowerLevel: false,
});
```

**Configuration:**
- **advertiseMode**: `LOW_LATENCY` for maximum detectability
- **txPowerLevel**: `HIGH` for better range
- **connectable**: `false` (we only need advertising, not connections)
- **includeDeviceName**: `false` (UUID is broadcast as the name)

### 3. Stopping Advertising

When leaving an event:

```typescript
await BleAdvertiser.stopBroadcast();
```

## Supported Platforms

### Android ✅
- **Supported**: Yes
- **Min API**: Android 5.0 (API 21+)
- **Best API**: Android 8.0+ (API 26+) for optimal advertising
- **Device Compatibility**: ~70% of Android devices support BLE advertising

### iOS ❌
- **Supported**: No
- **Reason**: iOS doesn't allow custom BLE advertising with arbitrary data
- **Fallback**: Simulation mode (user can still use QR code for attendance)

## Required Permissions

Already configured in `AndroidManifest.xml`:

```xml
<!-- Basic Bluetooth -->
<uses-permission android:name="android.permission.BLUETOOTH"/>
<uses-permission android:name="android.permission.BLUETOOTH_ADMIN"/>

<!-- Android 12+ (API 31+) -->
<uses-permission android:name="android.permission.BLUETOOTH_ADVERTISE"/>
<uses-permission android:name="android.permission.BLUETOOTH_CONNECT"/>
<uses-permission android:name="android.permission.BLUETOOTH_SCAN"/>

<!-- Location (required for BLE on Android) -->
<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION"/>
<uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION"/>

<!-- BLE Hardware -->
<uses-feature android:name="android.hardware.bluetooth_le" android:required="true"/>
```

## User Experience

### Android Devices with BLE Advertising Support
1. User logs in and registers their device
2. User joins an event
3. App requests Bluetooth permissions
4. App starts BLE advertising with user's UUID
5. ESP32 scanners detect the broadcast
6. Attendance is automatically recorded

### Android Devices without BLE Advertising Support
1. User logs in and registers their device
2. User joins an event
3. App detects no BLE advertising support
4. Falls back to **simulation mode**
5. User can use **QR code** for manual attendance

### iOS Devices
1. User logs in and registers their device
2. User joins an event
3. App automatically uses **simulation mode**
4. User uses **QR code** for manual attendance

## Testing

### Check if BLE Advertising Works

The app automatically logs the status:

```
[BLE Advertiser] Supported ✓
```

Or:

```
[BLE Advertiser] Not supported on this device, using simulation mode
```

### Manual Test

1. Install the app on an Android device
2. Log in and navigate to Events
3. Join an event
4. Check the console logs in React Native
5. Look for `[BLE Advertiser] Successfully started advertising ✓`

## Advantages of react-native-ble-advertiser

✅ **No Custom Native Code**: No need to maintain Java/Kotlin modules
✅ **Auto-linking**: Works automatically with React Native
✅ **Cross-platform**: Handles Android/iOS differences gracefully
✅ **Well-tested**: Used by many production apps
✅ **Better API**: Simpler and more reliable than custom implementation
✅ **Error Handling**: Built-in fallback mechanisms

## Disadvantages

⚠️ **Archived Module**: The module was archived in March 2024 (no longer actively maintained)
⚠️ **iOS Limitation**: iOS doesn't support custom BLE advertising
⚠️ **Device Compatibility**: Only ~70% of Android devices support BLE advertising

## Fallback Strategy

The app implements a graceful fallback:

1. **Try BLE Advertising** (Android devices with support)
2. **Fall back to Simulation Mode** (iOS or unsupported Android)
3. **QR Code Alternative** (always available as backup)

## Troubleshooting

### "BLE advertising not working"
- Check if device supports BLE advertising (Android 5.0+)
- Verify Bluetooth permissions are granted
- Enable Bluetooth on device
- Check console logs for detailed error messages

### "Permissions not granted"
- App automatically requests permissions
- User must accept all Bluetooth permissions
- On Android 12+, must accept `BLUETOOTH_ADVERTISE` permission

### "Simulation mode instead of real Bluetooth"
- Device doesn't support BLE advertising
- Use QR code as alternative attendance method
- Consider upgrading to newer Android device

### Build Issues

#### "Unsupported class file major version 68"
- You're using Java 24, but React Native requires Java 17 or 21
- **Solution**: Use Java 21:
  ```bash
  export JAVA_HOME=$(/usr/libexec/java_home -v 21)
  cd mobile && npx expo run:android
  ```
- **Permanent fix**: Add to `~/.zshrc`:
  ```bash
  export JAVA_HOME=$(/usr/libexec/java_home -v 21)
  ```

#### "compileSdkVersion to 30 or above"
- The patch might not be applied
- **Solution**: Run `npm install` to apply patches
- Or manually run: `npx patch-package`

#### "SDK location not found"
- Android SDK path not configured
- **Solution**: Ensure `/mobile/android/local.properties` exists with:
  ```
  sdk.dir=/Users/YOUR_USERNAME/Library/Android/sdk
  ```

## Related Files

- `/mobile/src/contexts/BluetoothContext.tsx` - Main Bluetooth logic
- `/mobile/android/app/src/main/AndroidManifest.xml` - Android permissions
- `/mobile/package.json` - Package dependencies

## Future Improvements

1. **Find Active Fork**: Look for actively maintained forks of `react-native-ble-advertiser`
2. **Hybrid Approach**: Combine BLE with QR code for redundancy
3. **Signal Strength**: Add RSSI tracking for proximity detection
4. **Background Support**: Enable advertising when app is in background

## Support

For issues related to:
- **BLE Advertising**: Check `react-native-ble-advertiser` documentation
- **Permissions**: Review Android Bluetooth permission docs
- **ESP32 Integration**: See `/ESP32_Scanner_TFT/README.md`
