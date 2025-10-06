#include "ble_scanner.h"

// Global instance defined in ESP32_Scanner_TFT.ino

// Callback implementation
BLEScanner::MyAdvertisedDeviceCallbacks::MyAdvertisedDeviceCallbacks(BLEScanner* scanner) {
  this->scanner = scanner;
}

void BLEScanner::MyAdvertisedDeviceCallbacks::onResult(BLEAdvertisedDevice advertisedDevice) {
  if (scanner) {
    scanner->onDeviceFound(advertisedDevice);
  }
}

BLEScanner::BLEScanner() {
  pBLEScan = nullptr;
  uuidFilter = "ATT-"; // Default filter for attendance devices
  scanDuration = BLE_SCAN_DURATION;
  activeScan = true;
  initialized = false;
  totalScans = 0;
  totalDevicesFound = 0;
  lastDedupeReset = millis();
  callbacks = nullptr;
}

BLEScanner::~BLEScanner() {
  end();
}

bool BLEScanner::begin() {
  if (initialized) {
    return true;
  }
  
  Serial.println("Initializing BLE Scanner...");
  
  // Initialize BLE
  BLEDevice::init("ESP32-Scanner");
  
  // Create scan object
  pBLEScan = BLEDevice::getScan();
  if (!pBLEScan) {
    Serial.println("Failed to create BLE scan object");
    return false;
  }
  
  // Create callback
  callbacks = new MyAdvertisedDeviceCallbacks(this);
  
  // Configure scan parameters
  pBLEScan->setAdvertisedDeviceCallbacks(callbacks);
  pBLEScan->setActiveScan(activeScan);
  pBLEScan->setInterval(100);
  pBLEScan->setWindow(99);
  
  initialized = true;
  Serial.println("BLE Scanner initialized successfully");
  return true;
}

void BLEScanner::end() {
  if (initialized) {
    if (callbacks) {
      delete callbacks;
      callbacks = nullptr;
    }
    BLEDevice::deinit(false);
    initialized = false;
    Serial.println("BLE Scanner deinitialized");
  }
}

std::vector<ScannedDevice> BLEScanner::scan() {
  if (!initialized) {
    return std::vector<ScannedDevice>();
  }
  
  // Reset deduplication for this scan window (per-scan dedupe)
  recentDevices.clear();
  lastDedupeReset = millis();
  
  // Clear previous results
  foundDevices.clear();
  
  Serial.println("Starting BLE scan for " + String(scanDuration) + "ms...");
  
  // Start scan (non-blocking)
  pBLEScan->start(scanDuration / 1000, false); // Convert ms to seconds
  totalScans++;
  
  // Wait for scan to complete, but check frequently for stop request
  unsigned long scanStart = millis();
  while (millis() - scanStart < scanDuration) {
    delay(100); // Check every 100ms
    // Note: stopScanRequested is checked in calling code
  }
  
  // Stop scan
  pBLEScan->stop();
  
  // Update statistics
  totalDevicesFound += foundDevices.size();
  
  Serial.println("BLE scan completed. Found " + String(foundDevices.size()) + " devices");
  
  return foundDevices;
}

void BLEScanner::setScanDuration(unsigned long duration) {
  scanDuration = duration;
}

void BLEScanner::setActiveScan(bool active) {
  activeScan = active;
  if (pBLEScan) {
    pBLEScan->setActiveScan(activeScan);
  }
}

void BLEScanner::setUUIDFilter(const String& prefix) {
  uuidFilter = prefix;
}

int BLEScanner::getTotalScans() {
  return totalScans;
}

int BLEScanner::getTotalDevicesFound() {
  return totalDevicesFound;
}

void BLEScanner::resetStatistics() {
  totalScans = 0;
  totalDevicesFound = 0;
}

void BLEScanner::resetDeduplication() {
  // Reset deduplication every 5 minutes
  if (millis() - lastDedupeReset > 300000) {
    recentDevices.clear();
    lastDedupeReset = millis();
    Serial.println("BLE deduplication reset");
  }
}

bool BLEScanner::shouldIncludeDevice(BLEAdvertisedDevice& device) {
  // Check RSSI threshold first (performance)
  if (device.getRSSI() < -80) { // -80 dBm threshold
    return false;
  }
  
  // Extract UUID up front (manufacturer data preferred)
  String uuid = extractUUID(device);
  if (uuid.length() == 0) {
    return false;
  }
  
  // Accept if either:
  // - We detect our service UUID, OR
  // - Device name matches filter, OR
  // - Extracted UUID starts with our prefix (manufacturer data path)
  bool hasServiceUuid = false;
  if (device.haveServiceUUID()) {
    BLEUUID serviceUuid("0000FFF0-0000-1000-8000-00805F9B34FB");
    hasServiceUuid = device.isAdvertisingService(serviceUuid);
  }
  
  bool nameMatches = false;
  String name = String(device.getName().c_str());
  if (name.length() > 0 && uuidFilter.length() > 0) {
    nameMatches = name.startsWith(uuidFilter);
  }
  
  bool uuidMatches = uuid.startsWith("ATT-");
  if (!hasServiceUuid && !nameMatches && !uuidMatches) {
    return false;
  }
  
  // Check deduplication by extracted UUID
  if (recentDevices.find(uuid) != recentDevices.end()) {
    return false;
  }
  recentDevices.insert(uuid);
  
  return true;
}

String BLEScanner::extractUUID(BLEAdvertisedDevice& device) {
  // First, try to get UUID from manufacturer data (react-native-ble-advertiser format)
  if (device.haveManufacturerData()) {
    try {
      std::string manufacturerData = device.getManufacturerData();
      
      if (manufacturerData.length() >= 2) {
        // Skip first 2 bytes (company ID: 0xFFFF)
        // Convert remaining bytes to string (user ID)
        String uuid = "";
        for (size_t i = 2; i < manufacturerData.length(); i++) {
          uuid += (char)manufacturerData[i];
        }
        uuid.trim();
        
        // Check if it looks like our UUID format (ATT-USER-XXXXXXXX)
        if (uuid.length() > 0 && uuid.startsWith("ATT-")) {
          Serial.println("Extracted UUID from manufacturer data: " + uuid);
          return uuid;
        }
      }
    } catch (...) {
      // If manufacturer data extraction fails, fall through
    }
  }
  
  // Second, try to get UUID from service data (backup method)
  if (device.haveServiceData()) {
    try {
      std::string serviceData = device.getServiceData();
      
      if (serviceData.length() > 0) {
        String uuid = "";
        for (size_t i = 0; i < serviceData.length(); i++) {
          uuid += (char)serviceData[i];
        }
        uuid.trim();
        
        if (uuid.length() > 0 && uuid.startsWith("ATT-")) {
          Serial.println("Extracted UUID from service data: " + uuid);
          return uuid;
        }
      }
    } catch (...) {
      // Fall through to device name
    }
  }
  
  // Fallback: use device name as UUID (primary method for Classic BT compatibility)
  String name = String(device.getName().c_str());
  name.trim();
  return name;
}

void BLEScanner::onDeviceFound(BLEAdvertisedDevice& device) {
  if (shouldIncludeDevice(device)) {
    ScannedDevice scannedDevice;
    scannedDevice.uuid = extractUUID(device);
    scannedDevice.name = String(device.getName().c_str());
    scannedDevice.rssi = device.getRSSI();
    scannedDevice.address = String(device.getAddress().toString().c_str());
    scannedDevice.timestamp = millis();
    
    foundDevices.push_back(scannedDevice);
    
    Serial.println("Found BLE device: " + scannedDevice.name + " (RSSI: " + String(scannedDevice.rssi) + ")");
  }
}
