# ESP32 Scanner Implementation Guide

## System Integration Overview

The ESP32 scanner is part of a complete attendance tracking system that integrates with:

### **System Architecture**
```
Mobile App (BLE UUID) ←→ ESP32 Scanner ←→ Backend API ←→ Admin Dashboard
```

### **Key Integration Points**

#### **1. Mobile App Integration**
- **BLE UUID Generation**: Mobile app generates unique 32-character BLE UUID for each user
- **Event Registration**: Users register for events through mobile app
- **BLE Broadcasting**: App broadcasts UUID when event is active
- **Real-time Updates**: App shows attendance status

#### **2. Backend API Integration**
- **GET /active-events**: Fetches available events from backend
- **POST /attendance**: Records attendance with BLE UUID and event ID
- **API Key Authentication**: Uses scanner-specific API keys
- **JSON Response Handling**: Processes event and attendance data

#### **3. Python Scanner Workflow**
- **Event Selection**: Interactive event selection via web interface
- **BLE Scanning**: Scans for devices with "ATT-" prefix
- **Attendance Recording**: Records attendance via HTTP API
- **Batch Sync**: Syncs records to backend in batches

## ESP32 Scanner Requirements

### **Hardware Requirements**
- **ESP32 Development Board**
- **TFT Display** (ST7735 128x128 or similar)
- **3 Push Buttons** (UP, DOWN, ENTER)
- **2 LEDs** (System status, Scanning indicator)
- **Power Supply** (3.3V or 5V via USB)

### **Pin Assignments**
```cpp
// Buttons
#define BTN_UP 2
#define BTN_ENTER 3
#define BTN_DOWN 4

// LEDs
#define LED_SYSTEM 5
#define LED_SCAN 6

// TFT Display
#define TFT_CS 10
#define TFT_RST 9
#define TFT_DC 8
```

### **Software Requirements**
- **Arduino IDE** with ESP32 board package
- **Adafruit ST7735 Library** (for TFT display)
- **Adafruit GFX Library** (dependency of ST7735)
- **ESP32 BLE Library** (built-in)

## Core Functionality

### **1. System Initialization**
```cpp
void setup() {
  // Initialize TFT display
  tft.initR(INITR_BLACKTAB);
  tft.setRotation(1);
  tft.fillScreen(ST7735_BLACK);
  
  // Initialize buttons and LEDs
  pinMode(BTN_UP, INPUT_PULLUP);
  pinMode(BTN_ENTER, INPUT_PULLUP);
  pinMode(BTN_DOWN, INPUT_PULLUP);
  pinMode(LED_SYSTEM, OUTPUT);
  pinMode(LED_SCAN, OUTPUT);
  
  // Initialize WiFi
  WiFi.begin(WIFI_SSID, WIFI_PASS);
  
  // Initialize BLE
  BLEDevice::init("ESP32-Scanner");
  pBLEScan = BLEDevice::getScan();
  pBLEScan->setAdvertisedDeviceCallbacks(new MyCallbacks());
  
  // Load events from backend
  loadEventsFromBackend();
}
```

### **2. Event Management**
```cpp
// Event structure
struct Event {
  char id[16];
  char name[20];
  bool isActive;
};

// Load events from backend API
bool loadEventsFromBackend() {
  String url = String(BACKEND_URL) + "/active-events";
  
  http.begin(url);
  http.addHeader("Content-Type", "application/json");
  http.addHeader("x-api-key", API_KEY);
  
  int httpCode = http.GET();
  if (httpCode == 200) {
    String response = http.getString();
    // Parse JSON response and populate events array
    return true;
  }
  return false;
}
```

### **3. BLE Scanning**
```cpp
class MyAdvertisedDeviceCallbacks: public BLEAdvertisedDeviceCallbacks {
  void onResult(BLEAdvertisedDevice advertisedDevice) {
    // Look for BLE UUIDs from mobile app
    String name = advertisedDevice.getName().c_str();
    String serviceUuid = "";
    
    if (advertisedDevice.haveServiceUUID()) {
      serviceUuid = advertisedDevice.getServiceUUID().toString();
    }
    
    // Look for 32-character BLE UUID pattern
    String bleUuid = "";
    if (serviceUuid.length() >= 32) {
      bleUuid = serviceUuid;
    } else if (name.length() >= 32) {
      bleUuid = name;
    }
    
    if (bleUuid.length() >= 32) {
      // Store device and record attendance
      recordAttendance(bleUuid, currentEventId);
    }
  }
};
```

### **4. Attendance Recording**
```cpp
bool recordAttendance(const char* bleUuid, const char* eventId) {
  String url = String(BACKEND_URL) + "/attendance";
  
  http.begin(url);
  http.addHeader("Content-Type", "application/json");
  http.addHeader("x-api-key", API_KEY);
  
  // Create JSON payload
  DynamicJsonDocument doc(512);
  doc["bleUuid"] = bleUuid;
  doc["eventId"] = eventId;
  
  String payload;
  serializeJson(doc, payload);
  
  int httpCode = http.POST(payload);
  return httpCode == 200;
}
```

### **5. TFT Display Interface**
```cpp
void drawEventMenu() {
  tft.fillScreen(ST7735_BLACK);
  tft.setTextColor(ST7735_WHITE, ST7735_BLACK);
  tft.setTextSize(1);
  
  tft.setCursor(5, 5);
  tft.println("EVENTS");
  tft.drawLine(5, 15, 155, 15, ST7735_WHITE);
  
  for (int i = 0; i < eventCount; i++) {
    tft.setCursor(5, 25 + i * 15);
    if (i == selectedEvent) {
      tft.setTextColor(ST7735_YELLOW, ST7735_BLACK);
      tft.print("> ");
    } else {
      tft.setTextColor(ST7735_WHITE, ST7735_BLACK);
      tft.print("  ");
    }
    tft.print(i + 1);
    tft.print(". ");
    tft.println(events[i].name);
  }
  
  tft.setTextColor(ST7735_CYAN, ST7735_BLACK);
  tft.setCursor(5, 85);
  tft.println("UP/DOWN: Select");
  tft.setCursor(5, 95);
  tft.println("ENTER: Start");
}
```

## User Interaction Flow

### **1. System Startup**
1. Initialize TFT display
2. Initialize buttons and LEDs
3. Connect to WiFi
4. Initialize BLE scanning
5. Load events from backend
6. Show event selection menu

### **2. Event Selection**
1. User navigates with UP/DOWN buttons
2. Selected event highlighted in yellow
3. Press ENTER to select event
4. System shows event details

### **3. BLE Scanning**
1. Start BLE scanning for devices
2. Scan LED turns on
3. Display shows scanning status
4. Detect mobile app BLE UUIDs
5. Record attendance automatically

### **4. Results Display**
1. Show found devices on TFT
2. Display device count
3. Show RSSI values
4. Press ENTER to stop scanning

## Memory Optimization Strategies

### **1. Library Selection**
- Use only essential libraries
- Avoid heavy HTTP libraries
- Use minimal JSON parsing
- Optimize TFT display code

### **2. Data Structure Optimization**
- Use minimal string sizes
- Limit array sizes
- Avoid complex structs
- Use direct arrays instead of classes

### **3. Code Optimization**
- Remove verbose logging
- Simplify error handling
- Use minimal state management
- Optimize display updates

## Configuration

### **WiFi Settings**
```cpp
#define WIFI_SSID "YourWiFi"
#define WIFI_PASS "YourPassword"
```

### **Backend API Settings**
```cpp
#define BACKEND_URL "https://your-convex-deployment.convex.cloud/http"
#define API_KEY "att_3sh4fmd2u14ffisevqztm"
#define SCANNER_ID "ESP32-Scanner-01"
```

### **Hardware Settings**
```cpp
#define SCAN_DURATION 3000  // 3 seconds
#define MAX_DEVICES 5       // Maximum devices to track
#define MAX_EVENTS 5        // Maximum events to load
```

## Testing and Debugging

### **1. Serial Monitor**
- Use 115200 baud rate
- Monitor system status
- Debug BLE scanning
- Check API responses

### **2. TFT Display**
- Verify button navigation
- Check event selection
- Monitor scanning status
- Display results

### **3. LED Indicators**
- System LED: Shows when ready
- Scan LED: Shows when scanning
- Visual feedback for user

## Integration Testing

### **1. Mobile App Integration**
- Test BLE UUID generation
- Verify event registration
- Check BLE broadcasting
- Test attendance recording

### **2. Backend API Integration**
- Test event loading
- Verify attendance recording
- Check API authentication
- Test error handling

### **3. System Integration**
- Test complete workflow
- Verify data flow
- Check error recovery
- Test multiple events

## Troubleshooting

### **Common Issues**
1. **Memory overflow**: Reduce array sizes, remove unused libraries
2. **BLE not scanning**: Check BLE initialization, verify permissions
3. **WiFi connection**: Check credentials, verify network
4. **TFT display**: Check pin connections, verify library installation
5. **API errors**: Check API key, verify backend URL

### **Debug Steps**
1. Enable serial output
2. Check system status
3. Verify hardware connections
4. Test individual components
5. Check network connectivity

## Production Deployment

### **1. Hardware Setup**
- Install in appropriate enclosure
- Connect all components
- Test power supply
- Verify connections

### **2. Software Configuration**
- Set correct WiFi credentials
- Configure backend API URL
- Set appropriate API key
- Test all functionality

### **3. System Integration**
- Test with mobile app
- Verify backend integration
- Check admin dashboard
- Test complete workflow

This guide provides the complete implementation details for the ESP32 scanner as part of the attendance tracking system.
