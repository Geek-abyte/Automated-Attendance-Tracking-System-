# Automated Attendance Tracking System - Backend

This is the Convex backend for the automated attendance tracking system using Bluetooth device identification.

## 🏗️ Architecture

The backend is built using [Convex](https://convex.dev) and provides:

- **Real-time database** with automatic schema migrations
- **Type-safe functions** for all operations
- **HTTP API endpoints** for scanner integration
- **Offline-first design** with batch sync capabilities

## 📊 Database Schema

### Users
- `email`: User's email address (unique)
- `name`: Display name
- `bleUuid`: Bluetooth UUID for device identification
- `createdAt`: Timestamp

### Events  
- `name`: Event title
- `description`: Event description
- `startTime` / `endTime`: Event duration
- `isActive`: Whether event accepts attendance
- `createdBy`: Admin identifier
- `createdAt`: Timestamp

### EventRegistrations
- `userId`: Reference to user
- `eventId`: Reference to event
- `registeredAt`: Registration timestamp
- `status`: "registered" | "cancelled"

### Attendance
- `userId`: Reference to user
- `eventId`: Reference to event  
- `timestamp`: Check-in time
- `scannerSource`: Which scanner detected the user
- `synced`: Whether record came from offline scanner
- `syncedAt`: Sync timestamp

### ApiKeys
- `keyHash`: Hashed API key for scanner authentication
- `name`: Human-readable key name
- `isActive`: Whether key is valid
- `createdAt`: Creation timestamp
- `lastUsed`: Last usage timestamp

## 🔧 Setup

### Prerequisites
- Node.js 18+ 
- npm or yarn

### Installation

1. **Install dependencies:**
```bash
npm install
```

2. **Initialize Convex:**
```bash
npx convex dev --once
```

3. **Run development server:**
```bash
npm run dev
```

## 🧪 Testing

Run the MVP test suite to verify all functions work correctly:

```bash
# Make sure dev server is running first
npm run dev

# In another terminal
node test-mvp.js
```

## 📡 API Endpoints

### POST /batch-checkin
Batch upload attendance records from offline scanners.

**Headers:**
- `x-api-key`: Valid API key
- `Content-Type: application/json`

**Request Body:**
```json
{
  "records": [
    {
      "bleUuid": "user-ble-uuid",
      "eventId": "event-id",
      "timestamp": 1640995200000,
      "scannerSource": "scanner-1"
    }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "processed": 1,
  "successful": 1,
  "duplicates": 0,
  "errors": 0,
  "results": [...]
}
```

### GET /active-events
Get list of currently active events.

**Headers:**
- `x-api-key`: Valid API key

**Response:**
```json
{
  "success": true,
  "events": [
    {
      "id": "event-id",
      "name": "Event Name",
      "startTime": 1640995200000,
      "endTime": 1640998800000,
      "isActive": true
    }
  ]
}
```

### GET /health
Health check endpoint.

**Response:**
```json
{
  "status": "healthy",
  "timestamp": 1640995200000,
  "version": "1.0.0"
}
```

## 🔐 Authentication

### API Keys
Create API keys for scanner authentication:

```javascript
// Create new API key
const result = await client.mutation("auth:createApiKey", {
  name: "Scanner 1"
});

// Use the returned apiKey for HTTP requests
const apiKey = result.apiKey;
```

## 🚀 Deployment

### Development
```bash
npm run dev
```

### Production
```bash
npm run build
```

The Convex dashboard will be available at the URL shown in the console.

## 📋 Available Functions

### User Management
- `users:createUser` - Create/update user
- `users:getUserByEmail` - Find user by email
- `users:getUserByBleUuid` - Find user by BLE UUID  
- `users:listUsers` - Get all users (admin)
- `users:updateUser` - Update user profile

### Event Management
- `events:createEvent` - Create new event
- `events:getEvent` - Get event by ID
- `events:listEvents` - List events with filters
- `events:listUpcomingEvents` - Get upcoming events
- `events:updateEvent` - Update event details
- `events:setEventActive` - Activate/deactivate event

### Event Registration
- `registrations:registerForEvent` - Register user for event
- `registrations:cancelRegistration` - Cancel registration
- `registrations:getUserRegistrations` - Get user's registrations
- `registrations:getEventRegistrations` - Get event registrations
- `registrations:isUserRegistered` - Check registration status
- `registrations:getEventStats` - Get registration statistics

### Attendance Tracking
- `attendance:recordAttendance` - Record single attendance
- `attendance:batchRecordAttendance` - Batch record attendance
- `attendance:getEventAttendance` - Get event attendance records
- `attendance:getUserAttendance` - Get user attendance history
- `attendance:didUserAttendEvent` - Check if user attended
- `attendance:getAttendanceSummary` - Get attendance summary

### Authentication
- `auth:createApiKey` - Create API key for scanner
- `auth:validateApiKey` - Validate API key
- `auth:listApiKeys` - List all API keys (admin)
- `auth:deactivateApiKey` - Disable API key
- `auth:reactivateApiKey` - Re-enable API key

## 🔧 Configuration

The system is configured for MVP usage with:
- Simple authentication (API keys only)
- Basic duplicate prevention (5-minute window)
- Automatic index creation
- CORS enabled for web clients

## 🚨 MVP Limitations

- **No advanced security**: Basic API key authentication only
- **No user roles**: All authenticated requests have full access
- **Simplified duplicate detection**: Basic time-window approach
- **No rate limiting**: Unlimited requests per API key
- **Basic error handling**: Essential validation only

## 🔄 Integration Points

### Mobile App
- User registration and BLE UUID assignment
- Event listing and registration
- Real-time attendance recording

### Admin Dashboard
- Event creation and management
- User management
- Attendance reporting
- API key management

### Scanner Application
- Batch attendance upload via HTTP API
- Active event synchronization
- Offline data storage and sync

## 📈 Next Steps

After MVP validation:
1. Add proper user authentication (Clerk/Auth0)
2. Implement role-based permissions
3. Add rate limiting and security headers
4. Enhanced error handling and logging
5. Performance optimization for scale
6. Advanced duplicate detection algorithms
7. Real-time notifications and webhooks

## 🐛 Troubleshooting

### Common Issues

**"Index not found" errors:**
```bash
# Regenerate schema and indexes
npx convex dev --once
```

**Type errors:**
```bash
# Regenerate API types  
npx convex dev --once
```

**Connection issues:**
- Check that Convex dev server is running
- Verify .env.local contains correct deployment URL

### Development Tips

1. **Use the Convex dashboard** to inspect data and debug queries
2. **Check console logs** in the dev server for function errors  
3. **Use the test script** to verify functionality after changes
4. **Backup data** before schema changes in production

---

For questions or issues, check the Convex documentation at [docs.convex.dev](https://docs.convex.dev) or contact the development team.
