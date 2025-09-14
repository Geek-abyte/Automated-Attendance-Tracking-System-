import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

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

// Create API key for scanner authentication
export const createApiKey = mutation({
  args: {
    name: v.string(),
  },
  handler: async (ctx, args) => {
    // Generate a simple API key (in production, use crypto.randomBytes)
    const apiKey = `att_${Math.random().toString(36).substring(2, 15)}${Math.random().toString(36).substring(2, 15)}`;
    
    // Hash the API key for storage
    const keyHash = simpleHash(apiKey);

    const keyId = await ctx.db.insert("apiKeys", {
      keyHash,
      name: args.name,
      isActive: true,
      createdAt: Date.now(),
    });

    return {
      keyId,
      apiKey, // Return the plain key once, it won't be stored
      name: args.name,
    };
  },
});

// Validate API key (for HTTP actions)
export const validateApiKey = mutation({
  args: { apiKey: v.string() },
  handler: async (ctx, args) => {
    // Hash the provided key
    const keyHash = simpleHash(args.apiKey);
    
    // For MVP, we'll do a simple scan since indexes aren't working yet
    const apiKeys = await ctx.db.query("apiKeys").collect();
    const apiKeyRecord = apiKeys.find(key => key.keyHash === keyHash);

    if (!apiKeyRecord || !apiKeyRecord.isActive) {
      return null;
    }

    // Update last used timestamp
    await ctx.db.patch(apiKeyRecord._id, {
      lastUsed: Date.now(),
    });

    return apiKeyRecord;
  },
});

// List API keys (for admin)
export const listApiKeys = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("apiKeys")
      .order("desc")
      .collect();
  },
});

// Deactivate API key
export const deactivateApiKey = mutation({
  args: { keyId: v.id("apiKeys") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.keyId, { isActive: false });
    return { success: true };
  },
});

// Reactivate API key
export const reactivateApiKey = mutation({
  args: { keyId: v.id("apiKeys") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.keyId, { isActive: true });
    return { success: true };
  },
});
