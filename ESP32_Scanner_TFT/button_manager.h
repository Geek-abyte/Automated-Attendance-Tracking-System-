#ifndef BUTTON_MANAGER_H
#define BUTTON_MANAGER_H

#include "hardware_config.h"

class ButtonManager {
private:
  bool upPressed;
  bool downPressed;
  bool enterPressed;
  
  bool upLastState;
  bool downLastState;
  bool enterLastState;
  
  unsigned long lastDebounceTime;
  unsigned long debounceDelay;
  unsigned long enterPressedAtMs;
  
public:
  ButtonManager();
  bool begin();
  void update();
  
  // Button state queries
  bool isUpPressed();
  bool isDownPressed();
  bool isEnterPressed();
  bool isEnterHeld(unsigned long requiredHoldMs);
  
private:
  bool readButton(int pin);
};

// Global button manager instance
extern ButtonManager buttons;

#endif // BUTTON_MANAGER_H