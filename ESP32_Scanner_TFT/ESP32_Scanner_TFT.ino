/*
 * ESP32 Attendance Scanner - With TFT Display
 * Based on working older version but optimized for memory
 */

#include <Arduino.h>
#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include <Adafruit_GFX.h>
#include <Adafruit_ST7735.h>
#include <SPI.h>
#include <SPIFFS.h>
#include "BluetoothSerial.h"

// TFT Display Configuration (ST7735 128x160 RGB)
#define TFT_CS    5   // Chip Select
#define TFT_RST   22  // Reset
#define TFT_DC    21  // Data/Command
#define TFT_MOSI  23  // MOSI (SDA)
#define TFT_SCLK  18  // Clock (SCK)

// Button Pins (with internal pullup, default state HIGH)
#define BUTTON_UP    35  // Up navigation
#define BUTTON_ENTER 32  // Enter/Select
#define BUTTON_DOWN  33  // Down navigation

// LED Pins
#define LED_YELLOW 34  // Device on/standby indicator
#define LED_BLUE   39  // Active scanning indicator

// Display Colors (16-bit RGB565)
#define COLOR_BLACK    0x0000
#define COLOR_WHITE    0xFFFF
#define COLOR_RED      0xF800
#define COLOR_GREEN    0x07E0
#define COLOR_BLUE     0x001F
#define COLOR_YELLOW   0xFFE0
#define COLOR_CYAN     0x07FF

// Display Layout (Landscape mode: 160x128)
#define SCREEN_WIDTH   160
#define SCREEN_HEIGHT  128
#define FONT_SIZE      1
#define LINE_HEIGHT    11  // Reduced for better fit
#define MAX_MENU_ITEMS 8   // Fits well in 128px height landscape mode

// Button States (with internal pullup)
#define BUTTON_PRESSED     LOW
#define BUTTON_RELEASED    HIGH

// LED States
#define LED_ON     HIGH
#define LED_OFF    LOW

// Display Text Positions (Landscape: 160x128)
#define TITLE_Y        8
#define MENU_START_Y   22
#define STATUS_Y       115  // Back to 128px height limit
#define LEFT_MARGIN    3
#define WIFI_STATUS_Y  105  // WiFi status indicator position
#define MAX_EVENT_NAME_LEN 20  // More characters with 160px width

// Global variables
Adafruit_ST7735 tft = Adafruit_ST7735(TFT_CS, TFT_DC, TFT_MOSI, TFT_SCLK, TFT_RST);
bool isScanning = false;
int selectedEvent = 0;

// Button states with improved debouncing
bool btnUp = false, btnEnter = false, btnDown = false;
bool lastBtnUp = false, lastBtnEnter = false, lastBtnDown = false;
bool btnUpPressed = false, btnEnterPressed = false, btnDownPressed = false;
unsigned long lastDebounce = 0;
unsigned long debounceDelay = 50; // 50ms debounce delay for stable operation

// Events - dynamic array with backend integration
char events[MAX_MENU_ITEMS][16];
char eventIds[MAX_MENU_ITEMS][64]; // Store event IDs for API calls
bool eventActive[MAX_MENU_ITEMS]; // Store event active status
int eventCount = 0;
bool eventsLoaded = false;

// Simple device tracking
int registeredDeviceCount = 0;
int foundRegisteredCount = 0;
char registeredDevices[MAX_MENU_ITEMS][18];
unsigned long lastScanTime = 0;
const unsigned long SCAN_INTERVAL = 3000; // Scan every 3 seconds

// Loading message for display
String currentLoadingMessage = "Loading...";

// System state
enum State { INIT, LOADING, READY, SCANNING, NO_WIFI, NO_EVENTS };
State currentState = INIT;

// Function declarations
bool activateEvent(const char* eventId);
bool deactivateAllEvents();
bool loadRegisteredDevices(const char* eventId);
bool logDeviceAttendance(const char* bleUuid, const char* eventId);
void performSimpleScan();

// Display update control - optimized for speed
unsigned long lastDisplayUpdate = 0;
bool needsRefresh = true;
bool displayInitialized = false;
State lastDisplayedState = INIT; // Track last displayed state to prevent overlap
bool menuNeedsUpdate = false; // Only update menu selection, not entire screen
bool titleNeedsUpdate = false; // Only update title area
bool statusNeedsUpdate = false; // Only update status area

// Efficient rendering system - NO MORE FULL SCREEN CLEARS
bool screenCleared = false;
String lastStatusMessage = "";
int lastSelectedEvent = -1;
int lastDeviceCount = -1;
unsigned long lastAnimUpdate = 0;
String lastLoadingMessage = "";
int lastAnimFrame = 0;

// Scanning display optimization - track what changed
int lastRegisteredDeviceCount = -1;
int lastFoundRegisteredCount = -1;
bool scanningDisplayNeedsUpdate = false;
unsigned long lastScanningDisplayUpdate = 0;

// Loading timeout
unsigned long loadingStartTime = 0;
const unsigned long LOADING_TIMEOUT = 30000; // 30 seconds timeout

// Backend configuration - Will be loaded from config.json
String backendUrl = "";
String apiKey = "";
String wifiSSID = "";
String wifiPassword = "";
String scannerId = "";
int scanIntervalSeconds = 5;

void setup() {
  Serial.begin(115200);
  delay(2000); // Increased delay to ensure Serial is ready
  
  Serial.println("*** SETUP FUNCTION STARTED ***");
  Serial.println("*** THIS IS THE UPDATED CODE VERSION 2.1 ***");
  Serial.println("*** IF YOU SEE THIS, THE CODE WAS UPLOADED ***");
  Serial.println("*** ESP32 IS RUNNING ***");
  Serial.flush(); // Force output to be sent immediately
  
  Serial.println("==========================================");
  Serial.println("ESP32 SCANNER STARTING UP");
  Serial.println("==========================================");
  Serial.println("ESP32 Scanner with TFT");
  Serial.println("ESP32 Chip ID: " + String((uint32_t)ESP.getEfuseMac(), HEX));
  Serial.println("Free heap: " + String(ESP.getFreeHeap()) + " bytes");
  Serial.println("Flash size: " + String(ESP.getFlashChipSize()) + " bytes");
  Serial.println("CPU frequency: " + String(ESP.getCpuFreqMHz()) + " MHz");
  Serial.println("==========================================");
  
  // Initialize SPIFFS for config file
  Serial.println("Initializing SPIFFS...");
  if (!SPIFFS.begin(true)) {
    Serial.println("SPIFFS initialization failed!");
    return;
  }
  Serial.println("SPIFFS initialized successfully");
  
  // Load configuration from config.json
  Serial.println("Loading configuration...");
  loadConfiguration();
  Serial.println("Configuration loaded");
  
  // Initialize TFT display
  Serial.println("Initializing TFT display...");
  tft.initR(INITR_BLACKTAB);
  tft.setRotation(1); // Landscape orientation
  tft.fillScreen(COLOR_BLACK);
  tft.setTextColor(COLOR_WHITE, COLOR_BLACK);
  tft.setTextSize(FONT_SIZE);
  Serial.println("TFT display initialized");
  
  // BLE will be handled with simple scanning
  
  // Initialize pins
  Serial.println("Initializing pins...");
  pinMode(BUTTON_UP, INPUT_PULLUP);
  pinMode(BUTTON_ENTER, INPUT_PULLUP);
  pinMode(BUTTON_DOWN, INPUT_PULLUP);
  pinMode(LED_YELLOW, OUTPUT);
  pinMode(LED_BLUE, OUTPUT);
  Serial.println("Pins initialized");
  
  // Test button functionality on startup
  Serial.println("Testing buttons...");
  testButtons();
  Serial.println("Button test completed");
  
  // Test WiFi module functionality
  Serial.println("Testing WiFi module...");
  testWiFiModule();
  Serial.println("WiFi module test completed");
  
  // Show loading screen
  currentState = LOADING;
  loadingStartTime = millis();
  needsRefresh = true;
  updateDisplay();
  
  // Initialize WiFi FIRST
  Serial.println("==========================================");
  Serial.println("STARTING WiFi CONNECTION");
  Serial.println("==========================================");
  Serial.println("Connecting to WiFi...");
  Serial.println("SSID: '" + wifiSSID + "'");
  Serial.println("Password: '" + String(wifiPassword.length()) + " characters'");
  Serial.println("Password preview: '" + wifiPassword.substring(0, min(3, (int)wifiPassword.length())) + "***'");
  Serial.println("==========================================");
  
  // Check if SSID is loaded
  if (wifiSSID.length() == 0) {
    Serial.println("ERROR: WiFi SSID not loaded from config!");
    Serial.println("System will not function without WiFi connection");
    return;
  }
  
  // Check if it's an open network (no password)
  if (wifiPassword.length() == 0) {
    Serial.println("WARNING: No WiFi password - attempting to connect to open network");
  }
  
  // SIMPLE DIRECT CONNECTION TEST
  Serial.println("==========================================");
  Serial.println("SIMPLE WiFi CONNECTION TEST");
  Serial.println("==========================================");
  Serial.println("Trying direct connection to '" + wifiSSID + "'...");
  
  // Reset WiFi module
  WiFi.disconnect(true);
  delay(1000);
  WiFi.mode(WIFI_OFF);
  delay(1000);
  WiFi.mode(WIFI_STA);
  delay(1000);
  
  // Scan for available networks first
  Serial.println("Scanning for available networks...");
  int n = WiFi.scanNetworks();
  Serial.println("Found " + String(n) + " networks:");
  bool targetNetworkFound = false;
  for (int i = 0; i < n; i++) {
    String ssid = WiFi.SSID(i);
    int rssi = WiFi.RSSI(i);
    int encryption = WiFi.encryptionType(i);
    Serial.println("  " + String(i + 1) + ": " + ssid + " (RSSI: " + String(rssi) + ", Security: " + String(encryption) + ")");
    if (ssid == wifiSSID) {
      targetNetworkFound = true;
      Serial.println("    ✓ TARGET NETWORK FOUND!");
    }
  }
  
  if (!targetNetworkFound) {
    Serial.println("⚠ WARNING: Target network '" + wifiSSID + "' not found in scan!");
    Serial.println("Please check the SSID spelling and ensure the network is in range.");
  }
  
  // Handle open network (no password) vs secured network
  if (wifiPassword.length() == 0) {
    Serial.println("Connecting to open network: " + wifiSSID);
    WiFi.begin(wifiSSID.c_str());
  } else {
    Serial.println("Connecting to secured network: " + wifiSSID);
    WiFi.begin(wifiSSID.c_str(), wifiPassword.c_str());
  }
  
  Serial.println("Waiting for connection...");
  for (int i = 0; i < 20; i++) {
    delay(1000);
    int status = WiFi.status();
    Serial.println("Attempt " + String(i + 1) + "/20 - Status: " + String(status) + " (" + getWiFiStatusString(status) + ")");
    
    // Show additional info every 5 attempts
    if (i % 5 == 0 && i > 0) {
      Serial.println("  Current SSID: " + WiFi.SSID());
      Serial.println("  RSSI: " + String(WiFi.RSSI()) + " dBm");
      Serial.println("  MAC: " + WiFi.macAddress());
    }
    
    if (status == WL_CONNECTED) {
      Serial.println("SUCCESS! Connected to WiFi!");
      Serial.println("IP Address: " + WiFi.localIP().toString());
      Serial.println("Gateway: " + WiFi.gatewayIP().toString());
      Serial.println("DNS: " + WiFi.dnsIP().toString());
      break;
    }
  }
  
  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("WiFi connection successful!");
    Serial.println("CALLING loadEventsFromBackend() from simple connection path");
    loadEventsFromBackend();
  } else {
    Serial.println("WiFi connection failed!");
    Serial.println("Final status: " + String(WiFi.status()));
    currentState = NO_WIFI;
    needsRefresh = true;
  }
  Serial.println("==========================================");
  
  // Continue with complex debugging if simple connection failed
  if (WiFi.status() != WL_CONNECTED) {
  
  // Scan for available networks first
  Serial.println("Scanning for available networks...");
  int n = WiFi.scanNetworks();
  Serial.println("Found " + String(n) + " networks:");
  for (int i = 0; i < n; i++) {
    Serial.println("  " + String(i + 1) + ": " + WiFi.SSID(i) + " (RSSI: " + String(WiFi.RSSI(i)) + ", Security: " + String(WiFi.encryptionType(i)) + ")");
  }
  
  // Check if our target network is in the list
  bool networkFound = false;
  for (int i = 0; i < n; i++) {
    if (WiFi.SSID(i) == wifiSSID) {
      networkFound = true;
      Serial.println("✓ Target network '" + wifiSSID + "' found with RSSI: " + String(WiFi.RSSI(i)));
      break;
    }
  }
  
  if (!networkFound) {
    Serial.println("✗ Target network '" + wifiSSID + "' not found in scan results!");
    Serial.println("Please check the SSID in config.json");
  }
  
  // Start WiFi connection with additional debugging
  Serial.println("Setting WiFi mode to STA...");
  WiFi.mode(WIFI_STA);
  
  // Disable power saving mode
  WiFi.setSleep(false);
  
  Serial.println("Starting WiFi connection...");
  Serial.println("SSID: '" + wifiSSID + "'");
  Serial.println("Password length: " + String(wifiPassword.length()));
  
  // Try different connection methods based on network type
  if (wifiPassword.length() == 0) {
    Serial.println("Attempting connection to open network...");
    WiFi.begin(wifiSSID.c_str());
  } else {
    Serial.println("Attempting connection to secured network...");
    WiFi.begin(wifiSSID.c_str(), wifiPassword.c_str());
  }
  
  // Wait a moment and check initial status
  delay(2000);
  Serial.println("Initial WiFi status after 2 seconds: " + String(WiFi.status()) + " (" + getWiFiStatusString(WiFi.status()) + ")");
  
  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 30) { // Increased to 30 attempts
    delay(500);
    attempts++;
    Serial.print(".");
    
    // Show detailed status every 5 attempts
    if (attempts % 5 == 0) {
      Serial.println();
      Serial.println("Attempt " + String(attempts) + "/30");
      int status = WiFi.status();
      Serial.println("WiFi Status: " + String(status) + " (" + getWiFiStatusString(status) + ")");
      Serial.println("SSID: " + WiFi.SSID());
      Serial.println("RSSI: " + String(WiFi.RSSI()) + " dBm");
      Serial.println("MAC: " + WiFi.macAddress());
    }
    
    // Update display with loading progress
    needsRefresh = true;
    updateDisplay();
  }
  
  Serial.println(); // New line after dots
  
  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("WiFi connected successfully!");
    Serial.println("IP address: " + WiFi.localIP().toString());
    Serial.println("Gateway: " + WiFi.gatewayIP().toString());
    Serial.println("DNS: " + WiFi.dnsIP().toString());
    Serial.println("Signal strength: " + String(WiFi.RSSI()) + " dBm");
    Serial.println("MAC address: " + WiFi.macAddress());
    
    // Test internet connectivity
    Serial.println("Testing internet connectivity...");
    HTTPClient testHttp;
    testHttp.begin("http://httpbin.org/ip");
    int testCode = testHttp.GET();
    if (testCode == 200) {
      Serial.println("✓ Internet connectivity confirmed");
    } else {
      Serial.println("✗ Internet connectivity failed: " + String(testCode));
    }
    testHttp.end();
    
    // Load events from backend AFTER WiFi is connected
    loadEventsFromBackend();
  } else {
    Serial.println("WiFi connection failed after " + String(attempts) + " attempts");
    Serial.println("Final WiFi Status: " + String(WiFi.status()) + " (" + getWiFiStatusString(WiFi.status()) + ")");
    
    // Try alternative connection methods
    Serial.println("\n=== Trying Alternative Connection Methods ===");
    tryAlternativeConnection();
    
    // If still not connected, show available networks
    if (WiFi.status() != WL_CONNECTED) {
      Serial.println("\nAvailable networks:");
      int n = WiFi.scanNetworks();
      for (int i = 0; i < n; i++) {
        Serial.println("  " + String(i + 1) + ": " + WiFi.SSID(i) + " (RSSI: " + String(WiFi.RSSI(i)) + ")");
      }
      
      Serial.println("System requires WiFi connection to function");
      Serial.println("Please check WiFi credentials and try again");
      
      // Try to connect to any available network as fallback
      tryConnectToAnyNetwork();
    }
  }
  } // End of complex debugging section
  
  // Turn on system LED
  digitalWrite(LED_YELLOW, LED_ON);
  
  // Move to ready state and show menu
  currentState = READY;
  
  // Ensure events are loaded if WiFi is connected
  if (WiFi.status() == WL_CONNECTED && eventCount == 0) {
    Serial.println("WiFi connected but no events loaded yet, loading now...");
    Serial.println("CALLING loadEventsFromBackend() from final check");
    loadEventsFromBackend();
  }
  
  // Check if events were loaded
  Serial.println("Checking event count: " + String(eventCount));
  if (eventCount == 0) {
    if (WiFi.status() != WL_CONNECTED) {
      Serial.println("No WiFi connection - cannot load events");
      currentState = NO_WIFI;
    } else {
      Serial.println("WiFi connected but no events available from backend");
      currentState = NO_EVENTS;
    }
    needsRefresh = true;
  } else {
    Serial.println("Events loaded successfully, showing menu...");
    Serial.println("Event count: " + String(eventCount));
    showMenu();
  }
   
  Serial.println("*** SETUP FUNCTION COMPLETED ***");
  Serial.println("Final event count: " + String(eventCount));
  Serial.println("Final WiFi status: " + String(WiFi.status()));
  Serial.println("Final current state: " + String(currentState));
}

void loop() {
  // Check for loading timeout
  if (currentState == LOADING && millis() - loadingStartTime > LOADING_TIMEOUT) {
    Serial.println("Loading timeout reached! Checking WiFi status...");
    if (WiFi.status() != WL_CONNECTED) {
      currentState = NO_WIFI;
    } else {
      currentState = NO_EVENTS;
    }
    needsRefresh = true;
  }
  
  // Check WiFi connection and attempt reconnection if needed
  checkWiFiConnection();
  
  // Update buttons with improved debouncing
  updateButtons();
  
  // Handle button presses - stable response
  // UP button disabled for now
  if (btnUpPressed) {
    btnUpPressed = false; // Reset the press flag
    Serial.println("UP button pressed (disabled)");
    // if (currentState == READY && eventCount > 0) {
    //   selectedEvent = (selectedEvent - 1 + eventCount) % eventCount; // Go up (decrease index)
    //   menuNeedsUpdate = true; // Trigger update
    //   Serial.print("UP pressed - selected: ");
    //   Serial.println(selectedEvent);
    // }
  }
  
  if (btnEnterPressed) {
    btnEnterPressed = false; // Reset the press flag
    if (currentState == READY) {
      startScanning();
    } else if (currentState == SCANNING) {
      stopScanning();
    }
    Serial.println("ENTER pressed");
  }
  
  if (btnDownPressed) {
    btnDownPressed = false; // Reset the press flag
    if (currentState == READY && eventCount > 0) {
      selectedEvent = (selectedEvent + 1) % eventCount; // Go down (increase index)
      menuNeedsUpdate = true; // Trigger update
      Serial.print("DOWN pressed - selected: ");
      Serial.println(selectedEvent);
    }
  }
  
  // Update LEDs
  digitalWrite(LED_YELLOW, LED_ON);
  digitalWrite(LED_BLUE, isScanning ? LED_ON : LED_OFF);
  
  // Handle simple scanning
  if (currentState == SCANNING) {
    // Perform periodic scan
    if (millis() - lastScanTime >= SCAN_INTERVAL) {
      performSimpleScan();
      lastScanTime = millis();
    }
    
    // Update scanning display only when needed
    if (scanningDisplayNeedsUpdate || millis() - lastScanningDisplayUpdate > 1000) {
      updateScanningDisplay();
      scanningDisplayNeedsUpdate = false;
      lastScanningDisplayUpdate = millis();
    }
  }
  
  // Update display when needed
  if (needsRefresh || menuNeedsUpdate) {
    updateDisplay();
    needsRefresh = false;
    menuNeedsUpdate = false;
  }
  
  // Update loading animation more frequently for better responsiveness
  if (currentState == LOADING && millis() - lastDisplayUpdate > 100) {
    updateLoadingAnimation();
  }
  
  delay(10); // Stable delay for proper operation
}

// Helper function to translate WiFi status codes to human-readable strings
String getWiFiStatusString(int status) {
  switch (status) {
    case WL_NO_SSID_AVAIL: return "No SSID Available";
    case WL_SCAN_COMPLETED: return "Scan Completed";
    case WL_CONNECTED: return "Connected";
    case WL_CONNECT_FAILED: return "Connect Failed";
    case WL_CONNECTION_LOST: return "Connection Lost";
    case WL_DISCONNECTED: return "Disconnected";
    case WL_IDLE_STATUS: return "Idle";
    default: return "Unknown (" + String(status) + ")";
  }
}

// Try alternative connection methods
void tryAlternativeConnection() {
  Serial.println("Method 1: Disconnect and reconnect...");
  WiFi.disconnect(true);
  delay(1000);
  
  if (wifiPassword.length() == 0) {
    WiFi.begin(wifiSSID.c_str());
  } else {
    WiFi.begin(wifiSSID.c_str(), wifiPassword.c_str());
  }
  
  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 15) {
    delay(1000);
    attempts++;
    Serial.print(".");
  }
  
  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\n✓ Connected with method 1!");
    return;
  }
  
  Serial.println("\nMethod 1 failed. Trying method 2...");
  WiFi.disconnect(true);
  delay(2000);
  
  // Try with different WiFi mode
  WiFi.mode(WIFI_OFF);
  delay(1000);
  WiFi.mode(WIFI_STA);
  delay(1000);
  
  if (wifiPassword.length() == 0) {
    WiFi.begin(wifiSSID.c_str());
  } else {
    WiFi.begin(wifiSSID.c_str(), wifiPassword.c_str());
  }
  
  attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 15) {
    delay(1000);
    attempts++;
    Serial.print(".");
  }
  
  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\n✓ Connected with method 2!");
    return;
  }
  
  Serial.println("\nMethod 2 failed. Trying method 3...");
  
  // Try with explicit channel specification
  WiFi.disconnect(true);
  delay(1000);
  
  // Scan for the specific network to get channel info
  int n = WiFi.scanNetworks();
  int targetChannel = 0;
  for (int i = 0; i < n; i++) {
    if (WiFi.SSID(i) == wifiSSID) {
      targetChannel = WiFi.channel(i);
      Serial.println("Found target network on channel: " + String(targetChannel));
      break;
    }
  }
  
  WiFi.begin(wifiSSID.c_str(), wifiPassword.c_str(), targetChannel);
  
  attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 15) {
    delay(1000);
    attempts++;
    Serial.print(".");
  }
  
  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\n✓ Connected with method 3!");
    return;
  }
  
  Serial.println("\nAll alternative methods failed.");
  Serial.println("WiFi Status: " + String(WiFi.status()) + " (" + getWiFiStatusString(WiFi.status()) + ")");
}

// Try to connect to any available network (for testing purposes)
void tryConnectToAnyNetwork() {
  Serial.println("\n=== Trying Alternative Networks ===");
  
  int n = WiFi.scanNetworks();
  if (n == 0) {
    Serial.println("No networks found");
    return;
  }
  
  // Try to connect to the strongest network (for testing)
  int bestNetwork = -1;
  int bestRSSI = -1000;
  
  for (int i = 0; i < n; i++) {
    if (WiFi.RSSI(i) > bestRSSI) {
      bestRSSI = WiFi.RSSI(i);
      bestNetwork = i;
    }
  }
  
  if (bestNetwork >= 0) {
    String testSSID = WiFi.SSID(bestNetwork);
    Serial.println("Trying strongest network: " + testSSID + " (RSSI: " + String(bestRSSI) + ")");
    
    // Try with empty password first (open network)
    WiFi.begin(testSSID.c_str(), "");
    
    int attempts = 0;
    while (WiFi.status() != WL_CONNECTED && attempts < 10) {
      delay(1000);
      attempts++;
      Serial.print(".");
    }
    
    if (WiFi.status() == WL_CONNECTED) {
      Serial.println("\n✓ Connected to " + testSSID + " (open network)");
      Serial.println("IP: " + WiFi.localIP().toString());
      // Load events from backend
      loadEventsFromBackend();
    } else {
      Serial.println("\n✗ Failed to connect to " + testSSID);
    }
  }
}

// Check WiFi connection and attempt reconnection if needed
void checkWiFiConnection() {
  static unsigned long lastWiFiCheck = 0;
  static int reconnectAttempts = 0;
  const int maxReconnectAttempts = 5;
  
  // Only check every 10 seconds
  if (millis() - lastWiFiCheck < 10000) return;
  lastWiFiCheck = millis();
  
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("WiFi disconnected! Attempting reconnection...");
    Serial.println("WiFi Status: " + String(WiFi.status()));
    
    if (reconnectAttempts < maxReconnectAttempts) {
      reconnectAttempts++;
      Serial.println("Reconnection attempt " + String(reconnectAttempts) + "/" + String(maxReconnectAttempts));
      
      WiFi.disconnect();
      delay(1000);
      
      if (wifiPassword.length() == 0) {
        WiFi.begin(wifiSSID.c_str());
      } else {
        WiFi.begin(wifiSSID.c_str(), wifiPassword.c_str());
      }
      
      // Wait a bit for connection
      int attempts = 0;
      while (WiFi.status() != WL_CONNECTED && attempts < 10) {
        delay(500);
        attempts++;
        Serial.print(".");
      }
      
      if (WiFi.status() == WL_CONNECTED) {
        Serial.println("\nWiFi reconnected successfully!");
        Serial.println("IP address: " + WiFi.localIP().toString());
        reconnectAttempts = 0; // Reset counter on success
        
        // If we were in NO_WIFI state, try to load events
        if (currentState == NO_WIFI) {
          Serial.println("WiFi reconnected, loading events...");
          loadEventsFromBackend();
        }
      } else {
        Serial.println("\nWiFi reconnection failed");
      }
    } else {
      Serial.println("Max reconnection attempts reached. Using offline mode.");
    }
  } else {
    // WiFi is connected, reset reconnect counter
    if (reconnectAttempts > 0) {
      Serial.println("WiFi connection restored!");
      reconnectAttempts = 0;
    }
  }
}

void startScanning() {
  Serial.println("\n=== STARTING SCAN ===");
  Serial.print("Event: ");
  Serial.println(events[selectedEvent]);
  Serial.print("Event ID: ");
  Serial.println(eventIds[selectedEvent]);
  
  // Show activation message
  currentLoadingMessage = "Activating event...";
  currentState = LOADING;
  needsRefresh = true;
  updateDisplay();
  
  // First, activate the selected event
  if (activateEvent(eventIds[selectedEvent])) {
    Serial.println("Event activated successfully");
    
    // Load registered devices for this event
    currentLoadingMessage = "Loading devices...";
    needsRefresh = true;
    updateDisplay();
    
    if (loadRegisteredDevices(eventIds[selectedEvent])) {
      Serial.println("Registered devices loaded successfully");
    } else {
      Serial.println("Failed to load registered devices");
    }
    
    currentState = SCANNING;
    isScanning = true;
    foundRegisteredCount = 0;
    needsRefresh = true;
    
    // Initialize display tracking variables for scanning
    lastRegisteredDeviceCount = -1;
    lastFoundRegisteredCount = -1;
    scanningDisplayNeedsUpdate = true;
    
    // Force immediate display update
    updateDisplay();
    
    Serial.println("Scanning for registered devices...");
    Serial.println("ENTER: Stop");
    
    // TODO: Implement actual BLE scanning and attendance recording
    // This would involve:
    // 1. Starting BLE scan for registered devices
    // 2. Recording attendance via /attendance endpoint
    // 3. Updating display with found devices
  } else {
    Serial.println("Failed to activate event");
    currentState = READY;
    needsRefresh = true;
  }
}

void stopScanning() {
  Serial.println("\n=== STOPPING SCAN ===");
  
  // Show deactivation message
  currentLoadingMessage = "Deactivating event...";
  currentState = LOADING;
  needsRefresh = true;
  updateDisplay();
  
  // Update display to show deactivation in progress
  updateLoadingAnimation();
  
  // Deactivate all events
  if (deactivateAllEvents()) {
    Serial.println("All events deactivated successfully");
    currentLoadingMessage = "Event deactivated";
  } else {
    Serial.println("Failed to deactivate events");
    currentLoadingMessage = "Deactivation failed";
  }
  
  // Brief pause to show deactivation status
  delay(1000);
  
  currentState = READY;
  isScanning = false;
  showResults();
  showMenu();
}

void performSimpleScan() {
  // Simple mock scan - simulate finding some registered devices
  int previousFoundCount = foundRegisteredCount;
  foundRegisteredCount = 0;
  
  // Simulate finding 1-3 registered devices randomly
  int found = random(0, min(registeredDeviceCount + 1, 4));
  foundRegisteredCount = found;
  
  // Only update display if counts actually changed
  if (foundRegisteredCount != previousFoundCount || 
      registeredDeviceCount != lastRegisteredDeviceCount) {
    scanningDisplayNeedsUpdate = true;
    lastRegisteredDeviceCount = registeredDeviceCount;
    lastFoundRegisteredCount = foundRegisteredCount;
  }
  
  // Log attendance for found devices
  for (int i = 0; i < foundRegisteredCount; i++) {
    if (logDeviceAttendance(registeredDevices[i], eventIds[selectedEvent])) {
      Serial.println("✓ Attendance logged for device " + String(i + 1));
    }
  }
}

void showMenu() {
  needsRefresh = true;
  
  Serial.println("\n=== EVENTS ===");
  for (int i = 0; i < eventCount; i++) {
    Serial.print(i == selectedEvent ? "> " : "  ");
    Serial.print(i + 1);
    Serial.print(". ");
    Serial.println(events[i]);
  }
  Serial.println("UP/DOWN: Select | ENTER: Start");
}

void showResults() {
  needsRefresh = true;
  
  Serial.println("\n=== SCAN RESULTS ===");
  Serial.print("Registered users: ");
  Serial.println(registeredDeviceCount);
  Serial.print("Present users: ");
  Serial.println(foundRegisteredCount);
  Serial.print("Attendance rate: ");
  if (registeredDeviceCount > 0) {
    Serial.print((foundRegisteredCount * 100) / registeredDeviceCount);
    Serial.println("%");
  } else {
    Serial.println("N/A");
  }
}

// TFT Display functions - Optimized for speed and responsiveness
void updateDisplay() {
  unsigned long now = millis();
  
  // Only update every 50ms to improve responsiveness while avoiding flickering
  if (now - lastDisplayUpdate < 50) return;
  
  // Check if we need to refresh
  bool shouldRefresh = needsRefresh || 
                      (currentState != lastDisplayedState) ||
                      (menuNeedsUpdate && currentState == READY) ||
                      (currentState == SCANNING && (foundRegisteredCount != lastDeviceCount)) ||
                      (currentState == LOADING && (now - lastAnimUpdate > 300));
  
  if (!shouldRefresh) return;
  
  // ONLY clear screen on state changes - never during normal operation
  if (currentState != lastDisplayedState) {
    tft.fillScreen(COLOR_BLACK);
    screenCleared = true;
    lastDisplayedState = currentState;
    displayInitialized = false;
  }
  
  // Draw based on current state
  switch (currentState) {
    case INIT:
      drawStartup();
      break;
    case LOADING:
      drawLoading();
      updateLoadingAnimation(); // Update animation without clearing screen
      break;
    case READY:
      if (menuNeedsUpdate) {
        drawEventMenuSelection(); // Fast update for button presses
        menuNeedsUpdate = false;
      } else {
        drawEventMenu();
      }
      drawWiFiStatus();
      break;
    case SCANNING:
      drawScanning();
      updateScanningDisplay(); // Always update scanning display when in SCANNING state
      drawWiFiStatus();
      break;
    case NO_WIFI:
      drawNoWiFi();
      break;
    case NO_EVENTS:
      drawNoEvents();
      drawWiFiStatus();
      break;
  }
  
  // Reset flags
  needsRefresh = false;
  lastDisplayUpdate = now;
  lastDeviceCount = foundRegisteredCount;
}

void drawStartup() {
  tft.fillScreen(COLOR_BLACK);
  tft.setTextColor(COLOR_WHITE, COLOR_BLACK);
  tft.setTextSize(FONT_SIZE);
  
  tft.setCursor(LEFT_MARGIN, TITLE_Y);
  tft.println("ESP32 SCANNER v2.1");
  tft.drawLine(LEFT_MARGIN, TITLE_Y + 10, SCREEN_WIDTH - LEFT_MARGIN, TITLE_Y + 10, COLOR_WHITE);
  
  tft.setTextColor(COLOR_CYAN, COLOR_BLACK);
  tft.setCursor(LEFT_MARGIN, 40);
  tft.println("Initializing...");
  
  tft.setCursor(LEFT_MARGIN, 55);
  tft.println("Version: 2.0.0");
  
  tft.setTextColor(COLOR_YELLOW, COLOR_BLACK);
  tft.setCursor(LEFT_MARGIN, STATUS_Y - 10);
  tft.println("Starting up");
}

void drawLoading() {
  // Only redraw if screen was cleared or not initialized
  if (!screenCleared && displayInitialized) return;
  
  tft.setTextColor(COLOR_WHITE, COLOR_BLACK);
  tft.setTextSize(FONT_SIZE);
  
  // Title
  tft.setCursor(LEFT_MARGIN, TITLE_Y);
  tft.println("LOADING");
  tft.drawLine(LEFT_MARGIN, TITLE_Y + 10, SCREEN_WIDTH - LEFT_MARGIN, TITLE_Y + 10, COLOR_WHITE);
  
  // Loading message
  tft.setTextColor(COLOR_CYAN, COLOR_BLACK);
  tft.setCursor(LEFT_MARGIN, 40);
  tft.println(currentLoadingMessage);
  
  // WiFi status
  int wifiStatus = WiFi.status();
  tft.setTextColor(wifiStatus == WL_CONNECTED ? COLOR_GREEN : COLOR_RED);
  tft.setCursor(LEFT_MARGIN, 55);
  tft.print("WiFi: ");
  if (wifiStatus == WL_CONNECTED) {
    tft.print("Connected to ");
    tft.println(WiFi.SSID());
  } else {
    tft.print("Connecting... (");
    tft.print(String(wifiStatus));
    tft.println(")");
  }
  
  if (WiFi.status() == WL_CONNECTED) {
    tft.setTextColor(COLOR_CYAN, COLOR_BLACK);
    tft.setCursor(LEFT_MARGIN, 70);
    tft.print("IP: ");
    tft.println(WiFi.localIP().toString());
  } else {
    tft.setTextColor(COLOR_YELLOW, COLOR_BLACK);
    tft.setCursor(LEFT_MARGIN, 70);
    tft.println("Check WiFi credentials");
  }
  
  displayInitialized = true;
  screenCleared = false;
}

// Optimized loading animation - only updates the animation area
void updateLoadingAnimation() {
  unsigned long now = millis();
  if (now - lastAnimUpdate > 300) { // Faster animation
    // Clear only the animation area
    tft.fillRect(LEFT_MARGIN, STATUS_Y - 10, SCREEN_WIDTH - LEFT_MARGIN, 15, COLOR_BLACK);
    
    lastAnimFrame = (lastAnimFrame + 1) % 4;
    String dots = "";
    for (int i = 0; i < lastAnimFrame + 1; i++) {
      dots += ".";
    }
    
    tft.setTextColor(COLOR_YELLOW, COLOR_BLACK);
    tft.setCursor(LEFT_MARGIN, STATUS_Y - 10);
    tft.println("Please wait" + dots);
    
    lastAnimUpdate = now;
  }
}

void drawEventMenu() {
  // Only redraw if screen was cleared or not initialized
  if (!screenCleared && displayInitialized) return;
  
  tft.setTextColor(COLOR_WHITE, COLOR_BLACK);
  tft.setTextSize(FONT_SIZE);
  
  // Title
  tft.setCursor(LEFT_MARGIN, TITLE_Y);
  tft.println("EVENTS");
  tft.drawLine(LEFT_MARGIN, TITLE_Y + 10, SCREEN_WIDTH - LEFT_MARGIN, TITLE_Y + 10, COLOR_WHITE);
  
  // Draw event items with better layout
  int maxVisibleItems = min(eventCount, MAX_MENU_ITEMS);
  for (int i = 0; i < maxVisibleItems; i++) {
    int y = MENU_START_Y + i * LINE_HEIGHT;
    
    if (i == selectedEvent) {
      // Highlight background for selected item
      tft.fillRect(LEFT_MARGIN, y - 1, SCREEN_WIDTH - LEFT_MARGIN, LINE_HEIGHT + 2, COLOR_BLUE);
      tft.setTextColor(COLOR_WHITE, COLOR_BLUE);
      tft.setCursor(LEFT_MARGIN, y);
      tft.print(">");
    } else {
      tft.setTextColor(COLOR_WHITE, COLOR_BLACK);
      tft.setCursor(LEFT_MARGIN, y);
      tft.print(" ");
    }
    
    // Event number and name
    tft.print(i + 1);
    tft.print(". ");
    
    // Truncate event name if too long
    tft.print(truncateEventName(events[i]));
    
    // Show active status on the right side
    int statusX = SCREEN_WIDTH - 30; // Position status on the right (more space with 160px width)
    if (eventActive[i]) {
      tft.setTextColor(COLOR_GREEN, i == selectedEvent ? COLOR_BLUE : COLOR_BLACK);
      tft.setCursor(statusX, y);
      tft.print("ON");
    } else {
      tft.setTextColor(COLOR_RED, i == selectedEvent ? COLOR_BLUE : COLOR_BLACK);
      tft.setCursor(statusX, y);
      tft.print("OFF");
    }
  }
  
  // Show scroll indicator if there are more events
  if (eventCount > MAX_MENU_ITEMS) {
    tft.setTextColor(COLOR_CYAN, COLOR_BLACK);
    tft.setCursor(LEFT_MARGIN, MENU_START_Y + MAX_MENU_ITEMS * LINE_HEIGHT);
    tft.print("... more events");
  }
  
  // Instructions
  tft.setTextColor(COLOR_CYAN, COLOR_BLACK);
  tft.setCursor(LEFT_MARGIN, STATUS_Y - 15);
  tft.println("DOWN: Select");
  tft.setCursor(LEFT_MARGIN, STATUS_Y - 5);
  tft.println("ENTER: Start");
  
  displayInitialized = true;
  screenCleared = false;
}

void drawScanning() {
  // Only redraw if screen was cleared or not initialized
  if (!screenCleared && displayInitialized) return;
  
  tft.setTextColor(COLOR_WHITE, COLOR_BLACK);
  tft.setTextSize(FONT_SIZE);
  
  // Title
  tft.setCursor(LEFT_MARGIN, TITLE_Y);
  tft.println("SCANNING");
  tft.drawLine(LEFT_MARGIN, TITLE_Y + 10, SCREEN_WIDTH - LEFT_MARGIN, TITLE_Y + 10, COLOR_WHITE);
  
  // Event name
  tft.setCursor(LEFT_MARGIN, TITLE_Y + 20);
  tft.print("Event: ");
  tft.println(truncateEventName(events[selectedEvent]));
  
  // Instructions
  tft.setTextColor(COLOR_CYAN, COLOR_BLACK);
  tft.setCursor(LEFT_MARGIN, STATUS_Y - 10);
  tft.println("ENTER: Stop");
  
  displayInitialized = true;
  screenCleared = false;
}

// Optimized scanning update - only updates changed elements
void updateScanningDisplay() {
  // Check if we need to update the device counts
  bool countsChanged = (registeredDeviceCount != lastRegisteredDeviceCount || 
                       foundRegisteredCount != lastFoundRegisteredCount ||
                       lastRegisteredDeviceCount == -1);
  
  // Update device counts if they changed
  if (countsChanged) {
    tft.fillRect(LEFT_MARGIN, TITLE_Y + 40, SCREEN_WIDTH - LEFT_MARGIN, 30, COLOR_BLACK);
    tft.setTextColor(COLOR_WHITE, COLOR_BLACK);
    
    // Show registered users count
    tft.setCursor(LEFT_MARGIN, TITLE_Y + 40);
    tft.print("Registered Users: ");
    tft.println(registeredDeviceCount);
    
    // Show present users count
    tft.setCursor(LEFT_MARGIN, TITLE_Y + 55);
    tft.print("Present Users: ");
    tft.println(foundRegisteredCount);
    
    // Update tracking variables
    lastRegisteredDeviceCount = registeredDeviceCount;
    lastFoundRegisteredCount = foundRegisteredCount;
  }
  
  // Always update animation
  static unsigned long lastAnimTime = 0;
  static int animDots = 0;
  if (millis() - lastAnimTime > 500) {
    animDots = (animDots + 1) % 4;
    lastAnimTime = millis();
    
    // Update only the animation area
    tft.fillRect(LEFT_MARGIN, TITLE_Y + 70, SCREEN_WIDTH - LEFT_MARGIN, 15, COLOR_BLACK);
    tft.setTextColor(COLOR_CYAN, COLOR_BLACK);
    tft.setCursor(LEFT_MARGIN, TITLE_Y + 70);
    tft.print("Scanning");
    for (int i = 0; i < animDots + 1; i++) {
      tft.print(".");
    }
  }
}

void drawNoWiFi() {
  tft.fillScreen(COLOR_BLACK);
  tft.setTextColor(COLOR_WHITE, COLOR_BLACK);
  tft.setTextSize(FONT_SIZE);
  
  tft.setCursor(LEFT_MARGIN, TITLE_Y);
  tft.println("NO WiFi");
  tft.drawLine(LEFT_MARGIN, TITLE_Y + 10, SCREEN_WIDTH - LEFT_MARGIN, TITLE_Y + 10, COLOR_WHITE);
  
  tft.setTextColor(COLOR_RED, COLOR_BLACK);
  tft.setCursor(LEFT_MARGIN, 40);
  tft.println("WiFi not connected");
  
  tft.setTextColor(COLOR_CYAN, COLOR_BLACK);
  tft.setCursor(LEFT_MARGIN, 55);
  tft.println("Check WiFi credentials");
  
  tft.setCursor(LEFT_MARGIN, 70);
  tft.println("and network settings");
  
  tft.setTextColor(COLOR_YELLOW, COLOR_BLACK);
  tft.setCursor(LEFT_MARGIN, 85);
  tft.println("Status: " + String(WiFi.status()));
  
  tft.setTextColor(COLOR_YELLOW, COLOR_BLACK);
  tft.setCursor(LEFT_MARGIN, STATUS_Y - 10);
  tft.println("Restart to retry");
}

void drawNoEvents() {
  tft.fillScreen(COLOR_BLACK);
  tft.setTextColor(COLOR_WHITE, COLOR_BLACK);
  tft.setTextSize(FONT_SIZE);
  
  tft.setCursor(LEFT_MARGIN, TITLE_Y);
  tft.println("NO EVENTS");
  tft.drawLine(LEFT_MARGIN, TITLE_Y + 10, SCREEN_WIDTH - LEFT_MARGIN, TITLE_Y + 10, COLOR_WHITE);
  
  tft.setTextColor(COLOR_RED, COLOR_BLACK);
  tft.setCursor(LEFT_MARGIN, 40);
  tft.println("No events available");
  
  tft.setTextColor(COLOR_CYAN, COLOR_BLACK);
  tft.setCursor(LEFT_MARGIN, 55);
  tft.println("WiFi: Connected");
  
  tft.setCursor(LEFT_MARGIN, 70);
  tft.println("Backend: No events");
  
  tft.setTextColor(COLOR_YELLOW, COLOR_BLACK);
  tft.setCursor(LEFT_MARGIN, STATUS_Y - 10);
  tft.println("Restart to retry");
}

// Ultra-fast menu selection update - only redraws changed lines
void drawEventMenuSelection() {
  // Only redraw if selection actually changed
  if (lastSelectedEvent == selectedEvent) return;
  
  // Clear previous selection
  if (lastSelectedEvent >= 0 && lastSelectedEvent < eventCount) {
    int y = MENU_START_Y + lastSelectedEvent * LINE_HEIGHT;
    tft.fillRect(LEFT_MARGIN, y - 1, SCREEN_WIDTH - LEFT_MARGIN, LINE_HEIGHT + 2, COLOR_BLACK);
    
    // Redraw previous item without highlight
    tft.setTextColor(COLOR_WHITE, COLOR_BLACK);
    tft.setCursor(LEFT_MARGIN, y);
    tft.print(" ");
    tft.print(lastSelectedEvent + 1);
    tft.print(". ");
    tft.print(truncateEventName(events[lastSelectedEvent]));
    
    // Show active status for previous item
    int statusX = SCREEN_WIDTH - 30;
    tft.setTextColor(eventActive[lastSelectedEvent] ? COLOR_GREEN : COLOR_RED, COLOR_BLACK);
    tft.setCursor(statusX, y);
    tft.print(eventActive[lastSelectedEvent] ? "ON" : "OFF");
  }
  
  // Draw new selection
  if (selectedEvent >= 0 && selectedEvent < eventCount) {
    int y = MENU_START_Y + selectedEvent * LINE_HEIGHT;
    
    // Highlight background
    tft.fillRect(LEFT_MARGIN, y - 1, SCREEN_WIDTH - LEFT_MARGIN, LINE_HEIGHT + 2, COLOR_BLUE);
    
    // Draw highlighted text
    tft.setTextColor(COLOR_WHITE, COLOR_BLUE);
    tft.setCursor(LEFT_MARGIN, y);
    tft.print(">");
    tft.print(selectedEvent + 1);
    tft.print(". ");
    tft.print(truncateEventName(events[selectedEvent]));
    
    // Show active status for selected item
    int statusX = SCREEN_WIDTH - 30;
    tft.setTextColor(eventActive[selectedEvent] ? COLOR_GREEN : COLOR_RED, COLOR_BLUE);
    tft.setCursor(statusX, y);
    tft.print(eventActive[selectedEvent] ? "ON" : "OFF");
  }
  
  lastSelectedEvent = selectedEvent;
}

// Draw WiFi status indicator
void drawWiFiStatus() {
  static unsigned long lastWiFiStatusUpdate = 0;
  static int lastWiFiStatus = -1;
  
  // Only update every 2 seconds to avoid flickering
  if (millis() - lastWiFiStatusUpdate < 2000 && lastWiFiStatus == WiFi.status()) {
    return;
  }
  
  // Clear WiFi status area
  tft.fillRect(LEFT_MARGIN, WIFI_STATUS_Y, SCREEN_WIDTH - LEFT_MARGIN, 15, COLOR_BLACK);
  
  int wifiStatus = WiFi.status();
  tft.setTextSize(1);
  
  if (wifiStatus == WL_CONNECTED) {
    tft.setTextColor(COLOR_GREEN, COLOR_BLACK);
    tft.setCursor(LEFT_MARGIN, WIFI_STATUS_Y);
    tft.print("WiFi: ");
    tft.print(WiFi.SSID());
    tft.print(" (");
    tft.print(WiFi.RSSI());
    tft.print("dBm)");
  } else {
    tft.setTextColor(COLOR_RED, COLOR_BLACK);
    tft.setCursor(LEFT_MARGIN, WIFI_STATUS_Y);
    tft.print("WiFi: Disconnected (");
    tft.print(wifiStatus);
    tft.print(")");
  }
  
  lastWiFiStatusUpdate = millis();
  lastWiFiStatus = wifiStatus;
}

// Improved button update function with proper debouncing
void updateButtons() {
  unsigned long now = millis();
  
  // Only update buttons if enough time has passed for debouncing
  if (now - lastDebounce >= debounceDelay) {
    // Store previous states
    lastBtnUp = btnUp;
    lastBtnEnter = btnEnter;
    lastBtnDown = btnDown;
    
    // Read current button states (with internal pullup, pressed = LOW)
    btnUp = (digitalRead(BUTTON_UP) == BUTTON_PRESSED);
    btnEnter = (digitalRead(BUTTON_ENTER) == BUTTON_PRESSED);
    btnDown = (digitalRead(BUTTON_DOWN) == BUTTON_PRESSED);
    
    // Detect button press events (transition from not pressed to pressed)
    // Only trigger if button was previously released
    if (btnUp && !lastBtnUp && !btnUpPressed) {
      btnUpPressed = true;
      Serial.println("UP button pressed");
    }
    
    if (btnEnter && !lastBtnEnter && !btnEnterPressed) {
      btnEnterPressed = true;
      Serial.println("ENTER button pressed");
    }
    
    if (btnDown && !lastBtnDown && !btnDownPressed) {
      btnDownPressed = true;
      Serial.println("DOWN button pressed");
    }
    
    // Debug button states (uncomment for troubleshooting)
    // if (btnUp || btnEnter || btnDown) {
    //   Serial.print("Button states - UP:");
    //   Serial.print(btnUp);
    //   Serial.print(" ENTER:");
    //   Serial.print(btnEnter);
    //   Serial.print(" DOWN:");
    //   Serial.println(btnDown);
    // }
    
    lastDebounce = now;
  }
}

// Button test function - call this during setup to verify button wiring
void testButtons() {
  Serial.println("\n=== BUTTON TEST ===");
  Serial.println("Testing button connections...");
  Serial.println("Press each button to test (5 seconds timeout)");
  
  unsigned long testStart = millis();
  bool upTested = false, enterTested = false, downTested = false;
  
  while (millis() - testStart < 5000 && (!upTested || !enterTested || !downTested)) {
    // Read button states
    bool upPressed = (digitalRead(BUTTON_UP) == BUTTON_PRESSED);
    bool enterPressed = (digitalRead(BUTTON_ENTER) == BUTTON_PRESSED);
    bool downPressed = (digitalRead(BUTTON_DOWN) == BUTTON_PRESSED);
    
    // Test UP button
    if (upPressed && !upTested) {
      Serial.println("✓ UP button working");
      upTested = true;
      digitalWrite(LED_BLUE, LED_ON);
      delay(200);
      digitalWrite(LED_BLUE, LED_OFF);
    }
    
    // Test ENTER button
    if (enterPressed && !enterTested) {
      Serial.println("✓ ENTER button working");
      enterTested = true;
      digitalWrite(LED_BLUE, LED_ON);
      delay(200);
      digitalWrite(LED_BLUE, LED_OFF);
    }
    
    // Test DOWN button
    if (downPressed && !downTested) {
      Serial.println("✓ DOWN button working");
      downTested = true;
      digitalWrite(LED_BLUE, LED_ON);
      delay(200);
      digitalWrite(LED_BLUE, LED_OFF);
    }
    
    delay(50);
  }
  
  // Report test results
  Serial.println("\nButton Test Results:");
  Serial.print("UP button: ");
  Serial.println(upTested ? "WORKING" : "NOT DETECTED");
  Serial.print("ENTER button: ");
  Serial.println(enterTested ? "WORKING" : "NOT DETECTED");
  Serial.print("DOWN button: ");
  Serial.println(downTested ? "WORKING" : "NOT DETECTED");
  
  if (upTested && enterTested && downTested) {
    Serial.println("✓ All buttons working correctly!");
  } else {
    Serial.println("⚠ Some buttons not detected - check wiring");
    Serial.println("Button wiring: One terminal to GPIO pin, other terminal to GND");
    Serial.println("No external pull-up resistors needed - using internal pull-ups");
  }
  
  Serial.println("=== END BUTTON TEST ===\n");
}

// Test WiFi module functionality
void testWiFiModule() {
  Serial.println("\n=== WiFi Module Test ===");
  Serial.println("Testing WiFi module functionality...");
  
  // Test basic WiFi operations
  Serial.println("1. Testing WiFi.mode()...");
  WiFi.mode(WIFI_STA);
  delay(100);
  Serial.println("   WiFi mode set to STA");
  
  Serial.println("2. Testing WiFi.scanNetworks()...");
  int n = WiFi.scanNetworks();
  if (n > 0) {
    Serial.println("   ✓ WiFi scan successful - found " + String(n) + " networks");
    Serial.println("   First few networks:");
    for (int i = 0; i < min(n, 3); i++) {
      Serial.println("     " + String(i + 1) + ": " + WiFi.SSID(i) + " (RSSI: " + String(WiFi.RSSI(i)) + ")");
    }
  } else {
    Serial.println("   ✗ WiFi scan failed - no networks found");
    Serial.println("   This might indicate a hardware issue");
  }
  
  Serial.println("3. Testing WiFi.begin() with test credentials...");
  WiFi.begin("TEST_NETWORK", "test_password");
  delay(3000);
  int status = WiFi.status();
  Serial.println("   WiFi status after test connection: " + String(status) + " (" + getWiFiStatusString(status) + ")");
  
  if (status == WL_CONNECT_FAILED || status == WL_NO_SSID_AVAIL) {
    Serial.println("   ✓ WiFi module is responding (expected failure for test network)");
  } else if (status == WL_CONNECTED) {
    Serial.println("   ✓ WiFi module connected to test network (unexpected!)");
    WiFi.disconnect();
  } else {
    Serial.println("   ? WiFi module status unclear");
  }
  
  Serial.println("4. Testing with hardcoded credentials...");
  WiFi.disconnect(true);
  delay(1000);
  WiFi.begin("Lexis Net", "testnet1234");
  delay(5000);
  status = WiFi.status();
  Serial.println("   WiFi status with hardcoded credentials: " + String(status) + " (" + getWiFiStatusString(status) + ")");
  
  if (status == WL_CONNECTED) {
    Serial.println("   ✓ SUCCESS! Connected with hardcoded credentials");
    Serial.println("   IP: " + WiFi.localIP().toString());
    WiFi.disconnect();
  } else {
    Serial.println("   ✗ Failed to connect with hardcoded credentials");
  }
  
  Serial.println("=== END WiFi Module Test ===\n");
}

// Load configuration from config.json file
void loadConfiguration() {
  Serial.println("\n=== Configuration Loading ===");
  Serial.println("Loading configuration from config.json...");
  
  // Check if SPIFFS is working
  if (!SPIFFS.begin(true)) {
    Serial.println("ERROR: SPIFFS initialization failed!");
    Serial.println("Using default configuration");
    loadDefaultConfiguration();
    return;
  }
  
  // Check if config file exists
  if (!SPIFFS.exists("/config.json")) {
    Serial.println("ERROR: config.json file not found!");
    Serial.println("Using default configuration");
    loadDefaultConfiguration();
    return;
  }
  
  File file = SPIFFS.open("/config.json", "r");
  if (!file) {
    Serial.println("ERROR: Failed to open config.json");
    Serial.println("Using default configuration");
    loadDefaultConfiguration();
    return;
  }
  
  String configContent = file.readString();
  file.close();
  
  Serial.println("Config file content:");
  Serial.println(configContent);
  Serial.println("Config file size: " + String(configContent.length()) + " bytes");
  
  // Parse JSON configuration
  DynamicJsonDocument doc(2048); // Increased buffer size
  DeserializationError error = deserializeJson(doc, configContent);
  
  if (error) {
    Serial.print("ERROR: Config JSON parsing failed: ");
    Serial.println(error.c_str());
    Serial.println("Raw config content: " + configContent);
    loadDefaultConfiguration();
    return;
  }
  
  // Load configuration values
  wifiSSID = doc["wifi_ssid"].as<String>();
  wifiPassword = doc["wifi_password"].as<String>();
  backendUrl = doc["backend_url"].as<String>();
  apiKey = doc["api_key"].as<String>();
  scannerId = doc["scanner_id"].as<String>();
  scanIntervalSeconds = doc["scan_interval_seconds"].as<int>();
  
  Serial.println("Loaded configuration values:");
  Serial.println("WiFi SSID: '" + wifiSSID + "'");
  Serial.println("Backend URL: '" + backendUrl + "'");
  Serial.println("Backend URL length: " + String(backendUrl.length()));
  Serial.println("API Key: '" + apiKey + "'");
  Serial.println("API Key length: " + String(apiKey.length()));
  
  Serial.println("Configuration loaded successfully:");
  Serial.println("WiFi SSID: '" + wifiSSID + "' (length: " + String(wifiSSID.length()) + ")");
  Serial.println("WiFi Password: '" + String(wifiPassword.length()) + " characters'");
  Serial.println("Backend URL: " + backendUrl);
  Serial.println("Scanner ID: " + scannerId);
  Serial.println("Scan Interval: " + String(scanIntervalSeconds) + "s");
  
  // Validate configuration
  if (wifiSSID.length() == 0) {
    Serial.println("WARNING: WiFi SSID is empty!");
  }
  if (wifiPassword.length() == 0) {
    Serial.println("WARNING: WiFi Password is empty!");
  }
}

// Helper function to truncate event names for display
String truncateEventName(const char* eventName) {
  String name = String(eventName);
  if (name.length() > MAX_EVENT_NAME_LEN) {
    return name.substring(0, MAX_EVENT_NAME_LEN - 3) + "...";
  }
  return name;
}


// Load default configuration if config file fails
// These are the production credentials - will be used if config.json fails to load
void loadDefaultConfiguration() {
  Serial.println("Loading default configuration...");
  wifiSSID = "Lexis Net";
  wifiPassword = "testnet1234";
  backendUrl = "https://compassionate-yak-763.convex.cloud/http";
  apiKey = "att_3sh4fmd2u14ffisevqztm";
  scannerId = "ESP32-Scanner-01";
  scanIntervalSeconds = 5;
}

// Load events from Convex backend
void loadEventsFromBackend() {
  static int callCount = 0;
  callCount++;
  Serial.println("==========================================");
  Serial.println("LOADING EVENTS FROM BACKEND - CALL #" + String(callCount));
  Serial.println("==========================================");
  Serial.println("Loading events from backend...");
  Serial.println("WiFi Status: " + String(WiFi.status() == WL_CONNECTED ? "Connected" : "Disconnected"));
  Serial.println("Backend URL: " + backendUrl);
  Serial.println("API Key: " + String(apiKey.length() > 0 ? "Set" : "Not set"));
  Serial.println("Current event count before loading: " + String(eventCount));
  
  // Double-check WiFi connection
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("WiFi not connected, cannot load events from backend");
    return;
  }
  
  Serial.println("WiFi connected, fetching events from: " + backendUrl);
  
  // Test backend connectivity first
  Serial.println("Testing backend connectivity...");
  HTTPClient testHttp;
  String testUrl = backendUrl + "/ping";
  testHttp.begin(testUrl);
  testHttp.setTimeout(5000);
  int testCode = testHttp.GET();
  Serial.println("Backend ping test: " + String(testCode));
  if (testCode == 200) {
    String pingResponse = testHttp.getString();
    Serial.println("Backend ping response: " + pingResponse);
  }
  testHttp.end();
  
  // Test different endpoint formats to find the correct one
  Serial.println("Testing different endpoint formats...");
  
  String testEndpoints[] = {
    "/events",
    "/active-events", 
    "/ping",
    "/health",
    "/registered-devices",
    "/batch-checkin"
  };
  
  for (int i = 0; i < 6; i++) {
    HTTPClient testHttp;
    String testUrl = backendUrl + testEndpoints[i];
    testHttp.begin(testUrl);
    testHttp.addHeader("x-api-key", apiKey);
    testHttp.setTimeout(3000);
    int testCode = testHttp.GET();
    Serial.println("Test " + String(i+1) + ": " + testUrl + " -> " + String(testCode));
    if (testCode == 200) {
      String response = testHttp.getString();
      Serial.println("SUCCESS! Response: " + response.substring(0, min(100, (int)response.length())));
    }
    testHttp.end();
    delay(500);
  }
  
  HTTPClient http;
  String url = backendUrl + "/events";  // Correct Convex HTTP actions endpoint
  
  Serial.println("DEBUG: backendUrl = '" + backendUrl + "'");
  Serial.println("DEBUG: Constructed URL = '" + url + "'");
  Serial.println("DEBUG: backendUrl length = " + String(backendUrl.length()));
  Serial.println("DEBUG: API Key = '" + apiKey + "'");
  Serial.println("DEBUG: API Key length = " + String(apiKey.length()));
  
  http.begin(url);
  http.addHeader("x-api-key", apiKey);
  http.addHeader("Content-Type", "application/json");
  http.setTimeout(10000); // 10 second timeout
  
  Serial.println("Making request to: " + url);
  Serial.println("Headers: x-api-key=" + apiKey + ", Content-Type=application/json");
  Serial.println("Request timeout: 10 seconds");
  int httpResponseCode = http.GET();
  
  Serial.println("HTTP Response Code: " + String(httpResponseCode));
  Serial.println("Response size: " + String(http.getSize()) + " bytes");
  
  if (httpResponseCode == 200) {
    String response = http.getString();
    Serial.println("Backend response received:");
    Serial.println(response);
    
    // Parse JSON response
    DynamicJsonDocument doc(4096); // Increased size for larger responses
    DeserializationError error = deserializeJson(doc, response);
    
    if (error) {
      Serial.print("JSON parsing failed: ");
      Serial.println(error.c_str());
      Serial.println("Raw response: " + response);
      Serial.println("Cannot load events due to parsing error");
      return;
    }
    
    // Clear existing events
    eventCount = 0;
    
    // Parse events from JSON - /events endpoint returns {success: true, events: [...]}
    JsonArray eventsArray;
    if (doc["events"].is<JsonArray>()) {
      eventsArray = doc["events"];
      Serial.println("Found events array in response");
    } else if (doc["data"].is<JsonArray>()) {
      eventsArray = doc["data"];
      Serial.println("Found data array in response");
    } else {
      Serial.println("No events array found in response");
      Serial.println("Available keys in response:");
      for (JsonPair pair : doc.as<JsonObject>()) {
        Serial.println("  " + String(pair.key().c_str()));
      }
      Serial.println("Cannot load events - invalid response format");
      return;
    }
    
    Serial.println("Found " + String(eventsArray.size()) + " events in response");
    
    for (JsonObject event : eventsArray) {
      if (eventCount >= MAX_MENU_ITEMS) {
        Serial.println("Reached maximum menu items limit");
        break;
      }
      
      const char* eventName = event["name"];
      const char* eventId = event["id"];
      bool isActive = event["isActive"].as<bool>();
      
      Serial.print("Processing event: ");
      Serial.print(eventName ? eventName : "NULL");
      Serial.print(" (ID: ");
      Serial.print(eventId ? eventId : "NULL");
      Serial.print(", Active: ");
      Serial.print(isActive ? "Yes" : "No");
      Serial.println(")");
      
      if (eventName && eventId) {
        strncpy(events[eventCount], eventName, 15);
        events[eventCount][15] = '\0'; // Ensure null termination
        
        strncpy(eventIds[eventCount], eventId, 63);
        eventIds[eventCount][63] = '\0'; // Ensure null termination
        
        eventActive[eventCount] = isActive;
        
        eventCount++;
        Serial.print("Successfully loaded event: ");
        Serial.print(eventName);
        Serial.print(" (ID: ");
        Serial.print(eventId);
        Serial.print(", Active: ");
        Serial.print(isActive ? "Yes" : "No");
        Serial.println(")");
      } else {
        Serial.println("Skipping event due to missing name or ID");
      }
    }
    
    eventsLoaded = true;
    Serial.print("Successfully loaded ");
    Serial.print(eventCount);
    Serial.println(" events from backend");
    
    // Update display state and show menu
    if (eventCount > 0) {
      Serial.println("Switching to READY state and showing menu...");
      currentState = READY;
      needsRefresh = true;
      showMenu();
    } else {
      Serial.println("No events loaded, switching to NO_EVENTS state...");
      currentState = NO_EVENTS;
      needsRefresh = true;
    }
  } else {
    Serial.print("HTTP error: ");
    Serial.println(httpResponseCode);
    String errorResponse = http.getString();
    Serial.println("Error response: " + errorResponse);
    Serial.println("Cannot load events due to HTTP error");
    
    // Additional debugging for common HTTP errors
    if (httpResponseCode == 401) {
      Serial.println("ERROR: Unauthorized - Check API key");
    } else if (httpResponseCode == 404) {
      Serial.println("ERROR: Not Found - Check backend URL and endpoint");
    } else if (httpResponseCode == 500) {
      Serial.println("ERROR: Server Error - Check backend logs");
    } else if (httpResponseCode == -1) {
      Serial.println("ERROR: Connection failed - Check WiFi and backend URL");
    }
    
    // Switch to appropriate state based on WiFi status
    if (WiFi.status() != WL_CONNECTED) {
      currentState = NO_WIFI;
    } else {
      currentState = NO_EVENTS;
    }
    needsRefresh = true;
  }
  
  http.end();
}


// Refresh events from backend (can be called during operation)
void refreshEvents() {
  Serial.println("Refreshing events from backend...");
  loadEventsFromBackend();
  needsRefresh = true;
}

// Activate a specific event
bool activateEvent(const char* eventId) {
  Serial.println("Activating event: " + String(eventId));
  
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("WiFi not connected, cannot activate event");
    return false;
  }
  
  HTTPClient http;
  String url = backendUrl + "/activate-event";
  
  http.begin(url);
  http.addHeader("x-api-key", apiKey);
  http.addHeader("Content-Type", "application/json");
  http.setTimeout(10000);
  
  // Create JSON payload
  String jsonPayload = "{\"eventId\":\"" + String(eventId) + "\"}";
  
  Serial.println("Making request to: " + url);
  Serial.println("Payload: " + jsonPayload);
  
  int httpResponseCode = http.POST(jsonPayload);
  String response = http.getString();
  
  Serial.println("HTTP Response Code: " + String(httpResponseCode));
  Serial.println("Response: " + response);
  
  bool success = (httpResponseCode == 200);
  
  if (success) {
    Serial.println("Event activated successfully");
  } else {
    Serial.println("Failed to activate event");
  }
  
  http.end();
  return success;
}

// Deactivate all events
bool deactivateAllEvents() {
  Serial.println("Deactivating all events");
  
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("WiFi not connected, cannot deactivate events");
    return false;
  }
  
  HTTPClient http;
  String url = backendUrl + "/deactivate-events";
  
  http.begin(url);
  http.addHeader("x-api-key", apiKey);
  http.addHeader("Content-Type", "application/json");
  http.setTimeout(10000);
  
  Serial.println("Making request to: " + url);
  Serial.println("API Key: " + String(apiKey.length() > 0 ? "Set" : "Not set"));
  
  int httpResponseCode = http.POST("{}");
  String response = http.getString();
  
  Serial.println("HTTP Response Code: " + String(httpResponseCode));
  Serial.println("Response: " + response);
  
  bool success = (httpResponseCode == 200);
  
  if (success) {
    Serial.println("✓ All events deactivated successfully");
    // Parse response to verify deactivation
    DynamicJsonDocument doc(1024);
    DeserializationError error = deserializeJson(doc, response);
    if (!error && doc["success"].as<bool>()) {
      Serial.println("✓ Backend confirmed deactivation");
    } else {
      Serial.println("⚠ Backend response unclear, but HTTP 200 received");
    }
  } else {
    Serial.println("✗ Failed to deactivate events - HTTP " + String(httpResponseCode));
    if (httpResponseCode == 401) {
      Serial.println("  Authentication failed - check API key");
    } else if (httpResponseCode == 404) {
      Serial.println("  Endpoint not found - check backend URL");
    } else if (httpResponseCode == 500) {
      Serial.println("  Server error - check backend logs");
    }
  }
  
  http.end();
  return success;
}

// Load registered devices for an event
bool loadRegisteredDevices(const char* eventId) {
  Serial.println("Loading registered devices for event: " + String(eventId));
  
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("WiFi not connected, cannot load registered devices");
    return false;
  }
  
  HTTPClient http;
  String url = backendUrl + "/registered-devices?eventId=" + String(eventId);
  
  http.begin(url);
  http.addHeader("x-api-key", apiKey);
  http.addHeader("Content-Type", "application/json");
  http.setTimeout(10000);
  
  Serial.println("Making request to: " + url);
  
  int httpResponseCode = http.GET();
  String response = http.getString();
  
  Serial.println("HTTP Response Code: " + String(httpResponseCode));
  Serial.println("Response: " + response);
  
  if (httpResponseCode == 200) {
    // Parse response to get registered device UUIDs
    DynamicJsonDocument doc(2048);
    DeserializationError error = deserializeJson(doc, response);
    
    if (!error && doc["success"].as<bool>()) {
      JsonArray deviceUuids = doc["deviceUuids"];
      Serial.println("Found " + String(deviceUuids.size()) + " registered devices");
      
      // Store registered devices for scanning
      int previousCount = registeredDeviceCount;
      registeredDeviceCount = 0;
      for (int i = 0; i < deviceUuids.size() && i < MAX_MENU_ITEMS; i++) {
        String uuid = deviceUuids[i].as<String>();
        strcpy(registeredDevices[registeredDeviceCount], uuid.c_str());
        registeredDeviceCount++;
        Serial.println("Registered device " + String(registeredDeviceCount) + ": " + uuid);
      }
      
      // Trigger display update if count changed
      if (registeredDeviceCount != previousCount) {
        scanningDisplayNeedsUpdate = true;
        lastRegisteredDeviceCount = registeredDeviceCount;
      }
      
      return true;
    } else {
      Serial.println("Failed to parse registered devices response");
    }
  } else {
    Serial.println("Failed to load registered devices");
  }
  
  http.end();
  return false;
}

// Log device attendance
bool logDeviceAttendance(const char* bleUuid, const char* eventId) {
  Serial.println("Logging attendance for device: " + String(bleUuid));
  
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("WiFi not connected, cannot log attendance");
    return false;
  }
  
  HTTPClient http;
  String url = backendUrl + "/batch-checkin";
  
  http.begin(url);
  http.addHeader("x-api-key", apiKey);
  http.addHeader("Content-Type", "application/json");
  http.setTimeout(10000);
  
  // Create JSON payload for batch check-in
  String jsonPayload = "{\"records\":[{\"bleUuid\":\"" + String(bleUuid) + "\",\"eventId\":\"" + String(eventId) + "\",\"timestamp\":" + String(millis()) + "}]}";
  
  Serial.println("Making request to: " + url);
  Serial.println("Payload: " + jsonPayload);
  
  int httpResponseCode = http.POST(jsonPayload);
  String response = http.getString();
  
  Serial.println("HTTP Response Code: " + String(httpResponseCode));
  Serial.println("Response: " + response);
  
  bool success = (httpResponseCode == 200);
  
  if (success) {
    Serial.println("Attendance logged successfully");
  } else {
    Serial.println("Failed to log attendance");
  }
  
  http.end();
  return success;
}

// Simple scanning implementation - no complex BLE libraries needed