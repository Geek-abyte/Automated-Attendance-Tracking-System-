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
  
  // Reset deduplication if needed
  resetDeduplication();
  
  // Clear previous results
  foundDevices.clear();
  
  Serial.println("Starting BLE scan for " + String(scanDuration) + "ms...");
  
  // Start scan
  pBLEScan->start(scanDuration, false);
  totalScans++;
  
  // Wait for scan to complete
  delay(scanDuration + 100);
  
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
  // Check if device has a name
  String name = device.getName();
  if (name.length() == 0) {
    return false;
  }
  
  // Check UUID filter
  if (uuidFilter.length() > 0 && !name.startsWith(uuidFilter)) {
    return false;
  }
  
  // Check RSSI threshold
  if (device.getRSSI() < -80) { // -80 dBm threshold
    return false;
  }
  
  // Check deduplication
  String uuid = extractUUID(device);
  if (recentDevices.find(uuid) != recentDevices.end()) {
    return false;
  }
  
  // Add to recent devices
  recentDevices.insert(uuid);
  
  return true;
}

String BLEScanner::extractUUID(BLEAdvertisedDevice& device) {
  // Use device name as UUID (same as Python scanner)
  String name = device.getName();
  name.trim();
  return name;
}

void BLEScanner::onDeviceFound(BLEAdvertisedDevice& device) {
  if (shouldIncludeDevice(device)) {
    ScannedDevice scannedDevice;
    scannedDevice.uuid = extractUUID(device);
    scannedDevice.name = device.getName();
    scannedDevice.rssi = device.getRSSI();
    scannedDevice.address = device.getAddress().toString();
    scannedDevice.timestamp = millis();
    
    foundDevices.push_back(scannedDevice);
    
    Serial.println("Found BLE device: " + scannedDevice.name + " (RSSI: " + String(scannedDevice.rssi) + ")");
  }
}
