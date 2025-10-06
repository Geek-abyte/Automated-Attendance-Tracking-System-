#ifndef LED_MANAGER_H
#define LED_MANAGER_H

#include "hardware_config.h"

class LEDManager {
private:
  bool systemOn;
  bool scanning;
  
  unsigned long lastBlink;
  bool blinkState;
  
public:
  LEDManager();
  bool begin();
  void update();
  
  // LED control
  void setSystemState(bool on, bool scanning);
  void setSystemOn(bool on);
  void setScanning(bool scanning);
  
private:
  void updateLEDs();
};

// Global LED manager instance
extern LEDManager leds;

#endif // LED_MANAGER_H