#include "button_manager.h"

// Global instance defined in ESP32_Scanner_TFT.ino

ButtonManager::ButtonManager() {
  upPressed = false;
  downPressed = false;
  enterPressed = false;
  
  upLastState = HIGH;
  downLastState = HIGH;
  enterLastState = HIGH;
  
  upLastDebounceTime = 0;
  downLastDebounceTime = 0;
  enterLastDebounceTime = 0;
  debounceDelay = 70; // slightly stronger debounce
  enterPressedAtMs = 0;
  
  upEventPending = false;
  downEventPending = false;
  enterEventPending = false;
  upPressStartMs = 0;
  downPressStartMs = 0;
  upLastRepeatMs = 0;
  downLastRepeatMs = 0;
  repeatStartDelayMs = 400; // start repeating after 400ms hold
  repeatIntervalMs = 120;   // then repeat every 120ms
}

bool ButtonManager::begin() {
  Serial.println("Initializing buttons...");
  
  // Configure button pins with internal pullup
  // BUTTON_UP now uses a pull-up-capable GPIO; enable internal pull-up
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
    upLastDebounceTime = now;
  }
  
  if (downReading != downLastState) {
    downLastDebounceTime = now;
  }
  
  if (enterReading != enterLastState) {
    enterLastDebounceTime = now;
  }
  
  // Debounce each button independently
  bool upStable = (now - upLastDebounceTime) > debounceDelay;
  bool downStable = (now - downLastDebounceTime) > debounceDelay;
  bool enterStable = (now - enterLastDebounceTime) > debounceDelay;
  
  bool prevUpPressed = upPressed;
  bool prevDownPressed = downPressed;
  bool prevEnterPressed = enterPressed;
  
  if (upStable) {
    upPressed = (upReading == BUTTON_PRESSED);
  }
  if (downStable) {
    downPressed = (downReading == BUTTON_PRESSED);
  }
  if (enterStable) {
    enterPressed = (enterReading == BUTTON_PRESSED);
  }
  
  // Track enter press start time for long-press detection
  if (enterPressed && !prevEnterPressed) {
    enterPressedAtMs = now;
    enterEventPending = true; // edge event
    #if BUTTON_DEBUG
    Serial.println("[BTN] ENTER pressed");
    #endif
  } else if (!enterPressed && prevEnterPressed) {
    #if BUTTON_DEBUG
    Serial.println("[BTN] ENTER released");
    #endif
  }
  
  // Edge-triggered navigation events with auto-repeat
  // UP
  if (upPressed && !prevUpPressed) {
    upEventPending = true;         // initial click
    upPressStartMs = now;
    upLastRepeatMs = now;
    #if BUTTON_DEBUG
    Serial.println("[BTN] UP pressed");
    #endif
  } else if (upPressed && prevUpPressed) {
    if (now - upPressStartMs >= repeatStartDelayMs && now - upLastRepeatMs >= repeatIntervalMs) {
      upEventPending = true;       // repeat event
      upLastRepeatMs = now;
      #if BUTTON_DEBUG
      Serial.println("[BTN] UP repeat");
      #endif
    }
  } else if (!upPressed && prevUpPressed) {
    #if BUTTON_DEBUG
    Serial.println("[BTN] UP released");
    #endif
  }
  
  // DOWN
  if (downPressed && !prevDownPressed) {
    downEventPending = true;       // initial click
    downPressStartMs = now;
    downLastRepeatMs = now;
    #if BUTTON_DEBUG
    Serial.println("[BTN] DOWN pressed");
    #endif
  } else if (downPressed && prevDownPressed) {
    if (now - downPressStartMs >= repeatStartDelayMs && now - downLastRepeatMs >= repeatIntervalMs) {
      downEventPending = true;     // repeat event
      downLastRepeatMs = now;
      #if BUTTON_DEBUG
      Serial.println("[BTN] DOWN repeat");
      #endif
    }
  } else if (!downPressed && prevDownPressed) {
    #if BUTTON_DEBUG
    Serial.println("[BTN] DOWN released");
    #endif
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

bool ButtonManager::pollUpEvent() {
  if (upEventPending) {
    upEventPending = false;
    return true;
  }
  return false;
}

bool ButtonManager::pollDownEvent() {
  if (downEventPending) {
    downEventPending = false;
    return true;
  }
  return false;
}

bool ButtonManager::pollEnterEvent() {
  if (enterEventPending) {
    enterEventPending = false;
    return true;
  }
  return false;
}

bool ButtonManager::readButton(int pin) {
  return digitalRead(pin);
}