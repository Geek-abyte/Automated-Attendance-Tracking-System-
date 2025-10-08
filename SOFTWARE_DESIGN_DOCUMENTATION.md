# 3.4 Software Design

## 3.4.1 ESP32 Scanner Firmware

The ESP32 runs custom firmware built with Arduino IDE. At startup, the program connects to WiFi, initializes all hardware components (TFT display, push buttons, LEDs, BLE scanner), and loads available events from the backend server.

**In Event Selection Mode:**
The ESP32 displays a list of available events on the TFT screen. Users navigate using UP/DOWN buttons and press ENTER to select an event. The selected event is highlighted, and the system loads registered device UUIDs from the backend.

**In Scanning Mode:**
The ESP32 continuously scans for BLE devices advertising UUIDs with the "ATT-" prefix. When a device is detected, the system checks if the UUID matches any registered devices for the selected event. If a match is found, attendance is recorded and sent to the backend with status flag `method=scanner`. The result is displayed on the TFT screen, and LED indicators provide visual feedback.

**In Offline Mode:**
The ESP32 stores attendance records locally in JSON format when network connectivity is unavailable. When connectivity is restored, all stored records are batch uploaded to the backend server.

**Steps to Program ESP32 using Arduino IDE:**

**Step 1: Install ESP32 Board in Arduino IDE**
1. Open Arduino IDE
2. Go to File → Preferences
3. In Additional Boards Manager URLs, add: https://dl.espressif.com/dl/package_esp32_index.json
4. Click OK
5. Go to Tools → Board → Boards Manager
6. Search "ESP32" and click Install
7. Wait for installation to complete

**Step 2: Install Required Libraries**
1. Go to Tools → Manage Libraries
2. Search and install "ArduinoJson" by Benoit Blanchon
3. Search and install "Adafruit ST7735 and ST7789 Library"
4. Search and install "Adafruit GFX Library"
5. Click Install for each library

**Step 3: Select ESP32 Board**
1. Go to Tools → Board → ESP32 Arduino
2. Choose "ESP32 Dev Module"
3. Set Upload Speed to 115200
4. Set CPU Frequency to 240MHz (WiFi/BT)
5. Set Flash Frequency to 80MHz
6. Set Flash Mode to QIO
7. Set Flash Size to 4MB (32Mb)
8. Set Partition Scheme to Default 4MB with spiffs
9. Set Core Debug Level to None

**Step 4: Connect ESP32 Hardware**
1. Connect ESP32 to your PC via USB cable
2. Go to Tools → Port → Select COMx (ESP32)
3. If port doesn't appear, install ESP32 USB drivers

**Step 5: Create Hardware Configuration File**
1. Click File → New
2. Save as "hardware_config.h"
3. Define TFT display pins (CS=5, RST=22, DC=21, MOSI=23, SCLK=18)
4. Define button pins (UP=35, ENTER=32, DOWN=33)
5. Define LED pins (YELLOW=34, BLUE=39)
6. Set WiFi credentials (SSID and password)
7. Set backend URL and API key
8. Set BLE configuration parameters

**Step 6: Create Main Arduino Sketch**
1. Click File → New
2. Save as "ESP32_Scanner_TFT.ino"
3. Include required libraries (WiFi, BLE, JSON, TFT)
4. Include hardware configuration
5. Initialize TFT display with 128x128 resolution
6. Initialize BLE scanner with active scanning
7. Set up system states (INIT, WIFI_CONNECTING, EVENT_SELECTION, SCANNING)
8. Create setup function to initialize hardware and connect to WiFi
9. Create loop function to handle different system states
10. Implement event selection with UP/DOWN navigation
11. Implement BLE scanning for devices with ATT- prefix
12. Implement attendance recording to backend
13. Add error handling and display feedback

**Step 7: Upload Code to ESP32**
1. Click the Verify button (checkmark icon) to compile the code
2. Wait for compilation to complete
3. If successful, click the Upload button (arrow icon)
4. Wait until IDE shows "Done uploading"
5. Go to Tools → Serial Monitor
6. Set baud rate to 115200
7. Check for initialization messages

**Step 8: Configure WiFi Settings**
1. Open hardware_config.h file
2. Change WIFI_SSID to your network name
3. Change WIFI_PASSWORD to your network password
4. Update BACKEND_URL with your Convex deployment URL
5. Update API_KEY with your scanner API key
6. Save the file
7. Click Upload button to re-upload the code

**Step 9: Test ESP32 Scanner**
1. Power on the ESP32
2. Watch Serial Monitor for "WiFi Connected" message
3. Check TFT display shows "Select Event" menu
4. Press UP button to navigate up in event list
5. Press DOWN button to navigate down in event list
6. Press ENTER button to select an event
7. Verify blue LED turns on when scanning starts
8. Test with mobile app broadcasting BLE UUID

**Step 10: Monitor System Operation**
1. Use Serial Monitor to see debug messages
2. Check TFT display shows current system status
3. Verify yellow LED indicates device ready
4. Verify blue LED indicates active scanning
5. Test with multiple mobile devices broadcasting BLE UUIDs
6. Check backend receives attendance records

## 3.4.2 Convex Backend System

The backend is a real-time database system built with Convex, providing TypeScript functions and HTTP API endpoints. It serves as the central data repository connecting the ESP32 scanner, mobile applications, and admin web interface.

**When receiving registration requests:**
The system checks if the user email already exists in the users table. If it exists, it returns "User already registered." If not, it creates a new user record with a unique BLE UUID and replies "Registration successful."

**When receiving attendance records:**
The system validates the BLE UUID against registered users for the specific event. If the user is registered and the event is active, it records the attendance with timestamp and scanner source. If not found or event inactive, it replies "Not registered" or "Event not active."

**Steps to create the Convex backend:**

**Step 1: Create Convex Project**
1. Open terminal and navigate to your project directory
2. Run `npx create-convex@latest attendance-backend`
3. Choose TypeScript when prompted
4. Navigate to the new directory: `cd attendance-backend`
5. Install dependencies: `npm install`

**Step 2: Configure Database Schema**
1. Open `convex/schema.ts` in your code editor
2. Delete any existing content
3. Define users table with email, name, bleUuid, role, createdAt fields
4. Add indexes for email and bleUuid lookups
5. Define events table with name, description, startTime, endTime, isActive, createdBy, createdAt fields
6. Add index for active events lookup
7. Define eventRegistrations table with userId, eventId, registeredAt, status fields
8. Add indexes for user-event and event lookups
9. Define attendance table with userId, eventId, scanTime, deviceId, isPresent, scannerSource, synced, syncedAt fields
10. Add indexes for user-event and event lookups
11. Define apiKeys table with keyHash, name, isActive, createdAt, lastUsed fields
12. Add index for key hash lookup
13. Save the file

**Step 3: Create User Management Functions**
1. Create new file `convex/users.ts`
2. Import required modules (mutation, query, server, values)
3. Create createUser mutation with email, name, bleUuid, role arguments
4. Check if user already exists by email
5. If exists, throw error "User already exists"
6. If not, insert new user with current timestamp
7. Create getUserByEmail query with email argument
8. Query users table by email index
9. Create getUserByBleUuid query with bleUuid argument
10. Query users table by bleUuid index
11. Save the file

**Step 4: Create Event Management Functions**
1. Create new file `convex/events.ts`
2. Import required modules (mutation, query, server, values)
3. Create createEvent mutation with name, description, startTime, endTime, createdBy arguments
4. Insert new event with isActive=false and current timestamp
5. Create listEvents query with optional isActive filter
6. If isActive filter provided, query by active index
7. Otherwise, return all events
8. Create setEventActive mutation with eventId and isActive arguments
9. Update event isActive status using patch
10. Save the file

**Step 5: Create Attendance Functions**
1. Create new file `convex/attendance.ts`
2. Import required modules (mutation, query, internalMutation, server, values)
3. Create recordAttendance mutation with userId, eventId, timestamp, scannerSource arguments
4. Check if event exists and is active
5. If not, throw error "Event not found or not active"
6. Check for existing attendance within 5 minutes
7. If exists, return existing record ID
8. If not, insert new attendance record
9. Create batchRecordAttendance internal mutation with records array
10. Loop through each record
11. Find user by bleUuid
12. Check if event exists and is active
13. Insert attendance record for each valid record
14. Return results array with status for each record
15. Save the file

**Step 6: Create HTTP API Endpoints**
1. Create new file `convex/http.ts`
2. Import required modules (httpRouter, httpAction, server, api)
3. Create httpRouter instance
4. Add /batch-checkin POST route
5. Check for x-api-key header
6. If missing, return 401 error
7. Parse request body for records array
8. If invalid, return 400 error
9. Call batchRecordAttendance mutation
10. Return success response with results
11. Add /active-events GET route
12. Check for x-api-key header
13. Query active events
14. Return events array
15. Add /health GET route
16. Return health status with timestamp and version
17. Export default http router
18. Save the file

**Step 7: Deploy the Backend**
1. Run `npx convex dev` in the terminal
2. Wait for deployment to complete
3. Note the deployment URL (e.g., `https://your-deployment.convex.cloud`)
4. Copy the HTTP URL for ESP32 configuration

**Step 8: Create API Key for Scanner**
1. Open the Convex dashboard in your browser
2. Navigate to the Functions tab
3. Create new function called createApiKey
4. Generate random API key with "att_" prefix
5. Hash the API key using SHA-256
6. Insert API key record into apiKeys table
7. Return the generated API key
8. Run this function to generate an API key
9. Copy the generated API key for ESP32 configuration

**Step 9: Test the Backend**
1. Create a test file `test-backend.js`
2. Import ConvexHttpClient
3. Create client with deployment URL
4. Test health endpoint by fetching /health
5. Log health check response
6. Test active events endpoint with API key header
7. Log active events response
8. Run `node test-backend.js`
9. Verify all endpoints return expected responses

## 3.4.3 Mobile Application (React Native)

The mobile application is built with React Native and Expo, providing cross-platform support for user registration and BLE broadcasting.

**For Android Devices:**
The app uses native Android BLE advertising APIs to broadcast a unique UUID. When a user registers for an event, the app automatically starts broadcasting the user's BLE UUID with service UUID `00001234-0000-1000-8000-00805F9B34FB`.

**For iOS Devices:**
Due to iOS restrictions on BLE advertising, the app operates in simulation mode, displaying a QR code for manual attendance tracking.

**Steps to create the mobile application:**

**Step 1: Initialize React Native Project**
1. Open terminal and navigate to your project directory
2. Run `npx create-expo-app@latest attendance-mobile --template typescript`
3. Navigate to the new directory: `cd attendance-mobile`
4. Install dependencies: `npm install`

**Step 2: Install Required Dependencies**
1. Install Convex client: `npm install @convex-dev/react-native`
2. Install navigation: `npm install @react-navigation/native @react-navigation/stack`
3. Install Expo modules: `npx expo install expo-bluetooth expo-permissions expo-location`
4. Install UI components: `npm install react-native-elements react-native-vector-icons`

**Step 3: Configure Convex Integration**
1. Create `.env.local` file in the root directory
2. Add your Convex deployment URL: `EXPO_PUBLIC_CONVEX_URL=https://your-deployment.convex.cloud`
3. Update `App.tsx` to import ConvexProvider and ConvexReactClient
4. Wrap app with ConvexProvider using deployment URL
5. Add AuthProvider for user authentication
6. Add NavigationContainer for screen navigation
7. Create AppNavigator component

**Step 4: Create Authentication System**
1. Create `src/contexts/AuthContext.tsx`
2. Import required modules (createContext, useContext, useState, useEffect, useMutation, useQuery)
3. Define User interface with _id, email, name, bleUuid fields
4. Define AuthContextType interface with user, login, register, logout, generateBleUuid methods
5. Create AuthProvider component with user state management
6. Implement generateBleUuid function with ATT-USER prefix and random string
7. Implement login function to query user by email
8. Implement register function to create new user with BLE UUID
9. Implement logout function to clear user state
10. Export useAuth hook for accessing context

**Step 5: Create Native Android BLE Module**
1. Create `android/app/src/main/java/com/attendancetracker/app/BleAdvertisingModule.java`
2. Import required Android BLE classes (BluetoothAdapter, BluetoothManager, AdvertiseCallback, etc.)
3. Extend ReactContextBaseJavaModule
4. Initialize BluetoothLeAdvertiser in constructor
5. Implement startAdvertising method with UUID parameter
6. Set up AdvertiseSettings with low latency mode and high power
7. Set up AdvertiseData with service UUID 00001234-0000-1000-8000-00805F9B34FB
8. Add service data with user UUID
9. Start advertising with callback
10. Implement stopAdvertising method
11. Implement isAdvertising method
12. Implement getCurrentUuid method
13. Add success and failure callbacks

**Step 6: Create BLE Package**
1. Create `android/app/src/main/java/com/attendancetracker/app/BleAdvertisingPackage.java`
2. Implement ReactPackage interface
3. Return empty list for createViewManagers
4. Return BleAdvertisingModule in createNativeModules
5. Add module to modules list

**Step 7: Register Native Module**
1. Open `android/app/src/main/java/com/attendancetracker/app/MainApplication.kt`
2. Import BleAdvertisingPackage
3. Add BleAdvertisingPackage to getPackages() method
4. Return list with MainReactPackage and BleAdvertisingPackage

**Step 8: Add Android Permissions**
1. Open `android/app/src/main/AndroidManifest.xml`
2. Add BLUETOOTH permission
3. Add BLUETOOTH_ADMIN permission
4. Add BLUETOOTH_ADVERTISE permission
5. Add BLUETOOTH_CONNECT permission
6. Add ACCESS_FINE_LOCATION permission
7. Add bluetooth_le hardware feature requirement

**Step 9: Create TypeScript Bridge**
1. Create `src/modules/BleAdvertising.ts`
2. Import NativeModules and Platform from react-native
3. Define BleAdvertisingModule interface with startAdvertising, stopAdvertising, isAdvertising, getCurrentUuid methods
4. Get BleAdvertising from NativeModules
5. Create isSupported function to check Android platform and module availability
6. Create startAdvertising function with error handling
7. Create stopAdvertising function with error handling
8. Create isAdvertising function with error handling
9. Create getCurrentUuid function with error handling

**Step 10: Create Bluetooth Context**
1. Create `src/contexts/BluetoothContext.tsx`
2. Import required modules (createContext, useContext, useState, useEffect, BleAdvertising, isSupported, useAuth)
3. Define BluetoothContextType interface with isNativeSupported, isBroadcasting, startBroadcasting, stopBroadcasting, currentUuid
4. Create BluetoothProvider component
5. Get user from AuthContext
6. Set up isBroadcasting and currentUuid state
7. Check isNativeSupported using isSupported function
8. Update currentUuid when user changes
9. Implement startBroadcasting function with error handling
10. Implement stopBroadcasting function with error handling
11. Export useBluetooth hook

**Step 11: Build User Interface Screens**
1. Create `src/screens/LoginScreen.tsx`
2. Import required modules (React, useState, View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, useAuth)
3. Create LoginScreen component with email and password state
4. Get login function from useAuth hook
5. Implement handleLogin function with try-catch error handling
6. Create UI with title, email input, password input, and login button
7. Add StyleSheet with container, title, input, button, buttonText styles
8. Set up proper keyboard types and secure text entry

**Step 12: Test Mobile Application**
1. Build for Android: `npx expo run:android`
2. Build for iOS: `npx expo run:ios`
3. Test BLE broadcasting on Android device
4. Verify user registration and event browsing functionality

## 3.4.4 Admin Web Interface (Next.js)

The admin interface is built with Next.js and provides comprehensive event management and attendance monitoring capabilities.

**Steps to create the admin interface:**

**Step 1: Initialize Next.js Project**
```bash
npx create-next-app@latest admin-interface --typescript --tailwind
cd admin-interface
npm install
```

**Step 2: Install Convex Dependencies**
```bash
npm install convex
npm install @convex-dev/react
```

**Step 3: Configure Convex Integration**
Set up Convex provider in `_app.tsx`:
```typescript
import { ConvexProvider, ConvexReactClient } from "@convex-dev/react";

const convex = new ConvexReactClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export default function App({ Component, pageProps }: AppProps) {
  return (
    <ConvexProvider client={convex}>
      <Component {...pageProps} />
    </ConvexProvider>
  );
}
```

**Step 4: Build Admin Components**
Create components for:
- Event creation and management
- User management
- Real-time attendance monitoring
- Attendance reports and analytics
- System configuration

**Step 5: Implement Real-time Features**
Use Convex subscriptions for real-time updates:
```typescript
const events = useQuery(api.events.listEvents);
const attendance = useQuery(api.attendance.getEventAttendance, { eventId });
```

**Step 6: Deploy Admin Interface**
```bash
npm run build
npm run start
```

## 3.4.5 Communication Protocol

The ESP32 scanner communicates with the backend using HTTP POST requests. Each request includes the scanner's API key, event ID, and attendance records:

**Registration Request:**
```
POST /batch-checkin
Headers: x-api-key: scanner-api-key
Body: {
  "records": [{
    "bleUuid": "ATT-USER-12345678",
    "eventId": "event-id",
    "timestamp": 1640995200000,
    "scannerSource": "ESP32-Scanner-01"
  }]
}
```

**Event Loading Request:**
```
GET /active-events
Headers: x-api-key: scanner-api-key
Response: {
  "success": true,
  "events": [{
    "id": "event-id",
    "name": "Event Name",
    "isActive": true
  }]
}
```

The backend processes requests and returns JSON responses with success status and any error messages. The ESP32 then updates the display and LED indicators according to the response.

## 3.5 Data Storage Structures

### 3.5.1 Convex Database Schema

The system uses Convex's real-time database with the following table structure:

**Users Table:**
Stores registered user information including email, name, BLE UUID, and role. Each user has a unique BLE UUID for device identification.

**Events Table:**
Contains event information including name, description, start/end times, and active status. Events are created by administrators and can be activated for attendance tracking.

**Event Registrations Table:**
Links users to events they have registered for. Each registration includes user ID, event ID, registration timestamp, and status (registered/cancelled).

**Attendance Table:**
Stores attendance records with user ID, event ID, scan timestamp, device ID, and scanner source. Records are marked as synced when uploaded from offline scanners.

### 3.5.2 Data Flow Architecture

**Event Creation Flow:**
Admin creates event → Backend stores event → Available to scanner and mobile app

**User Registration Flow:**
User registers via mobile app → Backend stores registration → Scanner loads registered users

**Attendance Recording Flow:**
Scanner detects BLE device → Verifies registration → Records attendance → Syncs to backend

**Offline Operation:**
Scanner stores attendance locally → Network reconnection → Batch upload to backend

## 3.6 User Interface and Feedback

The system provides comprehensive feedback through multiple interfaces:

**ESP32 TFT Display:**
Shows event selection menu, scanning status, and system responses like "Event Selected," "Scanning Active," or "Attendance Recorded."

**LED Indicators:**
Yellow LED indicates system ready state, blue LED shows active scanning status with proper timing and visual feedback.

**Push Button Interface:**
UP/DOWN buttons for navigation, ENTER button for selection and mode switching with proper debouncing and state management.

**Mobile App Interface:**
Real-time event updates, registration status, broadcasting status, and attendance history with intuitive navigation and user feedback.

**Admin Dashboard:**
Real-time attendance monitoring, event management, user administration, and comprehensive reporting with visual analytics and export functionality.

## 3.7 System Workflow

The complete system operation follows a structured sequence:

**System Initialization:**
ESP32 connects to WiFi, initializes hardware, and loads available events from backend. Mobile apps connect to backend and display available events to users.

**Event Preparation:**
Administrators create events through the web interface. Users register for events via mobile applications. ESP32 scanner loads registered device UUIDs for the selected event.

**Attendance Tracking:**
ESP32 scanner continuously scans for BLE devices. When a registered device is detected, attendance is recorded and synced to backend. Mobile apps show real-time attendance status and history.

**Data Management:**
Backend processes all attendance data with real-time synchronization. Admin interface provides comprehensive monitoring and reporting capabilities with percentage-based attendance calculations.

**Offline Operation:**
ESP32 scanner operates independently during events, storing attendance data locally. When connectivity is restored, all data is batch uploaded to backend for processing and reporting.

This workflow ensures reliable, automated attendance tracking with comprehensive data management and user-friendly interfaces across all system components.
