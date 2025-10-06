#!/usr/bin/env node

// Setup script to create test data for ESP32 scanner
// Run with: node setup-test-event.js

const { ConvexHttpClient } = require("convex/browser");

const DEPLOYMENT_URL = "https://combative-deer-426.convex.cloud";
const EVENT_ID = "jn7f56bc6vtrdx0tmnmby1cmm57qptfm";

const client = new ConvexHttpClient(DEPLOYMENT_URL);

async function setupTestData() {
  console.log("🔧 Setting up test data for ESP32 scanner...\n");
  
  try {
    // Step 1: Check if event exists
    console.log("1️⃣ Checking if event exists...");
    const event = await client.query("events:getEvent", { eventId: EVENT_ID });
    
    if (!event) {
      console.log("❌ Event not found with ID:", EVENT_ID);
      console.log("Please create the event first or use the correct event ID.");
      process.exit(1);
    }
    
    console.log("✅ Event found:", event.name);
    console.log("   Active:", event.isActive);
    console.log("");
    
    // Step 2: Check existing registrations
    console.log("2️⃣ Checking existing registrations...");
    const registrations = await client.query("registrations:getEventRegistrations", { 
      eventId: EVENT_ID 
    });
    
    console.log(`   Found ${registrations.length} existing registrations`);
    if (registrations.length > 0) {
      console.log("   Registered users:");
      for (const reg of registrations) {
        console.log(`   - ${reg.user.name} (${reg.user.email})`);
        console.log(`     BLE UUID: ${reg.user.bleUuid || "MISSING!"}`);
      }
    }
    console.log("");
    
    // Step 3: Create test users if needed
    console.log("3️⃣ Creating test users...");
    
    const testUsers = [
      { name: "Alice Test", email: "alice@test.com", bleUuid: "ATT-USER-001" },
      { name: "Bob Test", email: "bob@test.com", bleUuid: "ATT-USER-002" },
      { name: "Charlie Test", email: "charlie@test.com", bleUuid: "ATT-USER-003" },
    ];
    
    const createdUsers = [];
    
    for (const userData of testUsers) {
      try {
        console.log(`   Creating user: ${userData.name}...`);
        const userId = await client.mutation("users:createUser", userData);
        createdUsers.push({ ...userData, userId });
        console.log(`   ✅ Created: ${userData.name} (${userData.bleUuid})`);
      } catch (error) {
        if (error.message.includes("already exists") || error.message.includes("already in use")) {
          console.log(`   ⚠️  User already exists: ${userData.name}`);
          // Get existing user
          const existingUser = await client.query("users:getUserByEmail", { 
            email: userData.email 
          });
          if (existingUser) {
            createdUsers.push({ ...userData, userId: existingUser._id });
          }
        } else {
          console.log(`   ❌ Error creating user: ${error.message}`);
        }
      }
    }
    console.log("");
    
    // Step 4: Register users for event
    console.log("4️⃣ Registering users for event...");
    
    for (const user of createdUsers) {
      try {
        console.log(`   Registering: ${user.name}...`);
        await client.mutation("registrations:registerForEvent", {
          userId: user.userId,
          eventId: EVENT_ID,
        });
        console.log(`   ✅ Registered: ${user.name}`);
      } catch (error) {
        if (error.message.includes("Already registered")) {
          console.log(`   ⚠️  Already registered: ${user.name}`);
        } else {
          console.log(`   ❌ Error: ${error.message}`);
        }
      }
    }
    console.log("");
    
    // Step 5: Verify registrations
    console.log("5️⃣ Verifying final setup...");
    const finalRegistrations = await client.query("registrations:getEventRegistrations", { 
      eventId: EVENT_ID 
    });
    
    console.log(`   Total registered users: ${finalRegistrations.length}`);
    console.log("");
    console.log("   📋 Registered device UUIDs:");
    for (const reg of finalRegistrations) {
      if (reg.user.bleUuid) {
        console.log(`      ✅ ${reg.user.bleUuid} - ${reg.user.name}`);
      } else {
        console.log(`      ❌ MISSING BLE UUID - ${reg.user.name}`);
      }
    }
    console.log("");
    
    // Step 6: Test the endpoint directly
    console.log("6️⃣ Testing /registered-devices endpoint...");
    const apiKey = "att_3sh4fmd2u14ffisevqztm";
    const testUrl = `${DEPLOYMENT_URL}/http/registered-devices?eventId=${EVENT_ID}`;
    
    console.log("   Endpoint:", testUrl);
    
    const response = await fetch(testUrl, {
      headers: {
        "x-api-key": apiKey,
      },
    });
    
    const data = await response.json();
    console.log("   Response:", JSON.stringify(data, null, 2));
    console.log("");
    
    if (data.count === 0) {
      console.log("⚠️  WARNING: Endpoint still returning 0 devices!");
      console.log("   This might indicate:");
      console.log("   1. Backend code hasn't been redeployed");
      console.log("   2. Event ID mismatch");
      console.log("   3. Registration status issue");
    } else {
      console.log("🎉 SUCCESS! Endpoint returning", data.count, "devices");
    }
    
    console.log("");
    console.log("=" .repeat(60));
    console.log("✅ Test data setup complete!");
    console.log("=" .repeat(60));
    console.log("");
    console.log("📱 Now test on ESP32:");
    console.log("   1. Reset/restart the ESP32");
    console.log("   2. Select event: 'this is a thing'");
    console.log("   3. Should see", finalRegistrations.length, "registered devices");
    console.log("");
    console.log("🔍 Expected device UUIDs:");
    for (const reg of finalRegistrations) {
      if (reg.user.bleUuid) {
        console.log("   -", reg.user.bleUuid);
      }
    }
    
  } catch (error) {
    console.error("❌ Setup failed:", error.message);
    console.error(error);
    process.exit(1);
  }
}

setupTestData().then(() => {
  process.exit(0);
});





