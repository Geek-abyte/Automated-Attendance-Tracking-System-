# API Reference

This document provides detailed information about the ESP32 Scanner API.

## Web Interface API

### Dashboard Endpoints

#### GET /
Returns the main dashboard HTML page.

**Response:** HTML page with real-time dashboard

#### GET /dashboard
Returns the dashboard page (same as root).

**Response:** HTML page with dashboard interface

### Configuration Endpoints

#### GET /config
Returns the configuration page HTML.

**Response:** HTML page with configuration form

#### POST /config
Updates the device configuration.

**Request Body:**
```json
{
  "wifi_ssid": "string",
  "wifi_password": "string",
  "backend_url": "string",
  "api_key": "string",
  "scanner_id": "string",
  "event_id": "string",
  "uuid_prefix": "string",
  "scan_interval": "number"
}
```

**Response:** 302 Redirect to /config

### Logs Endpoints

#### GET /logs
Returns the logs page HTML.

**Response:** HTML page with attendance logs

### Sync Endpoints

#### POST /sync
Manually triggers data synchronization.

**Response:**
```json
{
  "success": true,
  "message": "Sync completed",
  "processed": 10,
  "successful": 8,
  "duplicates": 1,
  "errors": 1
}
```

### System Endpoints

#### GET /system
Returns the system information page HTML.

**Response:** HTML page with system information

## JSON API Endpoints

### Dashboard API

#### GET /api/dashboard
Returns real-time dashboard data.

**Response:**
```json
{
  "status": 2,
  "statusText": "Connected",
  "statusClass": "connected",
  "errorCode": 0,
  "errorMessage": "",
  "totalScans": 150,
  "devicesFound": 45,
  "recordsLogged": 38,
  "recordsSynced": 35,
  "lastSyncSuccess": 1640995200000,
  "uptime": 3600000
}
```

**Status Codes:**
- 0: Initializing
- 1: WiFi Connecting
- 2: WiFi Connected
- 3: BLE Scanning
- 4: Syncing
- 5: Error
- 6: Offline

### Configuration API

#### GET /api/config
Returns current configuration.

**Response:**
```json
{
  "wifi_ssid": "MyWiFi",
  "wifi_password": "***",
  "backend_url": "http://backend.com/http",
  "api_key": "***",
  "scanner_id": "ESP32-Scanner-01",
  "event_id": "event123",
  "uuid_prefix": "ATT",
  "scan_interval": "5"
}
```

### Logs API

#### GET /api/logs
Returns attendance logs.

**Response:**
```json
{
  "records": [
    {
      "bleUuid": "device-uuid-1",
      "timestamp": 1640995200000,
      "eventId": "event123",
      "scannerSource": "ESP32-Scanner-01",
      "rssi": -65,
      "deviceName": "iPhone",
      "deviceAddress": "AA:BB:CC:DD:EE:FF"
    }
  ],
  "totalRecords": 1,
  "logFileSize": 1024
}
```

### Sync API

#### POST /api/sync
Manually triggers data synchronization.

**Response:**
```json
{
  "success": true,
  "message": "Sync completed",
  "processed": 10,
  "successful": 8,
  "duplicates": 1,
  "errors": 1
}
```

### System API

#### GET /api/system
Returns system information.

**Response:**
```json
{
  "chipModel": "ESP32-D0WDQ6",
  "chipRevision": 1,
  "cpuFreq": 240,
  "flashSize": 4,
  "freeHeap": 200000,
  "uptime": "1d 2h 30m 45s",
  "wifiSSID": "MyWiFi",
  "wifiIP": "192.168.1.100",
  "wifiRSSI": -45,
  "wifiStatus": 3,
  "storageTotal": 1500000,
  "storageUsed": 500000,
  "storageFree": 1000000,
  "logFileSize": 25000
}
```

## C++ API Reference

### WiFiManager Class

#### Constructor
```cpp
WiFiManager();
```

#### Methods

##### begin()
```cpp
bool begin();
```
Initializes the WiFi manager.

**Returns:** `true` if successful, `false` otherwise

##### connect()
```cpp
bool connect(const String& ssid, const String& password);
```
Connects to a WiFi network.

**Parameters:**
- `ssid`: WiFi network name
- `password`: WiFi password

**Returns:** `true` if successful, `false` otherwise

##### isConnected()
```cpp
bool isConnected();
```
Checks if WiFi is connected.

**Returns:** `true` if connected, `false` otherwise

##### getIPAddress()
```cpp
String getIPAddress();
```
Gets the current IP address.

**Returns:** IP address as string

### BLEScanner Class

#### Constructor
```cpp
BLEScanner();
```

#### Methods

##### begin()
```cpp
bool begin();
```
Initializes the BLE scanner.

**Returns:** `true` if successful, `false` otherwise

##### scan()
```cpp
std::vector<BLEDevice> scan();
```
Performs a BLE scan.

**Returns:** Vector of found BLE devices

##### setScanDuration()
```cpp
void setScanDuration(uint32_t duration);
```
Sets the scan duration in milliseconds.

**Parameters:**
- `duration`: Scan duration in ms

##### setUUIDFilter()
```cpp
void setUUIDFilter(const String& uuidPrefix);
```
Sets the UUID prefix filter.

**Parameters:**
- `uuidPrefix`: Prefix to filter devices

### HTTPClient Class

#### Constructor
```cpp
HTTPClient();
```

#### Methods

##### begin()
```cpp
void begin();
```
Initializes the HTTP client.

##### setBaseURL()
```cpp
void setBaseURL(const String& url);
```
Sets the backend base URL.

**Parameters:**
- `url`: Backend URL

##### setAPIKey()
```cpp
void setAPIKey(const String& key);
```
Sets the API key.

**Parameters:**
- `key`: API key

##### syncRecords()
```cpp
HTTPResult syncRecords(const std::vector<JsonDocument>& records);
```
Syncs records to the backend.

**Parameters:**
- `records`: Vector of records to sync

**Returns:** HTTPResult with sync status

### Storage Class

#### Constructor
```cpp
Storage();
```

#### Methods

##### begin()
```cpp
bool begin();
```
Initializes the storage system.

**Returns:** `true` if successful, `false` otherwise

##### loadConfig()
```cpp
bool loadConfig();
```
Loads configuration from storage.

**Returns:** `true` if successful, `false` otherwise

##### saveConfig()
```cpp
bool saveConfig();
```
Saves configuration to storage.

**Returns:** `true` if successful, `false` otherwise

##### setConfigValue()
```cpp
void setConfigValue(const String& key, const String& value);
```
Sets a configuration value.

**Parameters:**
- `key`: Configuration key
- `value`: Configuration value

##### getConfigValue()
```cpp
String getConfigValue(const String& key);
```
Gets a configuration value.

**Parameters:**
- `key`: Configuration key

**Returns:** Configuration value as string

##### logRecord()
```cpp
bool logRecord(const JsonDocument& record);
```
Logs an attendance record.

**Parameters:**
- `record`: Record to log

**Returns:** `true` if successful, `false` otherwise

##### getPendingRecords()
```cpp
std::vector<JsonDocument> getPendingRecords();
```
Gets pending records for sync.

**Returns:** Vector of pending records

### Utils Class

#### Static Methods

##### generateDeviceId()
```cpp
static String generateDeviceId();
```
Generates a unique device ID.

**Returns:** Device ID as string

##### formatTimestamp()
```cpp
static String formatTimestamp(unsigned long timestamp);
```
Formats a timestamp.

**Parameters:**
- `timestamp`: Timestamp in milliseconds

**Returns:** Formatted timestamp string

##### formatBytes()
```cpp
static String formatBytes(size_t bytes);
```
Formats bytes as human-readable string.

**Parameters:**
- `bytes`: Number of bytes

**Returns:** Formatted string (e.g., "1.5 MB")

##### isValidUUID()
```cpp
static bool isValidUUID(const String& uuid);
```
Validates a UUID string.

**Parameters:**
- `uuid`: UUID to validate

**Returns:** `true` if valid, `false` otherwise

## Data Structures

### BLEDevice
```cpp
struct BLEDevice {
  String uuid;        // Device UUID
  String name;        // Device name
  int rssi;          // Signal strength
  String address;    // MAC address
  unsigned long timestamp; // Discovery time
};
```

### HTTPResult
```cpp
struct HTTPResult {
  bool success;       // Request success
  int statusCode;     // HTTP status code
  String response;    // Response body
  String errorMessage; // Error message
  int processed;      // Records processed
  int successful;     // Records successful
  int duplicates;     // Duplicate records
  int errors;         // Error records
};
```

## Error Codes

### System Status Codes
- `STATUS_INIT` (0): Initializing
- `STATUS_WIFI_CONNECTING` (1): WiFi connecting
- `STATUS_WIFI_CONNECTED` (2): WiFi connected
- `STATUS_BLE_SCANNING` (3): BLE scanning
- `STATUS_SYNCING` (4): Syncing data
- `STATUS_ERROR` (5): Error state
- `STATUS_OFFLINE` (6): Offline mode

### Error Codes
- `ERROR_NONE` (0): No error
- `ERROR_WIFI_CONNECT` (1): WiFi connection failed
- `ERROR_BLE_INIT` (2): BLE initialization failed
- `ERROR_HTTP_REQUEST` (3): HTTP request failed
- `ERROR_STORAGE_FULL` (4): Storage full
- `ERROR_INVALID_CONFIG` (5): Invalid configuration
- `ERROR_BACKEND_UNAVAILABLE` (6): Backend unavailable

## Configuration Keys

- `wifi_ssid`: WiFi network name
- `wifi_password`: WiFi password
- `backend_url`: Backend API URL
- `api_key`: API authentication key
- `scanner_id`: Unique scanner identifier
- `event_id`: Event identifier
- `uuid_prefix`: BLE UUID prefix filter
- `scan_interval`: Scan interval in seconds

