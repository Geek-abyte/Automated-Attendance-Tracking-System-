# ESP32 Attendance Scanner with TFT Display

A clean, focused ESP32-based attendance tracking system with TFT display, push buttons, and LED indicators.

## 🎯 Features

- **Event-Based Scanning**: Select events from backend and scan for registered devices
- **TFT Display Interface**: 128x128 ST7735 RGB display with intuitive navigation
- **Push Button Control**: UP/DOWN navigation and ENTER selection with internal pullup
- **LED Status Indicators**: Yellow (device on) and Blue (scanning) LEDs
- **BLE Scanning**: Automatic Bluetooth device detection with filtering
- **Backend Integration**: Real-time event loading and attendance recording
- **Clean Architecture**: Modular, maintainable code structure

## 🔌 Hardware Requirements

### ESP32 Development Board
- ESP32 with WiFi and Bluetooth capabilities
- USB cable for programming

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
GPIO34       YELLOW     Device on/standby indicator
GPIO39       BLUE       Active scanning indicator
```

## 📚 Required Libraries

Install these libraries in Arduino IDE:

1. **ArduinoJson** by Benoit Blanchon (v6.21.3+)
2. **Adafruit ST7735 and ST7789 Library** (v1.10.0+)
3. **Adafruit GFX Library** (v1.11.5+)

## 🚀 Quick Start

### 1. Install Arduino IDE
- Download from: https://www.arduino.cc/en/software
- Install ESP32 board package (see ARDUINO_SETUP_GUIDE.md)

### 2. Install Libraries
- Open Arduino IDE
- Go to Tools → Manage Libraries
- Install the required libraries listed above

### 3. Upload Code
1. Open `ESP32_Scanner_TFT.ino` in Arduino IDE
2. Select Board: **ESP32 Dev Module**
3. Select Port: Your ESP32's serial port
4. Click Upload

### 4. Configure WiFi
1. ESP32 will create hotspot: `ESP32-Scanner`
2. Connect to hotspot (password: `attendance123`)
3. Open browser to `http://192.168.4.1`
4. Configure your WiFi credentials

## 🎮 Usage

### Process Flow
1. **Boot Up**: System initializes and loads events from backend
2. **Event Selection**: Use UP/DOWN buttons to navigate event list
3. **Select Event**: Press ENTER to select an event
4. **Start Scanning**: Press ENTER again to begin scanning
5. **Active Scanning**: System scans for registered devices and records attendance
6. **Stop Scanning**: Press ENTER to stop scanning

### Navigation
- **UP Button**: Navigate up in event list
- **DOWN Button**: Navigate down in event list
- **ENTER Button**: Select event or start/stop scanning

### LED Indicators
- **Yellow LED**: 
  - Solid ON: Device ready and event selected
  - OFF: Device off or no event selected
- **Blue LED**:
  - Blinking: Actively scanning for BLE devices
  - OFF: Not scanning

## ⚙️ Configuration

### Backend Configuration
- **Backend URL**: `https://compassionate-yak-763.convex.cloud`
- **API Key**: `att_3sh4fmd2u14ffisevqztm`
- **Scanner ID**: `ESP32-Scanner-01`

### BLE Configuration
- **UUID Filter**: `ATT-` (only scans devices with this prefix)
- **RSSI Threshold**: -80 dBm
- **Scan Duration**: 3 seconds
- **Scan Interval**: 5 seconds

## 📁 File Structure

```
scanner-esp32/
├── ESP32_Scanner_TFT.ino          # Main Arduino sketch
├── hardware_config.h              # Hardware pin definitions
├── display_manager.h/.cpp         # TFT display interface
├── button_manager.h/.cpp          # Push button handling
├── led_manager.h/.cpp             # LED status indicators
├── backend_client.h/.cpp          # Backend API integration
├── ble_scanner.h/.cpp             # BLE scanning functionality
├── event_manager.h/.cpp           # Event management
├── config.json                    # Configuration file
├── libraries.txt                  # Required libraries list
├── ARDUINO_SETUP_GUIDE.md         # Detailed setup instructions
├── CONFIGURATION_SUMMARY.md       # Configuration overview
├── OPEN_WIFI_GUIDE.md             # Open WiFi setup guide
└── docs/
    └── API_REFERENCE.md           # Backend API documentation
```

## 🔧 Troubleshooting

### Upload Issues
- Try different USB cable
- Check COM port selection
- Put ESP32 in boot mode manually
- Reduce upload speed to 115200

### Display Issues
- Check wiring connections
- Verify 3.3V power supply
- Check display initialization in code

### Button Issues
- Buttons use internal pullup (default HIGH)
- Pressing button = LOW state
- Check for loose connections

### WiFi Issues
- ESP32 will create AP mode if WiFi fails
- Connect to AP and configure WiFi via web interface
- For open networks, leave password field empty

### BLE Scanning Issues
- Ensure mobile app is broadcasting BLE UUID
- Check UUID starts with "ATT-" prefix
- Verify device is within range (RSSI > -80 dBm)

## 📊 Monitoring

### Serial Monitor
- Open at 115200 baud
- Shows system status, WiFi connection, BLE scan results
- Displays error messages and debug information

### Display States
- **Startup**: System initialization
- **Loading**: Fetching events from backend
- **Event List**: Available events for selection
- **Event Selected**: Event chosen, ready to scan
- **Scanning**: Active BLE scanning with results
- **Error**: System error with retry option

## 🎯 Next Steps

1. **Upload the code** to your ESP32
2. **Configure WiFi** via web interface
3. **Test event loading** from backend
4. **Select an event** via TFT menu
5. **Test with mobile app** broadcasting BLE UUID
6. **Monitor attendance** in backend dashboard

## 📖 Additional Documentation

- **ARDUINO_SETUP_GUIDE.md**: Detailed Arduino IDE setup
- **CONFIGURATION_SUMMARY.md**: Complete configuration overview
- **OPEN_WIFI_GUIDE.md**: Open WiFi network setup
- **docs/API_REFERENCE.md**: Backend API documentation

## 🆘 Support

For issues or questions:
1. Check Serial Monitor output for error messages
2. Verify all connections and power supply
3. Test with minimal code first
4. Check library versions and compatibility

The system is now ready for immediate use with a clean, focused architecture!