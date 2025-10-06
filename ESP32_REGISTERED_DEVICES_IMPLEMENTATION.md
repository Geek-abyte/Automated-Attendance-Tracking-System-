# ESP32 Scanner - Registered Device Verification Implementation

## Overview

The ESP32 scanner now properly verifies that scanned BLE devices are registered for the selected event before recording their attendance. This ensures only authorized participants can check in.

## How It Works

### 1. Event Selection and Activation Flow

When you **select an event** using the UP/DOWN buttons and press ENTER:

```
STATE_EVENT_SELECTION → (immediately) → STATE_SCANNING
```

**Single ENTER press does everything:**
- Selects the event
- Loads registered devices from backend
- Activates the event
- Starts BLE scanning

```cpp
void startScanning() {
  1. Load registered devices from backend
  2. Cache device UUIDs locally
  3. Enter STATE_SCANNING
  4. Begin BLE scanning loop (every 5 seconds)
}
```

### 2. Stopping Scan Flow

When you **press ENTER while scanning**:

```
STATE_SCANNING → STATE_EVENT_SELECTION
```

**Single ENTER press:**
- Stops BLE scanning
- Deactivates the event
- Clears event selection
- Returns to event menu

**Key Steps:**
1. **Fetch Registered Devices** - Makes HTTP GET request to `/registered-devices?eventId={eventId}`
2. **Cache Locally** - Stores list of registered BLE UUIDs in `std::vector<String> registeredDevices`
3. **Fast Lookup** - During scanning, quickly checks if device is in cached list

### 3. Scanning Loop

Every 5 seconds while in `STATE_SCANNING`:

```cpp
void performScan() {
  1. Scan for BLE devices (filter: "ATT-" prefix)
  2. For each device found:
     a. Check if UUID is in registered devices cache
     b. If YES: Record attendance to backend
     c. If NO: Skip device and log it
  3. Update display with scan results
}
```

### 4. Device Registration Check

```cpp
bool EventManager::isDeviceRegistered(const String& eventId, const String& bleUuid) {
  // Check cached list of registered devices
  for (const auto& uuid : registeredDevices) {
    if (uuid == bleUuid) {
      return true;  // Device is registered
    }
  }
  return false;  // Device not registered
}
```

## Backend Integration

### Endpoints Used

1. **GET `/events`** - Fetch all events on startup
2. **GET `/registered-devices?eventId={id}`** - Fetch registered device UUIDs for selected event
3. **POST `/attendance`** - Record attendance for verified devices

### Backend Response Format

`/registered-devices` returns:
```json
{
  "success": true,
  "deviceUuids": [
    "ATT-USER-001",
    "ATT-USER-002",
    "ATT-USER-003"
  ],
  "count": 3
}
```

## Code Changes

### 1. EventManager (event_manager.h)

**Added:**
- `std::vector<String> registeredDevices` - Cache of registered device UUIDs
- `bool devicesLoaded` - Flag indicating if devices are loaded
- `bool loadRegisteredDevices(BackendClient& backend)` - Fetch devices from backend
- `int getRegisteredDeviceCount()` - Get number of registered devices
- `void clearRegisteredDevices()` - Clear device cache

### 2. EventManager (event_manager.cpp)

**Updated:**
- `isDeviceRegistered()` - Now checks cached list instead of just accepting "ATT-" prefix
- `selectEvent()` - Clears previous registered devices when new event selected
- Constructor - Initializes `devicesLoaded = false`

**Added:**
- `loadRegisteredDevices()` - Fetches and caches registered devices from backend
- `clearRegisteredDevices()` - Clears device cache

### 3. Main Scanner (ESP32_Scanner_TFT.ino)

**Updated:**
- `handleEnterPress()` - Now directly calls `startScanning()` from event selection (no intermediate state)
- `startScanning()` - Loads registered devices before entering scanning state
- `stopScanning()` - Now returns to event menu and clears event selection
- Shows warning if no devices are registered for the event
- Displays number of registered devices in serial output

### 4. BackendClient (backend_client.h)

**Updated:**
- Made `makeRequest()` public so EventManager can use it directly

## User Experience

### On the ESP32 Display:

1. **Event Menu** - Navigate with UP/DOWN buttons
2. **Press ENTER** - Selects event and immediately activates scanning
3. **"Loading registered devices..."** - Brief loading screen (1-2 seconds)
4. **"Scanning..."** - Actively scanning for registered devices
5. **Device Found** - Shows "Attendance Recorded" when registered device detected
6. **Press ENTER Again** - Stops scanning, returns to event menu

### Serial Monitor Output:

```
Selected event: Team Meeting (ID: abc123)
Loading registered devices for event...
Loaded 5 registered devices for event
  - ATT-USER-001
  - ATT-USER-002
  - ATT-USER-003
  - ATT-USER-004
  - ATT-USER-005
=== SCANNING ACTIVATED ===
Event: Team Meeting
Event ID: abc123
Registered devices: 5
Looking for devices with 'ATT-' prefix
Press ENTER to stop scanning

Performing BLE scan for event: Team Meeting
Found 3 BLE devices
Checking device: ATT-USER-001 (UUID: ATT-USER-001)
Device is registered for this event!
Recorded attendance for: ATT-USER-001
Checking device: ATT-RANDOM-999 (UUID: ATT-RANDOM-999)
Device not registered for this event
Registered devices found: 1/3
```

## Benefits

### 1. **Security**
- Only registered participants can check in
- Prevents unauthorized attendance recording
- Event-specific registration validation

### 2. **Performance**
- Device list fetched once per event
- Fast local lookup during scanning
- No network request per device scan

### 3. **Reliability**
- Clear error handling if backend unreachable
- Warning shown if no devices registered
- Caching prevents repeated network failures

### 4. **User Feedback**
- Shows number of registered devices
- Lists all registered UUIDs in serial output
- Clear distinction between registered/unregistered devices

## Error Handling

### No Backend Connection
```
Failed to load registered devices
Error: WiFi not connected
→ Returns to EVENT_ACTIVE state
```

### No Devices Registered
```
Warning: No registered devices for this event
→ Shows warning for 2 seconds
→ Continues to scanning (optional bypass)
```

### Invalid Event ID
```
Failed to load registered devices: Event not found
→ Returns to EVENT_ACTIVE state
```

## Testing Checklist

- [ ] Select event and verify device list loads
- [ ] Check serial output shows all registered devices
- [ ] Verify only registered devices record attendance
- [ ] Confirm unregistered devices are skipped
- [ ] Test with empty registration list
- [ ] Test backend connection failure handling
- [ ] Verify multiple events maintain separate device lists
- [ ] Check device list clears when changing events

## Future Enhancements

1. **Auto-refresh** - Periodically reload registered devices during long events
2. **Offline cache** - Store device lists in SPIFFS for offline operation
3. **Registration window** - Only check devices registered within time window
4. **Blocklist** - Support for explicitly blocked devices
5. **Dynamic updates** - WebSocket to receive registration updates in real-time

## Related Files

- `ESP32_Scanner_TFT/event_manager.h` - Header with new device caching
- `ESP32_Scanner_TFT/event_manager.cpp` - Implementation of device verification
- `ESP32_Scanner_TFT/ESP32_Scanner_TFT.ino` - Main scanner loop
- `ESP32_Scanner_TFT/backend_client.h` - HTTP client interface
- `backend/convex/http.ts` - Backend `/registered-devices` endpoint
- `backend/convex/registrations.ts` - Registration query logic

## API Documentation

See `ESP32_Scanner_TFT/docs/API_REFERENCE.md` for full backend API documentation.

