import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  events: defineTable({
    name: v.string(),
    description: v.optional(v.string()),
    startTime: v.optional(v.number()),
    endTime: v.optional(v.number()),
    isActive: v.boolean(),
    createdBy: v.optional(v.string()),
    createdAt: v.number(),
    location: v.optional(v.string()),
  })
    .index("by_active", ["isActive"])
    .index("by_startTime", ["startTime"]),

  users: defineTable({
    name: v.string(),
    email: v.string(),
    bleUuid: v.optional(v.string()),
    phone: v.optional(v.string()),
    department: v.optional(v.string()),
    isActive: v.optional(v.boolean()),
    createdAt: v.number(),
  })
    .index("by_email", ["email"])
    .index("by_bleUuid", ["bleUuid"])
    .index("by_active", ["isActive"]),

  attendance: defineTable({
    eventId: v.id("events"),
    userId: v.id("users"),
    timestamp: v.number(),
    method: v.string(), // "scanner", "manual", "mobile"
    deviceId: v.optional(v.string()),
    location: v.optional(v.string()),
  })
    .index("by_event", ["eventId"])
    .index("by_user", ["userId"])
    .index("by_event_user", ["eventId", "userId"])
    .index("by_timestamp", ["timestamp"]),

  registrations: defineTable({
    eventId: v.id("events"),
    userId: v.id("users"),
    registeredAt: v.number(),
    status: v.string(), // "registered", "cancelled"
  })
    .index("by_event", ["eventId"])
    .index("by_user", ["userId"])
    .index("by_event_user", ["eventId", "userId"]),
});
