#!/usr/bin/env python3
"""
Quick test script for the scanner system.
This script helps verify that the backend and scanner are working correctly.
"""

import json
import requests
import sys
import time
from typing import Dict, Any, List

# Configuration
BACKEND_URL = "http://127.0.0.1:3210/http"
API_KEY = "att_3sh4fmd2u14ffisevqztm"

def test_backend_health() -> bool:
    """Test if backend is running and healthy."""
    try:
        response = requests.get(f"{BACKEND_URL}/health", timeout=5)
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Backend is healthy: {data.get('status')}")
            return True
        else:
            print(f"❌ Backend health check failed: {response.status_code}")
            return False
    except requests.RequestException as e:
        print(f"❌ Backend is not reachable: {e}")
        return False

def create_test_data() -> Dict[str, str]:
    """Create test users and events."""
    print("\n📝 Creating test data...")
    
    # Create test users
    users = []
    user_data = [
        {"name": "Test User 1", "email": "test1@example.com", "bleUuid": "TestPhone-001"},
        {"name": "Test User 2", "email": "test2@example.com", "bleUuid": "TestPhone-002"},
    ]
    
    for user in user_data:
        try:
            response = requests.post(
                f"{BACKEND_URL}/create-user",
                headers={"Content-Type": "application/json", "x-api-key": API_KEY},
                data=json.dumps(user),
                timeout=10
            )
            if response.status_code == 200:
                data = response.json()
                user_id = data.get("userId")
                users.append(user_id)
                print(f"✅ Created user: {user['name']} (ID: {user_id})")
            else:
                print(f"❌ Failed to create user {user['name']}: {response.text}")
        except requests.RequestException as e:
            print(f"❌ Error creating user {user['name']}: {e}")
    
    # Create test event
    event_data = {
        "name": "Test Event - Scanner Demo",
        "description": "Automated test event for scanner testing",
        "isActive": True
    }
    
    try:
        response = requests.post(
            f"{BACKEND_URL}/create-event",
            headers={"Content-Type": "application/json", "x-api-key": API_KEY},
            data=json.dumps(event_data),
            timeout=10
        )
        if response.status_code == 200:
            data = response.json()
            event_id = data.get("eventId")
            print(f"✅ Created event: {event_data['name']} (ID: {event_id})")
        else:
            print(f"❌ Failed to create event: {response.text}")
            return {"users": users, "event_id": None}
    except requests.RequestException as e:
        print(f"❌ Error creating event: {e}")
        return {"users": users, "event_id": None}
    
    # Register users for event
    for user_id in users:
        try:
            response = requests.post(
                f"{BACKEND_URL}/register-user",
                headers={"Content-Type": "application/json", "x-api-key": API_KEY},
                data=json.dumps({"userId": user_id, "eventId": event_id}),
                timeout=10
            )
            if response.status_code == 200:
                print(f"✅ Registered user {user_id} for event")
            else:
                print(f"❌ Failed to register user {user_id}: {response.text}")
        except requests.RequestException as e:
            print(f"❌ Error registering user {user_id}: {e}")
    
    return {"users": users, "event_id": event_id}

def test_active_events() -> List[Dict[str, Any]]:
    """Test fetching active events."""
    print("\n📋 Testing active events endpoint...")
    
    try:
        response = requests.get(
            f"{BACKEND_URL}/active-events",
            headers={"x-api-key": API_KEY},
            timeout=10
        )
        if response.status_code == 200:
            data = response.json()
            events = data.get("events", [])
            print(f"✅ Found {len(events)} active events")
            for event in events:
                print(f"   - {event['name']} (ID: {event['id']})")
            return events
        else:
            print(f"❌ Failed to fetch events: {response.text}")
            return []
    except requests.RequestException as e:
        print(f"❌ Error fetching events: {e}")
        return []

def test_event_control(event_id: str) -> bool:
    """Test event start/stop functionality."""
    print(f"\n🎛️ Testing event control for {event_id}...")
    
    # Test stop
    try:
        response = requests.post(
            f"{BACKEND_URL}/event-control",
            headers={"Content-Type": "application/json", "x-api-key": API_KEY},
            data=json.dumps({"eventId": event_id, "action": "stop"}),
            timeout=10
        )
        if response.status_code == 200:
            print("✅ Event stopped successfully")
        else:
            print(f"❌ Failed to stop event: {response.text}")
    except requests.RequestException as e:
        print(f"❌ Error stopping event: {e}")
    
    # Test start
    try:
        response = requests.post(
            f"{BACKEND_URL}/event-control",
            headers={"Content-Type": "application/json", "x-api-key": API_KEY},
            data=json.dumps({"eventId": event_id, "action": "start"}),
            timeout=10
        )
        if response.status_code == 200:
            print("✅ Event started successfully")
            return True
        else:
            print(f"❌ Failed to start event: {response.text}")
            return False
    except requests.RequestException as e:
        print(f"❌ Error starting event: {e}")
        return False

def test_scanner_commands():
    """Test scanner command availability."""
    print("\n🔧 Testing scanner commands...")
    
    import subprocess
    import os
    
    # Change to scanner directory
    scanner_dir = os.path.dirname(os.path.abspath(__file__))
    os.chdir(scanner_dir)
    
    try:
        # Test help command
        result = subprocess.run(
            ["python", "scanner.py", "--help"],
            capture_output=True,
            text=True,
            timeout=10
        )
        if result.returncode == 0:
            print("✅ Scanner help command works")
        else:
            print(f"❌ Scanner help failed: {result.stderr}")
        
        # Test list-events command
        result = subprocess.run(
            ["python", "scanner.py", "list-events"],
            capture_output=True,
            text=True,
            timeout=10
        )
        if result.returncode == 0:
            print("✅ Scanner list-events command works")
            print("   Events found:")
            for line in result.stdout.split('\n'):
                if line.strip() and not line.startswith('==='):
                    print(f"     {line}")
        else:
            print(f"❌ Scanner list-events failed: {result.stderr}")
            
    except subprocess.TimeoutExpired:
        print("❌ Scanner commands timed out")
    except Exception as e:
        print(f"❌ Error testing scanner commands: {e}")

def main():
    """Run all tests."""
    print("🚀 Starting Scanner System Tests")
    print("=" * 50)
    
    # Test 1: Backend Health
    if not test_backend_health():
        print("\n❌ Backend is not running. Please start the backend first:")
        print("   cd backend && npm run dev")
        sys.exit(1)
    
    # Test 2: Create Test Data
    test_data = create_test_data()
    if not test_data["event_id"]:
        print("\n❌ Failed to create test data. Check backend logs.")
        sys.exit(1)
    
    # Test 3: Active Events
    events = test_active_events()
    if not events:
        print("\n❌ No active events found. Check event creation.")
        sys.exit(1)
    
    # Test 4: Event Control
    if not test_event_control(test_data["event_id"]):
        print("\n❌ Event control failed. Check backend logs.")
        sys.exit(1)
    
    # Test 5: Scanner Commands
    test_scanner_commands()
    
    print("\n" + "=" * 50)
    print("🎉 All tests completed!")
    print("\nNext steps:")
    print("1. Set up test devices with Bluetooth names:")
    print("   - 'TestPhone-001'")
    print("   - 'TestPhone-002'")
    print("2. Run interactive scanner:")
    print("   python scanner.py interactive-scan")
    print("3. Select the test event and start scanning")
    print("4. Enable Bluetooth on test devices")
    print("5. Watch for device detection and logging")
    print("6. Stop scanning (Ctrl+C) and sync data:")
    print("   python scanner.py sync")

if __name__ == "__main__":
    main()
