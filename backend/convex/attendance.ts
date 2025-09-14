import { mutation, query, internalMutation, internalQuery } from "./_generated/server";
import { v } from "convex/values";

// Record attendance for a user (single check-in)
export const recordAttendance = mutation({
  args: {
    userId: v.id("users"),
    eventId: v.id("events"),
    timestamp: v.optional(v.number()),
    scannerSource: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const timestamp = args.timestamp || Date.now();

    // Check if event exists and is active
    const event = await ctx.db.get(args.eventId);
    if (!event) {
      throw new Error("Event not found");
    }

    if (!event.isActive) {
      throw new Error("Event is not active");
    }

    // Check if user is registered for the event
    const registration = await ctx.db
      .query("eventRegistrations")
      .withIndex("by_user_event", (q) => 
        q.eq("userId", args.userId).eq("eventId", args.eventId)
      )
      .unique();

    if (!registration || registration.status !== "registered") {
      throw new Error("User is not registered for this event");
    }

    // Check for duplicate attendance (within 5 minutes)
    const fiveMinutesAgo = timestamp - (5 * 60 * 1000);
    const existingAttendance = await ctx.db
      .query("attendance")
      .withIndex("by_user_event", (q) => 
        q.eq("userId", args.userId).eq("eventId", args.eventId)
      )
      .filter((q) => q.gt(q.field("timestamp"), fiveMinutesAgo))
      .first();

    if (existingAttendance) {
      return existingAttendance._id; // Return existing record, don't duplicate
    }

    // Record attendance
    const attendanceId = await ctx.db.insert("attendance", {
      userId: args.userId,
      eventId: args.eventId,
      scanTime: timestamp,
      deviceId: args.scannerSource || "unknown",
      isPresent: true,
      scannerSource: args.scannerSource,
      synced: false, // Will be true when synced from offline scanner
      syncedAt: undefined,
    });

    return attendanceId;
  },
});

// Get attendance records for an event
export const getEventAttendance = query({
  args: { 
    eventId: v.id("events"),
    includeUserDetails: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const attendanceRecords = await ctx.db
      .query("attendance")
      .withIndex("by_event", (q) => q.eq("eventId", args.eventId))
      .order("desc")
      .collect();

    if (!args.includeUserDetails) {
      return attendanceRecords;
    }

    // Include user details
    const recordsWithUsers = await Promise.all(
      attendanceRecords.map(async (record) => {
        const user = await ctx.db.get(record.userId);
        return {
          ...record,
          user,
        };
      })
    );

    return recordsWithUsers;
  },
});

// Get user's attendance history
export const getUserAttendance = query({
  args: { 
    userId: v.id("users"),
    includeEventDetails: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const attendanceRecords = await ctx.db
      .query("attendance")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .order("desc")
      .collect();

    if (!args.includeEventDetails) {
      return attendanceRecords;
    }

    // Include event details
    const recordsWithEvents = await Promise.all(
      attendanceRecords.map(async (record) => {
        const event = await ctx.db.get(record.eventId);
        return {
          ...record,
          event,
        };
      })
    );

    return recordsWithEvents;
  },
});

// Check if user attended event
export const didUserAttendEvent = query({
  args: {
    userId: v.id("users"),
    eventId: v.id("events"),
  },
  handler: async (ctx, args) => {
    const attendance = await ctx.db
      .query("attendance")
      .withIndex("by_user_event", (q) => 
        q.eq("userId", args.userId).eq("eventId", args.eventId)
      )
      .first();

    return !!attendance;
  },
});

// Get attendance statistics for an event
export const getEventAttendanceStats = query({
  args: { eventId: v.id("events") },
  handler: async (ctx, args) => {
    const [attendanceRecords, registrations] = await Promise.all([
      ctx.db
        .query("attendance")
        .withIndex("by_event", (q) => q.eq("eventId", args.eventId))
        .collect(),
      ctx.db
        .query("eventRegistrations")
        .withIndex("by_event", (q) => q.eq("eventId", args.eventId))
        .filter((q) => q.eq(q.field("status"), "registered"))
        .collect()
    ]);

    const uniqueAttendees = new Set(attendanceRecords.map(a => a.userId));
    
    return {
      totalRegistered: registrations.length,
      totalAttended: uniqueAttendees.size,
      attendanceRate: registrations.length > 0 ? uniqueAttendees.size / registrations.length : 0,
      totalCheckins: attendanceRecords.length,
      syncedRecords: attendanceRecords.filter(a => a.synced).length,
      realtimeRecords: attendanceRecords.filter(a => !a.synced).length,
    };
  },
});

// Internal function for batch recording attendance (used by HTTP endpoints)
export const batchRecordAttendance = internalMutation({
  args: {
    records: v.array(v.object({
      bleUuid: v.string(),
      eventId: v.string(), // Changed to string to handle both ID and string formats
      timestamp: v.number(),
      scannerSource: v.optional(v.string()),
      rssi: v.optional(v.number()),
      deviceName: v.optional(v.string()),
    })),
  },
  handler: async (ctx, args) => {
    type ResultItem = {
      bleUuid: string;
      status: "success" | "error" | "duplicate";
      attendanceId?: any;
      error?: string;
    };
    
    const results: ResultItem[] = [];

    // Track min/max timestamps per event to auto-populate event time window
    const eventWindow = new Map<string, { min: number; max: number }>();
    
    for (const record of args.records) {
      try {
        // Find user by BLE UUID
        const user = await ctx.db
          .query("users")
          .withIndex("by_bleUuid", (q) => q.eq("bleUuid", record.bleUuid))
          .unique();

        if (!user) {
          results.push({
            bleUuid: record.bleUuid,
            status: "error",
            error: "User not found",
          });
          continue;
        }

        // Check if event exists (time validation is relaxed; scanner drives)
        let event;
        try {
          // Try to get event by ID first
          event = await ctx.db.get(record.eventId as any);
        } catch {
          // If that fails, try to find by name
          const events = await ctx.db
            .query("events")
            .filter((q) => q.eq(q.field("name"), record.eventId))
            .collect();
          event = events[0];
        }
        
        if (!event) {
          results.push({
            bleUuid: record.bleUuid,
            status: "error",
            error: "Event not found",
          });
          continue;
        }

        // Check if user was registered
        const registration = await ctx.db
          .query("eventRegistrations")
          .withIndex("by_user_event", (q) => 
            q.eq("userId", user._id).eq("eventId", record.eventId)
          )
          .unique();

        if (!registration || registration.status !== "registered") {
          results.push({
            bleUuid: record.bleUuid,
            status: "error",
            error: "User not registered for event",
          });
          continue;
        }

        // Check for existing attendance record (first-seen semantics per user/event)
        const existingAttendance = await ctx.db
          .query("attendance")
          .withIndex("by_user_event", (q) => 
            q.eq("userId", user._id).eq("eventId", event._id)
          )
          .first();

        if (existingAttendance) {
          results.push({
            bleUuid: record.bleUuid,
            status: "duplicate",
            attendanceId: existingAttendance._id,
          });
          // Still update event window based on this record
          const key = event._id;
          const win = eventWindow.get(key);
          if (!win) eventWindow.set(key, { min: record.timestamp, max: record.timestamp });
          else {
            win.min = Math.min(win.min, record.timestamp);
            win.max = Math.max(win.max, record.timestamp);
          }
          continue;
        }

        // Record attendance
        const attendanceId = await ctx.db.insert("attendance", {
          userId: user._id,
          eventId: event._id,
          scanTime: record.timestamp,
          deviceId: record.scannerSource || "unknown",
          signalStrength: record.rssi,
          isPresent: true,
          scannerSource: record.scannerSource,
          synced: true, // This is from scanner sync
          syncedAt: Date.now(),
        });

        // Track window
        const key = event._id;
        const win = eventWindow.get(key);
        if (!win) eventWindow.set(key, { min: record.timestamp, max: record.timestamp });
        else {
          win.min = Math.min(win.min, record.timestamp);
          win.max = Math.max(win.max, record.timestamp);
        }

        results.push({
          bleUuid: record.bleUuid,
          status: "success",
          attendanceId,
        });

      } catch (error) {
        results.push({
          bleUuid: record.bleUuid,
          status: "error",
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }

    // Auto-populate/expand event start/end times from observed scan window
    for (const [eventKey, win] of eventWindow.entries()) {
      try {
        const eventId = { table: "events", id: eventKey } as unknown as any;
        const evt = await ctx.db.get(eventId);
        if (!evt) continue;
        const updates: any = {};
        if (typeof evt.startTime !== "number" || win.min < evt.startTime) {
          updates.startTime = win.min;
        }
        if (typeof evt.endTime !== "number" || win.max > evt.endTime) {
          updates.endTime = win.max;
        }
        if (Object.keys(updates).length > 0) {
          await ctx.db.patch(eventId, updates);
        }
      } catch {
        // ignore window update errors per-event to not affect main result
      }
    }

    return {
      processed: results.length,
      successful: results.filter(r => r.status === "success").length,
      duplicates: results.filter(r => r.status === "duplicate").length,
      errors: results.filter(r => r.status === "error").length,
      results,
    };
  },
});

// Calculate attendance percentage for a user in an event
export const calculateAttendancePercentage = internalMutation({
  args: {
    userId: v.id("users"),
    eventId: v.id("events"),
  },
  handler: async (ctx, args) => {
    // Get event details
    const event = await ctx.db.get(args.eventId);
    if (!event) {
      throw new Error("Event not found");
    }

    // Get all attendance records for this user in this event
    const attendanceRecords = await ctx.db
      .query("attendance")
      .withIndex("by_user_event", (q) => 
        q.eq("userId", args.userId).eq("eventId", args.eventId)
      )
      .collect();

    if (attendanceRecords.length === 0) {
      return {
        totalScans: 0,
        presentScans: 0,
        attendancePercentage: 0,
        firstSeen: null,
        lastSeen: null,
        totalDuration: 0,
      };
    }

    // Calculate time window for the event
    const eventStart = event.startTime || Math.min(...attendanceRecords.map(r => r.scanTime));
    const eventEnd = event.endTime || Math.max(...attendanceRecords.map(r => r.scanTime));
    const eventDuration = eventEnd - eventStart;

    // Calculate expected scan intervals (every 5 minutes by default)
    const scanIntervalMinutes = 5;
    const scanIntervalMs = scanIntervalMinutes * 60 * 1000;
    const expectedScans = Math.max(1, Math.floor(eventDuration / scanIntervalMs));

    // Calculate actual presence
    const presentScans = attendanceRecords.length;
    const attendancePercentage = Math.min(100, (presentScans / expectedScans) * 100);

    // Calculate first and last seen
    const firstSeen = Math.min(...attendanceRecords.map(r => r.scanTime));
    const lastSeen = Math.max(...attendanceRecords.map(r => r.scanTime));

    // Calculate total duration present (simplified - assumes continuous presence)
    const totalDuration = lastSeen - firstSeen;

    // Update or create attendance summary
    const existingSummary = await ctx.db
      .query("attendanceSummary")
      .withIndex("by_user_event", (q) => 
        q.eq("userId", args.userId).eq("eventId", args.eventId)
      )
      .first();

    const summaryData = {
      userId: args.userId,
      eventId: args.eventId,
      totalScans: expectedScans,
      presentScans: presentScans,
      attendancePercentage: attendancePercentage,
      firstSeen: firstSeen,
      lastSeen: lastSeen,
      totalDuration: totalDuration,
      calculatedAt: Date.now(),
    };

    if (existingSummary) {
      await ctx.db.patch(existingSummary._id, summaryData);
      return summaryData;
    } else {
      const summaryId = await ctx.db.insert("attendanceSummary", summaryData);
      return { ...summaryData, _id: summaryId };
    }
  },
});

// Get attendance summary for a user in an event
export const getAttendanceSummary = query({
  args: {
    userId: v.id("users"),
    eventId: v.id("events"),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("attendanceSummary")
      .withIndex("by_user_event", (q) => 
        q.eq("userId", args.userId).eq("eventId", args.eventId)
      )
      .first();
  },
});

// Get all attendance summaries for an event
export const getEventAttendanceSummaries = query({
  args: {
    eventId: v.id("events"),
  },
  handler: async (ctx, args) => {
    const summaries = await ctx.db
      .query("attendanceSummary")
      .withIndex("by_event", (q) => q.eq("eventId", args.eventId))
      .collect();

    // Include user details
    const summariesWithUsers = await Promise.all(
      summaries.map(async (summary) => {
        const user = await ctx.db.get(summary.userId);
        return {
          ...summary,
          user: user ? {
            name: user.name,
            email: user.email,
          } : null,
        };
      })
    );

    return summariesWithUsers;
  },
});

// Recalculate all attendance summaries for an event
export const recalculateEventAttendanceSummaries = internalMutation({
  args: {
    eventId: v.id("events"),
  },
  handler: async (ctx, args) => {
    // Get all users who have attendance records for this event
    const attendanceRecords = await ctx.db
      .query("attendance")
      .withIndex("by_event", (q) => q.eq("eventId", args.eventId))
      .collect();

    const uniqueUserIds = [...new Set(attendanceRecords.map(r => r.userId))];

    // Recalculate for each user
    const results = [];
    for (const userId of uniqueUserIds) {
      try {
        const summary = await calculateAttendancePercentage(ctx, {
          userId,
          eventId: args.eventId,
        });
        results.push({ userId, success: true, summary });
      } catch (error) {
        results.push({ 
          userId, 
          success: false, 
          error: error instanceof Error ? error.message : "Unknown error" 
        });
      }
    }

    return results;
  },
});
