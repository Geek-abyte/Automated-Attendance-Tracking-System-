#!/usr/bin/env node

/**
 * Integration Test Script
 * Tests the connection between scanner, admin, and mobile app
 */

const https = require('https');
const http = require('http');

// Configuration
const BACKEND_URL = process.env.BACKEND_URL || 'https://your-convex-deployment.convex.cloud/http';
const API_KEY = process.env.API_KEY || 'your-api-key-here';

// Test data
const testUser = {
  name: 'Test User',
  email: 'test@example.com',
  bleUuid: 'ATT-12345678-1234-1234-1234-123456789012'
};

const testEvent = {
  name: 'Test Event',
  description: 'Integration test event',
  startTime: Date.now() + 24 * 60 * 60 * 1000, // Tomorrow
  endTime: Date.now() + 25 * 60 * 60 * 1000, // Tomorrow + 1 hour
  isActive: true
};

async function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const isHttps = url.startsWith('https');
    const client = isHttps ? https : http;
    
    const req = client.request(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': API_KEY,
        ...options.headers
      },
      ...options
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const jsonData = JSON.parse(data);
          resolve({ status: res.statusCode, data: jsonData });
        } catch (e) {
          resolve({ status: res.statusCode, data: data });
        }
      });
    });
    
    req.on('error', reject);
    
    if (options.body) {
      req.write(JSON.stringify(options.body));
    }
    
    req.end();
  });
}

async function testBackendConnection() {
  console.log('🔍 Testing backend connection...');
  
  try {
    const response = await makeRequest(`${BACKEND_URL}/health`, { method: 'GET' });
    if (response.status === 200) {
      console.log('✅ Backend connection successful');
      return true;
    } else {
      console.log('❌ Backend connection failed:', response.data);
      return false;
    }
  } catch (error) {
    console.log('❌ Backend connection error:', error.message);
    return false;
  }
}

async function testCreateUser() {
  console.log('👤 Testing user creation...');
  
  try {
    const response = await makeRequest(`${BACKEND_URL}/create-user`, {
      body: testUser
    });
    
    if (response.status === 200 && response.data.success) {
      console.log('✅ User created successfully:', response.data.userId);
      return response.data.userId;
    } else {
      console.log('❌ User creation failed:', response.data);
      return null;
    }
  } catch (error) {
    console.log('❌ User creation error:', error.message);
    return null;
  }
}

async function testCreateEvent() {
  console.log('📅 Testing event creation...');
  
  try {
    const response = await makeRequest(`${BACKEND_URL}/create-event`, {
      body: testEvent
    });
    
    if (response.status === 200 && response.data.success) {
      console.log('✅ Event created successfully:', response.data.eventId);
      return response.data.eventId;
    } else {
      console.log('❌ Event creation failed:', response.data);
      return null;
    }
  } catch (error) {
    console.log('❌ Event creation error:', error.message);
    return null;
  }
}

async function testRegisterUser(userId, eventId) {
  console.log('📝 Testing user registration...');
  
  try {
    const response = await makeRequest(`${BACKEND_URL}/register-user`, {
      body: { userId, eventId }
    });
    
    if (response.status === 200 && response.data.success) {
      console.log('✅ User registered successfully');
      return true;
    } else {
      console.log('❌ User registration failed:', response.data);
      return false;
    }
  } catch (error) {
    console.log('❌ User registration error:', error.message);
    return false;
  }
}

async function testScannerSync(userId, eventId) {
  console.log('📡 Testing scanner sync...');
  
  const scannerRecords = [{
    bleUuid: testUser.bleUuid,
    eventId: eventId,
    timestamp: Date.now(),
    scannerSource: 'ESP32-Scanner-Test',
    rssi: -50,
    deviceName: 'Test Device'
  }];
  
  try {
    const response = await makeRequest(`${BACKEND_URL}/batch-checkin`, {
      body: { records: scannerRecords }
    });
    
    if (response.status === 200 && response.data.success) {
      console.log('✅ Scanner sync successful:', response.data);
      return true;
    } else {
      console.log('❌ Scanner sync failed:', response.data);
      return false;
    }
  } catch (error) {
    console.log('❌ Scanner sync error:', error.message);
    return false;
  }
}

async function runIntegrationTest() {
  console.log('🚀 Starting Integration Test...\n');
  
  // Test 1: Backend connection
  const backendConnected = await testBackendConnection();
  if (!backendConnected) {
    console.log('\n❌ Integration test failed: Backend not accessible');
    process.exit(1);
  }
  
  // Test 2: Create user
  const userId = await testCreateUser();
  if (!userId) {
    console.log('\n❌ Integration test failed: Could not create user');
    process.exit(1);
  }
  
  // Test 3: Create event
  const eventId = await testCreateEvent();
  if (!eventId) {
    console.log('\n❌ Integration test failed: Could not create event');
    process.exit(1);
  }
  
  // Test 4: Register user for event
  const registrationSuccess = await testRegisterUser(userId, eventId);
  if (!registrationSuccess) {
    console.log('\n❌ Integration test failed: Could not register user');
    process.exit(1);
  }
  
  // Test 5: Simulate scanner sync
  const syncSuccess = await testScannerSync(userId, eventId);
  if (!syncSuccess) {
    console.log('\n❌ Integration test failed: Scanner sync failed');
    process.exit(1);
  }
  
  console.log('\n🎉 Integration test completed successfully!');
  console.log('\nNext steps:');
  console.log('1. Configure your ESP32 scanner with the backend URL and API key');
  console.log('2. Set up the mobile app with the same backend URL');
  console.log('3. Test with real BLE devices');
}

// Run the test
if (require.main === module) {
  runIntegrationTest().catch(console.error);
}

module.exports = {
  testBackendConnection,
  testCreateUser,
  testCreateEvent,
  testRegisterUser,
  testScannerSync
};
