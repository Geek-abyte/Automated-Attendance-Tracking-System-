import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// Create a new event
export const createEvent = mutation({
  args: {
    name: v.string(),
    description: v.optional(v.string()),
    startTime: v.optional(v.number()),
    endTime: v.optional(v.number()),
    createdBy: v.optional(v.string()),
    location: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const eventId = await ctx.db.insert("events", {
      name: args.name,
      description: args.description,
      startTime: args.startTime,
      endTime: args.endTime,
      isActive: false,
      createdBy: args.createdBy,
      createdAt: Date.now(),
      location: args.location,
    });

    return eventId;
  },
});

// Get event by ID
export const getEvent = query({
  args: { eventId: v.id("events") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.eventId);
  },
});

// List all events
export const listEvents = query({
  args: { 
    activeOnly: v.optional(v.boolean()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    if (args.activeOnly) {
      const events = await ctx.db
        .query("events")
        .withIndex("by_active", (q) => q.eq("isActive", true))
        .order("desc")
        .take(args.limit || 100);
      return events;
    }
    
    const events = await ctx.db
      .query("events")
      .order("desc")
      .take(args.limit || 100);
    
    return events;
  },
});

// Update event
export const updateEvent = mutation({
  args: {
    eventId: v.id("events"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    startTime: v.optional(v.number()),
    endTime: v.optional(v.number()),
    isActive: v.optional(v.boolean()),
    location: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { eventId, ...updates } = args;
    
    // Ensure only defined fields are patched
    const filteredUpdates = Object.fromEntries(
      Object.entries(updates).filter(([_, value]) => value !== undefined)
    );

    await ctx.db.patch(eventId, filteredUpdates as any);
    return await ctx.db.get(eventId);
  },
});

// Delete event (soft delete by setting inactive)
export const deleteEvent = mutation({
  args: { eventId: v.id("events") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.eventId, { isActive: false });
    return { success: true };
  },
});

// Activate/deactivate event
export const setEventActive = mutation({
  args: {
    eventId: v.id("events"),
    isActive: v.boolean(),
  },
  handler: async (ctx, args) => {
    const event = await ctx.db.get(args.eventId);
    if (!event) {
      throw new Error("Event not found");
    }

    await ctx.db.patch(args.eventId, { isActive: args.isActive });
    return await ctx.db.get(args.eventId);
  },
});
