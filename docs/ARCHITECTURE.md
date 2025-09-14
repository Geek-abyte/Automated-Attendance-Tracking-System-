# Automated Attendance Tracking System - Architecture Guide

## System Overview

The Automated Attendance Tracking System consists of four main components:

1. **Admin Web Interface** - Event management and monitoring
2. **Backend (Convex)** - Data storage and API
3. **Device Scanner Interface** - Event control and Bluetooth scanning
4. **Mobile App** - User registration and Bluetooth emission

## Core Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Admin Web     │    │   Mobile App    │    │  Scanner Device │
│   Interface     │    │                 │    │   Interface     │
│                 │    │                 │    │                 │
│ - Create Events │    │ - Register for  │    │ - Select Event  │
│ - Monitor Data  │    │   Events        │    │ - Start/Stop    │
│ - View Reports  │    │ - Emit BLE      │    │ - Scan BLE      │
│ - Manage Users  │    │ - View Profile  │    │ - Auto End      │
└─────────┬───────┘    └─────────┬───────┘    └─────────┬───────┘
          │                      │                      │
          │                      │                      │
          └──────────────────────┼──────────────────────┘
                                 │
                    ┌─────────────┴─────────────┐
                    │      Convex Backend       │
                    │                           │
                    │ - Events Database         │
                    │ - Users Database          │
                    │ - Registrations Database  │
                    │ - Attendance Database     │
                    │ - Real-time Sync          │
                    │ - Authentication          │
                    └───────────────────────────┘
```

## Component Details

### 1. Admin Web Interface (Next.js)

**Purpose**: Event management and monitoring dashboard

**Features**:
- Create, edit, and delete events
- View real-time attendance data
- Generate attendance reports
- Manage user accounts
- Monitor active events
- Set event parameters (duration, location, etc.)

**Key Pages**:
- Dashboard: Overview of all events and statistics
- Events: List, create, edit events
- Reports: Attendance analytics and exports
- Users: User management and registration status
- Settings: System configuration

### 2. Backend (Convex)

**Purpose**: Centralized data storage and real-time synchronization

**Database Schema**:

```typescript
// Events
interface Event {
  _id: string;
  name: string;
  description: string;
  startTime: number;
  endTime: number;
  location: string;
  isActive: boolean;
  autoEndEnabled: boolean;
  autoEndTime?: number;
  createdBy: string;
  createdAt: number;
  scanIntervalMinutes: number; // For percentage calculation
}

// Users
interface User {
  _id: string;
  email: string;
  name: string;
  bleUuid: string; // Unique BLE identifier
  role: 'admin' | 'user';
  createdAt: number;
}

// Event Registrations
interface EventRegistration {
  _id: string;
  userId: string;
  eventId: string;
  registeredAt: number;
  status: 'registered' | 'cancelled';
}

// Attendance Records (Multiple per user per event)
interface AttendanceRecord {
  _id: string;
  userId: string;
  eventId: string;
  scanTime: number;
  deviceId: string;
  signalStrength: number;
  isPresent: boolean;
}

// Attendance Summary (Calculated)
interface AttendanceSummary {
  _id: string;
  userId: string;
  eventId: string;
  totalScans: number;
  presentScans: number;
  attendancePercentage: number;
  firstSeen: number;
  lastSeen: number;
  totalDuration: number;
}
```

**API Functions**:
- Authentication: signIn, signUp, getUser
- Events: create, list, getById, update, delete, setActive
- Registrations: register, unregister, getUserRegistrations
- Attendance: recordScan, getEventAttendance, getUserAttendance
- Reports: generateReport, getStatistics

### 3. Scanner Device Interface

**Purpose**: Physical device control for event scanning

**Features**:
- Event selection from available events
- Start/Stop event scanning
- Real-time scan display
- Automatic end timer
- Manual event termination
- Scan frequency configuration

**Technical Requirements**:
- Bluetooth LE scanning capability
- Simple touch interface (tablet/smartphone)
- Battery efficient operation
- Network connectivity for data sync
- Local storage for offline operation

**Operation Flow**:
1. Select event from dropdown list
2. Configure scan settings (interval, auto-end)
3. Start scanning
4. Continuously scan for BLE devices
5. Record attendance data
6. Sync with backend
7. End event (manual or automatic)

### 4. Mobile App (React Native with Expo)

**Purpose**: User interface for event registration and attendance

**Features**:
- User authentication (email-based)
- Browse and register for events
- Automatic BLE signal emission
- Background operation
- Notification system
- Profile management
- Attendance history

**Key Screens**:
- Login/Register
- Events List (Available/Registered/All)
- Event Details with registration
- Profile/Settings
- Attendance History
- Notifications

**BLE Implementation**:
- Unique UUID per user device
- Continuous background advertising
- Signal strength monitoring
- Battery optimization
- Permission handling

## Data Flow

### Event Creation Flow
```
Admin → Create Event → Backend → Available to Scanner Device & Mobile App
```

### Registration Flow
```
Mobile User → Browse Events → Register → Backend → Updates Scanner Device
```

### Attendance Flow
```
Scanner Device → Scan BLE → Detect Mobile → Record → Backend → Real-time Updates
```

### Percentage Calculation
```
Total Event Duration ÷ Scan Intervals = Expected Scans
Present Scans ÷ Expected Scans × 100 = Attendance Percentage
```

## Security & Authentication

### User Authentication
- Email-based registration
- JWT tokens for session management
- Role-based access control (admin/user)
- Secure password hashing

### Device Security
- Unique BLE UUIDs per device
- Scanner device authentication
- Data encryption in transit
- Offline data protection

### Privacy Considerations
- Bluetooth scanning permissions
- Location data handling
- User consent for tracking
- Data retention policies

## Real-time Features

### Live Updates
- Real-time attendance monitoring
- Event status synchronization
- Instant registration updates
- Live scan results

### Background Operations
- Mobile app BLE advertising
- Continuous scanner operation
- Automatic data synchronization
- Battery optimization

## Percentage-Based Attendance System

### Scanning Strategy
- Configurable scan intervals (default: 5 minutes)
- Multiple scans throughout event duration
- Signal strength consideration
- Presence validation

### Calculation Method
```typescript
// Example calculation
const eventDuration = endTime - startTime; // milliseconds
const scanInterval = 5 * 60 * 1000; // 5 minutes
const expectedScans = Math.floor(eventDuration / scanInterval);
const attendancePercentage = (presentScans / expectedScans) * 100;

// Categories
// 90-100%: Excellent attendance
// 70-89%:  Good attendance  
// 50-69%:  Fair attendance
// <50%:    Poor attendance
```

### Attendance Validation
- Minimum presence duration requirements
- Signal strength thresholds
- Duplicate scan handling
- Late arrival/early departure tracking

## Deployment Architecture

### Production Setup
```
Frontend (Vercel) → Backend (Convex Cloud) ← Scanner Device (Local Network)
                                          ← Mobile Apps (Global)
```

### Development Environment
```
Local Frontend → Local Convex Dev → Local Scanner → Local Mobile
```

## Scalability Considerations

### Performance Optimization
- Efficient BLE scanning algorithms
- Batch data processing
- Optimized database queries
- Caching strategies

### Device Limitations
- Maximum concurrent users per scanner
- Bluetooth range considerations
- Network bandwidth requirements
- Battery life optimization

## Integration Points

### External Services
- Email notifications (SendGrid/SES)
- Push notifications (Expo)
- Analytics (optional)
- Backup storage (optional)

### API Endpoints
- RESTful API for scanner devices
- GraphQL for admin interface
- WebSocket for real-time updates
- Mobile SDK integration

This architecture ensures a robust, scalable, and user-friendly attendance tracking system with accurate percentage-based attendance calculation.
