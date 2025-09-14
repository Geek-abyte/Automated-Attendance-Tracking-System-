#!/usr/bin/env node

/**
 * Setup script to create test users and events for ESP32 testing
 * This ensures users exist before the ESP32 tries to scan them
 */

const API_BASE_URL = 'https://compassionate-yak-763.convex.cloud/http';
const API_KEY = 'att_3sh4fmd2u14ffisevqztm';

// Test users with BLE UUIDs
const testUsers = [
  {
    name: "John Doe",
    email: "john.doe@example.com",
    bleUuid: "12345678-1234-1234-1234-123456789abc"
  },
  {
    name: "Jane Smith", 
    email: "jane.smith@example.com",
    bleUuid: "87654321-4321-4321-4321-cba987654321"
  },
  {
    name: "Bob Johnson",
    email: "bob.johnson@example.com", 
    bleUuid: "11111111-2222-3333-4444-555555555555"
  },
  {
    name: "Alice Brown",
    email: "alice.brown@example.com",
    bleUuid: "22222222-3333-4444-5555-666666666666"
  }
];

const testEvent = {
  name: "Test Event - ESP32 Scanner",
  description: "Testing the ESP32 scanner with real users",
  startTime: Date.now(),
  endTime: Date.now() + (2 * 60 * 60 * 1000) // 2 hours from now
};

async function makeRequest(endpoint, method = 'GET', data = null) {
  const url = `${API_BASE_URL}${endpoint}`;
  const options = {
    method,
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': API_KEY
    }
  };

  if (data) {
    options.body = JSON.stringify(data);
  }

  try {
    const response = await fetch(url, options);
    const result = await response.json();
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${result.error || 'Unknown error'}`);
    }
    
    return result;
  } catch (error) {
    console.error(`Request failed: ${error.message}`);
    throw error;
  }
}

async function setupTestData() {
  console.log('🔧 Setting up test data for ESP32 scanner...\n');

  try {
    // Step 1: Create test event
    console.log('1️⃣ Creating test event...');
    const eventResult = await makeRequest('/create-event', 'POST', testEvent);
    const eventId = eventResult.eventId;
    console.log(`✅ Event created: ${eventResult.eventId}`);
    console.log(`   Name: ${testEvent.name}`);

    // Step 2: Create test users
    console.log('\n2️⃣ Creating test users...');
    const userIds = [];
    for (const user of testUsers) {
      const userResult = await makeRequest('/create-user', 'POST', user);
      userIds.push(userResult.userId);
      console.log(`✅ User created: ${user.name}`);
      console.log(`   Email: ${user.email}`);
      console.log(`   BLE UUID: ${user.bleUuid}`);
    }

    // Step 3: Register users for the event
    console.log('\n3️⃣ Registering users for event...');
    for (const userId of userIds) {
      await makeRequest('/register-user', 'POST', {
        userId,
        eventId
      });
      console.log(`✅ User registered for event`);
    }

    // Step 4: Activate the event
    console.log('\n4️⃣ Activating event...');
    await makeRequest('/activate-event', 'POST', { eventId });
    console.log('✅ Event activated');

    console.log('\n🎉 Test data setup complete!');
    console.log('\n📱 ESP32 Scanner Instructions:');
    console.log('1. Upload the ESP32 code to your Arduino');
    console.log('2. Connect to WiFi (configure via ESP32 web interface)');
    console.log('3. Select the "Test Event - ESP32 Scanner" event');
    console.log('4. Start scanning - users should now be identified by name!');
    
    console.log('\n👥 Test Users Created:');
    testUsers.forEach((user, index) => {
      console.log(`${index + 1}. ${user.name} (${user.email})`);
      console.log(`   BLE UUID: ${user.bleUuid}`);
    });

    console.log('\n🔍 What to Expect:');
    console.log('- Users will show up with their actual names (not "Unknown User")');
    console.log('- No duplicate entries for the same user');
    console.log('- Attendance percentages will be calculated automatically');
    console.log('- Admin interface will show detailed attendance reports');

  } catch (error) {
    console.error('\n❌ Setup failed:', error.message);
    process.exit(1);
  }
}

// Run the setup
if (require.main === module) {
  setupTestData().catch(console.error);
}

module.exports = { setupTestData };
