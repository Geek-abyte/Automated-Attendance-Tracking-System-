# How to Test the Enhanced Scanner System

## Quick Start (Recommended)

The easiest way to test the system is using our automated test script:

```bash
./quick_test.sh
```

This script will:
1. ✅ Check prerequisites
2. 🚀 Start the backend automatically
3. 🧪 Run automated tests
4. 🎯 Guide you through interactive testing
5. 🔄 Help you sync data

## Manual Testing Steps

If you prefer to test manually or the automated script doesn't work:

### 1. Start the Backend
```bash
cd backend
npm install  # if first time
npm run dev
```
Backend should be running on `http://127.0.0.1:3210`

### 2. Test Backend Health
```bash
curl http://127.0.0.1:3210/http/health
```
Should return: `{"status":"healthy",...}`

### 3. Run Automated Tests
```bash
cd scanner
python3 test_system.py
```
This will create test data and verify all endpoints work.

### 4. Test the Interactive Scanner
```bash
python3 scanner.py interactive-scan
```

### 5. Set Up Test Devices
- Enable Bluetooth on phones/devices
- Set device names to match test data:
  - `TestPhone-001`
  - `TestPhone-002`
  - Or any name you prefer

### 6. Monitor Scanning
- Watch for device detection messages
- Press Ctrl+C to stop scanning

### 7. Sync Data
```bash
python3 scanner.py sync
```

## What to Expect

### ✅ Successful Test Results

**Backend Tests:**
- Health check passes
- Test users created
- Test events created
- Users registered for events
- Event control works

**Scanner Tests:**
- Interactive mode starts
- Event selection menu appears
- BLE scanning begins
- Devices detected and logged
- Data syncs successfully

### 📱 Device Detection

When devices are detected, you'll see:
```
Scan #1 - Discovering devices...
  ✓ Logged TestPhone-001 at 2024-01-15T10:30:45
  Found 1 new devices in this scan
```

### 📊 Log Files

Check `scanner/attendance_log.jsonl` for logged devices:
```json
{"bleUuid":"TestPhone-001","timestamp":1705312245000,"eventId":"...","scannerSource":"Test-Scanner-01"}
```

## Troubleshooting

### Common Issues

**"Backend not reachable"**
- Ensure backend is running: `cd backend && npm run dev`
- Check if port 3210 is available
- Wait a few seconds for backend to fully start

**"No active events found"**
- Run the test script to create test data
- Check API key in `scanner/config.json`
- Verify backend is running

**"Bleak is not available"**
- Install BLE dependencies: `pip install bleak`
- Run on a system with Bluetooth support
- On macOS: ensure Bluetooth is enabled

**"No devices detected"**
- Enable Bluetooth on test devices
- Set device names to match expected UUIDs
- Move devices closer to scanner
- Try different scan intervals

**"Sync fails"**
- Check API key validity
- Verify backend is running
- Check network connectivity

### Debug Mode

For detailed debugging, modify `scanner/scanner.py`:
```python
import logging
logging.basicConfig(level=logging.DEBUG)
```

## Test Scenarios

### Basic Functionality Test
1. Run `./quick_test.sh`
2. Follow the interactive prompts
3. Verify devices are detected and logged
4. Check that data syncs to backend

### Multiple Events Test
1. Create additional events via backend
2. Test event selection menu
3. Verify correct event is selected
4. Test scanning with different events

### Event Control Test
1. Use `python3 scanner.py event-control <event-id> start`
2. Use `python3 scanner.py event-control <event-id> stop`
3. Verify event status changes
4. Test scanning with inactive events

### Offline/Online Test
1. Run scanner without backend
2. Verify local logging works
3. Start backend and test sync
4. Verify data uploads correctly

## Success Criteria

✅ **System is working correctly if:**
- Backend starts and responds to health checks
- Test data is created successfully
- Interactive scanner shows event selection menu
- BLE devices are detected and logged
- Attendance data syncs to backend
- No critical errors occur during testing

## Next Steps

After successful testing:
1. 🎯 Deploy to production environment
2. 📱 Set up real devices with proper BLE UUIDs
3. 👥 Create actual events and user registrations
4. 🔧 Configure production API keys and URLs
5. 📊 Monitor system performance and logs

## Support

If you encounter issues:
1. Check the detailed `scanner/TESTING_GUIDE.md`
2. Review backend logs for errors
3. Verify all dependencies are installed
4. Test individual components separately
5. Check network connectivity and firewall settings
