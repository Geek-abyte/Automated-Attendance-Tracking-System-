import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { Doc } from "./_generated/dataModel";

// Simple hash function (for MVP - in production use proper crypto)
function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return hash.toString(36);
}

// Create a new user with password
export const createUser = mutation({
  args: {
    email: v.string(),
    name: v.string(),
    password: v.string(),
    bleUuid: v.string(),
  },
  handler: async (ctx, args) => {
    // Check if user already exists by email
    const existingUser = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .unique();

    if (existingUser) {
      throw new Error("User with this email already exists");
    }

    // Check if BLE UUID is already taken
    const existingUuid = await ctx.db
      .query("users")
      .withIndex("by_bleUuid", (q) => q.eq("bleUuid", args.bleUuid))
      .unique();

    if (existingUuid) {
      throw new Error("BLE UUID already in use");
    }

    // Hash the password
    const passwordHash = simpleHash(args.password);

    // Create new user
    const userId = await ctx.db.insert("users", {
      email: args.email,
      name: args.name,
      passwordHash: passwordHash,
      bleUuid: args.bleUuid,
      createdAt: Date.now(),
    });

    return userId;
  },
});

// Verify user login credentials
export const verifyLogin = query({
  args: {
    email: v.string(),
    password: v.string(),
  },
  handler: async (ctx, args) => {
    // Find user by email
    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .unique();

    if (!user) {
      return null; // User not found
    }

    // Verify password
    const passwordHash = simpleHash(args.password);
    if (user.passwordHash !== passwordHash) {
      return null; // Invalid password
    }

    // Return user without password hash
    const { passwordHash: _, ...userWithoutPassword } = user;
    return userWithoutPassword;
  },
});

// Get user by email (without password hash)
export const getUserByEmail = query({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .unique();
    
    if (!user) {
      return null;
    }
    
    // Return user without password hash
    const { passwordHash: _, ...userWithoutPassword } = user;
    return userWithoutPassword;
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

// Get user profile (without password hash)
export const getUser = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    
    if (!user) {
      return null;
    }
    
    // Return user without password hash
    const { passwordHash: _, ...userWithoutPassword } = user;
    return userWithoutPassword;
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
