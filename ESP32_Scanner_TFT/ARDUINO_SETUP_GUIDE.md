# ESP32 Scanner with TFT Display - Arduino IDE Setup Guide

## Hardware Configuration

### TFT Display (ST7735 128x128 RGB)
```
ESP32 Pin    TFT Pin    Description
---------    -------    -----------
GND          GND(1)     Ground
3.3V         VCC(2)     3.3V Power
GPIO18       SCK(3)     SPI Clock
GPIO23       SDA(4)     SPI MOSI
GPIO22       RES(5)     Reset
GPIO21       DC(6)      Data/Command
GPIO5        CS(7)      Chip Select
3.3V         BL(8)      Backlight
```

### Push Buttons (with internal pullup)
```
ESP32 Pin    Button     Description
---------    -------    -----------
GPIO35       UP         Navigate up
GPIO32       ENTER      Select/Enter
GPIO33       DOWN       Navigate down
```

### LEDs
```
ESP32 Pin    LED        Description
---------    ---        -----------
GPIO34       YELLOW     Device status (on/standby)
GPIO39       BLUE       Active scanning indicator
```

## Arduino IDE Setup

### 1. Install Arduino IDE
- Download from: https://www.arduino.cc/en/software
- Install the latest version

### 2. Install ESP32 Board Package
1. Open Arduino IDE
2. Go to File → Preferences
3. Add this URL to "Additional Boards Manager URLs":
   ```
   https://raw.githubusercontent.com/espressif/arduino-esp32/gh-pages/package_esp32_index.json
   ```
4. Go to Tools → Board → Boards Manager
5. Search for "esp32" and install "ESP32 by Espressif Systems"

### 3. Install Required Libraries
Install these libraries via Tools → Manage Libraries:

1. **ArduinoJson** by Benoit Blanchon (v6.21.3+)
2. **Adafruit ST7735 and ST7789 Library** (v1.10.0+)
3. **Adafruit GFX Library** (v1.11.5+)
4. **ESPAsyncWebServer** by me-no-dev (v1.2.3+) - Optional
5. **AsyncTCP** by me-no-dev (v1.1.1+) - Optional

### 4. Configure Arduino IDE Settings
1. Select Board: **ESP32 Dev Module**
2. Select Port: Your ESP32's serial port (e.g., `/dev/tty.usbserial-*`)
3. Set Upload Speed: **921600**
4. Set CPU Frequency: **240MHz (WiFi/BT)**
5. Set Flash Frequency: **80MHz**
6. Set Flash Mode: **DIO**
7. Set Flash Size: **4MB (32Mb)**
8. Set Partition Scheme: **Default 4MB with spiffs (1.2MB APP/1.5MB SPIFFS)**
9. Set Core Debug Level: **Info**

## Uploading the Code

### 1. Prepare the Files
1. Create a new Arduino sketch
2. Copy the main code from `ESP32_Scanner_TFT.ino`
3. Copy all the header files:
   - `hardware_config.h`
   - `display_manager.h`
   - `button_manager.h`
   - `led_manager.h`
4. Copy all the implementation files:
   - `display_manager.cpp`
   - `button_manager.cpp`
   - `led_manager.cpp`

### 2. Upload Process
1. Connect ESP32 via USB
2. Put ESP32 in boot mode (if needed):
   - Hold BOOT button
   - Press and release EN/RESET button
   - Release BOOT button
3. Click Upload button in Arduino IDE
4. Wait for upload to complete

### 3. Monitor Serial Output
1. Open Serial Monitor (Tools → Serial Monitor)
2. Set baud rate to **115200**
3. Press EN/RESET button on ESP32 to restart

## Usage

### Navigation
- **UP Button (GPIO35)**: Navigate up in menus
- **DOWN Button (GPIO33)**: Navigate down in menus
- **ENTER Button (GPIO32)**: Select/Enter menu items

### LED Indicators
- **Yellow LED (GPIO34)**: 
  - Solid ON: Device ready and connected
  - Blinking: WiFi connecting or syncing
  - OFF: Device off or error
- **Blue LED (GPIO39)**:
  - Blinking: Actively scanning for BLE devices
  - OFF: Not scanning

### Menu System
1. **Main Menu**: Events, Settings, Status, Scan
2. **Events Menu**: Select event to scan for
3. **Settings Menu**: Configure WiFi, Scanner ID, etc.
4. **Status Menu**: View system information
5. **Scanning Screen**: Shows active scanning with device count

## Troubleshooting

### Upload Issues
- Try different USB cable
- Check COM port selection
- Put ESP32 in boot mode manually
- Reduce upload speed to 115200
- Check USB drivers (CP210x or CH34x)

### Display Issues
- Check wiring connections
- Verify 3.3V power supply
- Try different SPI pins if needed
- Check display initialization in code

### Button Issues
- Buttons use internal pullup (default HIGH)
- Pressing button = LOW state
- Check for loose connections

### WiFi Issues
- ESP32 will create AP mode if can't connect
- SSID: "ESP32-Scanner", Password: "attendance123"
- Connect to AP and configure WiFi via web interface

## Configuration

The scanner can be configured via:
1. **Web Interface**: Connect to ESP32's AP and visit http://192.168.4.1
2. **Serial Commands**: Send commands via Serial Monitor
3. **Configuration File**: Edit `config.json` in SPIFFS

## API Integration

The scanner communicates with the backend system via HTTP API:
- **Endpoint**: Configurable (default: http://127.0.0.1:3210/http)
- **Authentication**: API key based
- **Data Format**: JSON
- **Sync Interval**: 1 minute (configurable)

## Support

For issues or questions:
1. Check Serial Monitor output for error messages
2. Verify all connections and power supply
3. Test with minimal code first
4. Check library versions and compatibility
