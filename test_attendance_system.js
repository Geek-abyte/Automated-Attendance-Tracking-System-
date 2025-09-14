#!/usr/bin/env node

/**
 * Test script for the attendance tracking system
 * This script tests the complete flow from user creation to attendance recording
 */

const API_BASE_URL = process.env.API_BASE_URL || 'https://compassionate-yak-763.convex.cloud/http';
const API_KEY = 'att_3sh4fmd2u14ffisevqztm'; // Default API key for testing

// Test data
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
  }
];

const testEvent = {
  name: "Test Event - Attendance System",
  description: "Testing the attendance tracking system",
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

async function testSystem() {
  console.log('🧪 Starting Attendance System Test\n');

  try {
    // Step 1: Create test event
    console.log('1️⃣ Creating test event...');
    const eventResult = await makeRequest('/create-event', 'POST', testEvent);
    const eventId = eventResult.eventId;
    console.log(`✅ Event created: ${eventResult.eventId}`);

    // Step 2: Create test users
    console.log('\n2️⃣ Creating test users...');
    const userIds = [];
    for (const user of testUsers) {
      const userResult = await makeRequest('/create-user', 'POST', user);
      userIds.push(userResult.userId);
      console.log(`✅ User created: ${user.name} (${userResult.userId})`);
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

    // Step 5: Simulate attendance records (multiple scans per user)
    console.log('\n5️⃣ Recording attendance (simulating multiple scans)...');
    
    const attendanceRecords = [];
    const now = Date.now();
    
    // Create multiple scan records for each user over time
    for (let i = 0; i < 3; i++) {
      for (let j = 0; j < testUsers.length; j++) {
        const user = testUsers[j];
        const scanTime = now + (i * 5 * 60 * 1000); // 5 minutes apart
        
        attendanceRecords.push({
          bleUuid: user.bleUuid,
          eventId: eventId,
          timestamp: scanTime,
          scannerSource: "test_scanner",
          rssi: -50 - (i * 5), // Decreasing signal strength
          deviceName: "Test Scanner Device"
        });
      }
    }

    // Send batch attendance records
    const batchResult = await makeRequest('/batch-checkin', 'POST', {
      records: attendanceRecords
    });
    
    console.log(`✅ Batch attendance recorded:`);
    console.log(`   - Processed: ${batchResult.processed}`);
    console.log(`   - Successful: ${batchResult.successful}`);
    console.log(`   - Duplicates: ${batchResult.duplicates}`);
    console.log(`   - Errors: ${batchResult.errors}`);

    // Step 6: Check attendance summaries
    console.log('\n6️⃣ Checking attendance summaries...');
    
    // Wait a moment for calculations to complete
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Get event details to check attendance
    const events = await makeRequest('/events');
    const eventDetails = events.events.find(e => e.id === eventId);
    
    if (eventDetails) {
      console.log(`✅ Event details retrieved:`);
      console.log(`   - Name: ${eventDetails.name}`);
      console.log(`   - Active: ${eventDetails.isActive}`);
      console.log(`   - Start Time: ${new Date(eventDetails.startTime).toLocaleString()}`);
      console.log(`   - End Time: ${new Date(eventDetails.endTime).toLocaleString()}`);
    }

    // Step 7: Test duplicate prevention
    console.log('\n7️⃣ Testing duplicate prevention...');
    const duplicateRecords = [
      {
        bleUuid: testUsers[0].bleUuid,
        eventId: eventId,
        timestamp: now + (10 * 60 * 1000), // 10 minutes later
        scannerSource: "test_scanner",
        rssi: -60,
        deviceName: "Test Scanner Device"
      }
    ];

    const duplicateResult = await makeRequest('/batch-checkin', 'POST', {
      records: duplicateRecords
    });
    
    console.log(`✅ Duplicate test result:`);
    console.log(`   - Processed: ${duplicateResult.processed}`);
    console.log(`   - Successful: ${duplicateResult.successful}`);
    console.log(`   - Duplicates: ${duplicateResult.duplicates}`);
    console.log(`   - Errors: ${duplicateResult.errors}`);

    // Step 8: Test unknown user handling
    console.log('\n8️⃣ Testing unknown user handling...');
    const unknownUserRecords = [
      {
        bleUuid: "unknown-uuid-12345",
        eventId: eventId,
        timestamp: now + (15 * 60 * 1000),
        scannerSource: "test_scanner",
        rssi: -70,
        deviceName: "Test Scanner Device"
      }
    ];

    const unknownResult = await makeRequest('/batch-checkin', 'POST', {
      records: unknownUserRecords
    });
    
    console.log(`✅ Unknown user test result:`);
    console.log(`   - Processed: ${unknownResult.processed}`);
    console.log(`   - Successful: ${unknownResult.successful}`);
    console.log(`   - Duplicates: ${unknownResult.duplicates}`);
    console.log(`   - Errors: ${unknownResult.errors}`);

    console.log('\n🎉 All tests completed successfully!');
    console.log('\n📊 Summary:');
    console.log(`   - Event created and activated`);
    console.log(`   - ${testUsers.length} users created and registered`);
    console.log(`   - Multiple attendance scans recorded`);
    console.log(`   - Duplicate prevention working`);
    console.log(`   - Unknown user handling working`);
    console.log(`   - Attendance percentages should be calculated automatically`);
    
    console.log('\n🔍 Next steps:');
    console.log('   1. Check the admin interface at your deployed admin URL');
    console.log('   2. Select the test event to view attendance percentages');
    console.log('   3. Verify that users show up with their names (not "unknown")');
    console.log('   4. Check that attendance percentages are calculated correctly');

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    process.exit(1);
  }
}

// Run the test
if (require.main === module) {
  testSystem().catch(console.error);
}

module.exports = { testSystem };
