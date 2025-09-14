import { mutation, query } from "./_generated/server";
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

// Batch record attendance (for scanner sync)
export const batchRecordAttendance = mutation({
  args: {
    records: v.array(v.object({
      bleUuid: v.string(),
      eventId: v.id("events"),
      timestamp: v.number(),
      scannerSource: v.optional(v.string()),
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
        const event = await ctx.db.get(record.eventId);
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
            q.eq("userId", user._id).eq("eventId", record.eventId)
          )
          .first();

        if (existingAttendance) {
          results.push({
            bleUuid: record.bleUuid,
            status: "duplicate",
            attendanceId: existingAttendance._id,
          });
          // Still update event window based on this record
          const key = record.eventId.id as string;
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
          eventId: record.eventId,
          scanTime: record.timestamp,
          deviceId: record.scannerSource || "unknown",
          isPresent: true,
          scannerSource: record.scannerSource,
          synced: true,
          syncedAt: Date.now(),
        });

        // Track window
        const key = record.eventId.id as string;
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
