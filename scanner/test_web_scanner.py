#!/usr/bin/env python3
"""
Test script for the web-based Python scanner
"""

import requests
import time
import json
import os
import subprocess
import threading
import sys

def test_backend_connection(base_url: str, api_key: str) -> bool:
    """Test connection to backend."""
    try:
        response = requests.get(
            f"{base_url}/health",
            headers={"x-api-key": api_key},
            timeout=10
        )
        return response.status_code == 200
    except Exception as e:
        print(f"Backend connection failed: {e}")
        return False

def test_events_api(base_url: str, api_key: str) -> bool:
    """Test events API."""
    try:
        response = requests.get(
            f"{base_url}/active-events",
            headers={"x-api-key": api_key},
            timeout=10
        )
        if response.status_code == 200:
            data = response.json()
            print(f"Found {len(data.get('events', []))} active events")
            return True
        else:
            print(f"Events API failed: {response.status_code} {response.text}")
            return False
    except Exception as e:
        print(f"Events API error: {e}")
        return False

def test_web_scanner_api(port: int = 5000) -> bool:
    """Test web scanner API endpoints."""
    base_url = f"http://localhost:{port}"
    
    try:
        # Test dashboard API
        response = requests.get(f"{base_url}/api/dashboard", timeout=5)
        if response.status_code == 200:
            data = response.json()
            print(f"Dashboard API: {data}")
        else:
            print(f"Dashboard API failed: {response.status_code}")
            return False
        
        # Test events API
        response = requests.get(f"{base_url}/api/events", timeout=5)
        if response.status_code == 200:
            data = response.json()
            print(f"Events API: {data}")
        else:
            print(f"Events API failed: {response.status_code}")
            return False
        
        return True
        
    except Exception as e:
        print(f"Web scanner API error: {e}")
        return False

def start_web_scanner():
    """Start the web scanner in background."""
    try:
        process = subprocess.Popen([
            sys.executable, "web_scanner.py", "--port", "5000"
        ], stdout=subprocess.PIPE, stderr=subprocess.PIPE)
        
        # Wait for server to start
        time.sleep(5)
        
        return process
    except Exception as e:
        print(f"Failed to start web scanner: {e}")
        return None

def main():
    """Run comprehensive tests."""
    print("🧪 Testing Python Web Scanner")
    print("=" * 40)
    
    # Load config
    config_path = "config.json"
    if not os.path.exists(config_path):
        print("❌ config.json not found. Please create one first.")
        return False
    
    with open(config_path, "r") as f:
        config = json.load(f)
    
    base_url = config.get("backend_base_url", "")
    api_key = config.get("api_key", "")
    
    if not base_url or not api_key:
        print("❌ Backend URL or API key not configured")
        return False
    
    print(f"📡 Backend URL: {base_url}")
    print(f"🔑 API Key: {api_key[:10]}...")
    
    # Test 1: Backend connection
    print("\n1. Testing backend connection...")
    if test_backend_connection(base_url, api_key):
        print("✅ Backend connection successful")
    else:
        print("❌ Backend connection failed")
        return False
    
    # Test 2: Events API
    print("\n2. Testing events API...")
    if test_events_api(base_url, api_key):
        print("✅ Events API successful")
    else:
        print("❌ Events API failed")
        return False
    
    # Test 3: Start web scanner
    print("\n3. Starting web scanner...")
    scanner_process = start_web_scanner()
    if not scanner_process:
        print("❌ Failed to start web scanner")
        return False
    
    try:
        print("✅ Web scanner started")
        
        # Test 4: Web scanner API
        print("\n4. Testing web scanner API...")
        if test_web_scanner_api():
            print("✅ Web scanner API successful")
        else:
            print("❌ Web scanner API failed")
            return False
        
        # Test 5: Web interface
        print("\n5. Testing web interface...")
        try:
            response = requests.get("http://localhost:5000", timeout=5)
            if response.status_code == 200:
                print("✅ Web interface accessible")
            else:
                print(f"❌ Web interface failed: {response.status_code}")
                return False
        except Exception as e:
            print(f"❌ Web interface error: {e}")
            return False
        
        print("\n🎉 All tests passed!")
        print("\n📱 Web interface available at: http://localhost:5000")
        print("📅 Events page: http://localhost:5000/events")
        print("⚙️  Configuration: http://localhost:5000/config")
        print("\nPress Ctrl+C to stop the scanner")
        
        # Keep running
        try:
            while True:
                time.sleep(1)
        except KeyboardInterrupt:
            print("\n👋 Stopping scanner...")
            scanner_process.terminate()
            scanner_process.wait()
            print("✅ Scanner stopped")
        
        return True
        
    except Exception as e:
        print(f"❌ Test failed: {e}")
        if scanner_process:
            scanner_process.terminate()
        return False

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
