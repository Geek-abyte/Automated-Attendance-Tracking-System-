import { ConvexHttpClient } from "convex/browser";
// Use string operation names to avoid importing backend generated API

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export class ApiService {
  private static client: ConvexHttpClient;

  static initialize() {
    if (!this.client) {
      const url = process.env.EXPO_PUBLIC_CONVEX_URL;
      if (!url) {
        throw new Error(
          "EXPO_PUBLIC_CONVEX_URL is not set. Please define it in mobile/.env or your build environment."
        );
      }
      this.client = new ConvexHttpClient(url);
    }
  }

  // User management
  static async createUser(userData: { name: string; email: string; password: string; bleUuid: string }): Promise<string> {
    this.initialize();
    try {
      const userId = await this.client.mutation("users:createUser", userData);
      return userId;
    } catch (error) {
      console.error('Error creating user:', error);
      throw error;
    }
  }

  static async verifyLogin(email: string, password: string): Promise<any> {
    this.initialize();
    try {
      const user = await this.client.query("users:verifyLogin", { email, password });
      return user;
    } catch (error) {
      console.error('Error verifying login:', error);
      return null;
    }
  }

  static async getUserByEmail(email: string): Promise<any> {
    this.initialize();
    try {
      const user = await this.client.query("users:getUserByEmail", { email });
      return user;
    } catch (error) {
      console.error('Error getting user by email:', error);
      return null;
    }
  }

  static async getUserByBleUuid(bleUuid: string): Promise<any> {
    this.initialize();
    try {
      const user = await this.client.query("users:getUserByBleUuid", { bleUuid });
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
      const events = await this.client.query("events:listEvents", {});
      return events;
    } catch (error) {
      console.error('Error getting events:', error);
      return [];
    }
  }

  static async getUpcomingEvents(): Promise<any[]> {
    this.initialize();
    try {
      const events = await this.client.query("events:listUpcomingEvents", {});
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
      const registrations = await this.client.query("registrations:getUserRegistrations", { userId });
      return registrations;
    } catch (error) {
      console.error('Error getting user registrations:', error);
      return [];
    }
  }

  static async registerForEvent(userId: string, eventId: string): Promise<void> {
    this.initialize();
    try {
      await this.client.mutation("registrations:registerForEvent", { userId, eventId });
    } catch (error) {
      console.error('Error registering for event:', error);
      throw error;
    }
  }

  static async unregisterFromEvent(userId: string, eventId: string): Promise<void> {
    this.initialize();
    try {
      await this.client.mutation("registrations:cancelRegistration", { userId, eventId });
    } catch (error) {
      console.error('Error unregistering from event:', error);
      throw error;
    }
  }

  // Attendance management
  static async recordAttendance(userId: string, eventId: string, scannerSource: string = 'mobile'): Promise<void> {
    this.initialize();
    try {
      await this.client.mutation("attendance:recordAttendance", {
        userId,
        eventId,
        scannerSource,
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
      const attendance = await this.client.query("attendance:getUserAttendance", { userId });
      return attendance;
    } catch (error) {
      console.error('Error getting user attendance:', error);
      return [];
    }
  }
}