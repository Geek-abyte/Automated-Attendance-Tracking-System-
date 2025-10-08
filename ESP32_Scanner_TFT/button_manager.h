#ifndef BUTTON_MANAGER_H
#define BUTTON_MANAGER_H

#include "hardware_config.h"

// Enable to print button edge diagnostics to Serial
#ifndef BUTTON_DEBUG
#define BUTTON_DEBUG 1
#endif

class ButtonManager {
private:
  bool upPressed;
  bool downPressed;
  bool enterPressed;
  
  bool upLastState;
  bool downLastState;
  bool enterLastState;
  
  // Per-button debounce
  unsigned long upLastDebounceTime;
  unsigned long downLastDebounceTime;
  unsigned long enterLastDebounceTime;
  unsigned long debounceDelay;
  unsigned long enterPressedAtMs;
  
  // Edge-triggered navigation events with auto-repeat
  bool upEventPending;
  bool downEventPending;
  bool enterEventPending;
  unsigned long upPressStartMs;
  unsigned long downPressStartMs;
  unsigned long upLastRepeatMs;
  unsigned long downLastRepeatMs;
  unsigned long repeatStartDelayMs; // initial delay before repeat
  unsigned long repeatIntervalMs;   // repeat rate
  
public:
  ButtonManager();
  bool begin();
  void update();
  
  // Button state queries
  bool isUpPressed();
  bool isDownPressed();
  bool isEnterPressed();
  bool isEnterHeld(unsigned long requiredHoldMs);
  
  // One-shot navigation events (includes auto-repeat)
  bool pollUpEvent();   // returns true once per click/repeat
  bool pollDownEvent(); // returns true once per click/repeat
  bool pollEnterEvent(); // returns true once per press (edge)
  
private:
  bool readButton(int pin);
};

// Global button manager instance
extern ButtonManager buttons;

#endif // BUTTON_MANAGER_H