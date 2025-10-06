#ifndef BACKEND_CLIENT_H
#define BACKEND_CLIENT_H

#include <WiFi.h>
#include <HTTPClient.h>
#include <WiFiClientSecure.h>
#include <ArduinoHttpClient.h>
#include <ArduinoJson.h>
#include "common_types.h"

struct AttendanceRecord {
  String eventId;
  String bleUuid;
  String deviceName;
  int rssi;
  unsigned long timestamp;
  String scannerId;
};

class BackendClient {
private:
  String baseURL;
  String apiKey;
  unsigned long timeout;
  String lastError;
  
  void setHeaders(HTTPClient& client);
  String buildURL(const String& endpoint);
  
public:
  BackendClient();
  void begin();
  
  // Configuration
  void setBaseURL(const String& url);
  void setAPIKey(const String& key);
  void setTimeout(unsigned long timeoutMs);
  
  // Event management
  bool getEvents(Event* events, int& count, int maxCount);
  bool getActiveEvents(Event* events, int& count, int maxCount);
  bool activateEvent(const String& eventId);
  
  // Attendance recording
  bool recordAttendance(const AttendanceRecord& record);
  bool recordAttendance(const JsonDocument& record);
  
  // Device registration check
  bool isDeviceRegistered(const String& eventId, const String& bleUuid);
  
  // Health check
  bool isConnected();
  bool healthCheck();
  
  // Error handling
  String getLastError();
  
  // HTTP request (public for EventManager to use)
  bool makeRequest(const String& endpoint, const String& method, const String& body, String& response);
};

// Global backend client instance
extern BackendClient backend;

#endif // BACKEND_CLIENT_H
