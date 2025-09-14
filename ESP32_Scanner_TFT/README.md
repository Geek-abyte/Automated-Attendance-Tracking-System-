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
- **Buttons**: UP (pin 2), ENTER (pin 3), DOWN (pin 4)
- **LEDs**: System (pin 5), Scanning (pin 6)
- **TFT Display**: CS (pin 10), RST (pin 9), DC (pin 8)

## Required Libraries
- Adafruit ST7735 (for TFT display)
- Adafruit GFX (dependency of ST7735)
- ESP32 BLE (built-in)

## Configuration
Update these constants in the code:
```cpp
#define WIFI_SSID "YourWiFi"
#define WIFI_PASS "YourPassword"
#define BACKEND_URL "https://your-convex-deployment.convex.cloud/http"
#define API_KEY "att_3sh4fmd2u14ffisevqztm"
```

## Usage
1. Upload to ESP32
2. Open Serial Monitor (115200 baud)
3. Use buttons to navigate events
4. Press ENTER to start scanning
5. View results on TFT and serial

## Memory Optimization
- Minimal data structures
- Efficient display updates
- Optimized BLE scanning
- No heavy libraries

This implementation should fit within ESP32 memory constraints while providing full functionality.
