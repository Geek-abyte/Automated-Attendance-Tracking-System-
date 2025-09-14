# Attendance Tracker Mobile App

A React Native mobile application for automated attendance tracking using Bluetooth device identification.

## Features

- **User Authentication**: Login and registration with email
- **Event Management**: View and register for events
- **Bluetooth Broadcasting**: Automatically broadcast BLE UUID for attendance tracking
- **Offline-First**: Works without internet connection during events
- **Real-time Status**: See which events are active and when broadcasting is enabled

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Configure Convex (already done):
   - The app is connected to the existing Convex backend
   - Environment variables are set in `.env.local`

3. Run the app:
   ```bash
   # For development
   npm start
   
   # For Android
   npm run android
   
   # For iOS
   npm run ios
   ```

## App Flow

1. **Login/Register**: Users create an account or sign in
2. **View Events**: Browse available events and register for ones they want to attend
3. **Active Events**: When an event is active (between start and end time), users can enable broadcasting
4. **Attendance Tracking**: The app broadcasts the user's BLE UUID for the scanner to detect
5. **Profile Management**: Users can view their profile and BLE UUID

## Key Components

- **AuthContext**: Manages user authentication state
- **BluetoothContext**: Handles BLE broadcasting and permissions
- **EventsScreen**: Main screen for viewing and managing events
- **ProfileScreen**: User profile and settings
- **LoginScreen/RegisterScreen**: Authentication screens

## Permissions

The app requires the following permissions:
- Bluetooth (for broadcasting BLE UUID)
- Location (required for Bluetooth on Android)

## MVP Status

This is a clean, focused MVP implementation that includes:
- ✅ User authentication
- ✅ Event registration
- ✅ BLE UUID broadcasting simulation
- ✅ Clean, modern UI
- ✅ Convex backend integration

The app is ready for testing and can be extended with additional features as needed.
