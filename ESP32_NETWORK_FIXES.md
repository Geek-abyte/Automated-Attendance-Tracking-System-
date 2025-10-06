# ESP32 Network Connection Fixes

## Problem
The ESP32 scanner was failing to record attendance with error:
```
Failed to connect to combative-deer-426.convex.cloud:443
```

This occurred even though:
- BLE scanning was working correctly
- Device registration checks were successful
- The batch recording logic was implemented

## Root Cause
Network connectivity issues, likely due to:
1. Poor WiFi signal strength
2. SSL/TLS connection timeouts
3. No WiFi reconnection mechanism
4. No connection retry logic

## Changes Made

### 1. Enhanced Network Diagnostics (`backend_client.cpp`)
Added detailed logging before each HTTPS connection attempt:
- WiFi connection status
- WiFi signal strength (RSSI)
- Free heap memory
- DNS resolution check
- Connection status after failure

**Benefits:**
- Easier to identify the exact cause of connection failures
- Can detect memory issues, DNS problems, or WiFi signal issues

### 2. Connection Retry Logic (`backend_client.cpp`)
Implemented automatic retry mechanism:
- Up to 3 connection attempts per request
- 2-second delay between retries
- Clear progress logging

**Benefits:**
- Handles temporary network glitches
- Improves reliability on unstable WiFi

### 3. Increased Timeout (`backend_client.cpp`)
Changed default HTTP timeout:
- **Before:** 30 seconds
- **After:** 60 seconds

**Benefits:**
- Better support for slow or congested networks
- Gives SSL/TLS handshake more time to complete

### 4. WiFi Connection Monitoring (`ESP32_Scanner_TFT.ino`)
Added periodic WiFi status checking:
- Checks every 5 seconds
- Automatically attempts to reconnect if WiFi drops
- Displays reconnection status on screen

**Benefits:**
- Prevents silent failures when WiFi disconnects
- Automatically recovers from WiFi dropouts

### 5. DNS Resolution Check (`backend_client.cpp`)
Added explicit DNS resolution before connection attempts:
- Resolves hostname to IP address first
- Logs the resolved IP address
- Fails fast if DNS doesn't work

**Benefits:**
- Identifies DNS issues immediately
- Helps diagnose router/network problems

## Files Modified

1. **`ESP32_Scanner_TFT/backend_client.cpp`**
   - Added network diagnostics
   - Implemented retry logic
   - Increased timeout
   - Added DNS resolution

2. **`ESP32_Scanner_TFT/ESP32_Scanner_TFT.ino`**
   - Added WiFi monitoring in main loop
   - Auto-reconnection logic

## Next Steps

### 1. Upload the Code
Open Arduino IDE and upload the modified code to your ESP32:
```
File → Open → ESP32_Scanner_TFT/ESP32_Scanner_TFT.ino
Sketch → Upload
```

### 2. Monitor Serial Output
Open Serial Monitor at **115200 baud** and watch for:
```
WiFi Status: 3
WiFi RSSI: -XX dBm
Free Heap: XXXXX bytes
DNS resolved: XXX.XXX.XXX.XXX
Connection attempt 1/3...
```

### 3. Diagnose Based on Output

#### If DNS resolution fails:
- Router has no internet access
- DNS server issues
- Try restarting the router

#### If WiFi RSSI is below -70 dBm:
- Move ESP32 closer to router
- Use WiFi extender
- Switch to 2.4GHz network

#### If all retries fail:
- Network firewall may be blocking HTTPS
- Try mobile hotspot to test
- Check if port 443 is blocked

### 4. Report Results
Please share the Serial Monitor output, especially:
- WiFi RSSI value
- DNS resolution result
- Free heap memory
- Connection attempt results
- Any error messages

## Additional Resources

- **Network Troubleshooting Guide:** `ESP32_Scanner_TFT/NETWORK_TROUBLESHOOTING.md`
- Detailed debugging steps
- Common issues and solutions
- Testing checklist

## Testing Plan

1. **Basic Connectivity Test**
   - Upload code
   - Watch for WiFi connection
   - Check RSSI value

2. **DNS Resolution Test**
   - Verify DNS resolves to an IP
   - If fails, check router/internet

3. **HTTPS Connection Test**
   - Watch retry attempts
   - Check if any attempt succeeds
   - Note timeout behavior

4. **Network Change Test**
   - Try different WiFi network
   - Try mobile hotspot
   - Compare results

## Expected Improvements

With these changes, you should see:
- ✅ More informative error messages
- ✅ Automatic recovery from temporary glitches
- ✅ Better handling of poor WiFi conditions
- ✅ Automatic WiFi reconnection
- ✅ Faster identification of actual problems

## If Issues Persist

If the ESP32 still can't connect after these fixes:

1. **Network is the problem:**
   - Poor signal strength
   - Firewall blocking HTTPS
   - ISP/router issues

2. **Consider alternatives:**
   - Use HTTP (insecure, testing only)
   - Implement offline queue
   - Use different WiFi network
   - Add external antenna

3. **Report with diagnostics:**
   - Share full Serial Monitor output
   - Include RSSI value
   - Mention any network restrictions
   - Test results from different locations

---

**Last Updated:** 2025-10-05  
**Status:** Ready for testing