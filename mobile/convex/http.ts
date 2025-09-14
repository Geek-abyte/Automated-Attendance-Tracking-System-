import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";

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

      // Validate API key
      const keyValidation = await ctx.runMutation(internal.auth.validateApiKey, {
        apiKey,
      });

      if (!keyValidation) {
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

      const keyValidation = await ctx.runMutation(internal.auth.validateApiKey, {
        apiKey,
      });

      if (!keyValidation) {
        return new Response(
          JSON.stringify({ error: "Invalid API key" }),
          { status: 401, headers: { "Content-Type": "application/json" } }
        );
      }

      // Get active events
      const events = await ctx.runQuery(internal.events.listEvents, {
        activeOnly: true,
        limit: 50,
      });

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

      const keyValidation = await ctx.runMutation(internal.auth.validateApiKey, {
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

      const keyValidation = await ctx.runMutation(internal.auth.validateApiKey, {
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

      const keyValidation = await ctx.runMutation(internal.auth.validateApiKey, {
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

      const keyValidation = await ctx.runMutation(internal.auth.validateApiKey, {
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
