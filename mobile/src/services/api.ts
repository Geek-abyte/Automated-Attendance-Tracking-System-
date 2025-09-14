import { ConvexHttpClient } from "convex/browser";
import { api } from "../../convex/_generated/api";

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export class ApiService {
  private static client: ConvexHttpClient;

  static initialize() {
    if (!this.client) {
      this.client = new ConvexHttpClient(process.env.EXPO_PUBLIC_CONVEX_URL!);
    }
  }

  // User management
  static async createUser(userData: { name: string; email: string; bleUuid: string }): Promise<string> {
    this.initialize();
    try {
      const userId = await this.client.mutation(api.users.createUser, userData);
      return userId;
    } catch (error) {
      console.error('Error creating user:', error);
      throw error;
    }
  }

  static async getUserByEmail(email: string): Promise<any> {
    this.initialize();
    try {
      const user = await this.client.query(api.users.getUserByEmail, { email });
      return user;
    } catch (error) {
      console.error('Error getting user by email:', error);
      return null;
    }
  }

  static async getUserByBleUuid(bleUuid: string): Promise<any> {
    this.initialize();
    try {
      const user = await this.client.query(api.users.getUserByBleUuid, { bleUuid });
      return user;
    } catch (error) {
      console.error('Error getting user by BLE UUID:', error);
      return null;
    }
  }

  // Event management
  static async getEvents(): Promise<any[]> {
    this.initialize();
    try {
      const events = await this.client.query(api.events.listEvents, {});
      return events;
    } catch (error) {
      console.error('Error getting events:', error);
      return [];
    }
  }

  static async getUpcomingEvents(): Promise<any[]> {
    this.initialize();
    try {
      const events = await this.client.query(api.events.listUpcomingEvents, {});
      return events;
    } catch (error) {
      console.error('Error getting upcoming events:', error);
      return [];
    }
  }

  // Registration management
  static async getUserRegistrations(userId: string): Promise<any[]> {
    this.initialize();
    try {
      const registrations = await this.client.query(api.registrations.getUserRegistrations, { userId });
      return registrations;
    } catch (error) {
      console.error('Error getting user registrations:', error);
      return [];
    }
  }

  static async registerForEvent(userId: string, eventId: string): Promise<void> {
    this.initialize();
    try {
      await this.client.mutation(api.registrations.registerForEvent, { userId, eventId });
    } catch (error) {
      console.error('Error registering for event:', error);
      throw error;
    }
  }

  static async unregisterFromEvent(userId: string, eventId: string): Promise<void> {
    this.initialize();
    try {
      await this.client.mutation(api.registrations.cancelRegistration, { userId, eventId });
    } catch (error) {
      console.error('Error unregistering from event:', error);
      throw error;
    }
  }

  // Attendance management
  static async recordAttendance(userId: string, eventId: string, method: string = 'mobile'): Promise<void> {
    this.initialize();
    try {
      await this.client.mutation(api.attendance.recordAttendance, {
        userId,
        eventId,
        method,
        timestamp: Date.now(),
      });
    } catch (error) {
      console.error('Error recording attendance:', error);
      throw error;
    }
  }

  static async getUserAttendance(userId: string): Promise<any[]> {
    this.initialize();
    try {
      const attendance = await this.client.query(api.attendance.getUserAttendance, { userId });
      return attendance;
    } catch (error) {
      console.error('Error getting user attendance:', error);
      return [];
    }
  }
}