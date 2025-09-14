export interface User {
  _id: string;
  name: string;
  email: string;
  bleUuid: string;
  createdAt: number;
}

export interface Event {
  _id: string;
  name: string;
  description?: string;
  startTime?: number;
  endTime?: number;
  isActive: boolean;
  createdAt: number;
}

export interface EventRegistration {
  _id: string;
  userId: string;
  eventId: string;
  registeredAt: number;
}

export interface Attendance {
  _id: string;
  userId: string;
  eventId: string;
  checkInTime: number;
  bleUuid: string;
  scannerId: string;
}

export interface AuthState {
  isAuthenticated: boolean;
  user: User | null;
  loading: boolean;
}

export interface BluetoothState {
  isScanning: boolean;
  isBroadcasting: boolean;
  bleUuid: string | null;
  permissionsGranted: boolean;
}
