#include "button_manager.h"

// Global instance defined in ESP32_Scanner_TFT.ino

ButtonManager::ButtonManager() {
  upPressed = false;
  downPressed = false;
  enterPressed = false;
  
  upLastState = HIGH;
  downLastState = HIGH;
  enterLastState = HIGH;
  
  lastDebounceTime = 0;
  debounceDelay = 200; // stronger debounce to avoid phantom triggers
  enterPressedAtMs = 0;
}

bool ButtonManager::begin() {
  Serial.println("Initializing buttons...");
  
  // Configure button pins with internal pullup
  pinMode(BUTTON_UP, INPUT_PULLUP);
  pinMode(BUTTON_DOWN, INPUT_PULLUP);
  pinMode(BUTTON_ENTER, INPUT_PULLUP);
  
  Serial.println("Buttons initialized successfully");
  return true;
}

void ButtonManager::update() {
  unsigned long now = millis();
  
  // Read button states
  bool upReading = readButton(BUTTON_UP);
  bool downReading = readButton(BUTTON_DOWN);
  bool enterReading = readButton(BUTTON_ENTER);
  
  // Check for state changes
  if (upReading != upLastState) {
    lastDebounceTime = now;
  }
  
  if (downReading != downLastState) {
    lastDebounceTime = now;
  }
  
  if (enterReading != enterLastState) {
    lastDebounceTime = now;
  }
  
  // Check if debounce time has passed
  if ((now - lastDebounceTime) > debounceDelay) {
    // Update button states
    upPressed = (upReading == BUTTON_PRESSED);
    downPressed = (downReading == BUTTON_PRESSED);
    bool prevEnter = enterPressed;
    enterPressed = (enterReading == BUTTON_PRESSED);
    // Track enter press start time for long-press detection
    if (enterPressed && !prevEnter) {
      enterPressedAtMs = now;
    }
  }
  
  // Update last states
  upLastState = upReading;
  downLastState = downReading;
  enterLastState = enterReading;
}

bool ButtonManager::isUpPressed() {
  return upPressed;
}

bool ButtonManager::isDownPressed() {
  return downPressed;
}

bool ButtonManager::isEnterPressed() {
  return enterPressed;
}

bool ButtonManager::isEnterHeld(unsigned long requiredHoldMs) {
  if (!enterPressed) return false;
  return (millis() - enterPressedAtMs) >= requiredHoldMs;
}

bool ButtonManager::readButton(int pin) {
  return digitalRead(pin);
}