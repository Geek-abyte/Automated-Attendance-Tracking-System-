# Testing Guide for Enhanced Scanner System

This guide will help you test the complete attendance tracking system from backend setup to scanner functionality.

## Prerequisites

1. **Backend running** (Convex backend)
2. **Scanner dependencies installed**
3. **Test devices** with Bluetooth enabled

## Step 1: Backend Setup and Testing

### 1.1 Start the Backend
```bash
cd backend
npm run dev
# Backend should be running on http://127.0.0.1:3210
```

### 1.2 Test Backend Health
```bash
curl http://127.0.0.1:3210/http/health
# Should return: {"status":"healthy","timestamp":...,"version":"1.0.0"}
```

### 1.3 Create Test Data

#### Create Test Users
```bash
curl -X POST http://127.0.0.1:3210/http/create-user \
  -H "Content-Type: application/json" \
  -H "x-api-key: att_3sh4fmd2u14ffisevqztm" \
  -d '{
    "name": "John Doe",
    "email": "john@example.com",
    "bleUuid": "JohnPhone-12345"
  }'

curl -X POST http://127.0.0.1:3210/http/create-user \
  -H "Content-Type: application/json" \
  -H "x-api-key: att_3sh4fmd2u14ffisevqztm" \
  -d '{
    "name": "Jane Smith", 
    "email": "jane@example.com",
    "bleUuid": "JanePhone-67890"
  }'
```

#### Create Test Events
```bash
# Create an active event
curl -X POST http://127.0.0.1:3210/http/create-event \
  -H "Content-Type: application/json" \
  -H "x-api-key: att_3sh4fmd2u14ffisevqztm" \
  -d '{
    "name": "Team Meeting",
    "description": "Weekly team standup",
    "isActive": true
  }'

# Create an inactive event
curl -X POST http://127.0.0.1:3210/http/create-event \
  -H "Content-Type: application/json" \
  -H "x-api-key: att_3sh4fmd2u14ffisevqztm" \
  -d '{
    "name": "Conference 2024",
    "description": "Annual conference",
    "isActive": false
  }'
```

#### Register Users for Events
```bash
# Get the event IDs from the create-event responses, then:
curl -X POST http://127.0.0.1:3210/http/register-user \
  -H "Content-Type: application/json" \
  -H "x-api-key: att_3sh4fmd2u14ffisevqztm" \
  -d '{
    "userId": "USER_ID_FROM_CREATE_USER",
    "eventId": "EVENT_ID_FROM_CREATE_EVENT"
  }'
```

### 1.4 Test Backend Endpoints

#### List Active Events
```bash
curl -H "x-api-key: att_3sh4fmd2u14ffisevqztm" \
  http://127.0.0.1:3210/http/active-events
```

#### Control Events
```bash
# Start an event
curl -X POST http://127.0.0.1:3210/http/event-control \
  -H "Content-Type: application/json" \
  -H "x-api-key: att_3sh4fmd2u14ffisevqztm" \
  -d '{
    "eventId": "EVENT_ID",
    "action": "start"
  }'

# Stop an event
curl -X POST http://127.0.0.1:3210/http/event-control \
  -H "Content-Type: application/json" \
  -H "x-api-key: att_3sh4fmd2u14ffisevqztm" \
  -d '{
    "eventId": "EVENT_ID", 
    "action": "stop"
  }'
```

## Step 2: Scanner Setup and Testing

### 2.1 Install Scanner Dependencies
```bash
cd scanner
python3 -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate
pip install -r requirements.txt
```

### 2.2 Configure Scanner
```bash
cp config.example.json config.json
# Edit config.json with your settings:
```

Example `config.json`:
```json
{
  "backend_base_url": "http://127.0.0.1:3210/http",
  "api_key": "att_3sh4fmd2u14ffisevqztm",
  "scanner_id": "Test-Scanner-01",
  "event_id": "",
  "log_path": "./attendance_log.jsonl",
  "uuid_prefix": "",
  "scan_interval_seconds": 5
}
```

### 2.3 Test Scanner Commands

#### List Available Events
```bash
python scanner.py list-events
# Should show your created events
```

#### Test Event Control
```bash
# Start an event (replace EVENT_ID with actual ID)
python scanner.py event-control EVENT_ID start

# Stop an event
python scanner.py event-control EVENT_ID stop
```

#### Test Interactive Scanning
```bash
python scanner.py interactive-scan
# This will:
# 1. Fetch active events
# 2. Show a menu to select an event
# 3. Start scanning for BLE devices
# 4. Log detected devices in real-time
```

#### Test Traditional Scanning
```bash
# First, set event_id in config.json, then:
python scanner.py scan --duration 30
```

#### Test Sync
```bash
python scanner.py sync
# Uploads logged attendance to backend
```

## Step 3: End-to-End Testing

### 3.1 Prepare Test Devices

1. **Mobile Phones**: Enable Bluetooth and set device names to match BLE UUIDs
   - Phone 1: Set name to "JohnPhone-12345"
   - Phone 2: Set name to "JanePhone-67890"

2. **Alternative**: Use BLE beacon apps or devices that broadcast specific names

### 3.2 Complete Workflow Test

1. **Start Backend**:
   ```bash
   cd backend && npm run dev
   ```

2. **Create Test Data** (as shown in Step 1.3)

3. **Run Interactive Scanner**:
   ```bash
   cd scanner
   python scanner.py interactive-scan
   ```

4. **Select Event**: Choose from the menu

5. **Enable Test Devices**: Turn on Bluetooth on test phones/devices

6. **Monitor Scanning**: Watch for device detection and logging

7. **Stop Scanning**: Press Ctrl+C

8. **Sync Data**: 
   ```bash
   python scanner.py sync
   ```

9. **Verify Attendance**: Check the backend for recorded attendance

## Step 4: Verification

### 4.1 Check Log Files
```bash
# View attendance log
cat attendance_log.jsonl

# Should show entries like:
# {"bleUuid":"JohnPhone-12345","timestamp":1234567890123,"eventId":"...","scannerSource":"Test-Scanner-01"}
```

### 4.2 Check Backend Data
Use the admin interface or backend queries to verify:
- Events are created and active
- Users are registered for events
- Attendance records are created
- Statistics show correct counts

## Troubleshooting

### Common Issues

1. **"Bleak is not available"**
   - Install BLE dependencies: `pip install bleak`
   - Run on a system with Bluetooth support

2. **"No active events found"**
   - Ensure backend is running
   - Check API key in config.json
   - Create events and set them as active

3. **"Failed to fetch events"**
   - Check backend URL in config.json
   - Verify backend is running on correct port
   - Check network connectivity

4. **No devices detected**
   - Ensure Bluetooth is enabled on test devices
   - Check device names match expected BLE UUIDs
   - Try different scan intervals
   - Move devices closer to scanner

5. **Sync fails**
   - Check API key validity
   - Verify backend is running
   - Check log file exists and has data

### Debug Mode

Enable verbose logging by modifying the scanner code or adding debug prints:

```python
# Add to scanner.py for debugging
import logging
logging.basicConfig(level=logging.DEBUG)
```

## Test Scenarios

### Scenario 1: Basic Functionality
- Create 1 event, 2 users
- Register users for event
- Run interactive scanner
- Verify attendance logging

### Scenario 2: Multiple Events
- Create 2-3 events (mix of active/inactive)
- Test event selection menu
- Verify correct event is selected

### Scenario 3: Event Control
- Test starting/stopping events
- Verify event status changes
- Test scanning with inactive events

### Scenario 4: Offline/Online
- Run scanner without backend
- Verify local logging works
- Test sync when backend comes online

### Scenario 5: Error Handling
- Test with invalid API key
- Test with non-existent events
- Test with network disconnection

## Performance Testing

### Load Testing
- Create many users and events
- Run multiple scanners simultaneously
- Test with high device density
- Monitor memory and CPU usage

### Duration Testing
- Run scanner for extended periods
- Test deduplication over time
- Verify log file rotation if needed
- Test sync performance with large logs

## Success Criteria

✅ **Backend Setup**
- All endpoints respond correctly
- Events can be created and managed
- Users can be registered for events

✅ **Scanner Functionality**
- Interactive mode works end-to-end
- Event selection menu displays correctly
- BLE scanning detects devices
- Attendance logging works
- Sync uploads data successfully

✅ **Integration**
- Scanner communicates with backend
- Data flows correctly from scanner to backend
- Attendance records are created properly
- Statistics are accurate

✅ **User Experience**
- Commands are intuitive
- Error messages are helpful
- Progress feedback is clear
- System is reliable and stable
