#include "backend_client.h"

// Global instance defined in ESP32_Scanner_TFT.ino

// Forward declarations for helpers
static bool parseHttpsUrl(const String& url, String& hostOut, String& pathOut, int& portOut, bool& isHttpsOut);
static bool rawHttpsGet(const String& url, String& outResponse, unsigned long timeoutMs);

// Optional: paste the root CA PEM for convex.cloud here to enable strict TLS
// Fetch with: openssl s_client -showcerts -connect compassionate-yak-763.convex.cloud:443 </dev/null
// Then copy the correct root CA block into this string.
static const char* CONVEX_ROOT_CA_PEM = R"PEM(
  MIIF1jCCBL6gAwIBAgIQAWxpEnjPoMhYW0oSvumyfTANBgkqhkiG9w0BAQsFADA8
  MQswCQYDVQQGEwJVUzEPMA0GA1UEChMGQW1hem9uMRwwGgYDVQQDExNBbWF6b24g
  UlNBIDIwNDggTTAzMB4XDTI1MDYwODAwMDAwMFoXDTI2MDcwNjIzNTk1OVowGTEX
  MBUGA1UEAwwOKi5jb252ZXguY2xvdWQwggEiMA0GCSqGSIb3DQEBAQUAA4IBDwAw
  ggEKAoIBAQCNFipEL17Us6yzRQ/9lTwGH9rDjV1wrnCyrCs12L1UsUwJCY8XVc+t
  UIf0L15p9jPX9hHW3n99jWsUhGhaxb8lQti3t+/+iagGMixZbO8q1VPqf8GqvRJe
  oKkqAwmqPQ0dTS+ChUkM8aQ+CGpMyufxTLaqRauZ8XwlqEbAvjzdDpjZuTIwatUX
  H5TbuoGXRitSQri7HE4XMffNKC4z9oMQbOtyedGajbEGpHnW1tDw5exMap+qbSyM
  /QfiR27dZIFx07Ohe56bSZvv4my4zRCBu/1v2YY30L9rha62bUrOt1DSYeuWytGk
  0jOZwpY5qiE+kYns2GlKNrAGMA9tx/QbAgMBAAGjggL1MIIC8TAfBgNVHSMEGDAW
  gBRV2Rhf0hzMAeFYtL6r2VVCAdcuAjAdBgNVHQ4EFgQUsU6d/EK443vm34WpY2YC
  CImkEJYwJwYDVR0RBCAwHoIOKi5jb252ZXguY2xvdWSCDGNvbnZleC5jbG91ZDAT
  BgNVHSAEDDAKMAgGBmeBDAECATAOBgNVHQ8BAf8EBAMCBaAwHQYDVR0lBBYwFAYI
  KwYBBQUHAwEGCCsGAQUFBwMCMDsGA1UdHwQ0MDIwMKAuoCyGKmh0dHA6Ly9jcmwu
  cjJtMDMuYW1hem9udHJ1c3QuY29tL3IybTAzLmNybDB1BggrBgEFBQcBAQRpMGcw
  LQYIKwYBBQUHMAGGIWh0dHA6Ly9vY3NwLnIybTAzLmFtYXpvbnRydXN0LmNvbTA2
  BggrBgEFBQcwAoYqaHR0cDovL2NydC5yMm0wMy5hbWF6b250cnVzdC5jb20vcjJt
  MDMuY2VyMAwGA1UdEwEB/wQCMAAwggF+BgorBgEEAdZ5AgQCBIIBbgSCAWoBaAB3
  ANdtfRDRp/V3wsfpX9cAv/mCyTNaZeHQswFzF8DIxWl3AAABl02IV3sAAAQDAEgw
  RgIhANlJoLRSWKcFD/nLCEuiSQzEUCsLvTwZ/smS7ElazDCHAiEAqHsoJzkR2IdB
  CNI09lEcpxU1Qu/MrsbtnROT7hfI+PoAdgDCMX5XRRmjRe5/ON6ykEHrx8IhWiK/
  f9W1rXaa2Q5SzQAAAZdNiFekAAAEAwBHMEUCIQCeBDRWyeYGNHCluV8guYmKtYir
  /2zcMTXGORgigIuGJAIgXW2kufDIffLPNYI/CvhepUO86mif/FBHJu9WCbi1ArUA
  dQCUTkOH+uzB74HzGSQmqBhlAcfTXzgCAT9yZ31VNy4Z2AAAAZdNiFfAAAAEAwBG
  MEQCIBGzFpDrp2saSmuYlRvrvR2Ik/nCMjmzjTgL4TM00YSIAiBMEGcKnVGLI8YH
  Nypr7SqN2FdcduO4zPkXsmK/s38qhTANBgkqhkiG9w0BAQsFAAOCAQEAD9TsD4WT
  GuZ7fuzs3HCu0n+MyYbnS6zk5KqT3b2smV/NtRhqlC9wvcwC7bdFxv0/JryiWH+b
  psGcI4uvDcnQEtvA3T4ALRahjQSUPBXno2Osgu8WtJzKcda44vkv3NWaL8+yqDdf
  lDqdI7HL+LquV+Bds8TLgSCTUP9FYxZAESx8VQS2lzdafpicxa7X495cminm+OJ3
  bZuxqvOL57xtULBBsjvl3iZ9PqySOGbDdzIDlw05iRvPi5dc1gNyYvAIp7lWVFlK
  2nVkLUb/GG96Z2NJiRc5lpIIq5+8aQsOgjVe9qkIWAcV3Ow92Cq7f6HR+yVXB9za
  82iZ+vp5OZw5IQ==
)PEM";

BackendClient::BackendClient() {
  baseURL = "https://combative-deer-426.convex.cloud/http";
  apiKey = "att_3sh4fmd2u14ffisevqztm";
  timeout = 60000; // 60 seconds (increased for poor WiFi)
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

bool BackendClient::activateEvent(const String& eventId) {
  Serial.println("Activating event: " + eventId);
  
  // Create JSON body
  JsonDocument doc;
  doc["eventId"] = eventId;
  
  String body;
  serializeJson(doc, body);
  
  Serial.println("Request body: " + body);
  
  // Make request to activate-event endpoint
  String response;
  if (!makeRequest("activate-event", "POST", body, response)) {
    Serial.println("Failed to activate event: " + lastError);
    return false;
  }
  
  Serial.println("Activate event response: " + response);
  
  // Parse response
  JsonDocument responseDoc;
  DeserializationError error = deserializeJson(responseDoc, response);
  if (error) {
    lastError = "Failed to parse activate event response: " + String(error.c_str());
    Serial.println("JSON Parse Error: " + String(error.c_str()));
    return false;
  }
  
  // Check if successful
  if (responseDoc["success"].as<bool>()) {
    Serial.println("Event activated successfully!");
    Serial.println("Event name: " + responseDoc["event"]["name"].as<String>());
    return true;
  } else {
    lastError = "Event activation failed: " + responseDoc["error"].as<String>();
    Serial.println(lastError);
    return false;
  }
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
  
  // Use HTTPClient for both HTTP and HTTPS
  HTTPClient client;
  WiFiClientSecure *secureClient = nullptr;
  
  // For HTTPS, set up secure client
  if (url.startsWith("https://")) {
    Serial.println("Using HTTPS connection");
    secureClient = new WiFiClientSecure;
    secureClient->setInsecure(); // Skip certificate verification
    
    Serial.println("WiFi Status: " + String(WiFi.status()));
    Serial.println("WiFi RSSI: " + String(WiFi.RSSI()) + " dBm");
    Serial.println("Free Heap: " + String(ESP.getFreeHeap()) + " bytes");
    
    client.begin(*secureClient, url);
  } else {
    // Plain HTTP
    client.begin(url);
  }
  
  client.setTimeout(timeout);
  client.setFollowRedirects(HTTPC_STRICT_FOLLOW_REDIRECTS);
  setHeaders(client);
  
  Serial.println("Sending request...");
  int httpCode = 0;
  if (method == "GET") {
    httpCode = client.GET();
  } else if (method == "POST") {
    httpCode = client.POST(body);
  } else {
    lastError = "Unsupported HTTP method: " + method;
    client.end();
    if (secureClient) delete secureClient;
    return false;
  }
  
  Serial.println("HTTP Code: " + String(httpCode));
  
  if (httpCode > 0) {
    response = client.getString();
    Serial.println("Response: " + response);
    bool success = (httpCode >= 200 && httpCode < 300);
    if (!success) {
      lastError = "HTTP " + String(httpCode) + ": " + response;
      Serial.println("Request failed: " + lastError);
    } else {
      Serial.println("Request successful");
    }
    client.end();
    if (secureClient) delete secureClient;
    return success;
  } else {
    client.end();
    if (secureClient) delete secureClient;
    lastError = "HTTP request failed: " + String(httpCode);
    Serial.println("Request failed: " + lastError);
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

static bool parseHttpsUrl(const String& url, String& hostOut, String& pathOut, int& portOut, bool& isHttpsOut) {
  isHttpsOut = false;
  hostOut = "";
  pathOut = "/";
  portOut = 80;
  String u = url;
  if (u.startsWith("https://")) {
    isHttpsOut = true;
    portOut = 443;
    u = u.substring(8);
  } else if (u.startsWith("http://")) {
    isHttpsOut = false;
    portOut = 80;
    u = u.substring(7);
  }
  int slash = u.indexOf('/');
  String host = (slash >= 0) ? u.substring(0, slash) : u;
  String path = (slash >= 0) ? u.substring(slash) : "/";
  int colon = host.indexOf(':');
  if (colon >= 0) {
    portOut = host.substring(colon + 1).toInt();
    host = host.substring(0, colon);
  }
  hostOut = host;
  pathOut = path;
  return host.length() > 0;
}

// Minimal raw HTTPS GET as a fallback when HTTPClient fails (-1)
static bool rawHttpsGet(const String& url, String& outResponse, unsigned long timeoutMs) {
  String host, path;
  int port;
  bool isHttps;
  if (!parseHttpsUrl(url, host, path, port, isHttps)) return false;

  WiFiClientSecure client;
  client.setInsecure();
  client.setTimeout(timeoutMs);
  if (!client.connect(host.c_str(), port)) {
    return false;
  }

  // Compose request
  String req = String("GET ") + path + " HTTP/1.1\r\n" +
               "Host: " + host + "\r\n" +
               "User-Agent: ESP32-Scanner/2.0.0\r\n" +
               "Accept: */*\r\n" +
               "Connection: close\r\n" +
               "\r\n";
  client.print(req);

  unsigned long start = millis();
  while (client.connected() && !client.available() && (millis() - start) < timeoutMs) {
    delay(10);
  }
  if (!client.available()) {
    client.stop();
    return false;
  }

  // Read status line
  String statusLine = client.readStringUntil('\n');
  if (!statusLine.startsWith("HTTP/1.1 200") &&
      !statusLine.startsWith("HTTP/1.1 2")) {
    // Still read remaining to clear connection
    while (client.available()) client.read();
    client.stop();
    return false;
  }

  // Skip headers
  while (client.connected()) {
    String line = client.readStringUntil('\n');
    if (line == "\r" || line.length() == 0) break;
  }

  // Read body
  String body;
  while (client.available()) {
    body += (char)client.read();
  }
  client.stop();
  outResponse = body;
  return true;
}
