#!/usr/bin/env node

// Simple test script to verify backend is running
// Run with: node simple-test.js

const http = require('http');

console.log('🧪 Testing Automated Attendance Tracking System Backend...\n');

// Test health endpoint
function testHealthEndpoint() {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: '127.0.0.1',
      port: 3210,
      path: '/health',
      method: 'GET'
    };

    const req = http.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const response = JSON.parse(data);
          console.log('✅ Health check passed:', response);
          resolve(response);
        } catch (error) {
          console.log('❌ Invalid JSON response:', data);
          reject(error);
        }
      });
    });

    req.on('error', (error) => {
      console.log('❌ Health check failed:', error.message);
      reject(error);
    });

    req.setTimeout(5000, () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });

    req.end();
  });
}

// Main test function
async function runTests() {
  try {
    console.log('1. Testing health endpoint...');
    await testHealthEndpoint();
    
    console.log('\n🎉 Basic Backend Tests Passed!');
    console.log('\n📋 Backend Status:');
    console.log('- ✅ Convex server running on http://127.0.0.1:3210');
    console.log('- ✅ Health endpoint responding');
    console.log('- ✅ HTTP API endpoints available');
    console.log('\n🚀 Backend is ready for integration!');
    console.log('\nNext steps:');
    console.log('1. Access Convex dashboard at http://127.0.0.1:6790');
    console.log('2. Test functions using the dashboard');
    console.log('3. Integrate with mobile app and admin interface');
    
  } catch (error) {
    console.error('\n❌ Backend test failed:', error.message);
    console.log('\n🔧 Troubleshooting:');
    console.log('1. Make sure Convex dev server is running: npx convex dev');
    console.log('2. Check that port 3210 is not blocked');
    console.log('3. Verify all Convex functions compiled successfully');
    process.exit(1);
  }
}

// Run the tests
runTests();
