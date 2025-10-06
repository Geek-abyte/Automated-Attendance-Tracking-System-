# Bluetooth Classic Removal from ESP32 Scanner

## Reason for Removal

Bluetooth Classic scanning was removed from the ESP32 scanner because:

1. **No longer needed** - Mobile app now uses BLE advertising instead of Bluetooth Classic
2. **Performance overhead** - Classic Bluetooth discovery takes 10-15 seconds per scan
3. **Unnecessary complexity** - Maintaining two scanning methods adds code complexity
4. **Resource usage** - Classic BT uses additional memory and CPU cycles

## Changes Made

### Files Deleted
- ✅ `ESP32_Scanner_TFT/bt_classic_scanner.cpp` - Bluetooth Classic scanner implementation
- ✅ `ESP32_Scanner_TFT/bt_classic_scanner.h` - Bluetooth Classic scanner header

### Files Modified

#### `ESP32_Scanner_TFT/ESP32_Scanner_TFT.ino`

**Removed:**
- `#include "bt_classic_scanner.h"` - Header include
- `BTClassicScanner btClassicScanner;` - Global object declaration
- `btClassicScanner.begin()` - Initialization in `initializeHardware()`
- Classic Bluetooth scanning logic in `performScan()`

**Simplified:**
- Comments updated to reflect BLE-only operation
- `performScan()` now only uses BLE scanner
- Removed fallback logic (Classic BT → BLE)

### Before vs After

#### Before (Dual Scanning):
```cpp
// Try Classic Bluetooth first (99% device compatibility!)
Serial.println("Trying Classic Bluetooth discovery...");
std::vector<ScannedDevice> devices = btClassicScanner.scan(); // 10-15 seconds!

// If no Classic BT devices found, try BLE as fallback
if (devices.size() == 0) {
  Serial.println("No Classic BT devices, trying BLE scan...");
  devices = bleScanner.scan(); // Another 3-5 seconds
}
```

#### After (BLE Only):
```cpp
// Scan for BLE devices
std::vector<ScannedDevice> devices = bleScanner.scan(); // 3-5 seconds only
```

## Performance Improvements

### Scan Time Reduction
- **Before:** 10-15 seconds (Classic BT) + 3-5 seconds (BLE fallback) = **13-20 seconds**
- **After:** 3-5 seconds (BLE only) = **3-5 seconds**
- **Improvement:** ~75% faster scanning! ⚡

### Memory Savings
- Removed Classic Bluetooth stack initialization
- Reduced code size
- Freed up RAM for other operations

### Simpler Logs
- **Before:** Multiple scan attempts, fallback logic, dual protocol logs
- **After:** Clean BLE-only logs, easier to debug

## Current Bluetooth Architecture

```
┌─────────────┐        BLE         ┌─────────────┐
│  Mobile App │ ──────────────────> │ ESP32       │
│             │  Broadcasting       │ Scanner     │
│ BLE Advert. │  User UUID          │ (BLE Only)  │
└─────────────┘                     └─────────────┘
                                           │
                                           │ HTTPS
                                           ▼
                                    ┌─────────────┐
                                    │   Convex    │
                                    │   Backend   │
                                    └─────────────┘
```

### How It Works Now

1. **Mobile App** broadcasts BLE advertisement with user UUID
2. **ESP32 Scanner** scans for BLE advertisements every 5 seconds
3. **ESP32** extracts user UUID from manufacturer data
4. **ESP32** checks if device is registered for the event
5. **ESP32** batch records attendance to backend via HTTPS

## Migration Notes

### Mobile App Requirements
- ✅ Must use `react-native-ble-advertiser`
- ✅ Must broadcast with service UUID: `0000FFF0-0000-1000-8000-00805F9B34FB`
- ✅ Must include user UUID in manufacturer data (company ID: `0xFFFF`)

### ESP32 Scanner Configuration
- ✅ BLE scanner filters for service UUID: `0000FFF0-0000-1000-8000-00805F9B34FB`
- ✅ Extracts user UUID from manufacturer data (skips first 2 bytes for company ID)
- ✅ Validates UUID format starts with `ATT-`

## Testing Recommendations

After uploading the updated code:

1. **Verify faster scanning:**
   - Check Serial Monitor for scan duration
   - Should complete in 3-5 seconds instead of 13-20 seconds

2. **Confirm BLE detection:**
   - Mobile app should be detected immediately
   - Check for "Extracted UUID from manufacturer data" log

3. **Monitor resource usage:**
   - Check free heap memory
   - Should be higher without Classic BT

## Rollback (If Needed)

If you need to restore Bluetooth Classic support:

1. Restore deleted files from git:
   ```bash
   git checkout HEAD -- ESP32_Scanner_TFT/bt_classic_scanner.cpp
   git checkout HEAD -- ESP32_Scanner_TFT/bt_classic_scanner.h
   ```

2. Restore previous version of `ESP32_Scanner_TFT.ino`:
   ```bash
   git checkout HEAD -- ESP32_Scanner_TFT/ESP32_Scanner_TFT.ino
   ```

## Summary

✅ **Removed:** Bluetooth Classic scanning (unnecessary overhead)  
✅ **Kept:** BLE scanning (works with mobile app)  
✅ **Result:** 75% faster scanning, simpler code, lower resource usage  
✅ **Status:** Ready to upload and test

---

**Last Updated:** 2025-10-05  
**Related Changes:** Network fixes, loading screens, batch recording

