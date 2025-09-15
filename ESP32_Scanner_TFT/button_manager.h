#ifndef BUTTON_MANAGER_H
#define BUTTON_MANAGER_H

#include "hardware_config.h"

class ButtonManager {
private:
  // Debounced stable states
  bool buttonUpState;
  bool buttonEnterState;
  bool buttonDownState;

  // Last reported states (for edge detection)
  bool reportedUpState;
  bool reportedEnterState;
  bool reportedDownState;

  // Raw last reads (for debouncing)
  bool lastRawUp;
  bool lastRawEnter;
  bool lastRawDown;

  // Per-button debounce timers
  unsigned long lastDebounceTimeUp;
  unsigned long lastDebounceTimeEnter;
  unsigned long lastDebounceTimeDown;

  unsigned long debounceDelay;
  
public:
  ButtonManager();
  bool begin();
  void update();
  
  // Button state checks
  bool isUpPressed();
  bool isEnterPressed();
  bool isDownPressed();
  
  // Button click detection (pressed and released)
  bool isUpClicked();
  bool isEnterClicked();
  bool isDownClicked();
  
private:
  bool readButton(int pin, bool& lastState);
};

// Global button manager instance
extern ButtonManager buttons;

#endif // BUTTON_MANAGER_H