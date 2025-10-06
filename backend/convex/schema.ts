import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // Users table - stores user information and their BLE UUID
  users: defineTable({
    email: v.string(),
    name: v.string(),
    passwordHash: v.string(), // Hashed password for authentication
    bleUuid: v.string(), // Unique BLE identifier for device detection
    role: v.optional(v.union(v.literal("admin"), v.literal("user"))), // User role
    createdAt: v.number(),
  })
    .index("by_email", ["email"])
    .index("by_bleUuid", ["bleUuid"])
    .index("by_role", ["role"]),

  // Events table - stores attendance events with enhanced features
  events: defineTable({
    name: v.string(),
    description: v.optional(v.string()),
    startTime: v.optional(v.number()), // May be set dynamically by scanner
    endTime: v.optional(v.number()),   // May be set dynamically by scanner
    location: v.optional(v.string()),
    isActive: v.boolean(), // Whether event is currently accepting attendance
    autoEndEnabled: v.optional(v.boolean()), // Whether event should auto-end
    autoEndTime: v.optional(v.number()), // Auto-end timestamp
    scanIntervalMinutes: v.optional(v.number()), // Scan interval for percentage calculation (default: 5)
    createdBy: v.optional(v.string()), // Admin/organizer identifier
    createdAt: v.number(),
  })
    .index("by_active", ["isActive"])
    .index("by_startTime", ["startTime"])
    .index("by_createdBy", ["createdBy"]),

  // Attendance records - stores individual scans (multiple per user per event)
  attendance: defineTable({
    userId: v.id("users"),
    eventId: v.id("events"),
    scanTime: v.number(), // When the scan occurred
    deviceId: v.string(), // Scanner device identifier
    signalStrength: v.optional(v.number()), // BLE signal strength (RSSI)
    isPresent: v.boolean(), // Whether user was detected as present
    scannerSource: v.optional(v.string()), // Which scanner detected the user
    synced: v.boolean(), // Whether this was synced from offline scanner
    syncedAt: v.optional(v.number()), // When this record was synced
  })
    .index("by_event", ["eventId"])
    .index("by_user", ["userId"])
    .index("by_user_event", ["userId", "eventId"])
    .index("by_scanTime", ["scanTime"])
    .index("by_synced", ["synced"])
    .index("by_deviceId", ["deviceId"]),

  // Attendance summary - calculated attendance percentages
  attendanceSummary: defineTable({
    userId: v.id("users"),
    eventId: v.id("events"),
    totalScans: v.number(), // Total expected scans during event
    presentScans: v.number(), // Number of scans where user was present
    attendancePercentage: v.number(), // Calculated percentage (0-100)
    firstSeen: v.optional(v.number()), // First detection timestamp
    lastSeen: v.optional(v.number()), // Last detection timestamp
    totalDuration: v.number(), // Total time present in milliseconds
    calculatedAt: v.number(), // When this summary was calculated
  })
    .index("by_event", ["eventId"])
    .index("by_user", ["userId"])
    .index("by_user_event", ["userId", "eventId"])
    .index("by_percentage", ["attendancePercentage"]),

  // Event registrations - tracks which users are registered for events
  eventRegistrations: defineTable({
    userId: v.id("users"),
    eventId: v.id("events"),
    registeredAt: v.number(),
    status: v.union(v.literal("registered"), v.literal("cancelled")),
  })
    .index("by_event", ["eventId"])
    .index("by_user", ["userId"])
    .index("by_user_event", ["userId", "eventId"])
    .index("by_status", ["status"]),

  // API keys for scanner authentication
  apiKeys: defineTable({
    keyHash: v.string(), // Hashed API key for security
    name: v.string(), // Human-readable name for the key
    isActive: v.boolean(),
    createdAt: v.number(),
    lastUsed: v.optional(v.number()),
  })
    .index("by_keyHash", ["keyHash"])
    .index("by_active", ["isActive"]),
});
