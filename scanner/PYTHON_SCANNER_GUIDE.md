# Python Scanner Workflow Guide

## 🌐 Web-Based Interactive Scanner

The Python scanner now features a modern web interface that provides the same interactive event-based workflow as the ESP32 scanner, but with enhanced features and better usability.

## 🚀 Quick Start

### 1. **Installation**
```bash
cd scanner
python3 -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate
pip install -r requirements.txt
```

### 2. **Configuration**
```bash
# Copy example config
cp config.example.json config.json

# Edit config.json with your settings
{
  "backend_base_url": "https://your-convex-deployment.convex.cloud/http",
  "api_key": "your-api-key-here",
  "scanner_id": "Python-Scanner-01",
  "uuid_prefix": "ATT-",
  "scan_interval_seconds": 5
}
```

### 3. **Launch Scanner**
```bash
# Start web interface
python web_scanner.py

# Or use quick launcher
python start_web_scanner.py
```

### 4. **Access Interface**
Open your browser to `http://localhost:5000`

## 📱 Web Interface Features

### **Dashboard Page**
- **Real-time Statistics**: Live counts of scans, devices found, records logged
- **Event Status**: Currently selected event and scanning status
- **System Status**: Connection status and error messages
- **Quick Navigation**: Direct links to events and configuration

### **Events Page**
- **Event List**: All available events from the backend
- **Event Details**: Name, ID, start/end times, status
- **Selection Controls**: Select, start, and stop scanning
- **Visual Indicators**: Clear status indicators for each event
- **Real-time Updates**: Auto-refresh every 10 seconds

### **Configuration Page**
- **Backend Settings**: API URL and authentication
- **Scanner Settings**: Device ID and scanning parameters
- **UUID Filtering**: Optional prefix filtering
- **Scan Interval**: Configurable scanning frequency

## 🔄 Interactive Workflow

### **Step 1: Launch Scanner**
```bash
python web_scanner.py
```
- Scanner starts web server on port 5000
- Background workers start for BLE scanning and data sync
- Web interface becomes available

### **Step 2: Select Event**
1. Navigate to **Events** page
2. View list of available events from backend
3. Click **"Select Event"** on desired event
4. Event becomes highlighted and ready for scanning

### **Step 3: Start Scanning**
1. Click **"Start Scanning"** on selected event
2. Scanner begins detecting BLE devices
3. Real-time statistics update on dashboard
4. Attendance records logged automatically

### **Step 4: Monitor Progress**
1. Return to **Dashboard** to view live statistics
2. Watch device detection counts increase
3. Monitor sync status and error messages
4. View current event and scanning status

### **Step 5: Manage Events**
1. **Stop Scanning**: Click "Stop Scanning" to pause
2. **Change Event**: Select different event and start scanning
3. **View Logs**: Check attendance records in real-time
4. **Configure Settings**: Update scanner parameters as needed

## 🛠️ Technical Features

### **Background Processing**
- **BLE Scanning Worker**: Continuous device detection
- **Sync Worker**: Automatic data synchronization every 30 seconds
- **Deduplication**: Prevents duplicate attendance records
- **Error Handling**: Robust error recovery and logging

### **Data Management**
- **JSONL Logging**: Local storage of attendance records
- **Batch Sync**: Efficient bulk upload to backend
- **Offline Support**: Continues working without internet
- **Data Integrity**: Validates records before sync

### **Web Interface**
- **Flask Framework**: Lightweight and reliable web server
- **Responsive Design**: Works on desktop and mobile
- **Real-time Updates**: AJAX-powered live data
- **RESTful API**: Clean API endpoints for all operations

## 📊 Monitoring and Statistics

### **Real-time Metrics**
- **Total Scans**: Number of BLE scan cycles completed
- **Devices Found**: Total BLE devices detected
- **Records Logged**: Attendance records created locally
- **Records Synced**: Records successfully uploaded to backend

### **Event Status**
- **Selected Event**: Currently chosen event for scanning
- **Scanning Status**: Active/Inactive scanning state
- **Event Details**: Name, ID, and timing information
- **Quick Actions**: Direct links to event management

### **System Health**
- **Connection Status**: Backend connectivity
- **Error Messages**: Clear error reporting
- **Sync Status**: Last successful sync time
- **Worker Status**: Background process health

## 🔧 Configuration Options

### **Backend Settings**
```json
{
  "backend_base_url": "https://your-deployment.convex.cloud/http",
  "api_key": "your-scanner-api-key"
}
```

### **Scanner Settings**
```json
{
  "scanner_id": "Python-Scanner-01",
  "uuid_prefix": "ATT-",
  "scan_interval_seconds": 5
}
```

### **File Paths**
```json
{
  "log_path": "./attendance_log.jsonl"
}
```

## 🚨 Troubleshooting

### **Common Issues**

#### **No Events Showing**
- Check backend URL and API key
- Verify backend is running and accessible
- Check network connectivity

#### **Not Detecting Devices**
- Ensure BLE permissions are granted
- Check if mobile apps are broadcasting UUIDs
- Verify UUID prefix filtering settings

#### **Sync Failures**
- Check backend connection and API key
- Verify network connectivity
- Check backend logs for errors

#### **Web Interface Not Loading**
- Check if port 5000 is available
- Try different host/port settings
- Check firewall settings

### **Debug Mode**
```bash
# Run with debug output
python web_scanner.py --host 0.0.0.0 --port 5000

# Check logs
tail -f attendance_log.jsonl
```

## 🔄 Data Flow

```
Web Interface → Event Selection → BLE Scanning → 
Device Detection → Attendance Logging → Backend Sync
```

### **Detailed Flow**
1. **User selects event** via web interface
2. **Scanner starts BLE scanning** for selected event
3. **BLE devices detected** and filtered by UUID prefix
4. **Attendance records created** with event ID and timestamp
5. **Records logged locally** to JSONL file
6. **Background sync worker** uploads records to backend
7. **Backend processes** attendance and updates database
8. **Admin dashboard** shows real-time attendance data

## 📱 Mobile Usage

The web interface is fully responsive and works great on mobile devices:

- **Touch-friendly buttons** and navigation
- **Responsive layout** that adapts to screen size
- **Real-time updates** without page refresh
- **Easy event management** with large touch targets

## 🔒 Security Considerations

- **API Key Authentication**: Secure backend communication
- **Local Data Storage**: Sensitive data stays on device
- **HTTPS Support**: Secure communication with backend
- **Input Validation**: All user inputs are validated

## 🎯 Best Practices

### **Before Starting**
1. Ensure backend is running and accessible
2. Verify events are created and active
3. Check that users are registered for events
4. Confirm mobile apps are broadcasting BLE UUIDs

### **During Operation**
1. Monitor the dashboard for system status
2. Check events page for scanning status
3. Verify attendance data in admin dashboard
4. Handle any connection issues promptly

### **After Scanning**
1. Check sync status and error logs
2. Verify attendance records in backend
3. Review statistics and performance
4. Clean up old log files if needed

This Python scanner provides a powerful, user-friendly alternative to the ESP32 scanner with enhanced features and better usability!
