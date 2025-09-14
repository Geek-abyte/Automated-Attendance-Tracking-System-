import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// Register for an event
export const registerForEvent = mutation({
  args: {
    eventId: v.id("events"),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    // Check if user is already registered
    const existingRegistration = await ctx.db
      .query("registrations")
      .withIndex("by_event_user", (q) => 
        q.eq("eventId", args.eventId).eq("userId", args.userId)
      )
      .first();

    if (existingRegistration) {
      if (existingRegistration.status === "registered") {
        throw new Error("User is already registered for this event");
      } else {
        // Update cancelled registration to registered
        await ctx.db.patch(existingRegistration._id, {
          status: "registered",
          registeredAt: Date.now(),
        });
        return existingRegistration._id;
      }
    }

    // Create new registration
    const registrationId = await ctx.db.insert("registrations", {
      eventId: args.eventId,
      userId: args.userId,
      registeredAt: Date.now(),
      status: "registered",
    });

    return registrationId;
  },
});

// Cancel event registration
export const cancelEventRegistration = mutation({
  args: {
    eventId: v.id("events"),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const registration = await ctx.db
      .query("registrations")
      .withIndex("by_event_user", (q) => 
        q.eq("eventId", args.eventId).eq("userId", args.userId)
      )
      .first();

    if (!registration) {
      throw new Error("Registration not found");
    }

    if (registration.status === "cancelled") {
      throw new Error("Registration is already cancelled");
    }

    await ctx.db.patch(registration._id, {
      status: "cancelled",
    });

    return { success: true };
  },
});

// Get registrations for an event
export const getEventRegistrations = query({
  args: { eventId: v.id("events") },
  handler: async (ctx, args) => {
    const registrations = await ctx.db
      .query("registrations")
      .withIndex("by_event", (q) => q.eq("eventId", args.eventId))
      .order("desc")
      .collect();

    // Get user details for each registration
    const registrationsWithUsers = await Promise.all(
      registrations.map(async (registration) => {
        const user = await ctx.db.get(registration.userId);
        return {
          ...registration,
          user: user ? {
            name: user.name,
            email: user.email,
            department: user.department,
          } : null,
        };
      })
    );

    return registrationsWithUsers;
  },
});

// Get user's event registrations
export const getUserRegistrations = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const registrations = await ctx.db
      .query("registrations")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .order("desc")
      .collect();

    // Get event details for each registration
    const registrationsWithEvents = await Promise.all(
      registrations.map(async (registration) => {
        const event = await ctx.db.get(registration.eventId);
        return {
          ...registration,
          event: event ? {
            name: event.name,
            location: event.location,
            startTime: event.startTime,
            endTime: event.endTime,
            isActive: event.isActive,
          } : null,
        };
      })
    );

    return registrationsWithEvents;
  },
});

// Get registration statistics for an event
export const getEventRegistrationStats = query({
  args: { eventId: v.id("events") },
  handler: async (ctx, args) => {
    const registrations = await ctx.db
      .query("registrations")
      .withIndex("by_event", (q) => q.eq("eventId", args.eventId))
      .collect();

    const totalRegistrations = registrations.length;
    const activeRegistrations = registrations.filter(r => r.status === "registered").length;
    const cancelledRegistrations = registrations.filter(r => r.status === "cancelled").length;

    return {
      totalRegistrations,
      activeRegistrations,
      cancelledRegistrations,
      registrations,
    };
  },
});
