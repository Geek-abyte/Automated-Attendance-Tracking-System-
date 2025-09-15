#include "event_manager.h"

// Global instance defined in ESP32_Scanner_TFT.ino

EventManager::EventManager() {
  eventCount = 0;
  selectedEventIndex = -1;
  selectedEventId = "";
  selectedEventName = "";
}

void EventManager::begin() {
  clearEvents();
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
    
    // Add fallback test events if backend fails
    Serial.println("Adding fallback test events...");
    addTestEvents();
    return true;
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

bool EventManager::isDeviceRegistered(const String& eventId, const String& bleUuid) {
  // Delegate to backend client for real registration check
  return backend.isDeviceRegistered(eventId, bleUuid);
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
