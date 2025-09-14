import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// Create a new user
export const createUser = mutation({
  args: {
    name: v.string(),
    email: v.string(),
    bleUuid: v.optional(v.string()),
    phone: v.optional(v.string()),
    department: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Check if user already exists
    const existingUser = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .first();

    if (existingUser) {
      throw new Error("User with this email already exists");
    }

    const userId = await ctx.db.insert("users", {
      name: args.name,
      email: args.email,
      bleUuid: args.bleUuid,
      phone: args.phone,
      department: args.department,
      isActive: true,
      createdAt: Date.now(),
    });

    return userId;
  },
});

// Get user by ID
export const getUser = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.userId);
  },
});

// Get user by email
export const getUserByEmail = query({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .first();
  },
});

// Get user by BLE UUID
export const getUserByBleUuid = query({
  args: { bleUuid: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("users")
      .withIndex("by_bleUuid", (q) => q.eq("bleUuid", args.bleUuid))
      .first();
  },
});

// List all users
export const listUsers = query({
  args: { 
    activeOnly: v.optional(v.boolean()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    if (args.activeOnly) {
      const users = await ctx.db
        .query("users")
        .withIndex("by_active", (q) => q.eq("isActive", true))
        .order("desc")
        .take(args.limit || 100);
      return users;
    }
    
    const users = await ctx.db
      .query("users")
      .order("desc")
      .take(args.limit || 100);
    
    return users;
  },
});

// Update user
export const updateUser = mutation({
  args: {
    userId: v.id("users"),
    name: v.optional(v.string()),
    email: v.optional(v.string()),
    bleUuid: v.optional(v.string()),
    phone: v.optional(v.string()),
    department: v.optional(v.string()),
    isActive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const { userId, ...updates } = args;
    
    // Ensure only defined fields are patched
    const filteredUpdates = Object.fromEntries(
      Object.entries(updates).filter(([_, value]) => value !== undefined)
    );

    await ctx.db.patch(userId, filteredUpdates as any);
    return await ctx.db.get(userId);
  },
});

// Delete user (soft delete by setting inactive)
export const deleteUser = mutation({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.userId, { isActive: false });
    return { success: true };
  },
});
