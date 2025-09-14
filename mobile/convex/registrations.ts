import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// Register user for an event
export const registerForEvent = mutation({
  args: {
    userId: v.id("users"),
    eventId: v.id("events"),
  },
  handler: async (ctx, args) => {
    // Check if event exists and is available for registration
    const event = await ctx.db.get(args.eventId);
    if (!event) {
      throw new Error("Event not found");
    }

    // Check if event hasn't ended
    if (event.endTime < Date.now()) {
      throw new Error("Cannot register for past events");
    }

    // Check if user is already registered
    const existingRegistration = await ctx.db
      .query("eventRegistrations")
      .withIndex("by_user_event", (q) => 
        q.eq("userId", args.userId).eq("eventId", args.eventId)
      )
      .unique();

    if (existingRegistration) {
      if (existingRegistration.status === "registered") {
        throw new Error("Already registered for this event");
      }
      
      // Reactivate cancelled registration
      await ctx.db.patch(existingRegistration._id, {
        status: "registered",
        registeredAt: Date.now(),
      });
      return existingRegistration._id;
    }

    // Create new registration
    const registrationId = await ctx.db.insert("eventRegistrations", {
      userId: args.userId,
      eventId: args.eventId,
      registeredAt: Date.now(),
      status: "registered",
    });

    return registrationId;
  },
});

// Cancel event registration
export const cancelRegistration = mutation({
  args: {
    userId: v.id("users"),
    eventId: v.id("events"),
  },
  handler: async (ctx, args) => {
    const registration = await ctx.db
      .query("eventRegistrations")
      .withIndex("by_user_event", (q) => 
        q.eq("userId", args.userId).eq("eventId", args.eventId)
      )
      .unique();

    if (!registration || registration.status !== "registered") {
      throw new Error("No active registration found");
    }

    await ctx.db.patch(registration._id, {
      status: "cancelled",
    });

    return { success: true };
  },
});

// Get user's event registrations
export const getUserRegistrations = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const registrations = await ctx.db
      .query("eventRegistrations")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .filter((q) => q.eq(q.field("status"), "registered"))
      .collect();

    // Get event details for each registration
    const registrationsWithEvents = await Promise.all(
      registrations.map(async (reg) => {
        const event = await ctx.db.get(reg.eventId);
        return {
          ...reg,
          event,
        };
      })
    );

    return registrationsWithEvents;
  },
});

// Get event registrations (for admin)
export const getEventRegistrations = query({
  args: { eventId: v.id("events") },
  handler: async (ctx, args) => {
    const registrations = await ctx.db
      .query("eventRegistrations")
      .withIndex("by_event", (q) => q.eq("eventId", args.eventId))
      .filter((q) => q.eq(q.field("status"), "registered"))
      .collect();

    // Get user details for each registration
    const registrationsWithUsers = await Promise.all(
      registrations.map(async (reg) => {
        const user = await ctx.db.get(reg.userId);
        return {
          ...reg,
          user,
        };
      })
    );

    return registrationsWithUsers;
  },
});

// Check if user is registered for event
export const isUserRegistered = query({
  args: {
    userId: v.id("users"),
    eventId: v.id("events"),
  },
  handler: async (ctx, args) => {
    const registration = await ctx.db
      .query("eventRegistrations")
      .withIndex("by_user_event", (q) => 
        q.eq("userId", args.userId).eq("eventId", args.eventId)
      )
      .unique();

    return registration && registration.status === "registered";
  },
});

// Get registration stats for event
export const getEventStats = query({
  args: { eventId: v.id("events") },
  handler: async (ctx, args) => {
    const registrations = await ctx.db
      .query("eventRegistrations")
      .withIndex("by_event", (q) => q.eq("eventId", args.eventId))
      .collect();

    const attendanceRecords = await ctx.db
      .query("attendance")
      .withIndex("by_event", (q) => q.eq("eventId", args.eventId))
      .collect();

    return {
      totalRegistered: registrations.filter(r => r.status === "registered").length,
      totalCancelled: registrations.filter(r => r.status === "cancelled").length,
      totalAttended: new Set(attendanceRecords.map(a => a.userId)).size,
    };
  },
});
