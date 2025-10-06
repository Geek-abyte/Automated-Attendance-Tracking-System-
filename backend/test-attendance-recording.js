// Test attendance recording for ESP32 scanner
const https = require('https');

const CONVEX_URL = 'https://combative-deer-426.convex.cloud';
const API_KEY = 'att_3sh4fmd2u14ffisevqztm';
const BLE_UUID = 'ATT-USER-12P8AJNR'; // Your user's BLE UUID
const EVENT_ID = 'jn7f56bc6vtrdx0tmnmby1cmm57qptfm'; // Event ID from your logs

async function testAttendanceRecording() {
  console.log('=== Testing Attendance Recording ===\n');
  
  // Test 1: Record attendance
  console.log('1. Testing attendance recording...');
  console.log(`   BLE UUID: ${BLE_UUID}`);
  console.log(`   Event ID: ${EVENT_ID}`);
  
  const attendanceData = JSON.stringify({
    bleUuid: BLE_UUID,
    eventId: EVENT_ID,
    timestamp: Date.now(),
    scannerSource: 'test_script'
  });
  
  const options = {
    hostname: 'combative-deer-426.convex.cloud',
    port: 443,
    path: '/http/attendance',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': attendanceData.length,
      'x-api-key': API_KEY
    }
  };
  
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        console.log(`   Status: ${res.statusCode}`);
        console.log(`   Response: ${data}\n`);
        
        try {
          const response = JSON.parse(data);
          if (response.success) {
            console.log('✅ Attendance recorded successfully!');
            console.log(`   Attendance ID: ${response.attendanceId}`);
            if (response.user) {
              console.log(`   User: ${response.user.name} (${response.user.email})`);
            }
          } else {
            console.log('❌ Attendance recording failed');
            console.log(`   Error: ${response.error}`);
            if (response.details) {
              console.log(`   Details: ${response.details}`);
            }
          }
        } catch (e) {
          console.log('❌ Failed to parse response');
        }
        
        resolve();
      });
    });
    
    req.on('error', (error) => {
      console.error('❌ Request failed:', error.message);
      reject(error);
    });
    
    req.write(attendanceData);
    req.end();
  });
}

testAttendanceRecording().catch(console.error);
