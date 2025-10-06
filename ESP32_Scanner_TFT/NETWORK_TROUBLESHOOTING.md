# ESP32 Network Troubleshooting Guide

## Issue: HTTPS Connection Failures to Convex Backend

### Symptoms
- ESP32 successfully scans and finds BLE devices
- Device registration checks work
- HTTPS connection to `combative-deer-426.convex.cloud:443` times out
- Error: "Failed to connect to combative-deer-426.convex.cloud:443"

### Recent Improvements

#### 1. Enhanced Network Diagnostics
Added detailed logging for connection attempts:
- WiFi status and signal strength (RSSI)
- Available heap memory
- DNS resolution
- Connection retry mechanism

#### 2. Increased Timeouts
- Changed default HTTP timeout from 30s to 60s for poor WiFi conditions
- Helps with slow or unstable networks

#### 3. Connection Retry Logic
- Automatically retries HTTPS connections up to 3 times
- 2-second delay between retries
- Useful for intermittent connectivity issues

#### 4. WiFi Monitoring
- Checks WiFi connection every 5 seconds
- Automatically attempts to reconnect if WiFi drops
- Prevents silent failures during operation

### Debugging Steps

#### Step 1: Check WiFi Signal Strength
When you upload the new code, look for these lines in the Serial Monitor:

```
WiFi Status: 3  // 3 = WL_CONNECTED
WiFi RSSI: -XX dBm
```

**RSSI Guidelines:**
- `-30 to -50 dBm`: Excellent signal
- `-50 to -60 dBm`: Good signal
- `-60 to -70 dBm`: Fair signal (may have issues)
- `-70 to -80 dBm`: Weak signal (likely problems)
- `-80+ dBm`: Very weak signal (unreliable)

**If RSSI is below -70 dBm:**
- Move the ESP32 closer to the WiFi router
- Use a WiFi extender
- Switch to a less crowded WiFi channel

#### Step 2: Check DNS Resolution
Look for this line:
```
DNS resolved: XXX.XXX.XXX.XXX
```

**If DNS fails:**
- Router may not have internet access
- DNS server issues
- Try using Google DNS (8.8.8.8) in your router settings

#### Step 3: Check Memory
Look for:
```
Free Heap: XXXXX bytes
```

**ESP32 Memory Guidelines:**
- HTTPS/TLS requires significant memory (~40-50KB)
- If free heap is below 50KB, you may have issues
- Consider disabling unnecessary features or optimizing code

#### Step 4: Test Basic Connectivity
Try these tests to isolate the issue:

1. **Ping the backend from another device on the same network:**
   ```bash
   ping combative-deer-426.convex.cloud
   ```

2. **Test HTTPS from your computer:**
   ```bash
   curl https://combative-deer-426.convex.cloud/http/health
   ```

3. **Check if port 443 is blocked:**
   - Some networks block HTTPS to external sites
   - Try from mobile hotspot to rule out network restrictions

#### Step 5: Try HTTP Instead of HTTPS (Temporary Test)
If you want to quickly test if HTTPS/SSL is the issue, you can temporarily try HTTP:

**⚠️ WARNING: This is NOT secure and should only be used for testing!**

In `backend_client.cpp`, change:
```cpp
baseURL = "http://combative-deer-426.convex.cloud/http";  // NOT SECURE!
```

If this works but HTTPS doesn't, the issue is with SSL/TLS.

### Common Causes and Solutions

#### 1. Poor WiFi Signal
**Symptoms:**
- Intermittent connections
- Long connection times
- Random disconnections

**Solutions:**
- Move ESP32 closer to router
- Use external antenna if available
- Switch to 2.4GHz instead of 5GHz (better range)
- Use a WiFi extender

#### 2. Network Firewall/Restrictions
**Symptoms:**
- DNS resolves correctly
- Connection attempts time out consistently

**Solutions:**
- Check router firewall settings
- Try mobile hotspot
- Whitelist `convex.cloud` domain
- Check if corporate/school network blocks external HTTPS

#### 3. SSL/TLS Issues
**Symptoms:**
- Connection starts but fails during handshake
- Works with HTTP but not HTTPS

**Solutions:**
- Current code uses `setInsecure()` to skip certificate validation
- May need to add root CA certificate (already prepared in code)
- Update ESP32 WiFi library to latest version

#### 4. Memory Issues
**Symptoms:**
- Connection fails after device has been running for a while
- Free heap is very low

**Solutions:**
- Reduce scan intervals
- Clear unnecessary data structures
- Restart ESP32 periodically

#### 5. Router/ISP Issues
**Symptoms:**
- All devices on network have issues
- Works on different network

**Solutions:**
- Restart router
- Update router firmware
- Contact ISP if persistent
- Try different WiFi network

### Testing Checklist

- [ ] Upload new code with enhanced diagnostics
- [ ] Open Serial Monitor at 115200 baud
- [ ] Record WiFi RSSI value
- [ ] Check if DNS resolution succeeds
- [ ] Note free heap memory
- [ ] Count number of connection retry attempts
- [ ] Test from a different location (closer to router)
- [ ] Try mobile hotspot to rule out network restrictions
- [ ] Ping backend from computer on same network
- [ ] Check for firmware updates for ESP32 board

### Expected Output (Successful Connection)

```
Making POST request to: https://combative-deer-426.convex.cloud/http/batch-checkin
Using HTTPS connection to: combative-deer-426.convex.cloud:443
Attempting secure connection...
WiFi Status: 3
WiFi RSSI: -45 dBm
Free Heap: 198456 bytes
DNS resolved: 54.230.xxx.xxx
Connection attempt 1/3...
Secure connection established
Response status code: 200
Response body: {"success":true,"successful":1,"failed":0}
✅ Batch attendance recorded!
```

### Emergency Workaround: Manual Recording

If network issues persist, you can implement offline queueing:

1. Store attendance records in ESP32 SPIFFS/EEPROM
2. Retry sending when WiFi improves
3. Implement a "sync" button to manually retry failed uploads

This requires code modifications but ensures no data loss during network issues.

### Next Steps

1. **Upload the updated code** to your ESP32
2. **Monitor Serial output** carefully during connection attempts
3. **Report back** with:
   - WiFi RSSI value
   - DNS resolution result
   - Free heap memory
   - Any error messages
   - Number of connection attempts before failure

This will help identify the exact cause of the connection failure.

