#ifndef COMMON_TYPES_H
#define COMMON_TYPES_H

struct Event {
  String id;
  String name;
  String description;
  bool isActive;
  String startDate;
  String endDate;
};

struct ScannedDevice {
  String uuid;
  String name;
  int rssi;
  String address;
  unsigned long timestamp;
};

#endif // COMMON_TYPES_H
