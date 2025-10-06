# ESP32 Scanner - Updated Flow Diagram

## Simple Flow (New Behavior)

```
┌─────────────────────────────────────────────────────────────┐
│                     SYSTEM STARTUP                          │
├─────────────────────────────────────────────────────────────┤
│ 1. Initialize Hardware (Display, Buttons, LEDs, BLE)       │
│ 2. Connect to WiFi                                          │
│ 3. Load Events from Backend                                 │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│                   EVENT SELECTION MENU                      │
├─────────────────────────────────────────────────────────────┤
│ Display: List of Events                                     │
│ Actions:                                                    │
│   - UP/DOWN buttons: Navigate through events               │
│   - ENTER button: Select event & START SCANNING            │
└────────────────────┬────────────────────────────────────────┘
                     │
                     │ Press ENTER
                     ▼
┌─────────────────────────────────────────────────────────────┐
│            LOADING REGISTERED DEVICES (1-2 sec)             │
├─────────────────────────────────────────────────────────────┤
│ Display: "Loading registered devices..."                   │
│ Backend: GET /registered-devices?eventId=xxx               │
│ Cache: Store device UUIDs in memory                        │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│                  ACTIVE SCANNING MODE                       │
├─────────────────────────────────────────────────────────────┤
│ Display: "Scanning... [Event Name]"                        │
│ LED: Green (ready) + Blue (scanning)                       │
│                                                             │
│ Every 5 seconds:                                            │
│   1. Scan for BLE devices (ATT-* prefix)                   │
│   2. Check each device against registered list             │
│   3. If registered → Record attendance to backend          │
│   4. Update display with results                           │
│                                                             │
│ Actions:                                                    │
│   - ENTER button: STOP SCANNING & return to menu           │
└────────────────────┬────────────────────────────────────────┘
                     │
                     │ Press ENTER
                     ▼
┌─────────────────────────────────────────────────────────────┐
│              STOP & RETURN TO EVENT MENU                    │
├─────────────────────────────────────────────────────────────┤
│ 1. Stop BLE scanning                                        │
│ 2. Clear event selection                                    │
│ 3. Clear registered devices cache                          │
│ 4. Return to EVENT SELECTION MENU                          │
└─────────────────────────────────────────────────────────────┘
```

## State Diagram

```
                    ┌──────────────┐
                    │    INIT      │
                    └──────┬───────┘
                           │
                    ┌──────▼────────┐
                    │ WiFi Connect  │
                    └──────┬────────┘
                           │
                    ┌──────▼────────┐
                    │ Load Events   │
                    └──────┬────────┘
                           │
                    ┌──────▼────────────┐
          ┌─────────┤ EVENT SELECTION   │◄───────┐
          │         └───────────────────┘        │
          │                                      │
    Press ENTER                            Press ENTER
    (on event)                            (while scanning)
          │                                      │
          │         ┌───────────────┐            │
          └────────►│ Load Devices  │            │
                    └──────┬────────┘            │
                           │                     │
                    ┌──────▼────────┐            │
                    │   SCANNING    │────────────┘
                    └───────────────┘
```

## Button Controls

### In Event Selection Menu:
- **UP Button**: Navigate up in event list
- **DOWN Button**: Navigate down in event list
- **ENTER Button**: Select highlighted event **→ Activate & Start Scanning**

### While Scanning:
- **UP Button**: *(Not used during scanning)*
- **DOWN Button**: *(Not used during scanning)*
- **ENTER Button**: **Stop Scanning & Return to Event Menu**

## Serial Monitor Example

```
=== ESP32 Attendance Scanner ===
Version: 3.0.0
System initialized successfully

WiFi connected: 192.168.1.100
Loading events from backend...
Loaded 3 events from backend

[User navigates to "Team Meeting" and presses ENTER]

Selected event: Team Meeting (ID: k17abc123)
Loading registered devices for event...
Loaded 5 registered devices for event
  - ATT-USER-001
  - ATT-USER-002
  - ATT-USER-003
  - ATT-USER-004
  - ATT-USER-005
=== SCANNING ACTIVATED ===
Event: Team Meeting
Event ID: k17abc123
Registered devices: 5
Looking for devices with 'ATT-' prefix
Press ENTER to stop scanning

Performing BLE scan for event: Team Meeting
Found 2 BLE devices
Checking device: ATT-USER-001 (UUID: ATT-USER-001)
Device is registered for this event!
Recorded attendance for: ATT-USER-001
Checking device: ATT-STRANGER-999 (UUID: ATT-STRANGER-999)
Device not registered for this event
Registered devices found: 1/2

[User presses ENTER to stop]

=== SCANNING DEACTIVATED ===
Returning to event menu
Select an event to begin scanning

[Back to event selection menu]
```

## LED Indicators

| State | Green LED | Blue LED | Meaning |
|-------|-----------|----------|---------|
| Init/Connecting | OFF | OFF | System starting up |
| Event Selection | ON | OFF | Ready to scan |
| Scanning | ON | BLINKING | Actively scanning for devices |
| Error | OFF | OFF | System error occurred |

## Key Benefits of This Flow

✅ **Faster Operation**: One button press to start scanning (was 2 before)  
✅ **Cleaner UX**: No intermediate "Event Active" state  
✅ **Clear Exit**: ENTER while scanning returns to menu (not just pause)  
✅ **Event Isolation**: Each scan session is independent  
✅ **Device Verification**: Only registered devices are processed  

## Comparison: Old vs New

### OLD Flow (3 states, 2 ENTER presses):
```
Event Selection → [ENTER] → Event Active → [ENTER] → Scanning
                                            ↓
Scanning → [ENTER] → Event Active (paused) → [ENTER] → Scanning
```

### NEW Flow (2 states, 1 ENTER press):
```
Event Selection → [ENTER] → Scanning
                             ↓
Scanning → [ENTER] → Event Selection
```

**Result**: Simpler, faster, more intuitive!





