#include "display_manager.h"
#include <WiFi.h>

// Global instance defined in ESP32_Scanner_TFT.ino

DisplayManager::DisplayManager() : tft(TFT_CS, TFT_DC, TFT_RST) {
  selectedIndex = 0;
  maxItems = 0;
  needsRefresh = true;
  lastUpdate = 0;
  eventCount = 0;
  currentState = STATE_LOADING;
  statusMessage = "";
  scanCount = 0;
}

bool DisplayManager::begin() {
  Serial.println("Initializing TFT display...");
  
  // Initialize TFT display
  tft.initR(INITR_BLACKTAB);
  tft.setRotation(1);         // Landscape orientation
  tft.fillScreen(COLOR_BLACK);
  
  Serial.println("TFT Display initialized successfully");
  return true;
}

void DisplayManager::update() {
  unsigned long now = millis();
  
  // Update display every 100ms to avoid flickering
  if (needsRefresh && (now - lastUpdate >= 100)) {
    refresh();
    needsRefresh = false;
    lastUpdate = now;
  }
}

void DisplayManager::navigateUp() {
  if (selectedIndex > 0) {
    selectedIndex--;
    needsRefresh = true;
  }
}

void DisplayManager::navigateDown() {
  if (selectedIndex < maxItems - 1) {
    selectedIndex++;
    needsRefresh = true;
  }
}

int DisplayManager::getSelectedIndex() {
  return selectedIndex;
}

void DisplayManager::showWiFiConnecting(const String& ssid) {
  currentState = STATE_WIFI_CONNECTING;
  statusMessage = "Connecting to: " + ssid;
  needsRefresh = true;
}

void DisplayManager::showWiFiConnected(const String& ip) {
  currentState = STATE_WIFI_CONNECTED;
  statusMessage = "WiFi Connected! IP: " + ip;
  needsRefresh = true;
}

void DisplayManager::showLoading(const String& message) {
  currentState = STATE_LOADING;
  statusMessage = message;
  needsRefresh = true;
}

void DisplayManager::showEventList(const Event* events, int count) {
  currentState = STATE_EVENT_LIST;
  eventCount = count;
  maxItems = count;
  selectedIndex = 0;
  
  // Copy events
  for (int i = 0; i < count && i < MAX_EVENTS; i++) {
    this->events[i] = events[i];
  }
  
  needsRefresh = true;
}

void DisplayManager::showEventSelected(const String& eventName) {
  currentState = STATE_EVENT_SELECTED;
  statusMessage = "Selected: " + eventName;
  needsRefresh = true;
}

void DisplayManager::showScanning(const String& eventName) {
  currentState = STATE_SCANNING;
  statusMessage = "Scanning: " + eventName;
  scanCount = 0;
  needsRefresh = true;
}

void DisplayManager::showError(const String& message) {
  currentState = STATE_ERROR;
  statusMessage = message;
  needsRefresh = true;
}

void DisplayManager::updateScanResults(int deviceCount) {
  scanCount = deviceCount;
  needsRefresh = true;
}

void DisplayManager::showAttendanceRecorded(const String& deviceName) {
  // Show a brief message that attendance was recorded
  statusMessage = "Recorded: " + deviceName;
  needsRefresh = true;
}

void DisplayManager::refresh() {
  switch (currentState) {
    case STATE_WIFI_CONNECTING:
      drawWiFiConnecting();
      break;
    case STATE_WIFI_CONNECTED:
      drawWiFiConnected();
      break;
    case STATE_LOADING:
      drawLoadingScreen();
      break;
    case STATE_EVENT_LIST:
      drawEventList();
      break;
    case STATE_EVENT_SELECTED:
      drawEventSelected();
      break;
    case STATE_SCANNING:
      drawScanningScreen();
      break;
    case STATE_ERROR:
      drawErrorScreen();
      break;
  }
}

void DisplayManager::clearScreen() {
  tft.fillScreen(COLOR_BLACK);
}

void DisplayManager::drawTitle(const String& title) {
  tft.setTextColor(COLOR_WHITE);
  tft.setTextSize(1);
  tft.setCursor(LEFT_MARGIN, TITLE_Y);
  tft.print(title);
  
  // Draw line under title
  tft.drawLine(LEFT_MARGIN, TITLE_Y + 8, SCREEN_WIDTH - RIGHT_MARGIN, TITLE_Y + 8, COLOR_WHITE);
}

void DisplayManager::drawStatus(const String& status) {
  tft.setTextColor(COLOR_YELLOW);
  tft.setTextSize(1);
  tft.setCursor(LEFT_MARGIN, STATUS_Y);
  tft.print(status);
}

void DisplayManager::drawWiFiConnecting() {
  clearScreen();
  drawTitle("WiFi Connection");
  
  tft.setTextColor(COLOR_CYAN);
  tft.setTextSize(1);
  tft.setCursor(LEFT_MARGIN, 40);
  tft.print(statusMessage);
  
  // Draw connecting animation
  static int animFrame = 0;
  animFrame = (animFrame + 1) % 4;
  
  String dots = "";
  for (int i = 0; i < animFrame + 1; i++) {
    dots += ".";
  }
  
  tft.setCursor(LEFT_MARGIN, 55);
  tft.print("Connecting" + dots);
  
  drawStatus("Please wait");
}

void DisplayManager::drawWiFiConnected() {
  clearScreen();
  drawTitle("WiFi Connected");
  
  tft.setTextColor(COLOR_GREEN);
  tft.setTextSize(1);
  tft.setCursor(LEFT_MARGIN, 40);
  tft.print(statusMessage);
  
  tft.setTextColor(COLOR_CYAN);
  tft.setCursor(LEFT_MARGIN, 60);
  tft.print("Loading events...");
  
  drawStatus("Connected");
}

void DisplayManager::drawLoadingScreen() {
  clearScreen();
  drawTitle("Loading");
  
  tft.setTextColor(COLOR_CYAN);
  tft.setTextSize(1);
  tft.setCursor(LEFT_MARGIN, 40);
  tft.print(statusMessage);
  
  // Draw loading animation (spinning dots)
  static int animFrame = 0;
  animFrame = (animFrame + 1) % 4;
  
  String dots = "";
  for (int i = 0; i < animFrame + 1; i++) {
    dots += ".";
  }
  
  tft.setCursor(LEFT_MARGIN, 55);
  tft.print("Loading" + dots);
  
  // Show WiFi status
  tft.setTextColor(WiFi.status() == WL_CONNECTED ? COLOR_GREEN : COLOR_RED);
  tft.setCursor(LEFT_MARGIN, 70);
  tft.print("WiFi: " + String(WiFi.status() == WL_CONNECTED ? "Connected" : "Disconnected"));
  
  if (WiFi.status() == WL_CONNECTED) {
    tft.setTextColor(COLOR_CYAN);
    tft.setCursor(LEFT_MARGIN, 85);
    tft.print("IP: " + WiFi.localIP().toString());
  }
  
  drawStatus("Please wait");
}

void DisplayManager::drawEventList() {
  clearScreen();
  drawTitle("Select Event");
  
  // Draw event list
  for (int i = 0; i < eventCount && i < MAX_EVENTS; i++) {
    int y = MENU_START_Y + (i * LINE_HEIGHT);
    
    if (i == selectedIndex) {
      // Highlight selected item
      tft.fillRect(LEFT_MARGIN, y - 2, SCREEN_WIDTH - LEFT_MARGIN - RIGHT_MARGIN, LINE_HEIGHT, COLOR_BLUE);
      tft.setTextColor(COLOR_WHITE);
    } else {
      tft.setTextColor(COLOR_CYAN);
    }
    
    tft.setCursor(LEFT_MARGIN + 5, y);
    tft.print(events[i].name);
  }
  
  drawStatus("UP/DOWN: Navigate, ENTER: Select");
}

void DisplayManager::drawEventSelected() {
  clearScreen();
  drawTitle("Event Selected");
  
  tft.setTextColor(COLOR_GREEN);
  tft.setTextSize(1);
  tft.setCursor(LEFT_MARGIN, 40);
  tft.print(statusMessage);
  
  tft.setTextColor(COLOR_CYAN);
  tft.setCursor(LEFT_MARGIN, 60);
  tft.print("Press ENTER to start scanning");
  
  drawStatus("Ready to scan");
}

void DisplayManager::drawScanningScreen() {
  clearScreen();
  drawTitle("Scanning");
  
  // Draw scanning animation
  static int animFrame = 0;
  animFrame = (animFrame + 1) % 4;
  
  tft.setTextColor(COLOR_GREEN);
  tft.setTextSize(2);
  tft.setCursor(LEFT_MARGIN + 20, 40);
  
  String dots = "";
  for (int i = 0; i < animFrame + 1; i++) {
    dots += ".";
  }
  tft.print("Scan" + dots);
  
  // Draw device count
  tft.setTextColor(COLOR_CYAN);
  tft.setTextSize(1);
  tft.setCursor(LEFT_MARGIN, 65);
  tft.print("Devices found: " + String(scanCount));
  
  // Draw event info
  tft.setTextColor(COLOR_WHITE);
  tft.setCursor(LEFT_MARGIN, 80);
  tft.print(statusMessage);
  
  // Draw scanning status
  tft.setTextColor(COLOR_YELLOW);
  tft.setCursor(LEFT_MARGIN, 95);
  tft.print("Looking for ATT- devices");
  
  drawStatus("ENTER: Stop scanning");
}

void DisplayManager::drawErrorScreen() {
  clearScreen();
  drawTitle("Error");
  
  tft.setTextColor(COLOR_RED);
  tft.setTextSize(1);
  tft.setCursor(LEFT_MARGIN, 40);
  tft.print(statusMessage);
  
  tft.setTextColor(COLOR_CYAN);
  tft.setCursor(LEFT_MARGIN, 60);
  tft.print("Press ENTER to retry");
  
  drawStatus("System error");
}