# Scanner Integration Guide

This guide explains how to connect the ESP32 scanner with the admin dashboard and mobile app for automated attendance tracking.

## Overview

The system consists of three main components:
1. **ESP32 Scanner** - Scans for BLE devices and syncs attendance data
2. **Admin Dashboard** - Manages events, users, and views attendance reports
3. **Mobile App** - Allows users to register for events and broadcast BLE UUID

## Prerequisites

1. ESP32 scanner hardware with BLE capabilities
2. Backend server running (Convex)
3. Admin dashboard accessible
4. Mobile app installed on user devices

## Step 1: Backend Setup

### 1.1 Deploy Backend
```bash
cd backend
npx convex dev
```

### 1.2 Get Backend URL
After deployment, note the Convex HTTP URL (e.g., `https://your-deployment.convex.cloud/http`)

### 1.3 Create API Key
Create an API key for the scanner in the admin dashboard or backend.

## Step 2: Scanner Configuration

### 2.1 Upload Scanner Code
1. Open the ESP32 scanner project in PlatformIO or Arduino IDE
2. Update `config.h` with your backend URL:
   ```cpp
   #define DEFAULT_BACKEND_URL "https://your-deployment.convex.cloud/http"
   ```
3. Upload the code to your ESP32

### 2.2 Configure Scanner via Web Interface
1. Connect to the ESP32's WiFi hotspot: `ESP32-Scanner`
2. Password: `attendance123`
3. Open browser to `http://192.168.4.1`
4. Go to Configuration page
5. Enter the following:
   - **WiFi SSID**: Your network name
   - **WiFi Password**: Your network password
   - **Backend URL**: Your Convex HTTP URL
   - **API Key**: Your scanner API key
   - **Scanner ID**: Unique identifier (e.g., "ESP32-Scanner-01")
   - **Event ID**: Name or ID of the event to track
   - **UUID Prefix**: Filter for specific UUIDs (e.g., "ATT-")
   - **Scan Interval**: Seconds between scans (default: 10)

### 2.3 Verify Connection
1. Check the scanner's dashboard for connection status
2. Look for "Backend Connected" status
3. Test with a BLE device broadcasting the correct UUID

## Step 3: Admin Dashboard Setup

### 3.1 Create Events
1. Open admin dashboard
2. Navigate to Events
3. Create a new event
4. Note the event name or ID for scanner configuration

### 3.2 Create Users
1. Navigate to Users
2. Add users with their BLE UUIDs
3. Users can also register via mobile app

### 3.3 Activate Events
1. Go to Events page
2. Click "Activate" on the event you want to track
3. The scanner will now sync attendance for this event

## Step 4: Mobile App Setup

### 4.1 User Registration
1. Open mobile app
2. Register with name, email, and BLE UUID
3. The app will generate a BLE UUID if not provided

### 4.2 Event Registration
1. Browse available events
2. Register for events you want to attend
3. The app will broadcast your BLE UUID during events

## Step 5: Testing the Integration

### 5.1 Test Scanner Detection
1. Ensure mobile app is broadcasting BLE UUID
2. Check scanner dashboard for detected devices
3. Verify attendance records appear in admin dashboard

### 5.2 Test Attendance Recording
1. Activate an event in admin dashboard
2. Have users with mobile app nearby
3. Check attendance records in admin dashboard
4. Verify real-time updates

## Troubleshooting

### Scanner Issues
- **WiFi Connection**: Check network credentials
- **Backend Connection**: Verify URL and API key
- **BLE Scanning**: Check if BLE is enabled and devices are broadcasting
- **No Attendance**: Verify users are registered for the event

### Mobile App Issues
- **BLE Not Working**: Check permissions and BLE library
- **Registration Failed**: Verify backend connection
- **UUID Not Broadcasting**: Check BLE context setup

### Admin Dashboard Issues
- **No Data**: Check Convex connection and API keys
- **Events Not Loading**: Verify Convex functions are deployed
- **Attendance Not Showing**: Check event activation and user registration

## API Endpoints

The scanner communicates with these backend endpoints:

- `POST /batch-checkin` - Sync attendance records
- `GET /active-events` - Get active events
- `GET /health` - Health check

## Data Flow

1. **Mobile App** broadcasts BLE UUID
2. **ESP32 Scanner** detects BLE devices and logs attendance
3. **Scanner** syncs data to backend via HTTP API
4. **Backend** processes and stores attendance records
5. **Admin Dashboard** displays real-time attendance data

## Security Considerations

- Use HTTPS for backend communication
- Implement API key authentication
- Validate BLE UUIDs to prevent spoofing
- Consider rate limiting for API endpoints

## Monitoring

- Check scanner dashboard for system status
- Monitor backend logs for sync errors
- Use admin dashboard for attendance reports
- Set up alerts for system failures

## Support

For issues or questions:
1. Check the scanner's web dashboard
2. Review backend logs
3. Verify network connectivity
4. Test with known BLE devices
