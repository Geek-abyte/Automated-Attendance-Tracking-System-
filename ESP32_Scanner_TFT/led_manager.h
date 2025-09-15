#ifndef LED_MANAGER_H
#define LED_MANAGER_H

#include "hardware_config.h"

class LEDManager {
private:
  bool deviceOnState;
  bool scanningState;
  unsigned long lastBlinkTime;
  bool blinkState;
  unsigned long blinkInterval;
  
public:
  LEDManager();
  bool begin();
  void update();
  
  // LED control
  void setDeviceOn(bool state);
  void setScanning(bool state);
  void setDeviceOnBlink(bool blink, unsigned long interval = 500);
  void setScanningBlink(bool blink, unsigned long interval = 200);
  
  // Combined control
  void turnOffAll();
  void setSystemState(bool deviceOn, bool scanning);
  
private:
  void updateBlinking();
};

// Global LED manager instance
extern LEDManager leds;

#endif // LED_MANAGER_H