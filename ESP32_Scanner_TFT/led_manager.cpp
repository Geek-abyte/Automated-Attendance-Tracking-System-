#include "led_manager.h"

// Global instance defined in ESP32_Scanner_TFT.ino

LEDManager::LEDManager() {
  systemOn = false;
  scanning = false;
  lastBlink = 0;
  blinkState = false;
}

bool LEDManager::begin() {
  Serial.println("Initializing LEDs...");
  
  // Configure LED pins
  pinMode(LED_YELLOW, OUTPUT);
  pinMode(LED_BLUE, OUTPUT);
  
  // Turn off LEDs initially
  digitalWrite(LED_YELLOW, LED_OFF);
  digitalWrite(LED_BLUE, LED_OFF);
  
  Serial.println("LEDs initialized successfully");
  return true;
}

void LEDManager::update() {
  updateLEDs();
}

void LEDManager::setSystemState(bool on, bool scan) {
  systemOn = on;
  scanning = scan;
}

void LEDManager::setSystemOn(bool on) {
  systemOn = on;
}

void LEDManager::setScanning(bool scan) {
  scanning = scan;
}

void LEDManager::updateLEDs() {
  unsigned long now = millis();
  
  // Yellow LED: System on indicator (solid when on)
  if (systemOn) {
    digitalWrite(LED_YELLOW, LED_ON);
  } else {
    digitalWrite(LED_YELLOW, LED_OFF);
  }
  
  // Blue LED: Scanning indicator (blinking when scanning)
  if (scanning) {
    if (now - lastBlink >= 500) { // Blink every 500ms
      blinkState = !blinkState;
      lastBlink = now;
    }
    digitalWrite(LED_BLUE, blinkState ? LED_ON : LED_OFF);
  } else {
    digitalWrite(LED_BLUE, LED_OFF);
  }
}