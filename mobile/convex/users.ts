import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { Doc } from "./_generated/dataModel";

// Create or update a user
export const createUser = mutation({
  args: {
    email: v.string(),
    name: v.string(),
    bleUuid: v.string(),
  },
  handler: async (ctx, args) => {
    // Check if user already exists by email
    const existingUser = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .unique();

    if (existingUser) {
      // Update existing user
      await ctx.db.patch(existingUser._id, {
        name: args.name,
        bleUuid: args.bleUuid,
      });
      return existingUser._id;
    }

    // Check if BLE UUID is already taken
    const existingUuid = await ctx.db
      .query("users")
      .withIndex("by_bleUuid", (q) => q.eq("bleUuid", args.bleUuid))
      .unique();

    if (existingUuid) {
      throw new Error("BLE UUID already in use");
    }

    // Create new user
    const userId = await ctx.db.insert("users", {
      email: args.email,
      name: args.name,
      bleUuid: args.bleUuid,
      createdAt: Date.now(),
    });

    return userId;
  },
});

// Get user by email
export const getUserByEmail = query({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .unique();
  },
});

// Get user by BLE UUID (used by scanner)
export const getUserByBleUuid = query({
  args: { bleUuid: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("users")
      .withIndex("by_bleUuid", (q) => q.eq("bleUuid", args.bleUuid))
      .unique();
  },
});

// List all users (for admin)
export const listUsers = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("users").collect();
  },
});

// Get user profile
export const getUser = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.userId);
  },
});

// Update user profile
export const updateUser = mutation({
  args: {
    userId: v.id("users"),
    name: v.optional(v.string()),
    bleUuid: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { userId, ...updates } = args;
    
    // If updating BLE UUID, check it's not taken
    if (updates.bleUuid && updates.bleUuid.trim() !== "") {
      const existingUuid = await ctx.db
        .query("users")
        .withIndex("by_bleUuid", (q) => q.eq("bleUuid", updates.bleUuid!))
        .unique();

      if (existingUuid && existingUuid._id !== userId) {
        throw new Error("BLE UUID already in use");
      }
    }

    // Remove undefined fields
    const filteredUpdates = Object.fromEntries(
      Object.entries(updates).filter(([_, value]) => value !== undefined)
    );

    await ctx.db.patch(userId, filteredUpdates);
    return await ctx.db.get(userId);
  },
});

// Delete user
export const deleteUser = mutation({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    // First, delete all attendance records for this user
    const attendanceRecords = await ctx.db
      .query("attendance")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();

    for (const record of attendanceRecords) {
      await ctx.db.delete(record._id);
    }

    // Then delete the user
    await ctx.db.delete(args.userId);
  },
});
