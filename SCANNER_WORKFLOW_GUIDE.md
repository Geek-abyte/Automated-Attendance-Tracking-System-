# ESP32 Scanner Workflow Guide

## New Interactive Event-Based Workflow

The ESP32 scanner now features an interactive workflow that allows you to select and manage events directly from the device's web interface.

## 🚀 How It Works

### 1. **Launch Scanner**
- Power on the ESP32 scanner
- Connect to WiFi or use the scanner's hotspot
- Open web browser to `http://192.168.4.1` (hotspot) or the scanner's IP address

### 2. **View Available Events**
- The scanner automatically fetches available events from the backend
- Navigate to the **Events** page to see all active events
- Each event shows:
  - Event name and ID
  - Start and end times
  - Current status (Active/Inactive)
  - Registration count

### 3. **Select an Event**
- Click **"Select Event"** on the event you want to track
- The selected event will be highlighted in blue
- The scanner is now configured for that specific event

### 4. **Start Scanning**
- Once an event is selected, click **"Start Scanning"**
- The scanner begins detecting BLE devices for that event
- Only devices registered for the selected event will be logged
- Real-time attendance data is synced to the backend

### 5. **Monitor Progress**
- Return to the **Dashboard** to see:
  - Current event being tracked
  - Scanning status (Active/Inactive)
  - Real-time statistics
  - Device detection count
  - Attendance records logged

### 6. **Stop Scanning**
- Click **"Stop Scanning"** to pause attendance tracking
- Data continues to sync to the backend
- You can restart scanning or select a different event

## 📱 Web Interface Features

### Dashboard
- **System Status**: WiFi, BLE, and backend connection status
- **Event Status**: Currently selected event and scanning status
- **Statistics**: Real-time counts of scans, devices found, records logged
- **Quick Actions**: Direct links to event management

### Events Page
- **Event List**: All available events from the backend
- **Event Details**: Name, ID, times, and status
- **Selection Controls**: Select, start, and stop scanning
- **Visual Indicators**: Clear status indicators for each event

### Configuration
- **Backend Settings**: API URL and authentication
- **WiFi Settings**: Network configuration
- **Scanner Settings**: Device ID and scanning parameters

## 🔄 Workflow States

### 1. **Idle State**
- No event selected
- Scanner not actively scanning
- Ready to select an event

### 2. **Event Selected**
- Event chosen but not yet scanning
- Ready to start attendance tracking
- Can change selection if needed

### 3. **Scanning Active**
- Actively detecting BLE devices
- Logging attendance for selected event
- Real-time data sync to backend

### 4. **Scanning Paused**
- Event selected but scanning stopped
- Can resume or select different event
- Data continues to sync

## 🎯 Key Benefits

### **Event-Specific Tracking**
- Only scan for devices registered for the selected event
- Prevents false positives from other events
- Clean, organized attendance data

### **Real-Time Management**
- Start/stop scanning as needed
- Switch between events easily
- Monitor progress in real-time

### **User-Friendly Interface**
- Intuitive web-based controls
- Clear status indicators
- Mobile-responsive design

### **Flexible Operation**
- Work with multiple events
- Pause and resume as needed
- No need to reconfigure for each event

## 🛠️ Technical Details

### Event Selection Process
1. Scanner fetches active events from backend
2. User selects event via web interface
3. Event ID stored in scanner memory
4. BLE scanning targets only registered devices

### Attendance Recording
1. BLE device detected with matching UUID prefix
2. Device UUID checked against event registrations
3. Attendance record created with event ID
4. Data synced to backend in real-time

### Data Flow
```
Event Selection → BLE Scanning → Device Detection → 
Registration Check → Attendance Logging → Backend Sync
```

## 📋 Best Practices

### **Before Starting**
1. Ensure backend is running and accessible
2. Verify events are created and active
3. Check that users are registered for events
4. Confirm mobile apps are broadcasting BLE UUIDs

### **During Operation**
1. Monitor the dashboard for system status
2. Check event page for scanning status
3. Verify attendance data in admin dashboard
4. Handle any connection issues promptly

### **Troubleshooting**
- **No Events Showing**: Check backend connection and API key
- **Not Detecting Devices**: Verify BLE permissions and UUID broadcasting
- **Sync Issues**: Check network connection and backend status
- **Wrong Event Data**: Ensure correct event is selected

## 🔧 Configuration Requirements

### Backend Setup
- Convex backend running and accessible
- Events created and marked as active
- Users registered for events
- API key configured for scanner

### Scanner Setup
- WiFi connected or hotspot mode
- Backend URL and API key configured
- BLE scanning enabled
- Web interface accessible

### Mobile App Setup
- BLE permissions granted
- UUID broadcasting enabled
- User registered for events
- App connected to same backend

## 📊 Monitoring and Reports

### Real-Time Monitoring
- Dashboard shows live statistics
- Event page shows scanning status
- Admin dashboard shows attendance data
- Backend logs show sync activity

### Data Verification
- Check attendance records in admin
- Verify device detection counts
- Monitor sync success rates
- Review error logs if issues occur

This new workflow makes the scanner much more user-friendly and event-focused, allowing for precise control over attendance tracking for specific events.
