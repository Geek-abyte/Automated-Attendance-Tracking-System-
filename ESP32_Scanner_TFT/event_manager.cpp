#include "event_manager.h"
#include <ArduinoJson.h>

// Global instance defined in ESP32_Scanner_TFT.ino

EventManager::EventManager() {
  eventCount = 0;
  selectedEventIndex = -1;
  selectedEventId = "";
  selectedEventName = "";
  devicesLoaded = false;
}

void EventManager::begin() {
  clearEvents();
  clearRegisteredDevices();
  Serial.println("Event Manager initialized");
}

bool EventManager::loadFromBackend(BackendClient& backend) {
  if (!backend.isConnected()) {
    Serial.println("Backend not connected, cannot load events");
    return false;
  }
  
  clearEvents();
  
  Event tempEvents[MAX_EVENTS];
  int count = 0;
  
  if (!backend.getEvents(tempEvents, count, MAX_EVENTS)) {
    Serial.println("Failed to load events from backend: " + backend.getLastError());
    return false;
  }
  
  // Add events to manager
  for (int i = 0; i < count; i++) {
    addEvent(tempEvents[i]);
  }
  
  Serial.println("Loaded " + String(eventCount) + " events from backend");
  return true;
}

void EventManager::addTestEvents() {
  // Add some test events for demonstration
  Event testEvent1;
  testEvent1.id = "test-event-1";
  testEvent1.name = "Test Event 1";
  testEvent1.description = "This is a test event";
  testEvent1.isActive = true;
  testEvent1.startDate = "2024-01-01";
  testEvent1.endDate = "2024-12-31";
  addEvent(testEvent1);
  
  Event testEvent2;
  testEvent2.id = "test-event-2";
  testEvent2.name = "Test Event 2";
  testEvent2.description = "Another test event";
  testEvent2.isActive = true;
  testEvent2.startDate = "2024-01-01";
  testEvent2.endDate = "2024-12-31";
  addEvent(testEvent2);
  
  Serial.println("Added " + String(eventCount) + " test events");
}

bool EventManager::loadActiveEvents(BackendClient& backend) {
  return loadFromBackend(backend);
}

bool EventManager::selectEvent(int index) {
  if (index < 0 || index >= eventCount) {
    Serial.println("Invalid event index: " + String(index));
    return false;
  }
  
  selectedEventIndex = index;
  selectedEventId = events[index].id;
  selectedEventName = events[index].name;
  
  // Clear previously loaded devices when selecting a new event
  clearRegisteredDevices();
  
  Serial.println("Selected event: " + selectedEventName + " (ID: " + selectedEventId + ")");
  return true;
}

bool EventManager::selectEventById(const String& eventId) {
  for (int i = 0; i < eventCount; i++) {
    if (events[i].id == eventId) {
      return selectEvent(i);
    }
  }
  
  Serial.println("Event not found: " + eventId);
  return false;
}

String EventManager::getSelectedEventId() {
  return selectedEventId;
}

String EventManager::getSelectedEventName() {
  return selectedEventName;
}

int EventManager::getSelectedEventIndex() {
  return selectedEventIndex;
}

Event* EventManager::getEventList() {
  return events;
}

int EventManager::getEventCount() {
  return eventCount;
}

Event* EventManager::getEvent(int index) {
  if (index < 0 || index >= eventCount) {
    return nullptr;
  }
  return &events[index];
}

Event* EventManager::getEventById(const String& eventId) {
  for (int i = 0; i < eventCount; i++) {
    if (events[i].id == eventId) {
      return &events[i];
    }
  }
  return nullptr;
}

bool EventManager::loadRegisteredDevices(BackendClient& backend) {
  if (selectedEventId.length() == 0) {
    Serial.println("No event selected, cannot load registered devices");
    return false;
  }
  
  Serial.println("Loading registered devices for event: " + selectedEventId);
  
  // Make request to backend
  String endpoint = "registered-devices?eventId=" + selectedEventId;
  String response;
  
  if (!backend.makeRequest(endpoint, "GET", "", response)) {
    Serial.println("Failed to load registered devices: " + backend.getLastError());
    return false;
  }
  
  // Parse JSON response
  JsonDocument doc;
  DeserializationError error = deserializeJson(doc, response);
  if (error) {
    Serial.println("Failed to parse registered devices response: " + String(error.c_str()));
    return false;
  }
  
  if (!doc.containsKey("deviceUuids")) {
    Serial.println("No deviceUuids in response");
    return false;
  }
  
  // Clear and load devices
  registeredDevices.clear();
  JsonArray uuids = doc["deviceUuids"];
  
  for (JsonVariant uuid : uuids) {
    registeredDevices.push_back(uuid.as<String>());
  }
  
  devicesLoaded = true;
  Serial.println("Loaded " + String(registeredDevices.size()) + " registered devices for event");
  
  // Print registered devices for debugging
  for (const auto& uuid : registeredDevices) {
    Serial.println("  - " + uuid);
  }
  
  return true;
}

int EventManager::getRegisteredDeviceCount() {
  return registeredDevices.size();
}

bool EventManager::isDeviceRegistered(const String& eventId, const String& bleUuid) {
  // If devices haven't been loaded yet, we can't verify
  if (!devicesLoaded) {
    Serial.println("Warning: Registered devices not loaded yet for event " + eventId);
    return false;
  }
  
  // Check if bleUuid is in the registered devices list
  for (const auto& uuid : registeredDevices) {
    if (uuid == bleUuid) {
      return true;
    }
  }
  
  return false;
}

bool EventManager::isEventActive(const String& eventId) {
  Event* event = getEventById(eventId);
  if (!event) {
    return false;
  }
  
  return event->isActive;
}

bool EventManager::isEventValid(const String& eventId) {
  return getEventById(eventId) != nullptr;
}

void EventManager::clearEvents() {
  eventCount = 0;
  selectedEventIndex = -1;
  selectedEventId = "";
  selectedEventName = "";
  clearRegisteredDevices();
}

void EventManager::clearRegisteredDevices() {
  registeredDevices.clear();
  devicesLoaded = false;
}

bool EventManager::addEvent(const Event& event) {
  if (eventCount >= MAX_EVENTS) {
    Serial.println("Maximum number of events reached");
    return false;
  }
  
  events[eventCount] = event;
  eventCount++;
  
  return true;
}
