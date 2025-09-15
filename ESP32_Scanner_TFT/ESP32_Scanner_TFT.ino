/*
 * ESP32 Attendance Scanner with TFT Display
 * Clean, focused implementation for event-based attendance tracking
 * 
 * Hardware:
 * - TFT Display (ST7735 128x128 RGB)
 * - 3 Push Buttons (UP, DOWN, ENTER) with internal pullup
 * - 2 LEDs (Yellow: Device On, Blue: Scanning)
 * 
 * Process:
 * 1. Boot up and fetch events from backend
 * 2. Display event list for selection
 * 3. User selects event and chooses to begin scan
 * 4. Scanner actively scans for registered devices
 * 5. Records attendance and updates database
 */

#include <Arduino.h>
#include <WiFi.h>
#include <BluetoothSerial.h>
#include <SPIFFS.h>
#include <ArduinoJson.h>
#include <WebServer.h>
#include <ArduinoOTA.h>

// Hardware includes
#include "hardware_config.h"
#include "display_manager.h"
#include "button_manager.h"
#include "led_manager.h"
#include "backend_client.h"
#include "ble_scanner.h"
#include "event_manager.h"

// Global objects
DisplayManager display;
ButtonManager buttons;
LEDManager leds;
BackendClient backend;
BLEScanner bleScanner;
EventManager events;

// System state
enum SystemState {
  STATE_INIT,
  STATE_LOADING_EVENTS,
  STATE_EVENT_SELECTION,
  STATE_EVENT_ACTIVE,
  STATE_SCANNING,
  STATE_ERROR
};

SystemState currentState = STATE_INIT;
unsigned long lastUpdate = 0;
unsigned long lastScan = 0;
String errorMessage = "";
int eventLoadRetries = 0;
const int MAX_EVENT_RETRIES = 5;

// Event data
String selectedEventId = "";
String selectedEventName = "";
bool isScanning = false;

void setup() {
  Serial.begin(115200);
  Serial.println("\n=== ESP32 Attendance Scanner ===");
  Serial.println("Version: 2.0.0");
  
  // Initialize hardware
  if (!initializeHardware()) {
    setError("Hardware initialization failed");
    return;
  }
  
  // Initialize storage
  if (!SPIFFS.begin(true)) {
    setError("Storage initialization failed");
    return;
  }
  
  // Initialize WiFi
  if (!initializeWiFi()) {
    setError("WiFi initialization failed");
    return;
  }
  
  // Initialize backend client
  backend.begin();
  {
    String url = loadConfig("backend_url");
    String key = loadConfig("api_key");
    if (url.length() > 0) {
      backend.setBaseURL(url);
    }
    if (key.length() > 0) {
      backend.setAPIKey(key);
    }
  }
  
  // Initialize BLE scanner
  if (!bleScanner.begin()) {
    setError("BLE scanner initialization failed");
    return;
  }
  
  // Initialize event manager
  events.begin();
  
  // Setup OTA
  setupOTA();
  
  // Start loading events
  currentState = STATE_LOADING_EVENTS;
  display.showLoading("Loading events...");
  
  Serial.println("System initialized successfully");
}

void loop() {
  // Handle OTA updates
  ArduinoOTA.handle();
  
  // Update hardware
  updateHardware();
  
  // Update system state
  updateSystemState();
  
  // Small delay to prevent watchdog reset
  delay(10);
}

bool initializeHardware() {
  // Initialize display
  if (!display.begin()) {
    Serial.println("Failed to initialize display");
    return false;
  }
  
  // Initialize buttons
  if (!buttons.begin()) {
    Serial.println("Failed to initialize buttons");
    return false;
  }
  
  // Initialize LEDs
  if (!leds.begin()) {
    Serial.println("Failed to initialize LEDs");
    return false;
  }
  
  // Show startup screen
  display.showStartup();
  
  return true;
}

bool initializeWiFi() {
  // Load WiFi credentials from storage
  String ssid = loadConfig("wifi_ssid");
  String password = loadConfig("wifi_password");
  
  if (ssid.length() == 0) {
    // No WiFi configured, start AP mode
    return startAPMode();
  }
  
  // Connect to WiFi
  WiFi.begin(ssid.c_str(), password.c_str());
  
  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 20) {
    delay(500);
    attempts++;
    Serial.print(".");
  }
  
  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\nWiFi connected: " + WiFi.localIP().toString());
    return true;
  } else {
    Serial.println("\nWiFi connection failed, starting AP mode");
    return startAPMode();
  }
}

bool startAPMode() {
  WiFi.softAP("ESP32-Scanner", "attendance123");
  Serial.println("AP mode started: ESP32-Scanner");
  return true;
}

void updateHardware() {
  // Update button states
  buttons.update();
  
  // Handle button presses
  if (buttons.isUpClicked()) {
    display.navigateUp();
  }
  
  if (buttons.isDownClicked()) {
    display.navigateDown();
  }
  
  if (buttons.isEnterClicked()) {
    handleEnterPress();
  }
  
  // Update display
  display.update();
  
  // Update LEDs
  leds.update();
}

void updateSystemState() {
  unsigned long now = millis();
  
  // Check WiFi connection status
  if (currentState != STATE_INIT && WiFi.status() != WL_CONNECTED) {
    Serial.println("WiFi disconnected, attempting reconnection...");
    if (initializeWiFi()) {
      Serial.println("WiFi reconnected successfully");
    } else {
      Serial.println("WiFi reconnection failed");
    }
  }
  
  switch (currentState) {
    case STATE_LOADING_EVENTS:
      if (now - lastUpdate >= 2000) { // Check every 2 seconds
        Serial.println("Attempting to load events from backend... (Attempt " + String(eventLoadRetries + 1) + "/" + String(MAX_EVENT_RETRIES) + ")");
        Serial.println("WiFi Status: " + String(WiFi.status() == WL_CONNECTED ? "Connected" : "Disconnected"));
        Serial.println("Backend Connected: " + String(backend.isConnected() ? "Yes" : "No"));
        
        if (loadEventsFromBackend()) {
          Serial.println("Events loaded successfully: " + String(events.getEventCount()) + " events");
          currentState = STATE_EVENT_SELECTION;
          display.showEventList(events.getEventList(), events.getEventCount());
          eventLoadRetries = 0; // Reset retry counter on success
        } else {
          eventLoadRetries++;
          Serial.println("Failed to load events: " + backend.getLastError());
          
          if (eventLoadRetries >= MAX_EVENT_RETRIES) {
            Serial.println("Max retries reached, showing test events");
            setError("Backend unavailable. Using test events.");
            // Force load test events
            events.addTestEvents();
            currentState = STATE_EVENT_SELECTION;
            display.showEventList(events.getEventList(), events.getEventCount());
          } else {
            display.showLoading("Failed to load events. Retrying... (" + String(eventLoadRetries) + "/" + String(MAX_EVENT_RETRIES) + ")");
          }
        }
        lastUpdate = now;
      }
      break;
      
    case STATE_EVENT_SELECTION:
      // Waiting for user input
      break;
      
    case STATE_EVENT_ACTIVE:
      // Event selected, waiting for scan start
      break;
      
    case STATE_SCANNING:
      if (now - lastScan >= 5000) { // Scan every 5 seconds
        performScan();
        lastScan = now;
      }
      break;
      
    case STATE_ERROR:
      // Error state, waiting for reset
      break;
  }
  
  // Update LED states
  updateLEDStates();
}

void handleEnterPress() {
  switch (currentState) {
    case STATE_EVENT_SELECTION:
      if (events.selectEvent(display.getSelectedIndex())) {
        selectedEventId = events.getSelectedEventId();
        selectedEventName = events.getSelectedEventName();
        currentState = STATE_EVENT_ACTIVE;
        display.showEventSelected(selectedEventName);
      }
      break;
      
    case STATE_EVENT_ACTIVE:
      startScanning();
      break;
      
    case STATE_SCANNING:
      stopScanning();
      break;
      
    case STATE_ERROR:
      // Reset system
      currentState = STATE_LOADING_EVENTS;
      display.showLoading("Restarting...");
      break;
  }
}

void startScanning() {
  if (selectedEventId.length() == 0) {
    setError("No event selected");
    return;
  }
  
  isScanning = true;
  currentState = STATE_SCANNING;
  display.showScanning(selectedEventName);
  Serial.println("Started scanning for event: " + selectedEventName);
}

void stopScanning() {
  isScanning = false;
  currentState = STATE_EVENT_ACTIVE;
  display.showEventSelected(selectedEventName);
  Serial.println("Stopped scanning");
}

void performScan() {
  if (!isScanning) return;
  
  Serial.println("Performing BLE scan...");
  
  // Get BLE devices
  std::vector<ScannedDevice> devices = bleScanner.scan();
  
  if (devices.size() > 0) {
    Serial.println("Found " + String(devices.size()) + " devices");
    
    // Process each device
    for (const auto& device : devices) {
      if (isDeviceRegistered(device)) {
        recordAttendance(device);
      }
    }
  }
  
  // Update display with scan results
  display.updateScanResults(devices.size());
}

bool isDeviceRegistered(const ScannedDevice& device) {
  // Check if device is registered for the selected event
  return events.isDeviceRegistered(selectedEventId, device.uuid);
}

void recordAttendance(const ScannedDevice& device) {
  // Create attendance record
  JsonDocument record;
  record["eventId"] = selectedEventId;
  record["bleUuid"] = device.uuid;
  record["deviceName"] = device.name;
  record["rssi"] = device.rssi;
  record["timestamp"] = millis();
  record["scannerId"] = "ESP32-Scanner-01";
  
  // Send to backend
  if (backend.recordAttendance(record)) {
    Serial.println("Recorded attendance for: " + device.uuid);
    display.showAttendanceRecorded(device.name);
  } else {
    Serial.println("Failed to record attendance for: " + device.uuid);
  }
}

bool loadEventsFromBackend() {
  return events.loadFromBackend(backend);
}

void setError(const String& message) {
  errorMessage = message;
  currentState = STATE_ERROR;
  display.showError(message);
  Serial.println("Error: " + message);
}

void updateLEDStates() {
  switch (currentState) {
    case STATE_INIT:
    case STATE_LOADING_EVENTS:
      leds.setSystemState(false, false);
      break;
      
    case STATE_EVENT_SELECTION:
    case STATE_EVENT_ACTIVE:
      leds.setSystemState(true, false);
      break;
      
    case STATE_SCANNING:
      leds.setSystemState(true, true);
      break;
      
    case STATE_ERROR:
      leds.setSystemState(false, false);
      break;
  }
}

void setupOTA() {
  ArduinoOTA.setHostname("esp32-scanner");
  ArduinoOTA.setPassword("attendance123");
  
  ArduinoOTA.onStart([]() {
    Serial.println("OTA Start updating");
  });
  
  ArduinoOTA.onEnd([]() {
    Serial.println("\nOTA End");
  });
  
  ArduinoOTA.onProgress([](unsigned int progress, unsigned int total) {
    Serial.printf("OTA Progress: %u%%\r", (progress / (total / 100)));
  });
  
  ArduinoOTA.onError([](ota_error_t error) {
    Serial.printf("OTA Error[%u]: ", error);
  });
  
  ArduinoOTA.begin();
}

String loadConfig(const String& key) {
  if (!SPIFFS.exists("/config.json")) {
    return "";
  }
  
  File file = SPIFFS.open("/config.json", "r");
  if (!file) {
    return "";
  }
  
  String content = file.readString();
  file.close();
  
  JsonDocument doc;
  deserializeJson(doc, content);
  
  if (doc.containsKey(key)) {
    return doc[key].as<String>();
  }
  
  return "";
}

void saveConfig(const String& key, const String& value) {
  JsonDocument doc;
  
  // Load existing config
  if (SPIFFS.exists("/config.json")) {
    File file = SPIFFS.open("/config.json", "r");
    if (file) {
      String content = file.readString();
      file.close();
      deserializeJson(doc, content);
    }
  }
  
  // Update value
  doc[key] = value;
  
  // Save config
  File file = SPIFFS.open("/config.json", "w");
  if (file) {
    serializeJson(doc, file);
    file.close();
  }
}