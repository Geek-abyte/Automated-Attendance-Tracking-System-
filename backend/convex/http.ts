import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";
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

const http = httpRouter();

// Simple ping route for sanity check
http.route({
  path: "/ping",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    return new Response("pong", {
      status: 200,
      headers: { "Content-Type": "text/plain", "Access-Control-Allow-Origin": "*" },
    });
  }),
});

// Debug API key validation
http.route({
  path: "/debug-api-key",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    try {
      const apiKey = request.headers.get("x-api-key");
      if (!apiKey) {
        return new Response(
          JSON.stringify({ error: "Missing API key" }),
          { status: 401, headers: { "Content-Type": "application/json" } }
        );
      }

      console.log("Debug: API key received:", apiKey);
      
      // Test hash function directly
      const testHash = simpleHash(apiKey);
      console.log("Debug: Test hash:", testHash);
      
      // Test internal function call
      try {
        const keyValidation = await ctx.runMutation(internal.auth.validateApiKeyInternal, {
          apiKey,
        });
        
        return new Response(
          JSON.stringify({ 
            success: true, 
            message: "Debug info collected",
            debug: { 
              apiKey, 
              testHash,
              keyValidation,
              message: "Internal function call successful"
            }
          }),
          { 
            status: 200, 
            headers: { 
              "Content-Type": "application/json",
              "Access-Control-Allow-Origin": "*",
            } 
          }
        );
      } catch (error) {
        return new Response(
          JSON.stringify({ 
            success: false, 
            message: "Internal function call failed",
            debug: { 
              apiKey, 
              testHash,
              error: error instanceof Error ? error.message : "Unknown error"
            }
          }),
          { 
            status: 500, 
            headers: { 
              "Content-Type": "application/json",
              "Access-Control-Allow-Origin": "*",
            } 
          }
        );
      }

      if (!keyValidation) {
        return new Response(
          JSON.stringify({ error: "Invalid API key", debug: { apiKey, keyValidation } }),
          { status: 401, headers: { "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ 
          success: true, 
          message: "API key is valid",
          debug: { apiKey, keyValidation }
        }),
        { 
          status: 200, 
          headers: { 
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
          } 
        }
      );

    } catch (error) {
      console.error("Debug API key error:", error);
      return new Response(
        JSON.stringify({ 
          error: "Internal server error",
          details: error instanceof Error ? error.message : "Unknown error"
        }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }
  }),
});

// Batch check-in endpoint for scanner
http.route({
  path: "/batch-checkin",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    try {
      // Parse request body
      const body = await request.text();
      const data = JSON.parse(body);

      // Validate API key
      const apiKey = request.headers.get("x-api-key");
      if (!apiKey) {
        return new Response(
          JSON.stringify({ error: "Missing API key" }),
          { status: 401, headers: { "Content-Type": "application/json" } }
        );
      }

      // Simple API key validation (for MVP)
      const keyHash = simpleHash(apiKey);
      
      // For MVP, we'll use a simple hardcoded validation
      const validApiKeys = [
        { key: "att_3sh4fmd2u14ffisevqztm", hash: "wn5q1i", name: "Local Scanner" },
        { key: "att_rf3g3b5m4yx0f9dxwyzd", hash: "ejpcot", name: "Python Scanner" }
      ];
      
      const validKey = validApiKeys.find(k => k.hash === keyHash);
      
      if (!validKey) {
        return new Response(
          JSON.stringify({ error: "Invalid API key" }),
          { status: 401, headers: { "Content-Type": "application/json" } }
        );
      }

      // Validate request body
      if (!data.records || !Array.isArray(data.records)) {
        return new Response(
          JSON.stringify({ error: "Invalid request body. Expected { records: [...] }" }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        );
      }

      // Process batch attendance
      const result = await ctx.runMutation(internal.attendance.batchRecordAttendance, {
        records: data.records,
      });

      // If we have successful records, trigger attendance percentage calculation
      if (result.successful > 0) {
        // Get unique event IDs from successful records
        const successfulRecords = result.results.filter(r => r.status === "success");
        const eventIds = [...new Set(successfulRecords.map(r => {
          // Find the event ID from the original records
          const originalRecord = data.records.find(orig => orig.bleUuid === r.bleUuid);
          return originalRecord?.eventId;
        }).filter(Boolean))];

        // Recalculate attendance summaries for each event
        for (const eventId of eventIds) {
          try {
            await ctx.runMutation(internal.attendance.recalculateEventAttendanceSummaries, {
              eventId: eventId as any,
            });
          } catch (error) {
            console.error("Failed to recalculate attendance summaries for event", eventId, error);
          }
        }
      }

      return new Response(
        JSON.stringify({
          success: true,
          ...result,
        }),
        { 
          status: 200, 
          headers: { 
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "POST, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type, x-api-key",
          } 
        }
      );

    } catch (error) {
      console.error("Batch check-in error:", error);
      return new Response(
        JSON.stringify({ 
          error: "Internal server error",
          details: error instanceof Error ? error.message : "Unknown error"
        }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }
  }),
});

// Get registered devices for an event
http.route({
  path: "/registered-devices",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    try {
      // Validate API key
      const apiKey = request.headers.get("x-api-key");
      if (!apiKey) {
        return new Response(
          JSON.stringify({ error: "Missing API key" }),
          { status: 401, headers: { "Content-Type": "application/json" } }
        );
      }

      // Simple API key validation (for MVP)
      const keyHash = simpleHash(apiKey);
      const validApiKeys = [
        { key: "att_3sh4fmd2u14ffisevqztm", hash: "wn5q1i", name: "Local Scanner" },
        { key: "att_rf3g3b5m4yx0f9dxwyzd", hash: "ejpcot", name: "Python Scanner" }
      ];
      
      const validKey = validApiKeys.find(k => k.hash === keyHash);
      
      if (!validKey) {
        return new Response(
          JSON.stringify({ error: "Invalid API key" }),
          { status: 401, headers: { "Content-Type": "application/json" } }
        );
      }

      // Get event ID from query params
      const url = new URL(request.url);
      const eventId = url.searchParams.get("eventId");
      
      if (!eventId) {
        return new Response(
          JSON.stringify({ error: "Missing eventId parameter" }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        );
      }

      // Get registered devices for the event (pass plain string)
      const result = await ctx.runQuery(internal.registrations.getRegisteredDevicesForEvent, {
        eventId,
      });

      return new Response(
        JSON.stringify({
          success: true,
          deviceUuids: result.deviceUuids,
          count: result.deviceUuids.length,
        }),
        { 
          status: 200, 
          headers: { 
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
          } 
        }
      );

    } catch (error) {
      console.error("Get registered devices error:", error);
      return new Response(
        JSON.stringify({ 
          error: "Internal server error",
          details: error instanceof Error ? error.message : "Unknown error"
        }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }
  }),
});

// Health check endpoint
http.route({
  path: "/health",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    return new Response(
      JSON.stringify({ 
        status: "healthy",
        timestamp: Date.now(),
        version: "1.0.0"
      }),
      { 
        status: 200, 
        headers: { 
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        } 
      }
    );
  }),
});

// Get active events endpoint (for scanner to know what events to scan for)
http.route({
  path: "/active-events",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    try {
      // Validate API key
      const apiKey = request.headers.get("x-api-key");
      if (!apiKey) {
        return new Response(
          JSON.stringify({ error: "Missing API key" }),
          { status: 401, headers: { "Content-Type": "application/json" } }
        );
      }

      // Simple API key validation (for MVP)
      const keyHash = simpleHash(apiKey);
      
      // For MVP, we'll use a simple hardcoded validation
      // In production, this should use proper database queries
      const validApiKeys = [
        { key: "att_3sh4fmd2u14ffisevqztm", hash: "wn5q1i", name: "Local Scanner" },
        { key: "att_rf3g3b5m4yx0f9dxwyzd", hash: "ejpcot", name: "Python Scanner" }
      ];
      
      const validKey = validApiKeys.find(k => k.hash === keyHash);
      
      if (!validKey) {
        return new Response(
          JSON.stringify({ error: "Invalid API key" }),
          { status: 401, headers: { "Content-Type": "application/json" } }
        );
      }

      // Get active events
      console.log("HTTP Action: Getting active events...");
      const events = await ctx.runQuery(internal.events.listEventsInternal, {
        activeOnly: true,
        limit: 50,
      });
      console.log("HTTP Action: Events retrieved:", events.length);

      return new Response(
        JSON.stringify({ 
          success: true,
          events: events.map(event => ({
            id: event._id,
            name: event.name,
            startTime: event.startTime,
            endTime: event.endTime,
            isActive: event.isActive,
          }))
        }),
        { 
          status: 200, 
          headers: { 
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type, x-api-key",
          } 
        }
      );

    } catch (error) {
      console.error("Active events error:", error);
      return new Response(
        JSON.stringify({ 
          error: "Internal server error",
          details: error instanceof Error ? error.message : "Unknown error"
        }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }
  }),
});

// Create event endpoint (for testing)
http.route({
  path: "/create-event",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    try {
      // Parse request body
      const body = await request.text();
      const data = JSON.parse(body);

      // Validate API key
      const apiKey = request.headers.get("x-api-key");
      if (!apiKey) {
        return new Response(
          JSON.stringify({ error: "Missing API key" }),
          { status: 401, headers: { "Content-Type": "application/json" } }
        );
      }

      const keyValidation = await ctx.runMutation(internal.auth.validateApiKeyInternal, {
        apiKey,
      });

      if (!keyValidation) {
        return new Response(
          JSON.stringify({ error: "Invalid API key" }),
          { status: 401, headers: { "Content-Type": "application/json" } }
        );
      }

      // Create event
      const eventId = await ctx.runMutation(internal.events.createEvent, {
        name: data.name,
        description: data.description,
        startTime: data.startTime,
        endTime: data.endTime,
        createdBy: data.createdBy || "scanner",
      });

      // Activate event if requested
      if (data.isActive) {
        await ctx.runMutation(internal.events.setEventActive, {
          eventId,
          isActive: true,
        });
      }

      return new Response(
        JSON.stringify({ 
          success: true,
          eventId,
          message: "Event created successfully"
        }),
        { 
          status: 200, 
          headers: { 
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "POST, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type, x-api-key",
          } 
        }
      );

    } catch (error) {
      console.error("Create event error:", error);
      return new Response(
        JSON.stringify({ 
          error: "Internal server error",
          details: error instanceof Error ? error.message : "Unknown error"
        }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }
  }),
});

// Create user endpoint (for testing)
http.route({
  path: "/create-user",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    try {
      // Parse request body
      const body = await request.text();
      const data = JSON.parse(body);

      // Validate API key
      const apiKey = request.headers.get("x-api-key");
      if (!apiKey) {
        return new Response(
          JSON.stringify({ error: "Missing API key" }),
          { status: 401, headers: { "Content-Type": "application/json" } }
        );
      }

      const keyValidation = await ctx.runMutation(internal.auth.validateApiKeyInternal, {
        apiKey,
      });

      if (!keyValidation) {
        return new Response(
          JSON.stringify({ error: "Invalid API key" }),
          { status: 401, headers: { "Content-Type": "application/json" } }
        );
      }

      // Create user
      const userId = await ctx.runMutation(internal.users.createUser, {
        name: data.name,
        email: data.email,
        bleUuid: data.bleUuid,
      });

      return new Response(
        JSON.stringify({ 
          success: true,
          userId,
          message: "User created successfully"
        }),
        { 
          status: 200, 
          headers: { 
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "POST, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type, x-api-key",
          } 
        }
      );

    } catch (error) {
      console.error("Create user error:", error);
      return new Response(
        JSON.stringify({ 
          error: "Internal server error",
          details: error instanceof Error ? error.message : "Unknown error"
        }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }
  }),
});

// Register user for event endpoint (for testing)
http.route({
  path: "/register-user",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    try {
      // Parse request body
      const body = await request.text();
      const data = JSON.parse(body);

      // Validate API key
      const apiKey = request.headers.get("x-api-key");
      if (!apiKey) {
        return new Response(
          JSON.stringify({ error: "Missing API key" }),
          { status: 401, headers: { "Content-Type": "application/json" } }
        );
      }

      const keyValidation = await ctx.runMutation(internal.auth.validateApiKeyInternal, {
        apiKey,
      });

      if (!keyValidation) {
        return new Response(
          JSON.stringify({ error: "Invalid API key" }),
          { status: 401, headers: { "Content-Type": "application/json" } }
        );
      }

      // Register user for event
      const registrationId = await ctx.runMutation(internal.registrations.registerForEvent, {
        userId: data.userId,
        eventId: data.eventId,
      });

      return new Response(
        JSON.stringify({ 
          success: true,
          registrationId,
          message: "User registered successfully"
        }),
        { 
          status: 200, 
          headers: { 
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "POST, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type, x-api-key",
          } 
        }
      );

    } catch (error) {
      console.error("Register user error:", error);
      return new Response(
        JSON.stringify({ 
          error: "Internal server error",
          details: error instanceof Error ? error.message : "Unknown error"
        }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }
  }),
});

// Control event (start/stop) endpoint
http.route({
  path: "/event-control",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    try {
      // Parse request body
      const body = await request.text();
      const data = JSON.parse(body);

      // Validate API key
      const apiKey = request.headers.get("x-api-key");
      if (!apiKey) {
        return new Response(
          JSON.stringify({ error: "Missing API key" }),
          { status: 401, headers: { "Content-Type": "application/json" } }
        );
      }

      const keyValidation = await ctx.runMutation(internal.auth.validateApiKeyInternal, {
        apiKey,
      });

      if (!keyValidation) {
        return new Response(
          JSON.stringify({ error: "Invalid API key" }),
          { status: 401, headers: { "Content-Type": "application/json" } }
        );
      }

      // Validate request body
      if (!data.eventId || !data.action) {
        return new Response(
          JSON.stringify({ error: "Missing eventId or action" }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        );
      }

      if (!["start", "stop"].includes(data.action)) {
        return new Response(
          JSON.stringify({ error: "Action must be 'start' or 'stop'" }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        );
      }

      // Control event
      const isActive = data.action === "start";
      const event = await ctx.runMutation(internal.events.setEventActive, {
        eventId: data.eventId,
        isActive,
      });

      return new Response(
        JSON.stringify({ 
          success: true,
          event,
          message: `Event ${data.action}ped successfully`
        }),
        { 
          status: 200, 
          headers: { 
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "POST, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type, x-api-key",
          } 
        }
      );

    } catch (error) {
      console.error("Event control error:", error);
      return new Response(
        JSON.stringify({ 
          error: "Internal server error",
          details: error instanceof Error ? error.message : "Unknown error"
        }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }
  }),
});

// OPTIONS handler for CORS preflight
http.route({
  path: "/batch-checkin",
  method: "OPTIONS",
  handler: httpAction(async (ctx, request) => {
    return new Response(null, {
      status: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, x-api-key",
      },
    });
  }),
});

// Get all events endpoint (for scanner to see all events and select one)
http.route({
  path: "/events",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    try {
      // Validate API key
      const apiKey = request.headers.get("x-api-key");
      if (!apiKey) {
        return new Response(
          JSON.stringify({ error: "Missing API key" }),
          { status: 401, headers: { "Content-Type": "application/json" } }
        );
      }

      // Simple API key validation (for MVP)
      const keyHash = simpleHash(apiKey);
      
      // For MVP, we'll use a simple hardcoded validation
      // In production, this should use proper database queries
      const validApiKeys = [
        { key: "att_3sh4fmd2u14ffisevqztm", hash: "wn5q1i", name: "Local Scanner" },
        { key: "att_rf3g3b5m4yx0f9dxwyzd", hash: "ejpcot", name: "Python Scanner" }
      ];
      
      const validKey = validApiKeys.find(k => k.hash === keyHash);
      
      if (!validKey) {
        return new Response(
          JSON.stringify({ error: "Invalid API key" }),
          { status: 401, headers: { "Content-Type": "application/json" } }
        );
      }

      // Get all events (not just active ones)
      const events = await ctx.runQuery(internal.events.listEventsInternal, {
        activeOnly: false,
        limit: 50
      });

      return new Response(
        JSON.stringify({ 
          success: true, 
          events: events.map(event => ({
            id: event._id,
            name: event.name,
            description: event.description,
            isActive: event.isActive,
            startTime: event.startTime,
            endTime: event.endTime
          }))
        }),
        { 
          status: 200, 
          headers: { 
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type, x-api-key",
          } 
        }
      );
    } catch (error) {
      console.error("Error fetching events:", error);
      return new Response(
        JSON.stringify({ 
          error: "Internal server error",
          details: error instanceof Error ? error.message : "Unknown error"
        }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }
  }),
});

http.route({
  path: "/events",
  method: "OPTIONS",
  handler: httpAction(async (ctx, request) => {
    return new Response(null, {
      status: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, x-api-key",
      },
    });
  }),
});

// Activate event endpoint (for scanner to activate selected event)
http.route({
  path: "/activate-event",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    try {
      // Validate API key
      const apiKey = request.headers.get("x-api-key");
      if (!apiKey) {
        return new Response(
          JSON.stringify({ error: "Missing API key" }),
          { status: 401, headers: { "Content-Type": "application/json" } }
        );
      }

      // Simple API key validation (for MVP)
      const keyHash = simpleHash(apiKey);
      
      // For MVP, we'll use a simple hardcoded validation
      // In production, this should use proper database queries
      const validApiKeys = [
        { key: "att_3sh4fmd2u14ffisevqztm", hash: "wn5q1i", name: "Local Scanner" },
        { key: "att_rf3g3b5m4yx0f9dxwyzd", hash: "ejpcot", name: "Python Scanner" }
      ];
      
      const validKey = validApiKeys.find(k => k.hash === keyHash);
      
      if (!validKey) {
        return new Response(
          JSON.stringify({ error: "Invalid API key" }),
          { status: 401, headers: { "Content-Type": "application/json" } }
        );
      }

      // Parse request body
      const body = await request.json();
      const { eventId } = body;

      if (!eventId) {
        return new Response(
          JSON.stringify({ error: "Missing eventId" }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        );
      }

      // First deactivate all events, then activate the selected one
      const allEvents = await ctx.runQuery(internal.events.listEventsInternal, {
        activeOnly: false,
        limit: 100
      });

      // Deactivate all events
      for (const event of allEvents) {
        await ctx.runMutation(internal.events.setEventActive, {
          eventId: event._id,
          isActive: false
        });
      }

      // Activate the selected event
      const updatedEvent = await ctx.runMutation(internal.events.setEventActive, {
        eventId: eventId,
        isActive: true
      });

      return new Response(
        JSON.stringify({ 
          success: true, 
          event: {
            id: updatedEvent._id,
            name: updatedEvent.name,
            isActive: updatedEvent.isActive
          }
        }),
        { 
          status: 200, 
          headers: { 
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "POST, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type, x-api-key",
          } 
        }
      );
    } catch (error) {
      console.error("Error activating event:", error);
      return new Response(
        JSON.stringify({ 
          error: "Internal server error",
          details: error instanceof Error ? error.message : "Unknown error"
        }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }
  }),
});

http.route({
  path: "/activate-event",
  method: "OPTIONS",
  handler: httpAction(async (ctx, request) => {
    return new Response(null, {
      status: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, x-api-key",
      },
    });
  }),
});

// Record attendance endpoint (for scanner to log attendance)
http.route({
  path: "/attendance",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    try {
      // Validate API key
      const apiKey = request.headers.get("x-api-key");
      if (!apiKey) {
        return new Response(
          JSON.stringify({ error: "Missing API key" }),
          { status: 401, headers: { "Content-Type": "application/json" } }
        );
      }

      // Simple API key validation (for MVP)
      const keyHash = simpleHash(apiKey);
      
      // For MVP, we'll use a simple hardcoded validation
      // In production, this should use proper database queries
      const validApiKeys = [
        { key: "att_3sh4fmd2u14ffisevqztm", hash: "wn5q1i", name: "Local Scanner" },
        { key: "att_rf3g3b5m4yx0f9dxwyzd", hash: "ejpcot", name: "Python Scanner" }
      ];
      
      const validKey = validApiKeys.find(k => k.hash === keyHash);
      
      if (!validKey) {
        return new Response(
          JSON.stringify({ error: "Invalid API key" }),
          { status: 401, headers: { "Content-Type": "application/json" } }
        );
      }

      // Parse request body
      const body = await request.json();
      const { bleUuid, eventId } = body;

      if (!bleUuid || !eventId) {
        return new Response(
          JSON.stringify({ error: "Missing bleUuid or eventId" }),
          { status: 400, headers: { "Content-Type": "application/json" } }
        );
      }

      // Find user by BLE UUID
      const user = await ctx.runQuery(internal.users.getUserByBleUuid, {
        bleUuid: bleUuid
      });

      if (!user) {
        return new Response(
          JSON.stringify({ error: "User not found for BLE UUID" }),
          { status: 404, headers: { "Content-Type": "application/json" } }
        );
      }

      // Record attendance
      const attendanceId = await ctx.runMutation(internal.attendance.recordAttendance, {
        userId: user._id,
        eventId: eventId,
        timestamp: Date.now(),
        scannerSource: "esp32_scanner"
      });

      return new Response(
        JSON.stringify({ 
          success: true, 
          attendanceId: attendanceId,
          user: {
            name: user.name,
            email: user.email
          }
        }),
        { 
          status: 200, 
          headers: { 
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "POST, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type, x-api-key",
          } 
        }
      );
    } catch (error) {
      console.error("Error recording attendance:", error);
      return new Response(
        JSON.stringify({ 
          error: "Internal server error",
          details: error instanceof Error ? error.message : "Unknown error"
        }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }
  }),
});

http.route({
  path: "/attendance",
  method: "OPTIONS",
  handler: httpAction(async (ctx, request) => {
    return new Response(null, {
      status: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, x-api-key",
      },
    });
  }),
});

// Deactivate all events endpoint (for scanner to stop scanning)
http.route({
  path: "/deactivate-events",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    try {
      // Validate API key
      const apiKey = request.headers.get("x-api-key");
      if (!apiKey) {
        return new Response(
          JSON.stringify({ error: "Missing API key" }),
          { status: 401, headers: { "Content-Type": "application/json" } }
        );
      }

      // Simple API key validation (for MVP)
      const keyHash = simpleHash(apiKey);
      
      // For MVP, we'll use a simple hardcoded validation
      // In production, this should use proper database queries
      const validApiKeys = [
        { key: "att_3sh4fmd2u14ffisevqztm", hash: "wn5q1i", name: "Local Scanner" },
        { key: "att_rf3g3b5m4yx0f9dxwyzd", hash: "ejpcot", name: "Python Scanner" }
      ];
      
      const validKey = validApiKeys.find(k => k.hash === keyHash);
      
      if (!validKey) {
        return new Response(
          JSON.stringify({ error: "Invalid API key" }),
          { status: 401, headers: { "Content-Type": "application/json" } }
        );
      }

      // Deactivate all events
      const allEvents = await ctx.runQuery(internal.events.listEventsInternal, {
        activeOnly: false,
        limit: 100
      });

      let deactivatedCount = 0;
      for (const event of allEvents) {
        if (event.isActive) {
          await ctx.runMutation(internal.events.setEventActive, {
            eventId: event._id,
            isActive: false
          });
          deactivatedCount++;
        }
      }

      return new Response(
        JSON.stringify({ 
          success: true, 
          deactivatedCount: deactivatedCount,
          message: "All events deactivated"
        }),
        { 
          status: 200, 
          headers: { 
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "POST, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type, x-api-key",
          } 
        }
      );
    } catch (error) {
      console.error("Error deactivating events:", error);
      return new Response(
        JSON.stringify({ 
          error: "Internal server error",
          details: error instanceof Error ? error.message : "Unknown error"
        }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }
  }),
});

http.route({
  path: "/deactivate-events",
  method: "OPTIONS",
  handler: httpAction(async (ctx, request) => {
    return new Response(null, {
      status: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, x-api-key",
      },
    });
  }),
});

http.route({
  path: "/active-events",
  method: "OPTIONS",
  handler: httpAction(async (ctx, request) => {
    return new Response(null, {
      status: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, x-api-key",
      },
    });
  }),
});

http.route({
  path: "/event-control",
  method: "OPTIONS",
  handler: httpAction(async (ctx, request) => {
    return new Response(null, {
      status: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, x-api-key",
      },
    });
  }),
});

export default http;
