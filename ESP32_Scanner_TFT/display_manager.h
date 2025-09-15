#ifndef DISPLAY_MANAGER_H
#define DISPLAY_MANAGER_H

#include "hardware_config.h"
#include "common_types.h"

class DisplayManager {
private:
  Adafruit_ST7735 tft;
  int selectedIndex;
  int maxItems;
  bool needsRefresh;
  unsigned long lastUpdate;
  
  // Event list
  Event events[MAX_EVENTS];
  int eventCount;
  
  // Display states
  enum DisplayState {
    STATE_STARTUP,
    STATE_LOADING,
    STATE_EVENT_LIST,
    STATE_EVENT_SELECTED,
    STATE_SCANNING,
    STATE_ERROR
  };
  
  DisplayState currentState;
  String statusMessage;
  int scanCount;
  unsigned long lastScanTime;
  
public:
  DisplayManager();
  bool begin();
  void update();
  
  // Navigation
  void navigateUp();
  void navigateDown();
  int getSelectedIndex();
  
  // Display states
  void showStartup();
  void showLoading(const String& message);
  void showEventList(const Event* events, int count);
  void showEventSelected(const String& eventName);
  void showScanning(const String& eventName);
  void showError(const String& message);
  
  // Private drawing methods
  void drawStartupScreen();
  
  // Updates
  void updateScanResults(int deviceCount);
  void showAttendanceRecorded(const String& deviceName);
  
  // Event management
  void setEvents(const Event* events, int count);
  
private:
  void refresh();
  void clearScreen();
  void drawTitle(const String& title);
  void drawMenu();
  void drawStatus(const String& status);
  void drawScanningAnimation();
  void drawEventList();
  void drawEventSelected();
  void drawScanningScreen();
  void drawErrorScreen();
  void drawLoadingScreen();
};

// Global display manager instance
extern DisplayManager display;

#endif // DISPLAY_MANAGER_H