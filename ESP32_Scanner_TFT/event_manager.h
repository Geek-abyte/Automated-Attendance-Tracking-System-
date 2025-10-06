#ifndef EVENT_MANAGER_H
#define EVENT_MANAGER_H

#include "hardware_config.h"
#include "backend_client.h"
#include "common_types.h"

class EventManager {
private:
  Event events[MAX_EVENTS];
  int eventCount;
  int selectedEventIndex;
  String selectedEventId;
  String selectedEventName;
  
  // Cache of registered devices for the selected event
  std::vector<String> registeredDevices;
  bool devicesLoaded;
  
public:
  EventManager();
  void begin();
  
  // Event loading
  bool loadFromBackend(BackendClient& backend);
  bool loadActiveEvents(BackendClient& backend);
  
  // Event selection
  bool selectEvent(int index);
  bool selectEventById(const String& eventId);
  String getSelectedEventId();
  String getSelectedEventName();
  int getSelectedEventIndex();
  
  // Load registered devices for selected event
  bool loadRegisteredDevices(BackendClient& backend);
  int getRegisteredDeviceCount();
  
  // Event access
  Event* getEventList();
  int getEventCount();
  Event* getEvent(int index);
  Event* getEventById(const String& eventId);
  
  // Device registration check
  bool isDeviceRegistered(const String& eventId, const String& bleUuid);
  
  // Event validation
  bool isEventActive(const String& eventId);
  bool isEventValid(const String& eventId);
  
  // Test events
  void addTestEvents();
  
private:
  void clearEvents();
  void clearRegisteredDevices();
  bool addEvent(const Event& event);
};

// Global event manager instance
extern EventManager events;

#endif // EVENT_MANAGER_H
