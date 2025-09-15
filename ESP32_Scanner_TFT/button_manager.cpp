#include "button_manager.h"

// Global instance defined in ESP32_Scanner_TFT.ino

ButtonManager::ButtonManager() {
  buttonUpState = BUTTON_RELEASED;
  buttonEnterState = BUTTON_RELEASED;
  buttonDownState = BUTTON_RELEASED;
  reportedUpState = BUTTON_RELEASED;
  reportedEnterState = BUTTON_RELEASED;
  reportedDownState = BUTTON_RELEASED;
  lastRawUp = BUTTON_RELEASED;
  lastRawEnter = BUTTON_RELEASED;
  lastRawDown = BUTTON_RELEASED;
  lastDebounceTimeUp = 0;
  lastDebounceTimeEnter = 0;
  lastDebounceTimeDown = 0;
  debounceDelay = 50; // 50ms debounce delay
}

bool ButtonManager::begin() {
  // Configure button pins with internal pullup
  // GPIO35 has no internal pull-up
  if (BUTTON_UP == 34 || BUTTON_UP == 35 || BUTTON_UP == 36 || BUTTON_UP == 39) {
    pinMode(BUTTON_UP, INPUT);
  } else {
    pinMode(BUTTON_UP, INPUT_PULLUP);
  }
  pinMode(BUTTON_ENTER, INPUT_PULLUP);
  pinMode(BUTTON_DOWN, INPUT_PULLUP);
  
  // Read initial states
  lastRawUp = digitalRead(BUTTON_UP);
  lastRawEnter = digitalRead(BUTTON_ENTER);
  lastRawDown = digitalRead(BUTTON_DOWN);
  buttonUpState = lastRawUp;
  buttonEnterState = lastRawEnter;
  buttonDownState = lastRawDown;
  
  Serial.println("Buttons initialized with internal pullup");
  return true;
}

void ButtonManager::update() {
  unsigned long now = millis();
  
  // Update UP with per-button debouncing
  bool currentUp = digitalRead(BUTTON_UP);
  if (currentUp != lastRawUp) {
    lastDebounceTimeUp = now;
    lastRawUp = currentUp;
  }
  if ((now - lastDebounceTimeUp) > debounceDelay) {
    buttonUpState = currentUp;
  }

  // Update ENTER
  bool currentEnter = digitalRead(BUTTON_ENTER);
  if (currentEnter != lastRawEnter) {
    lastDebounceTimeEnter = now;
    lastRawEnter = currentEnter;
  }
  if ((now - lastDebounceTimeEnter) > debounceDelay) {
    buttonEnterState = currentEnter;
  }

  // Update DOWN
  bool currentDown = digitalRead(BUTTON_DOWN);
  if (currentDown != lastRawDown) {
    lastDebounceTimeDown = now;
    lastRawDown = currentDown;
  }
  if ((now - lastDebounceTimeDown) > debounceDelay) {
    buttonDownState = currentDown;
  }
}

bool ButtonManager::isUpPressed() {
  return buttonUpState == BUTTON_PRESSED;
}

bool ButtonManager::isEnterPressed() {
  return buttonEnterState == BUTTON_PRESSED;
}

bool ButtonManager::isDownPressed() {
  return buttonDownState == BUTTON_PRESSED;
}

bool ButtonManager::isUpClicked() {
  bool clicked = (buttonUpState == BUTTON_PRESSED && reportedUpState == BUTTON_RELEASED);
  reportedUpState = buttonUpState;
  return clicked;
}

bool ButtonManager::isEnterClicked() {
  bool clicked = (buttonEnterState == BUTTON_PRESSED && reportedEnterState == BUTTON_RELEASED);
  reportedEnterState = buttonEnterState;
  return clicked;
}

bool ButtonManager::isDownClicked() {
  bool clicked = (buttonDownState == BUTTON_PRESSED && reportedDownState == BUTTON_RELEASED);
  reportedDownState = buttonDownState;
  return clicked;
}

bool ButtonManager::readButton(int pin, bool& lastState) {
  return digitalRead(pin);
}