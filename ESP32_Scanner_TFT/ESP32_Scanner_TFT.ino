/*
 * ESP32 Attendance Scanner - Clean Implementation
 * 
 * Flow:
 * 1. Initialize hardware (display, buttons, LEDs, BLE scanner)
 * 2. Connect to WiFi
 * 3. Fetch events from backend
 * 4. Show event selection menu
 * 5. User selects event → Immediately activates event and starts scanning
 * 6. Scan for registered devices using BLE
 * 7. Record attendance for any registered devices found
 * 8. Press ENTER while scanning → Stops scan, deactivates event, returns to menu
 * 
 * Bluetooth Support:
 * - BLE: Works with mobile app BLE advertising
 */

#include <Arduino.h>
#include <WiFi.h>
#include <SPI.h>
#include <ArduinoJson.h>
#include <time.h>
#include <HTTPClient.h>

// Hardware includes
#include "hardware_config.h"
#include "display_manager.h"
#include "button_manager.h"
#include "led_manager.h"
#include "backend_client.h"
#include "ble_scanner.h"
#include "event_manager.h"

// Configuration
const char* WIFI_SSID = "scanner-wifi";
const char* WIFI_PASSWORD = "";
const char* BACKEND_URL = "https://beaming-loris-569.convex.cloud/http";
const char* API_KEY = "att_3sh4fmd2u14ffisevqztm";

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
  STATE_WIFI_CONNECTING,
  STATE_WIFI_CONNECTED,
  STATE_LOADING_EVENTS,
  STATE_EVENT_SELECTION,
  STATE_EVENT_ACTIVE,
  STATE_SCANNING,
  STATE_ERROR
};

SystemState currentState = STATE_INIT;
String errorMessage = "";
String selectedEventId = "";
String selectedEventName = "";
int eventLoadRetries = 0;
const int MAX_EVENT_RETRIES = 3;
bool stopScanRequested = false;

void setup() {
  Serial.begin(115200);
  Serial.println("\n=== ESP32 Attendance Scanner ===");
  Serial.println("Version: 3.0.0");
  
  // Initialize hardware
  if (!initializeHardware()) {
    setError("Hardware initialization failed");
    return;
  }
  
  // Start the main flow
  currentState = STATE_WIFI_CONNECTING;
  display.showWiFiConnecting(WIFI_SSID);
  
  Serial.println("System initialized successfully");
}

void loop() {
  // Check WiFi connection periodically
  static unsigned long lastWiFiCheck = 0;
  if (millis() - lastWiFiCheck > 5000) { // Check every 5 seconds
    if (WiFi.status() != WL_CONNECTED && currentState != STATE_WIFI_CONNECTING) {
      Serial.println("⚠️ WiFi disconnected! Attempting to reconnect...");
      currentState = STATE_WIFI_CONNECTING;
      display.showLoading("WiFi reconnecting...");
    }
    lastWiFiCheck = millis();
  }
  
  // Update hardware
  updateHardware();
  
  // Update system state
  updateSystemState();
  
  // Small delay
  delay(10);
}

bool initializeHardware() {
  Serial.println("Initializing hardware...");
  
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
  
  // Initialize backend
  backend.begin();
  backend.setBaseURL(BACKEND_URL);
  backend.setAPIKey(API_KEY);
  
  // Initialize BLE scanner
  if (!bleScanner.begin()) {
    Serial.println("Failed to initialize BLE scanner");
    return false;
  }
  
  // Initialize event manager
  events.begin();
  
  Serial.println("Hardware initialization complete");
  return true;
}

void updateHardware() {
  // Update button states
  buttons.update();
  
  // Handle button presses
  if (buttons.pollUpEvent()) {
    display.navigateUp();
  }
  
  if (buttons.pollDownEvent()) {
    display.navigateDown();
  }
  
  // ENTER handling: edge-triggered + optional long-press in scanning
  if (currentState == STATE_SCANNING) {
    static bool stopTriggered = false;
    // Use edge event to start measuring hold, reduce accidental repeats
    if (buttons.pollEnterEvent()) {
      // Edge occurred; held logic continues below
    }
    if (!stopTriggered && buttons.isEnterHeld(600)) {
      stopTriggered = true;
      Serial.println("Long-press ENTER detected (>=0.6s). Stopping scan.");
      handleEnterPress();
    }
    if (!buttons.isEnterPressed()) {
      stopTriggered = false; // reset when released
    }
  } else if (buttons.pollEnterEvent()) {
    handleEnterPress();
  }
  
  // Update display
  display.update();
  
  // Update LEDs
  leds.update();
}

void updateSystemState() {
  switch (currentState) {
    case STATE_WIFI_CONNECTING:
      if (connectToWiFi()) {
        currentState = STATE_WIFI_CONNECTED;
        display.showWiFiConnected(WiFi.localIP().toString());
        delay(2000);
        currentState = STATE_LOADING_EVENTS;
        display.showLoading("Loading events...");
      }
      break;
      
    case STATE_LOADING_EVENTS:
      if (loadEvents()) {
        currentState = STATE_EVENT_SELECTION;
        display.showEventList(events.getEventList(), events.getEventCount());
      } else {
        eventLoadRetries++;
        if (eventLoadRetries >= MAX_EVENT_RETRIES) {
          setError("Failed to load events after " + String(MAX_EVENT_RETRIES) + " attempts");
        } else {
          display.showLoading("Retrying... (" + String(eventLoadRetries) + "/" + String(MAX_EVENT_RETRIES) + ")");
          delay(2000);
        }
      }
      break;
      
    case STATE_EVENT_SELECTION:
      // Waiting for user input
      break;
      
    case STATE_EVENT_ACTIVE:
      // Event selected, waiting for scan start
      break;
      
    case STATE_SCANNING:
      // Perform BLE scan
      performScan();
      break;
      
    case STATE_ERROR:
      // Error state, waiting for reset
      break;
  }
  
  // Update LED states
  updateLEDStates();
}

// Get current Unix timestamp in milliseconds (requires NTP sync)
unsigned long long getCurrentTimestamp() {
  time_t now;
  time(&now);
  
  if (now < 1000000000) {
    // Time not synced yet - this is bad!
    Serial.println("WARNING: Time not synced, using millis() - attendance may fail!");
    return millis(); // Fallback but will cause backend errors
  }
  
  // Convert seconds to milliseconds and return
  return ((unsigned long long)now) * 1000ULL;
}

bool connectToWiFi() {
  static unsigned long lastAttempt = 0;
  static int attempts = 0;
  
  // Try to connect every 2 seconds
  if (millis() - lastAttempt < 2000) {
    return false;
  }
  
  lastAttempt = millis();
  attempts++;
  
  Serial.println("WiFi attempt " + String(attempts) + ": Connecting to " + String(WIFI_SSID));
  
  WiFi.mode(WIFI_STA);
  WiFi.disconnect(true, true);
  delay(100);
  
  if (strlen(WIFI_PASSWORD) == 0) {
    WiFi.begin(WIFI_SSID);
  } else {
    WiFi.begin(WIFI_SSID, WIFI_PASSWORD);
  }
  
  // Wait for connection
  int waitAttempts = 0;
  while (WiFi.status() != WL_CONNECTED && waitAttempts < 20) {
    delay(500);
    waitAttempts++;
    Serial.print(".");
  }
  
  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\nWiFi connected: " + WiFi.localIP().toString());
    
    // Configure time sync with NTP
    Serial.println("Syncing time with NTP...");
    configTime(0, 0, "pool.ntp.org", "time.nist.gov");
    
    // Wait up to 5 seconds for time to be set
    int timeoutCount = 0;
    time_t now = time(nullptr);
    while (now < 1000000000 && timeoutCount < 50) {
      delay(100);
      now = time(nullptr);
      timeoutCount++;
    }
    
    if (now > 1000000000) {
      Serial.println("Time synced: " + String(ctime(&now)));
    } else {
      Serial.println("Warning: Time sync failed, timestamps may be incorrect");
    }
    
    return true;
  } else {
    Serial.println("\nWiFi connection failed");
    if (attempts >= 5) {
      Serial.println("Max WiFi attempts reached, starting AP mode");
      WiFi.softAP("ESP32-Scanner", "attendance123");
      return true; // AP mode counts as "connected" for our purposes
    }
    return false;
  }
}

bool loadEvents() {
  Serial.println("Loading events from backend...");
  
  if (!backend.isConnected()) {
    Serial.println("Backend not connected");
    return false;
  }
  
  // Test backend connection first
  Serial.println("Testing backend health...");
  if (backend.healthCheck()) {
    Serial.println("Backend health check passed");
  } else {
    Serial.println("Backend health check failed: " + backend.getLastError());
  }
  
  // Test simple HTTP connection
  Serial.println("Testing simple HTTP connection...");
  testSimpleConnection();
  
  if (events.loadFromBackend(backend)) {
    Serial.println("Events loaded successfully: " + String(events.getEventCount()) + " events");
    return true;
  } else {
    Serial.println("Failed to load events: " + backend.getLastError());
    return false;
  }
}

void handleEnterPress() {
  switch (currentState) {
    case STATE_EVENT_SELECTION:
      // Select event and immediately start scanning
      if (events.selectEvent(display.getSelectedIndex())) {
        selectedEventId = events.getSelectedEventId();
        selectedEventName = events.getSelectedEventName();
        Serial.println("Event selected: " + selectedEventName);
        startScanning();  // Immediately start scanning
      }
      break;
      
    case STATE_EVENT_ACTIVE:
      // This state is no longer used, but kept for compatibility
      startScanning();
      break;
      
    case STATE_SCANNING:
      // Set flag to stop scanning and return to event menu
      stopScanRequested = true;
      Serial.println("Stop scan requested by user");
      break;
      
    case STATE_ERROR:
      // Reset system
      currentState = STATE_WIFI_CONNECTING;
      display.showWiFiConnecting(WIFI_SSID);
      eventLoadRetries = 0;
      break;
  }
}

void startScanning() {
  if (selectedEventId.length() == 0) {
    setError("No event selected");
    return;
  }
  
  // Reset stop flag
  stopScanRequested = false;
  
  // Activate event in backend
  Serial.println("Activating event in backend...");
  display.showLoading("Activating event...");
  
  if (!backend.activateEvent(selectedEventId)) {
    Serial.println("Warning: Failed to activate event");
    Serial.println("Error: " + backend.getLastError());
    // Continue anyway - event might already be active
  } else {
    Serial.println("Event activated successfully!");
  }
  
  delay(500); // Brief pause to show activation message
  
  // Load registered devices for this event
  Serial.println("Loading registered devices for event...");
  display.showLoading("Loading registered devices...");
  
  if (!events.loadRegisteredDevices(backend)) {
    setError("Failed to load registered devices");
    return;
  }
  
  int deviceCount = events.getRegisteredDeviceCount();
  Serial.println("Found " + String(deviceCount) + " registered devices");
  
  if (deviceCount == 0) {
    Serial.println("Warning: No registered devices for this event");
    display.showLoading("Warning: No devices!");
    delay(2000);
  }
  
  currentState = STATE_SCANNING;
  display.showScanning(selectedEventName);
  Serial.println("=== SCANNING ACTIVATED ===");
  Serial.println("Event: " + selectedEventName);
  Serial.println("Event ID: " + selectedEventId);
  Serial.println("Registered devices: " + String(deviceCount));
  Serial.println("Looking for devices with 'ATT-' prefix");
  Serial.println("Hold ENTER (≥0.8s) to stop scanning");
}

void stopScanning() {
  Serial.println("=== STOPPING SCAN ===");
  Serial.println("Deactivating event and returning to menu");
  
  // Show loading screen
  display.showLoading("Stopping scan...");
  display.update();
  
  // Deactivate event on backend (deactivates ALL events)
  Serial.println("Deactivating event on backend...");
  String response;
  if (backend.makeRequest("deactivate-events", "POST", "", response)) {
    Serial.println("✅ Event deactivated successfully");
    
    // Parse response
    JsonDocument doc;
    DeserializationError error = deserializeJson(doc, response);
    if (!error && doc["success"]) {
      int deactivatedCount = doc["deactivatedCount"] | 0;
      Serial.println("   Deactivated " + String(deactivatedCount) + " event(s)");
    }
  } else {
    Serial.println("⚠️ Warning: Failed to deactivate event on backend");
    Serial.println("   Error: " + backend.getLastError());
    // Continue anyway - user wants to stop scanning
  }
  
  // Clear event selection
  selectedEventId = "";
  selectedEventName = "";
  
  // Reset stop flag
  stopScanRequested = false;
  
  // Return to event selection menu
  currentState = STATE_EVENT_SELECTION;
  display.showEventList(events.getEventList(), events.getEventCount());
  
  // Small input cooldown to avoid immediate re-trigger
  unsigned long cooldownStart = millis();
  while (millis() - cooldownStart < 300) {
    buttons.update();
    delay(10);
  }
  
  Serial.println("=== SCAN STOPPED ===");
  Serial.println("Select an event to begin scanning");
}

void performScan() {
  // Check if stop was requested
  if (stopScanRequested) {
    stopScanning();
    return;
  }
  
  static unsigned long lastScan = 0;
  
  // Scan every 5 seconds
  if (millis() - lastScan < 5000) {
    return;
  }
  
  lastScan = millis();
  Serial.println("Performing BLE scan for event: " + selectedEventName);
  
  // Scan for BLE devices
  std::vector<ScannedDevice> devices = bleScanner.scan();
  
  // Check if stop was requested during scan
  if (stopScanRequested) {
    stopScanning();
    return;
  }
  
  if (devices.size() > 0) {
    Serial.println("Found " + String(devices.size()) + " BLE devices");
    
    // Collect registered devices for batch processing
    std::vector<ScannedDevice> registeredDevicesList;
    
    for (const auto& device : devices) {
      Serial.println("Checking device: " + device.name + " (UUID: " + device.uuid + ")");
      
      if (isDeviceRegistered(device)) {
        registeredDevicesList.push_back(device);
        Serial.println("Device is registered for this event!");
      } else {
        Serial.println("Device not registered for this event");
      }
    }
    
    Serial.println("Registered devices found: " + String(registeredDevicesList.size()) + "/" + String(devices.size()));
    
    // OPTIMIZED: Batch record all attendance in ONE network call
    if (registeredDevicesList.size() > 0) {
      recordAttendanceBatch(registeredDevicesList);
    }
  } else {
    Serial.println("No BLE devices found in this scan");
  }
  
  // Update display with scan results
  display.updateScanResults(devices.size());
}

bool isDeviceRegistered(const ScannedDevice& device) {
  return events.isDeviceRegistered(selectedEventId, device.uuid);
}

// OPTIMIZED: Batch record attendance (single network call!)
void recordAttendanceBatch(const std::vector<ScannedDevice>& devices) {
  Serial.println("\n=== Batch Recording Attendance ===");
  Serial.println("Recording " + String(devices.size()) + " devices in ONE request...");
  
  // Show loading screen
  display.showLoading("Recording " + String(devices.size()) + " student(s)...");
  display.update();
  delay(50); // Give display time to refresh
  
  // Create batch records array
  JsonDocument doc;
  JsonArray records = doc["records"].to<JsonArray>();
  
  for (const auto& device : devices) {
    JsonObject record = records.add<JsonObject>();
    record["eventId"] = selectedEventId;
    record["bleUuid"] = device.uuid;
    record["deviceName"] = device.name;
    record["rssi"] = device.rssi;
    record["timestamp"] = getCurrentTimestamp(); // Use proper Unix timestamp
    record["scannerSource"] = "ESP32-Scanner-01"; // Changed from scannerId to match backend
  }
  
  // Serialize to string
  String body;
  serializeJson(doc, body);
  
  Serial.println("Request body size: " + String(body.length()) + " bytes");
  
  // Use backend client to send (it has proper HTTPS setup)
  String response;
  if (backend.makeRequest("batch-checkin", "POST", body, response)) {
    JsonDocument responseDoc;
    DeserializationError error = deserializeJson(responseDoc, response);
    
    if (!error) {
      int successful = responseDoc["successful"] | 0;
      int failed = responseDoc["failed"] | 0;
      
      Serial.println("✅ Batch attendance recorded!");
      Serial.println("   Successful: " + String(successful));
      Serial.println("   Failed: " + String(failed));
      
      // Show success feedback
      display.showAttendanceRecorded(String(successful) + " student(s)");
      display.update();
      delay(1500); // Show success message for 1.5 seconds
    } else {
      Serial.println("❌ Failed to parse response");
      display.showLoading("Error: Bad response");
      display.update();
      delay(1500);
    }
  } else {
    Serial.println("❌ Batch recording failed");
    Serial.println("   Error: " + backend.getLastError());
    
    // Show error feedback
    display.showLoading("Error: Network failed");
    display.update();
    delay(1500);
  }
  
  // Return to scanning screen
  display.showScanning(selectedEventName);
  display.update();
  
  Serial.println("=== Batch Recording Complete ===\n");
}

// Legacy: Single device recording (kept for compatibility)
void recordAttendance(const ScannedDevice& device) {
  std::vector<ScannedDevice> singleDevice = {device};
  recordAttendanceBatch(singleDevice);
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
    case STATE_WIFI_CONNECTING:
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

void testSimpleConnection() {
  // Test with a simple HTTP client
  HTTPClient http;
  http.begin("https://beaming-loris-569.convex.cloud/http/health");
  http.setTimeout(10000); // 10 second timeout
  http.addHeader("Content-Type", "application/json");
  http.addHeader("x-api-key", API_KEY);
  
  Serial.println("Testing direct HTTP connection...");
  int httpCode = http.GET();
  Serial.println("HTTP Code: " + String(httpCode));
  
  if (httpCode > 0) {
    String response = http.getString();
    Serial.println("Response: " + response);
  } else {
    Serial.println("HTTP request failed with code: " + String(httpCode));
  }
  
  http.end();
}