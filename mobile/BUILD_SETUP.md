# Android Build Setup Guide

## Issues Encountered & Fixed

### 1. ✅ Native Module Not Linked
**Error**: `Cannot read property 'setCompanyId' of null`

**Cause**: After installing `react-native-ble-advertiser`, the native code wasn't compiled into the app.

**Solution**: Ran `npx expo prebuild --clean` to regenerate native projects with the new module.

---

### 2. ✅ SDK Location Not Found
**Error**: `SDK location not found. Define a valid SDK location...`

**Solution**: Created `/mobile/android/local.properties`:
```properties
sdk.dir=/Users/aokiji/Library/Android/sdk
```

---

### 3. ✅ Java Version Incompatibility
**Error**: `Unsupported class file major version 68`

**Cause**: Using Java 24, but React Native requires Java 17 or 21.

**Solution**: Build with Java 21:
```bash
export JAVA_HOME=$(/usr/libexec/java_home -v 21)
```

**Permanent Fix**: Add to `~/.zshrc`:
```bash
export JAVA_HOME=$(/usr/libexec/java_home -v 21)
```

---

### 4. ✅ react-native-ble-advertiser Outdated compileSdkVersion
**Error**: `In order to compile Java 9+ source, please set compileSdkVersion to 30 or above`

**Cause**: The module's `build.gradle` uses `compileSdkVersion 28` (too old).

**Solution**: 
1. Installed `patch-package`
2. Updated `node_modules/react-native-ble-advertiser/android/build.gradle`:
   - Changed `compileSdkVersion` from 28 to 35
   - Changed `buildToolsVersion` from "28.0.3" to "35.0.0"
   - Changed `targetSdkVersion` from 28 to 35
3. Created patch: `patches/react-native-ble-advertiser+0.0.17.patch`
4. Added `postinstall` script to `package.json` to auto-apply patches

**The patch is now permanent** and will be applied automatically after `npm install`.

---

## Build Commands

### First Time Setup
```bash
cd mobile

# Install dependencies
npm install

# Regenerate native projects (if needed)
npx expo prebuild --clean

# Build and run (with Java 21)
export JAVA_HOME=$(/usr/libexec/java_home -v 21)
npx expo run:android
```

### Subsequent Builds
```bash
cd mobile

# Just run (patches auto-applied)
export JAVA_HOME=$(/usr/libexec/java_home -v 21)
npx expo run:android
```

---

## Files Modified

1. ✅ `/mobile/package.json` - Added `patch-package` and `postinstall` script
2. ✅ `/mobile/patches/react-native-ble-advertiser+0.0.17.patch` - Gradle fix
3. ✅ `/mobile/android/local.properties` - SDK location (gitignored)
4. ✅ `/mobile/src/contexts/BluetoothContext.tsx` - Uses `react-native-ble-advertiser`

---

## Expected Behavior After Build

### Success Logs
When the app starts, you should see:
```
✅ [BLE Advertiser] Supported ✓
✅ [BLE Advertiser] Successfully started advertising ✓
```

### Instead of Previous Errors
```
❌ [BLE Advertiser] Error checking support: [TypeError: Cannot read property 'setCompanyId' of null]
❌ [SIMULATION] Started broadcasting UUID
```

---

## Testing BLE Advertising

1. **Connect Android device** (or start emulator)
2. **Build and run**:
   ```bash
   export JAVA_HOME=$(/usr/libexec/java_home -v 21)
   cd mobile && npx expo run:android
   ```
3. **Log in** to the app
4. **Join an event**
5. **Check logs** for `[BLE Advertiser] Successfully started advertising ✓`
6. **Test with ESP32 scanner** - it should detect your device

---

## Troubleshooting

### Build Still Failing?
- Stop all Gradle daemons: `cd android && ./gradlew --stop`
- Clean build: `./gradlew clean`
- Rebuild: `npx expo run:android`

### Patch Not Applied?
- Run: `npm install` or `npx patch-package`
- Check if `/mobile/patches/` folder exists

### Java Version Issues?
- Check version: `java -version`
- List available: `/usr/libexec/java_home -V`
- Switch to 21: `export JAVA_HOME=$(/usr/libexec/java_home -v 21)`

---

## Summary

✅ **react-native-ble-advertiser** integrated successfully  
✅ **All build issues resolved**  
✅ **Patches created for future builds**  
✅ **Documentation updated**  
✅ **Ready for testing**  

🚀 **The app should now broadcast real BLE advertisements on Android!**
