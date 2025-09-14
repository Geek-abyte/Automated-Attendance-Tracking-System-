import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// Record attendance
export const recordAttendance = mutation({
  args: {
    eventId: v.id("events"),
    userId: v.id("users"),
    method: v.string(),
    deviceId: v.optional(v.string()),
    location: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Check if attendance already exists for this user and event
    const existingAttendance = await ctx.db
      .query("attendance")
      .withIndex("by_event_user", (q) => 
        q.eq("eventId", args.eventId).eq("userId", args.userId)
      )
      .first();

    if (existingAttendance) {
      // Update existing attendance
      await ctx.db.patch(existingAttendance._id, {
        timestamp: Date.now(),
        method: args.method,
        deviceId: args.deviceId,
        location: args.location,
      });
      return existingAttendance._id;
    }

    // Create new attendance record
    const attendanceId = await ctx.db.insert("attendance", {
      eventId: args.eventId,
      userId: args.userId,
      timestamp: Date.now(),
      method: args.method,
      deviceId: args.deviceId,
      location: args.location,
    });

    return attendanceId;
  },
});

// Batch record attendance
export const batchRecordAttendance = mutation({
  args: {
    records: v.array(v.object({
      eventId: v.id("events"),
      userId: v.id("users"),
      method: v.string(),
      deviceId: v.optional(v.string()),
      location: v.optional(v.string()),
    })),
  },
  handler: async (ctx, args) => {
    const results = [];
    
    for (const record of args.records) {
      try {
        const attendanceId = await recordAttendance(ctx, record);
        results.push({ success: true, id: attendanceId });
      } catch (error) {
        results.push({ success: false, error: error instanceof Error ? error.message : 'Unknown error' });
      }
    }
    
    return results;
  },
});

// Get attendance for a specific event
export const getEventAttendance = query({
  args: { eventId: v.id("events") },
  handler: async (ctx, args) => {
    const attendance = await ctx.db
      .query("attendance")
      .withIndex("by_event", (q) => q.eq("eventId", args.eventId))
      .order("desc")
      .collect();

    // Get user details for each attendance record
    const attendanceWithUsers = await Promise.all(
      attendance.map(async (record) => {
        const user = await ctx.db.get(record.userId);
        return {
          ...record,
          user: user ? {
            name: user.name,
            email: user.email,
            department: user.department,
          } : null,
        };
      })
    );

    return attendanceWithUsers;
  },
});

// Get attendance for a specific user
export const getUserAttendance = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const attendance = await ctx.db
      .query("attendance")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .order("desc")
      .collect();

    // Get event details for each attendance record
    const attendanceWithEvents = await Promise.all(
      attendance.map(async (record) => {
        const event = await ctx.db.get(record.eventId);
        return {
          ...record,
          event: event ? {
            name: event.name,
            location: event.location,
            startTime: event.startTime,
            endTime: event.endTime,
          } : null,
        };
      })
    );

    return attendanceWithEvents;
  },
});

// Get attendance statistics for an event
export const getEventAttendanceStats = query({
  args: { eventId: v.id("events") },
  handler: async (ctx, args) => {
    const attendance = await ctx.db
      .query("attendance")
      .withIndex("by_event", (q) => q.eq("eventId", args.eventId))
      .collect();

    const totalAttendees = attendance.length;
    const uniqueAttendees = new Set(attendance.map(a => a.userId)).size;
    
    const methodCounts = attendance.reduce((acc, record) => {
      acc[record.method] = (acc[record.method] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      totalAttendees,
      uniqueAttendees,
      methodCounts,
      records: attendance,
    };
  },
});

// Get attendance summaries for an event (with percentages)
export const getEventAttendanceSummaries = query({
  args: { eventId: v.id("events") },
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

// Get detailed attendance records for an event with user info
export const getEventAttendanceWithUsers = query({
  args: { eventId: v.id("events") },
  handler: async (ctx, args) => {
    const attendance = await ctx.db
      .query("attendance")
      .withIndex("by_event", (q) => q.eq("eventId", args.eventId))
      .order("desc")
      .collect();

    // Get user details for each attendance record
    const attendanceWithUsers = await Promise.all(
      attendance.map(async (record) => {
        const user = await ctx.db.get(record.userId);
        return {
          ...record,
          user: user ? {
            name: user.name,
            email: user.email,
            bleUuid: user.bleUuid,
          } : null,
        };
      })
    );

    return attendanceWithUsers;
  },
});
