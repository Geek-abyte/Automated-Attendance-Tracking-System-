#include "led_manager.h"

// Global instance defined in ESP32_Scanner_TFT.ino

LEDManager::LEDManager() {
  deviceOnState = false;
  scanningState = false;
  lastBlinkTime = 0;
  blinkState = false;
  blinkInterval = 500;
}

bool LEDManager::begin() {
  // Configure LED pins as outputs
  pinMode(LED_YELLOW, OUTPUT);
  pinMode(LED_BLUE, OUTPUT);
  
  // Turn off all LEDs initially
  turnOffAll();
  
  Serial.println("LEDs initialized");
  return true;
}

void LEDManager::update() {
  updateBlinking();
}

void LEDManager::setDeviceOn(bool state) {
  deviceOnState = state;
  if (state) {
    digitalWrite(LED_YELLOW, LED_ON);
  } else {
    digitalWrite(LED_YELLOW, LED_OFF);
  }
}

void LEDManager::setScanning(bool state) {
  scanningState = state;
  if (state) {
    digitalWrite(LED_BLUE, LED_ON);
  } else {
    digitalWrite(LED_BLUE, LED_OFF);
  }
}

void LEDManager::setDeviceOnBlink(bool blink, unsigned long interval) {
  if (blink) {
    blinkInterval = interval;
    // Yellow LED will blink based on deviceOnState
  } else {
    // Stop blinking, set to current state
    setDeviceOn(deviceOnState);
  }
}

void LEDManager::setScanningBlink(bool blink, unsigned long interval) {
  if (blink) {
    blinkInterval = interval;
    // Blue LED will blink based on scanningState
  } else {
    // Stop blinking, set to current state
    setScanning(scanningState);
  }
}

void LEDManager::turnOffAll() {
  setDeviceOn(false);
  setScanning(false);
}

void LEDManager::setSystemState(bool deviceOn, bool scanning) {
  deviceOnState = deviceOn;
  scanningState = scanning;
  
  // Update LEDs based on states
  if (deviceOn) {
    digitalWrite(LED_YELLOW, LED_ON);
  } else {
    digitalWrite(LED_YELLOW, LED_OFF);
  }
  
  if (scanning) {
    digitalWrite(LED_BLUE, LED_ON);
  } else {
    digitalWrite(LED_BLUE, LED_OFF);
  }
}

void LEDManager::updateBlinking() {
  unsigned long now = millis();
  
  if (now - lastBlinkTime >= blinkInterval) {
    blinkState = !blinkState;
    lastBlinkTime = now;
    
    // Update LEDs based on current state and blink mode
    if (deviceOnState) {
      digitalWrite(LED_YELLOW, blinkState ? LED_ON : LED_OFF);
    }
    if (scanningState) {
      digitalWrite(LED_BLUE, blinkState ? LED_ON : LED_OFF);
    }
  }
}