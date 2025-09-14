/*
 * ESP32 Attendance Scanner - With TFT Display
 * Based on working older version but optimized for memory
 */

#include <Arduino.h>
#include <WiFi.h>
#include <Adafruit_GFX.h>
#include <Adafruit_ST7735.h>
#include <SPI.h>

// TFT Display Configuration (ST7735 128x128 RGB)
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

// Display Layout
#define SCREEN_WIDTH   128
#define SCREEN_HEIGHT  128
#define FONT_SIZE      1
#define LINE_HEIGHT    12
#define MAX_MENU_ITEMS 6

// Button States (with internal pullup)
#define BUTTON_PRESSED     LOW
#define BUTTON_RELEASED    HIGH

// LED States
#define LED_ON     HIGH
#define LED_OFF    LOW

// Display Text Positions
#define TITLE_Y        8
#define MENU_START_Y   25
#define STATUS_Y       120
#define LEFT_MARGIN    5

// Global variables
Adafruit_ST7735 tft = Adafruit_ST7735(TFT_CS, TFT_DC, TFT_MOSI, TFT_SCLK, TFT_RST);
bool isScanning = false;
int selectedEvent = 0;
int deviceCount = 0;

// Button states
bool btnUp = false, btnEnter = false, btnDown = false;
bool lastBtnUp = false, lastBtnEnter = false, lastBtnDown = false;
unsigned long lastDebounce = 0;

// Events - minimal
char events[3][12] = {"Meeting", "Workshop", "Training"};
int eventCount = 3;

// Scanned devices - minimal
char devices[3][16];
int rssi[3];

// System state
enum State { READY, SCANNING };
State currentState = READY;

// Display update control
unsigned long lastDisplayUpdate = 0;
bool needsRefresh = true;
bool displayInitialized = false;

void setup() {
  Serial.begin(115200);
  delay(1000);
  
  Serial.println("ESP32 Scanner with TFT");
  
  // Initialize TFT display
  tft.initR(INITR_BLACKTAB);
  tft.setRotation(1); // Landscape orientation
  tft.fillScreen(COLOR_BLACK);
  tft.setTextColor(COLOR_WHITE, COLOR_BLACK);
  tft.setTextSize(FONT_SIZE);
  
  // Initialize pins
  pinMode(BUTTON_UP, INPUT_PULLUP);
  pinMode(BUTTON_ENTER, INPUT_PULLUP);
  pinMode(BUTTON_DOWN, INPUT_PULLUP);
  pinMode(LED_YELLOW, OUTPUT);
  pinMode(LED_BLUE, OUTPUT);
  
  // Initialize WiFi
  WiFi.begin("YourWiFi", "YourPassword");
  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 10) {
    delay(500);
    attempts++;
  }
  
  // Turn on system LED
  digitalWrite(LED_YELLOW, LED_ON);
  
  showMenu();
}

void loop() {
  // Update buttons
  unsigned long now = millis();
  if (now - lastDebounce >= 50) {
    lastBtnUp = btnUp;
    lastBtnEnter = btnEnter;
    lastBtnDown = btnDown;
    
    btnUp = (digitalRead(BUTTON_UP) == BUTTON_PRESSED);
    btnEnter = (digitalRead(BUTTON_ENTER) == BUTTON_PRESSED);
    btnDown = (digitalRead(BUTTON_DOWN) == BUTTON_PRESSED);
    
    // Debug button states (uncomment if needed)
    // if (btnUp || btnEnter || btnDown) {
    //   Serial.print("Buttons - UP:");
    //   Serial.print(btnUp);
    //   Serial.print(" ENTER:");
    //   Serial.print(btnEnter);
    //   Serial.print(" DOWN:");
    //   Serial.println(btnDown);
    // }
    
    lastDebounce = now;
  }
  
  // Handle button presses - immediate response
  if (btnUp && !lastBtnUp) {
    if (currentState == READY) {
      selectedEvent = (selectedEvent - 1 + eventCount) % eventCount; // Go up (decrease index)
      needsRefresh = true; // Trigger immediate refresh
      Serial.print("UP pressed - selected: ");
      Serial.println(selectedEvent);
    }
  }
  
  if (btnEnter && !lastBtnEnter) {
    if (currentState == READY) {
      startScanning();
    } else if (currentState == SCANNING) {
      stopScanning();
    }
    Serial.println("ENTER pressed");
  }
  
  if (btnDown && !lastBtnDown) {
    if (currentState == READY) {
      selectedEvent = (selectedEvent + 1) % eventCount; // Go down (increase index)
      needsRefresh = true; // Trigger immediate refresh
      Serial.print("DOWN pressed - selected: ");
      Serial.println(selectedEvent);
    }
  }
  
  // Update LEDs
  digitalWrite(LED_YELLOW, LED_ON);
  digitalWrite(LED_BLUE, isScanning ? LED_ON : LED_OFF);
  
  // Handle scanning (mock)
  if (currentState == SCANNING) {
    static unsigned long lastScan = 0;
    if (millis() - lastScan >= 5000) {
      performScan();
      lastScan = millis();
    }
  }
  
  // Update display only when needed
  if (needsRefresh) {
    updateDisplay();
    needsRefresh = false;
  }
  
  delay(10);
}

void startScanning() {
  currentState = SCANNING;
  isScanning = true;
  deviceCount = 0;
  needsRefresh = true;
  
  Serial.println("\n=== SCANNING ===");
  Serial.print("Event: ");
  Serial.println(events[selectedEvent]);
  Serial.println("Scanning...");
  Serial.println("ENTER: Stop");
}

void stopScanning() {
  currentState = READY;
  isScanning = false;
  showResults();
  showMenu();
}

void performScan() {
  // Mock scan - add fake devices
  deviceCount = 2;
  strcpy(devices[0], "12345678-1234");
  rssi[0] = -45;
  strcpy(devices[1], "87654321-4321");
  rssi[1] = -52;
  
  needsRefresh = true;
  showResults();
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
  
  Serial.println("\n=== RESULTS ===");
  Serial.print("Found: ");
  Serial.println(deviceCount);
  
  for (int i = 0; i < deviceCount; i++) {
    Serial.print(i + 1);
    Serial.print(". ");
    Serial.print(devices[i]);
    Serial.print(" (");
    Serial.print(rssi[i]);
    Serial.println(" dBm)");
  }
}

// TFT Display functions - Optimized for speed
void updateDisplay() {
  // Only update if enough time has passed and refresh is needed
  if (millis() - lastDisplayUpdate < 50) return;
  
  switch (currentState) {
    case READY:
      drawEventMenu();
      break;
    case SCANNING:
      drawScanning();
      break;
  }
  
  lastDisplayUpdate = millis();
}

void drawEventMenu() {
  // Only clear and redraw if not initialized
  if (!displayInitialized) {
    tft.fillScreen(COLOR_BLACK);
    tft.setTextColor(COLOR_WHITE, COLOR_BLACK);
    tft.setTextSize(FONT_SIZE);
    
    // Title (only draw once)
    tft.setCursor(LEFT_MARGIN, TITLE_Y);
    tft.println("EVENTS");
    tft.drawLine(LEFT_MARGIN, TITLE_Y + 10, SCREEN_WIDTH - LEFT_MARGIN, TITLE_Y + 10, COLOR_WHITE);
    
    // Instructions (only draw once)
    tft.setTextColor(COLOR_CYAN, COLOR_BLACK);
    tft.setCursor(LEFT_MARGIN, STATUS_Y - 20);
    tft.println("UP/DOWN: Select");
    tft.setCursor(LEFT_MARGIN, STATUS_Y - 10);
    tft.println("ENTER: Start");
    
    displayInitialized = true;
  }
  
  // Only redraw the event list (faster)
  for (int i = 0; i < eventCount; i++) {
    int y = MENU_START_Y + i * LINE_HEIGHT;
    
    // Clear the line first
    tft.fillRect(LEFT_MARGIN, y, SCREEN_WIDTH - LEFT_MARGIN, LINE_HEIGHT, COLOR_BLACK);
    
    tft.setCursor(LEFT_MARGIN, y);
    
    if (i == selectedEvent) {
      tft.setTextColor(COLOR_YELLOW, COLOR_BLACK);
      tft.print("> ");
    } else {
      tft.setTextColor(COLOR_WHITE, COLOR_BLACK);
      tft.print("  ");
    }
    tft.print(i + 1);
    tft.print(". ");
    tft.println(events[i]);
  }
}

void drawScanning() {
  // Always clear screen for scanning (different content)
  tft.fillScreen(COLOR_BLACK);
  tft.setTextColor(COLOR_WHITE, COLOR_BLACK);
  tft.setTextSize(FONT_SIZE);
  
  // Title
  tft.setCursor(LEFT_MARGIN, TITLE_Y);
  tft.println("SCANNING");
  tft.drawLine(LEFT_MARGIN, TITLE_Y + 10, SCREEN_WIDTH - LEFT_MARGIN, TITLE_Y + 10, COLOR_WHITE);
  
  // Event name
  tft.setCursor(LEFT_MARGIN, TITLE_Y + 20);
  tft.print("Event: ");
  tft.println(events[selectedEvent]);
  
  // Device count
  tft.setCursor(LEFT_MARGIN, TITLE_Y + 40);
  tft.print("Found: ");
  tft.println(deviceCount);
  
  // Show found devices
  for (int i = 0; i < deviceCount && i < 3; i++) {
    int y = TITLE_Y + 60 + i * LINE_HEIGHT;
    tft.setCursor(LEFT_MARGIN, y);
    tft.print(i + 1);
    tft.print(". ");
    tft.print(devices[i]);
  }
  
  // Instructions
  tft.setTextColor(COLOR_CYAN, COLOR_BLACK);
  tft.setCursor(LEFT_MARGIN, STATUS_Y - 10);
  tft.println("ENTER: Stop");
  
  // Reset display flag for next time
  displayInitialized = false;
}