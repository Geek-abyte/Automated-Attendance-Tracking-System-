#include "backend_client.h"

// Global instance defined in ESP32_Scanner_TFT.ino

BackendClient::BackendClient() {
  baseURL = "https://compassionate-yak-763.convex.cloud/http";
  apiKey = "att_3sh4fmd2u14ffisevqztm";
  timeout = 30000; // 30 seconds
  lastError = "";
}

void BackendClient::begin() {
  Serial.println("Backend Client initialized");
  Serial.println("Base URL: " + baseURL);
  Serial.println("API Key: " + String(apiKey.length() > 0 ? "Set" : "Not set"));
}

void BackendClient::setBaseURL(const String& url) {
  baseURL = url;
  if (!baseURL.endsWith("/")) {
    baseURL += "/";
  }
}

void BackendClient::setAPIKey(const String& key) {
  apiKey = key;
}

void BackendClient::setTimeout(unsigned long timeoutMs) {
  timeout = timeoutMs;
}

bool BackendClient::getEvents(Event* events, int& count, int maxCount) {
  String response;
  if (!makeRequest("events", "GET", "", response)) {
    return false;
  }
  
  JsonDocument doc;
  DeserializationError error = deserializeJson(doc, response);
  if (error) {
    lastError = "Failed to parse events response: " + String(error.c_str());
    return false;
  }
  
  if (!doc.containsKey("events")) {
    lastError = "No events array in response";
    return false;
  }
  
  JsonArray eventsArray = doc["events"];
  count = 0;
  
  for (JsonObject eventObj : eventsArray) {
    if (count >= maxCount) break;
    
    events[count].id = eventObj["id"].as<String>();
    events[count].name = eventObj["name"].as<String>();
    events[count].description = eventObj["description"].as<String>();
    events[count].isActive = eventObj["isActive"].as<bool>();
    // Backend returns startTime/endTime; map to local fields
    events[count].startDate = eventObj["startTime"].as<String>();
    events[count].endDate = eventObj["endTime"].as<String>();
    
    count++;
  }
  
  Serial.println("Loaded " + String(count) + " events from backend");
  return true;
}

bool BackendClient::getActiveEvents(Event* events, int& count, int maxCount) {
  String response;
  Serial.println("Requesting active events from backend...");
  
  if (!makeRequest("active-events", "GET", "", response)) {
    Serial.println("Failed to make request: " + lastError);
    return false;
  }
  
  Serial.println("Response received: " + response);
  
  JsonDocument doc;
  DeserializationError error = deserializeJson(doc, response);
  if (error) {
    lastError = "Failed to parse active events response: " + String(error.c_str());
    Serial.println("JSON Parse Error: " + String(error.c_str()));
    Serial.println("Raw response: " + response);
    return false;
  }
  
  if (!doc.containsKey("events")) {
    lastError = "No events array in response";
    Serial.println("No 'events' key in response. Available keys:");
    for (JsonPair pair : doc.as<JsonObject>()) {
      Serial.println("  " + String(pair.key().c_str()));
    }
    return false;
  }
  
  JsonArray eventsArray = doc["events"];
  count = 0;
  
  Serial.println("Found " + String(eventsArray.size()) + " events in response");
  
  for (JsonObject eventObj : eventsArray) {
    if (count >= maxCount) break;
    
    events[count].id = eventObj["id"].as<String>();
    events[count].name = eventObj["name"].as<String>();
    events[count].description = eventObj["description"].as<String>();
    events[count].isActive = eventObj["isActive"].as<bool>();
    events[count].startDate = eventObj["startDate"].as<String>();
    events[count].endDate = eventObj["endDate"].as<String>();
    
    Serial.println("Event " + String(count) + ": " + events[count].name + " (ID: " + events[count].id + ")");
    count++;
  }
  
  Serial.println("Loaded " + String(count) + " active events from backend");
  return true;
}

bool BackendClient::recordAttendance(const AttendanceRecord& record) {
  JsonDocument doc;
  doc["eventId"] = record.eventId;
  doc["bleUuid"] = record.bleUuid;
  doc["deviceName"] = record.deviceName;
  doc["rssi"] = record.rssi;
  doc["timestamp"] = record.timestamp;
  doc["scannerId"] = record.scannerId;
  
  return recordAttendance(doc);
}

bool BackendClient::recordAttendance(const JsonDocument& record) {
  String body;
  serializeJson(record, body);
  
  String response;
  if (!makeRequest("attendance", "POST", body, response)) {
    return false;
  }
  
  JsonDocument doc;
  DeserializationError error = deserializeJson(doc, response);
  if (error) {
    lastError = "Failed to parse attendance response: " + String(error.c_str());
    return false;
  }
  
  bool success = doc["success"].as<bool>();
  if (!success) {
    lastError = doc["error"].as<String>();
    return false;
  }
  
  Serial.println("Attendance recorded successfully");
  return true;
}

bool BackendClient::isDeviceRegistered(const String& eventId, const String& bleUuid) {
  // Use HTTP /registered-devices?eventId=... and check if bleUuid exists in list
  String endpoint = "registered-devices?eventId=" + eventId;
  String response;
  
  if (!makeRequest(endpoint, "GET", "", response)) {
    return false;
  }
  
  JsonDocument doc;
  DeserializationError error = deserializeJson(doc, response);
  if (error) {
    lastError = "Failed to parse device check response: " + String(error.c_str());
    return false;
  }

  if (!doc.containsKey("deviceUuids")) {
    lastError = "No deviceUuids in response";
    return false;
  }

  JsonArray uuids = doc["deviceUuids"];
  for (JsonVariant v : uuids) {
    if (v.as<String>() == bleUuid) {
      return true;
    }
  }
  return false;
}

bool BackendClient::isConnected() {
  return WiFi.status() == WL_CONNECTED;
}

bool BackendClient::healthCheck() {
  String response;
  return makeRequest("health", "GET", "", response);
}

String BackendClient::getLastError() {
  return lastError;
}

bool BackendClient::makeRequest(const String& endpoint, const String& method, const String& body, String& response) {
  if (!isConnected()) {
    lastError = "WiFi not connected";
    return false;
  }
  
  String url = buildURL(endpoint);
  Serial.println("Making " + method + " request to: " + url);
  
  HTTPClient client;
  client.begin(url);
  client.setTimeout(timeout);
  setHeaders(client);
  
  int httpCode = 0;
  
  if (method == "GET") {
    httpCode = client.GET();
  } else if (method == "POST") {
    httpCode = client.POST(body);
  } else {
    lastError = "Unsupported HTTP method: " + method;
    client.end();
    return false;
  }
  
  if (httpCode > 0) {
    response = client.getString();
    bool success = (httpCode >= 200 && httpCode < 300);
    
    if (!success) {
      lastError = "HTTP " + String(httpCode) + ": " + response;
    }
    
    client.end();
    return success;
  } else {
    lastError = "HTTP request failed: " + String(httpCode);
    client.end();
    return false;
  }
}

void BackendClient::setHeaders(HTTPClient& client) {
  client.addHeader("Content-Type", "application/json");
  client.addHeader("User-Agent", "ESP32-Scanner/2.0.0");
  
  if (apiKey.length() > 0) {
    client.addHeader("x-api-key", apiKey);
  }
}

String BackendClient::buildURL(const String& endpoint) {
  String url = baseURL;
  if (!url.endsWith("/")) {
    url += "/";
  }
  url += endpoint;
  return url;
}
