#ifndef BLE_SCANNER_H
#define BLE_SCANNER_H

#include <BLEDevice.h>
#include <BLEScan.h>
#include <BLEAdvertisedDevice.h>
#include <vector>
#include <set>
#include "hardware_config.h"
#include "common_types.h"

class BLEScanner {
private:
  BLEScan* pBLEScan;
  String uuidFilter;
  unsigned long scanDuration;
  bool activeScan;
  bool initialized;
  
  // Statistics
  int totalScans;
  int totalDevicesFound;
  
  // Deduplication
  std::set<String> recentDevices;
  unsigned long lastDedupeReset;
  
  // Callback for scan results
  class MyAdvertisedDeviceCallbacks : public BLEAdvertisedDeviceCallbacks {
  public:
    MyAdvertisedDeviceCallbacks(BLEScanner* scanner);
    void onResult(BLEAdvertisedDevice advertisedDevice);
    
  private:
    BLEScanner* scanner;
  };
  
  MyAdvertisedDeviceCallbacks* callbacks;
  std::vector<ScannedDevice> foundDevices;
  
public:
  BLEScanner();
  ~BLEScanner();
  
  bool begin();
  void end();
  
  // Scanning
  std::vector<ScannedDevice> scan();
  void setScanDuration(unsigned long duration);
  void setActiveScan(bool active);
  void setUUIDFilter(const String& prefix);
  
  // Statistics
  int getTotalScans();
  int getTotalDevicesFound();
  void resetStatistics();
  
private:
  void resetDeduplication();
  bool shouldIncludeDevice(BLEAdvertisedDevice& device);
  String extractUUID(BLEAdvertisedDevice& device);
  void onDeviceFound(BLEAdvertisedDevice& device);
};

// Global BLE scanner instance
extern BLEScanner bleScanner;

#endif // BLE_SCANNER_H
