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
    STATE_WIFI_CONNECTING,
    STATE_WIFI_CONNECTED,
    STATE_LOADING,
    STATE_EVENT_LIST,
    STATE_EVENT_SELECTED,
    STATE_SCANNING,
    STATE_ERROR
  };
  
  DisplayState currentState;
  String statusMessage;
  int scanCount;
  
public:
  DisplayManager();
  bool begin();
  void update();
  
  // Navigation
  void navigateUp();
  void navigateDown();
  int getSelectedIndex();
  
  // Display states
  void showWiFiConnecting(const String& ssid);
  void showWiFiConnected(const String& ip);
  void showLoading(const String& message);
  void showEventList(const Event* events, int count);
  void showEventSelected(const String& eventName);
  void showScanning(const String& eventName);
  void showError(const String& message);
  
  // Updates
  void updateScanResults(int deviceCount);
  void showAttendanceRecorded(const String& deviceName);
  
private:
  void refresh();
  void clearScreen();
  void drawTitle(const String& title);
  void drawStatus(const String& status);
  void drawEventList();
  void drawEventSelected();
  void drawScanningScreen();
  void drawErrorScreen();
  void drawLoadingScreen();
  void drawWiFiConnecting();
  void drawWiFiConnected();
};

// Global display manager instance
extern DisplayManager display;

#endif // DISPLAY_MANAGER_H