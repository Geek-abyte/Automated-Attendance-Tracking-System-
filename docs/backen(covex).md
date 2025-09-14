Part 1: The Backend (Convex) Implementation
Purpose
The Convex backend is the central brain and single source of truth for all data and business logic. It securely stores information and provides functions for the other components to interact with that information.
Technology Stack
Platform: Convex
Language: TypeScript
Core Implementation Details
1. Database Schema (
This file defines the "shape" of our data. It is the foundational contract for the entire system.
Generated typescript
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // Stores user information
  users: defineTable({
    name: v.string(),
    email: v.string(),
    role: v.union(v.literal("user"), v.literal("admin")),
    tokenIdentifier: v.string(), // Unique ID from Clerk auth
    bleUuid: v.string(), // The unique ID for their mobile app to broadcast
  })
    .index("by_token", ["tokenIdentifier"])
    .index("by_ble_uuid", ["bleUuid"]), // Crucial for the scanner lookup

  // Stores event information
  events: defineTable({
    eventName: v.string(),
    description: v.string(),
    startTime: v.number(), // Unix timestamp (ms)
    endTime: v.number(),   // Unix timestamp (ms)
  }),

  // Links users to events they register for
  registrations: defineTable({
    userId: v.id("users"),
    eventId: v.id("events"),
  }).index("by_user_event", ["userId", "eventId"]),

  // Stores the final, confirmed attendance records
  attendance: defineTable({
    userId: v.id("users"),
    eventId: v.id("events"),
    checkInTime: v.number(), // Unix timestamp (ms)
    scannerId: v.string(),
  }).index("by_event", ["eventId"]),
});
Use code with caution.TypeScript
2. Backend Functions (
 (For Web & Mobile Apps): Contains the standard functions for authenticated users.
create: A mutation for admins to create new events.
list: A query for anyone to see a list of events.
registerForEvent: A mutation for a logged-in user to register for an event.


 (For the Scanner Device): This file exposes a standard HTTP endpoint that our Python scanner can talk to.
Generated typescript
// convex/http.ts
import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";

const http = httpRouter();

// Define the endpoint for the scanner to call
http.route({
  path: "/batchCheckIn",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    // 1. Authenticate the Scanner
    const apiKey = request.headers.get("Authorization")?.replace("Bearer ", "");
    if (apiKey !== process.env.SCANNER_API_KEY) {
      return new Response("Unauthorized", { status: 403 });
    }

    // 2. Get the data from the request
    const { eventId, records } = await request.json();

    // 3. Process each record by calling an internal mutation
    for (const record of records) {
      await ctx.runMutation(internal.attendance.performCheckIn, {
        eventId,
        bleUuid: record.bleUuid,
        checkInTime: record.checkInTime,
        scannerId: record.scannerId,
      });
    }

    // 4. Respond to the scanner
    return new Response(JSON.stringify({ status: "success", received: records.length }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }),
});

export default http;
Use code with caution.TypeScript
(Note: You would also need to create the 
Communication with Other Components
Talks to Admin App & Mobile App: Via the secure, real-time Convex client library (convex/react). This uses queries and mutations.
Listens to Scanner Device: Provides a single, secure HTTP endpoint (/batchCheckIn) for the scanner to upload its data batch.
