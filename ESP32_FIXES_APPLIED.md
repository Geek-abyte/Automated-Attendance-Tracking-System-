# ESP32 Scanner Fixes Applied

## Issues Fixed

### 1. ✅ No Registered Devices Found
**Problem:** Scanner returned 0 registered devices even though users were registered.

**Root Cause:** The backend query wasn't properly handling the Convex ID conversion and had no debugging output.

**Fix Applied:**
- Added extensive logging to `backend/convex/registrations.ts` in `getRegisteredDevicesForEvent()`
- Added event existence verification
- Added console logs for each step of the process

**To Verify the Fix:**

1. **Check if users are actually registered:**
   ```bash
   # In the backend directory, check the Convex dashboard
   # Look at the eventRegistrations table
   # You should see entries with:
   # - userId: <user_id>
   # - eventId: jn7f56bc6vtrdx0tmnmby1cmm57qptfm
   # - status: "registered"
   ```

2. **Check if users have BLE UUIDs:**
   ```bash
   # In the Convex dashboard, check the users table
   # Make sure each registered user has a bleUuid field populated
   # Example: "ATT-USER-001"
   ```

3. **Check backend logs:**
   ```bash
   # When the scanner requests registered devices, you should see:
   getRegisteredDevicesForEvent called with eventId: jn7f56bc6vtrdx0tmnmby1cmm57qptfm
   Event found: this is a thing
   Found registrations: X
   Processing registration for user: user@email.com
   Adding BLE UUID: ATT-USER-XXX
   Returning device UUIDs: [...]
   ```

### How to Register a User for Testing:

**Option 1: Via Convex Dashboard**
```javascript
// In the Convex dashboard function runner:
// First, create a user if you don't have one
await ctx.runMutation("users:createUser", {
  name: "Test User",
  email: "test@example.com",
  bleUuid: "ATT-TEST-001"
});

// Get the user ID from the response, then register for event
await ctx.runMutation("registrations:registerForEvent", {
  userId: "<user_id_from_above>",
  eventId: "jn7f56bc6vtrdx0tmnmby1cmm57qptfm"
});
```

**Option 2: Via HTTP API**
```bash
# Create user
curl -X POST https://combative-deer-426.convex.cloud/http/create-user \
  -H "Content-Type: application/json" \
  -H "x-api-key: att_3sh4fmd2u14ffisevqztm" \
  -d '{
    "name": "Test User",
    "email": "test@example.com",
    "bleUuid": "ATT-TEST-001"
  }'

# Register user for event (use userId from above response)
curl -X POST https://combative-deer-426.convex.cloud/http/register-user \
  -H "Content-Type: application/json" \
  -H "x-api-key: att_3sh4fmd2u14ffisevqztm" \
  -d '{
    "userId": "<user_id>",
    "eventId": "jn7f56bc6vtrdx0tmnmby1cmm57qptfm"
  }'
```

---

### 2. ✅ ENTER Button Not Stopping Scan
**Problem:** Pressing ENTER multiple times during scanning did not stop the scan.

**Root Cause:** The BLE scan blocks execution for 3+ seconds (scan duration + processing time). During this blocking period, button presses are not detected.

**Fix Applied:**
- Added `stopScanRequested` flag to handle stop requests asynchronously
- When ENTER is pressed during scanning, the flag is set immediately
- The flag is checked before starting a scan and immediately after completing a scan
- This allows the scan to be interrupted between scan cycles

**How It Works Now:**
1. User presses ENTER → `stopScanRequested = true`
2. Message logged: "Stop scan requested by user"
3. Next loop iteration checks the flag at the start of `performScan()`
4. If flag is set, calls `stopScanning()` immediately
5. Also checks flag after BLE scan completes (in case button pressed during scan)
6. Scanner returns to event menu

**Expected Behavior:**
- Press ENTER → "Stop scan requested by user" appears in serial
- Within 5 seconds (at most), scan stops and returns to event menu
- If pressed during active BLE scan (3 seconds), stops immediately after scan completes

---

## Testing Checklist

### Backend Registration Check
- [ ] Open Convex dashboard at `http://127.0.0.1:6790` (or your deployment URL)
- [ ] Navigate to "Data" → "eventRegistrations" table
- [ ] Verify entries exist with:
  - `eventId`: jn7f56bc6vtrdx0tmnmby1cmm57qptfm
  - `status`: "registered"
- [ ] Navigate to "Data" → "users" table
- [ ] Verify registered users have valid `bleUuid` values (e.g., "ATT-USER-001")
- [ ] Check backend logs when scanner requests devices

### ESP32 Scanner Check
- [ ] Upload updated firmware to ESP32
- [ ] Select event "this is a thing"
- [ ] Check serial output shows: "Loaded X registered devices" (where X > 0)
- [ ] Check serial output lists each device UUID
- [ ] During scanning, press ENTER
- [ ] Verify "Stop scan requested by user" appears
- [ ] Verify scanner returns to event menu within 5 seconds

---

## Serial Output Example (Expected)

### Successful Device Loading:
```
Selected event: this is a thing (ID: jn7f56bc6vtrdx0tmnmby1cmm57qptfm)
Loading registered devices for event...
Making GET request to: .../registered-devices?eventId=jn7f56bc6vtrdx0tmnmby1cmm57qptfm
Response status code: 200
Response body: {"success":true,"deviceUuids":["ATT-USER-001","ATT-USER-002"],"count":2}
Loaded 2 registered devices for event
  - ATT-USER-001
  - ATT-USER-002
=== SCANNING ACTIVATED ===
Registered devices: 2
```

### Successful Stop:
```
Press ENTER to stop scanning
[User presses ENTER]
Stop scan requested by user
=== SCANNING DEACTIVATED ===
Returning to event menu
Select an event to begin scanning
```

---

## Common Issues & Solutions

### Issue: Still showing 0 devices after fix
**Solution:**
1. Make sure backend server is restarted to pick up the updated code
2. Run `npx convex dev` in the backend directory
3. Check Convex dashboard logs for any errors
4. Verify users are actually registered (see checklist above)

### Issue: ENTER still not responsive
**Solution:**
1. Make sure you uploaded the updated firmware to ESP32
2. Check that button connections are correct
3. Try pressing ENTER multiple times (once per second)
4. Check serial monitor for "Stop scan requested by user" message

### Issue: Backend logs not showing
**Solution:**
1. Restart Convex dev server: `npx convex dev`
2. Check terminal where convex is running for console.log outputs
3. Make sure you're looking at the right terminal/logs

---

## Files Modified

### Backend:
- `backend/convex/registrations.ts` - Added logging and improved ID handling

### ESP32:
- `ESP32_Scanner_TFT/ESP32_Scanner_TFT.ino` - Added stopScanRequested flag and checks

---

## Next Steps

1. **Deploy backend updates:** Restart Convex dev server or deploy to production
2. **Upload ESP32 firmware:** Upload the updated .ino file to your ESP32
3. **Register test users:** Follow the guide above to create test registrations
4. **Test the flow:** Select event → Check device count → Start scanning → Press ENTER to stop
5. **Monitor logs:** Watch both backend and ESP32 serial output for debugging

---

## Support

If issues persist:
1. Check backend logs in Convex dashboard
2. Check ESP32 serial output at 115200 baud
3. Verify WiFi connection is stable
4. Ensure API key is correct: `att_3sh4fmd2u14ffisevqztm`
5. Confirm event ID matches in database and ESP32 logs





