# ESP32 Attendance Scanner - Clean Implementation

## Overview
A clean, memory-optimized ESP32 scanner that integrates with the complete attendance tracking system.

## Features
- **TFT Display**: Interactive event selection and scanning status
- **3 Buttons**: UP, DOWN, ENTER navigation
- **2 LEDs**: System status and scanning indicators
- **BLE Scanning**: Detects mobile app BLE UUIDs
- **System Integration**: Works with backend API and mobile app

## Hardware Setup

### Button Wiring (Simple Push Buttons - No External Pull-ups Needed)
The ESP32 uses internal pull-up resistors, so simple push buttons work perfectly:

**Button Connections:**
- **UP Button**: One terminal to GPIO 35, other terminal to GND
- **ENTER Button**: One terminal to GPIO 32, other terminal to GND  
- **DOWN Button**: One terminal to GPIO 33, other terminal to GND

**Important:** No external pull-up resistors needed! The ESP32's internal pull-ups handle this.

### LED Connections
- **System LED (Yellow)**: GPIO 34 to LED anode, LED cathode to GND (with current limiting resistor)
- **Scanning LED (Blue)**: GPIO 39 to LED anode, LED cathode to GND (with current limiting resistor)

### TFT Display (ST7735 128x128)
- **CS (Chip Select)**: GPIO 5
- **RST (Reset)**: GPIO 22
- **DC (Data/Command)**: GPIO 21
- **MOSI (SDA)**: GPIO 23
- **SCLK (Clock)**: GPIO 18
- **VCC**: 3.3V
- **GND**: GND

## Required Libraries
- Adafruit ST7735 (for TFT display)
- Adafruit GFX (dependency of ST7735)
- ArduinoJson (for parsing backend responses) - Install via Library Manager
- HTTPClient (built-in with ESP32)
- ESP32 BLE (built-in)

### Installing ArduinoJson
1. Open Arduino IDE
2. Go to Tools → Manage Libraries
3. Search for "ArduinoJson"
4. Install the library by Benoit Blanchon

## Configuration
Update these constants in the code:
```cpp
const char* backendUrl = "https://your-convex-deployment.convex.cloud/http";
const char* apiKey = "att_3sh4fmd2u14ffisevqztm";
const char* wifiSSID = "YourWiFi";
const char* wifiPassword = "YourPassword";
```

**Important:** Replace `your-convex-deployment` with your actual Convex deployment URL.

## Backend Integration
The ESP32 now fetches events from your Convex backend:

1. **Events API**: Fetches all events from `/events` endpoint
2. **Authentication**: Uses API key for secure access
3. **Fallback**: Uses local events if backend is unavailable
4. **Real-time**: Events are loaded on startup and can be refreshed

### Backend Requirements
- Convex deployment with events API
- Valid API key configured
- WiFi connection to access backend

## Usage
1. Upload to ESP32
2. Open Serial Monitor (115200 baud)
3. Use buttons to navigate events
4. Press ENTER to start scanning
5. View results on TFT and serial

## Button Troubleshooting

### If Buttons Don't Work:
1. **Check Wiring**: Ensure one terminal goes to the GPIO pin, other to GND
2. **No Pull-up Resistors**: Don't add external pull-ups - the ESP32 has internal ones
3. **Test Mode**: The code includes a button test on startup - watch the Serial Monitor
4. **Debug Mode**: Uncomment the debug lines in `updateButtons()` to see button states

### Button Test Results:
When you power on the ESP32, it will run a 5-second button test:
- Press each button during startup
- Blue LED will flash when a button is detected
- Serial Monitor will show test results
- All buttons should show "WORKING" if wired correctly

### Common Issues:
- **"NOT DETECTED"**: Check wiring - button not connected properly
- **False triggers**: Check for loose connections or short circuits
- **No response**: Verify GPIO pin numbers match your wiring

## Memory Optimization
- Minimal data structures
- Efficient display updates
- Optimized BLE scanning
- No heavy libraries

This implementation should fit within ESP32 memory constraints while providing full functionality.
