#!/usr/bin/env python3

"""
Test script to simulate ESP32 scanner behavior
This script tests the complete data flow from scanner to backend
"""

import requests
import json
import time
import random
from datetime import datetime

# Configuration
API_BASE_URL = "https://compassionate-yak-763.convex.cloud/http"
API_KEY = "att_3sh4fmd2u14ffisevqztm"

# Test data - simulating BLE devices
test_devices = [
    {
        "bleUuid": "12345678-1234-1234-1234-123456789abc",
        "deviceName": "John's Phone",
        "rssi": -45
    },
    {
        "bleUuid": "87654321-4321-4321-4321-cba987654321", 
        "deviceName": "Jane's Watch",
        "rssi": -52
    },
    {
        "bleUuid": "11111111-2222-3333-4444-555555555555",
        "deviceName": "Bob's Headphones", 
        "rssi": -38
    }
]

def make_request(endpoint, method="GET", data=None):
    """Make HTTP request to the API"""
    url = f"{API_BASE_URL}{endpoint}"
    headers = {
        "Content-Type": "application/json",
        "x-api-key": API_KEY
    }
    
    try:
        if method == "GET":
            response = requests.get(url, headers=headers)
        elif method == "POST":
            response = requests.post(url, headers=headers, json=data)
        
        response.raise_for_status()
        return response.json()
    except requests.exceptions.RequestException as e:
        print(f"❌ Request failed: {e}")
        return None

def test_scanner_flow():
    """Test the complete scanner flow"""
    print("🔍 Testing ESP32 Scanner Flow\n")
    
    # Step 1: Get available events
    print("1️⃣ Getting available events...")
    events_response = make_request("/events")
    if not events_response or not events_response.get("success"):
        print("❌ Failed to get events")
        return False
    
    events = events_response.get("events", [])
    if not events:
        print("❌ No events available. Please create an event first.")
        return False
    
    print(f"✅ Found {len(events)} events")
    for event in events:
        print(f"   - {event['name']} (ID: {event['id']}, Active: {event['isActive']})")
    
    # Step 2: Select first event
    selected_event = events[0]
    event_id = selected_event["id"]
    print(f"\n2️⃣ Selected event: {selected_event['name']}")
    
    # Step 3: Activate the event
    print("\n3️⃣ Activating event...")
    activate_response = make_request("/activate-event", "POST", {"eventId": event_id})
    if not activate_response or not activate_response.get("success"):
        print("❌ Failed to activate event")
        return False
    
    print("✅ Event activated")
    
    # Step 4: Simulate multiple scanning sessions
    print("\n4️⃣ Simulating BLE scanning sessions...")
    
    for session in range(3):  # 3 scanning sessions
        print(f"\n   Session {session + 1}:")
        
        # Create attendance records for this session
        records = []
        current_time = int(time.time() * 1000) + (session * 5 * 60 * 1000)  # 5 minutes apart
        
        for device in test_devices:
            # Simulate some devices not being detected in every session
            if random.random() > 0.2:  # 80% detection rate
                record = {
                    "bleUuid": device["bleUuid"],
                    "eventId": event_id,
                    "timestamp": current_time,
                    "scannerSource": "esp32_test_scanner",
                    "rssi": device["rssi"] + random.randint(-10, 10),
                    "deviceName": device["deviceName"]
                }
                records.append(record)
                print(f"     📱 Detected: {device['deviceName']} (RSSI: {record['rssi']})")
        
        if records:
            # Send batch attendance records
            batch_response = make_request("/batch-checkin", "POST", {"records": records})
            if batch_response and batch_response.get("success"):
                print(f"     ✅ Batch sent: {batch_response['successful']} successful, {batch_response['duplicates']} duplicates, {batch_response['errors']} errors")
            else:
                print(f"     ❌ Batch failed: {batch_response}")
        
        # Wait between sessions
        time.sleep(2)
    
    # Step 5: Test duplicate prevention
    print("\n5️⃣ Testing duplicate prevention...")
    duplicate_records = [
        {
            "bleUuid": test_devices[0]["bleUuid"],
            "eventId": event_id,
            "timestamp": int(time.time() * 1000),
            "scannerSource": "esp32_test_scanner",
            "rssi": -50,
            "deviceName": test_devices[0]["deviceName"]
        }
    ]
    
    duplicate_response = make_request("/batch-checkin", "POST", {"records": duplicate_records})
    if duplicate_response and duplicate_response.get("success"):
        print(f"✅ Duplicate test: {duplicate_response['duplicates']} duplicates detected")
    
    # Step 6: Test unknown device handling
    print("\n6️⃣ Testing unknown device handling...")
    unknown_records = [
        {
            "bleUuid": "unknown-device-uuid-12345",
            "eventId": event_id,
            "timestamp": int(time.time() * 1000),
            "scannerSource": "esp32_test_scanner",
            "rssi": -60,
            "deviceName": "Unknown Device"
        }
    ]
    
    unknown_response = make_request("/batch-checkin", "POST", {"records": unknown_records})
    if unknown_response and unknown_response.get("success"):
        print(f"✅ Unknown device test: {unknown_response['errors']} errors (expected)")
    
    # Step 7: Deactivate event
    print("\n7️⃣ Deactivating event...")
    deactivate_response = make_request("/deactivate-events", "POST", {})
    if deactivate_response and deactivate_response.get("success"):
        print(f"✅ Event deactivated ({deactivate_response['deactivatedCount']} events)")
    
    print("\n🎉 Scanner flow test completed!")
    print("\n📊 Summary:")
    print("   - Multiple scanning sessions simulated")
    print("   - BLE devices detected and logged")
    print("   - Duplicate prevention tested")
    print("   - Unknown device handling tested")
    print("   - Event lifecycle managed")
    
    print("\n🔍 Next steps:")
    print("   1. Check the admin interface for attendance data")
    print("   2. Verify users are identified by name (not 'unknown')")
    print("   3. Check attendance percentages are calculated")
    print("   4. Verify duplicate prevention is working")
    
    return True

if __name__ == "__main__":
    test_scanner_flow()
