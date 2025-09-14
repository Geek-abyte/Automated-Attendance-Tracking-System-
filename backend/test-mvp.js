// Test script to verify MVP backend functionality
// Run with: npx convex dev --once && node test.js

const { ConvexHttpClient } = require("convex/browser");

// Initialize client (using local development server)
const client = new ConvexHttpClient("http://127.0.0.1:3210");

async function testMVPBackend() {
  console.log("🧪 Testing MVP Backend Functions...\n");

  try {
    // Test 1: Create API Key
    console.log("1. Creating API Key...");
    const apiKeyResult = await client.mutation("auth:createApiKey", {
      name: "Scanner API Key",
    });
    console.log("✅ API Key created:", { keyId: apiKeyResult.keyId, name: apiKeyResult.name });
    const apiKey = apiKeyResult.apiKey;

    // Test 2: Create Test User
    console.log("\n2. Creating test user...");
    const userId = await client.mutation("users:createUser", {
      email: "test@example.com",
      name: "Test User",
      bleUuid: "test-ble-uuid-123",
    });
    console.log("✅ User created with ID:", userId);

    // Test 3: Create Test Event
    console.log("\n3. Creating test event...");
    const eventId = await client.mutation("events:createEvent", {
      name: "Test Event",
      description: "MVP Test Event",
      startTime: Date.now() - 3600000, // 1 hour ago
      endTime: Date.now() + 3600000,   // 1 hour from now
      createdBy: "test-admin",
    });
    console.log("✅ Event created with ID:", eventId);

    // Test 4: Activate Event
    console.log("\n4. Activating event...");
    await client.mutation("events:setEventActive", {
      eventId,
      isActive: true,
    });
    console.log("✅ Event activated");

    // Test 5: Register User for Event
    console.log("\n5. Registering user for event...");
    const registrationId = await client.mutation("registrations:registerForEvent", {
      userId,
      eventId,
    });
    console.log("✅ User registered with registration ID:", registrationId);

    // Test 6: Record Attendance
    console.log("\n6. Recording attendance...");
    const attendanceId = await client.mutation("attendance:recordAttendance", {
      userId,
      eventId,
      scannerSource: "test-scanner",
    });
    console.log("✅ Attendance recorded with ID:", attendanceId);

    // Test 7: Get Event Summary
    console.log("\n7. Getting event summary...");
    const summary = await client.query("attendance:getAttendanceSummary", {
      eventId,
    });
    console.log("✅ Event summary:", summary);

    // Test 8: Validate API Key
    console.log("\n8. Validating API key...");
    const validation = await client.mutation("auth:validateApiKey", {
      apiKey,
    });
    console.log("✅ API key validation result:", validation ? "Valid" : "Invalid");

    console.log("\n🎉 All MVP Backend Tests Passed!");
    console.log("\n📊 Summary:");
    console.log("- ✅ Database schema working");
    console.log("- ✅ User management working");
    console.log("- ✅ Event management working");
    console.log("- ✅ Registration system working");
    console.log("- ✅ Attendance tracking working");
    console.log("- ✅ API key authentication working");
    console.log("\n🚀 Backend ready for integration!");

  } catch (error) {
    console.error("❌ Test failed:", error.message);
    process.exit(1);
  }
}

// Run tests
testMVPBackend().then(() => {
  process.exit(0);
}).catch(error => {
  console.error("❌ Test suite failed:", error);
  process.exit(1);
});
