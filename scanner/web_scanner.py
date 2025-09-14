#!/usr/bin/env python3
"""
Interactive Web-Based Scanner for Attendance Tracking
Features event selection, real-time scanning, and web interface
"""

import asyncio
import json
import os
import sys
import time
import threading
from datetime import datetime
from typing import Dict, Any, List, Set, Optional
from dataclasses import dataclass
from flask import Flask, render_template_string, request, jsonify, redirect, url_for

import click
import requests

try:
    from bleak import BleakScanner
except Exception:
    BleakScanner = None

# Global state
@dataclass
class ScannerState:
    selected_event_id: str = ""
    selected_event_name: str = ""
    is_scanning: bool = False
    is_event_active: bool = False
    total_scans: int = 0
    devices_found: int = 0
    records_logged: int = 0
    records_synced: int = 0
    last_sync_time: int = 0
    error_message: str = ""

# Global scanner state
scanner_state = ScannerState()

# Flask app
app = Flask(__name__)

# Configuration
CONFIG_PATH_DEFAULT = os.path.join(os.path.dirname(__file__), "config.json")

def load_config(config_path: str) -> Dict[str, Any]:
    """Load configuration from JSON file."""
    if not os.path.exists(config_path):
        raise FileNotFoundError(f"Config not found at {config_path}. Copy config.example.json to config.json and edit values.")
    with open(config_path, "r", encoding="utf-8") as f:
        return json.load(f)

def save_config(config_path: str, config: Dict[str, Any]) -> None:
    """Save configuration to JSON file."""
    with open(config_path, "w", encoding="utf-8") as f:
        json.dump(config, f, indent=2)

def append_jsonl(path: str, obj: Dict[str, Any]) -> None:
    """Append JSON object to JSONL file."""
    os.makedirs(os.path.dirname(path) or ".", exist_ok=True)
    with open(path, "a", encoding="utf-8") as f:
        f.write(json.dumps(obj, separators=(",", ":")) + "\n")

def read_jsonl(path: str) -> List[Dict[str, Any]]:
    """Read all records from JSONL file."""
    if not os.path.exists(path):
        return []
    records: List[Dict[str, Any]] = []
    with open(path, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            try:
                records.append(json.loads(line))
            except json.JSONDecodeError:
                continue
    return records

def fetch_active_events(base_url: str, api_key: str) -> List[Dict[str, Any]]:
    """Fetch active events from the backend."""
    url = base_url.rstrip("/") + "/active-events"
    try:
        response = requests.get(
            url,
            headers={
                "Content-Type": "application/json",
                "x-api-key": api_key,
            },
            timeout=10,
        )
        if response.status_code == 200:
            data = response.json()
            return data.get("events", [])
        else:
            print(f"Failed to fetch events: {response.status_code} {response.text}")
            return []
    except requests.RequestException as e:
        print(f"Error fetching events: {e}")
        return []

def fetch_registered_devices(base_url: str, api_key: str, event_id: str) -> Set[str]:
    """Fetch registered device UUIDs for a specific event."""
    # For now, we'll use a simple approach - fetch all users and check their BLE UUIDs
    # In a real implementation, you'd have a dedicated endpoint for this
    url = base_url.rstrip("/") + "/registered-devices"
    try:
        response = requests.get(
            url,
            headers={
                "Content-Type": "application/json",
                "x-api-key": api_key,
            },
            params={"eventId": event_id},
            timeout=10,
        )
        if response.status_code == 200:
            data = response.json()
            return set(data.get("deviceUuids", []))
        else:
            print(f"Failed to fetch registered devices: {response.status_code} {response.text}")
            return set()
    except Exception as e:
        print(f"Error fetching registered devices: {e}")
        return set()

def is_device_registered_for_event(device_uuid: str, event_id: str, registered_devices: Set[str]) -> bool:
    """Check if a device is registered for the current event."""
    return device_uuid in registered_devices

def sync_records_to_backend(base_url: str, api_key: str, records: List[Dict[str, Any]]) -> Dict[str, Any]:
    """Sync attendance records to backend."""
    if not records:
        return {"success": True, "processed": 0, "successful": 0, "duplicates": 0, "errors": 0}
    
    url = base_url.rstrip("/") + "/batch-checkin"
    try:
        response = requests.post(
            url,
            headers={
                "Content-Type": "application/json",
                "x-api-key": api_key,
            },
            json={"records": records},
            timeout=30,
        )
        if response.status_code == 200:
            data = response.json()
            return {
                "success": True,
                "processed": data.get("processed", 0),
                "successful": data.get("successful", 0),
                "duplicates": data.get("duplicates", 0),
                "errors": data.get("errors", 0),
            }
        else:
            return {
                "success": False,
                "error": f"HTTP {response.status_code}: {response.text}",
                "processed": 0,
                "successful": 0,
                "duplicates": 0,
                "errors": 0,
            }
    except requests.RequestException as e:
        return {
            "success": False,
            "error": str(e),
            "processed": 0,
            "successful": 0,
            "duplicates": 0,
            "errors": 0,
        }

def should_log_device(device_uuid: str, uuid_prefix: str, recent_devices: Set[str], registered_devices: Set[str]) -> bool:
    """Check if device should be logged."""
    # Check UUID prefix filter
    if uuid_prefix and not device_uuid.startswith(uuid_prefix):
        return False
    
    # Check if device is registered for the current event
    if not is_device_registered_for_event(device_uuid, scanner_state.selected_event_id, registered_devices):
        return False
    
    # Check if device was recently logged (deduplication)
    return device_uuid not in recent_devices

def log_device(device_uuid: str, device_name: str, rssi: int, event_id: str, scanner_id: str, log_path: str) -> bool:
    """Log device detection to JSONL file."""
    record = {
        "bleUuid": device_uuid,
        "timestamp": int(time.time() * 1000),
        "eventId": event_id,
        "scannerSource": scanner_id,
        "rssi": rssi,
        "deviceName": device_name or "Unknown",
    }
    
    try:
        append_jsonl(log_path, record)
        scanner_state.records_logged += 1
        print(f"Logged device: {device_uuid} for event: {scanner_state.selected_event_name} (RSSI: {rssi})")
        return True
    except Exception as e:
        print(f"Failed to log device {device_uuid}: {e}")
        return False

async def scan_for_devices(config: Dict[str, Any], recent_devices: Set[str]) -> None:
    """Scan for BLE devices and log detections."""
    if not scanner_state.is_scanning or not scanner_state.selected_event_id:
        return
    
    if BleakScanner is None:
        print("Bleak is not available. Install requirements or run on a BLE-capable system.")
        return
    
    scanner_state.total_scans += 1
    print(f"Starting BLE scan #{scanner_state.total_scans}...")
    
    # Fetch registered devices for the current event
    registered_devices = fetch_registered_devices(
        config.get("backend_base_url", ""),
        config.get("api_key", ""),
        scanner_state.selected_event_id
    )
    
    if not registered_devices:
        print(f"No registered devices found for event {scanner_state.selected_event_id}")
        return
    
    print(f"Found {len(registered_devices)} registered devices for this event")
    
    try:
        devices = await BleakScanner.discover(timeout=5.0)
        
        if devices:
            print(f"Found {len(devices)} BLE devices")
            scanner_state.devices_found += len(devices)
            
            for device in devices:
                # Prefer advertised name as the logical BLE identifier we match against registrations
                device_name = device.name or ""
                device_identifier = device_name if device_name else str(device.address)
                rssi = getattr(device, 'rssi', -100)

                if should_log_device(device_identifier, config.get("uuid_prefix", ""), recent_devices, registered_devices):
                    if log_device(device_identifier, device_name or "Unknown", rssi, scanner_state.selected_event_id,
                                config.get("scanner_id", "Scanner-01"), config.get("log_path", "./attendance_log.jsonl")):
                        recent_devices.add(device_identifier)
                        print(f"✅ Logged registered device: {device_name or 'Unknown'} ({device_identifier})")
        else:
            print("No BLE devices found")
            
    except Exception as e:
        print(f"Error during BLE scan: {e}")
        scanner_state.error_message = str(e)

def sync_worker(config: Dict[str, Any]) -> None:
    """Background worker to sync records to backend."""
    while True:
        try:
            if scanner_state.is_scanning and scanner_state.selected_event_id:
                # Get pending records
                records = read_jsonl(config.get("log_path", "./attendance_log.jsonl"))
                
                if records:
                    # Sync to backend
                    result = sync_records_to_backend(
                        config.get("backend_base_url", ""),
                        config.get("api_key", ""),
                        records
                    )
                    
                    if result["success"]:
                        scanner_state.records_synced += result["successful"]
                        scanner_state.last_sync_time = int(time.time())
                        print(f"Synced {result['successful']} records to backend")
                        
                        # Clear synced records (keep last 100 for safety)
                        if result["successful"] > 0:
                            all_records = read_jsonl(config.get("log_path", "./attendance_log.jsonl"))
                            if len(all_records) > 100:
                                keep_records = all_records[-100:]
                                with open(config.get("log_path", "./attendance_log.jsonl"), "w") as f:
                                    for record in keep_records:
                                        f.write(json.dumps(record, separators=(",", ":")) + "\n")
                    else:
                        print(f"Sync failed: {result.get('error', 'Unknown error')}")
                        scanner_state.error_message = result.get('error', 'Unknown error')
            
            time.sleep(30)  # Sync every 30 seconds
            
        except Exception as e:
            print(f"Error in sync worker: {e}")
            scanner_state.error_message = str(e)
            time.sleep(60)  # Wait longer on error

def scanning_worker(config: Dict[str, Any]) -> None:
    """Background worker for BLE scanning."""
    recent_devices = set()
    
    while True:
        try:
            if scanner_state.is_scanning and scanner_state.selected_event_id:
                # Run BLE scan
                asyncio.run(scan_for_devices(config, recent_devices))
                
                # Clean old devices from recent set (older than 5 minutes)
                current_time = time.time()
                recent_devices = {uuid for uuid in recent_devices if current_time - time.time() < 300}
            
            time.sleep(config.get("scan_interval_seconds", 5))
            
        except Exception as e:
            print(f"Error in scanning worker: {e}")
            scanner_state.error_message = str(e)
            time.sleep(10)

# Flask routes
@app.route('/')
def dashboard():
    """Main dashboard page."""
    return render_template_string(DASHBOARD_TEMPLATE)

@app.route('/events')
def events():
    """Events page."""
    return render_template_string(EVENTS_TEMPLATE)

@app.route('/config')
def config_page():
    """Configuration page."""
    return render_template_string(CONFIG_TEMPLATE)

@app.route('/api/events')
def api_events():
    """API endpoint to get events."""
    try:
        config = load_config(CONFIG_PATH_DEFAULT)
        events = fetch_active_events(config.get("backend_base_url", ""), config.get("api_key", ""))
        return jsonify({
            "success": True,
            "events": events,
            "selectedEventId": scanner_state.selected_event_id,
            "selectedEventName": scanner_state.selected_event_name,
            "isEventActive": scanner_state.is_event_active,
            "isScanningForEvent": scanner_state.is_scanning
        })
    except Exception as e:
        return jsonify({"success": False, "error": str(e)})

@app.route('/api/event/select', methods=['POST'])
def api_event_select():
    """API endpoint to select an event."""
    try:
        data = request.get_json()
        event_id = data.get('eventId', '')
        event_name = data.get('eventName', '')
        
        if not event_id or not event_name:
            return jsonify({"success": False, "error": "Missing eventId or eventName"})
        
        scanner_state.selected_event_id = event_id
        scanner_state.selected_event_name = event_name
        scanner_state.is_event_active = False
        scanner_state.is_scanning = False
        
        print(f"Selected event: {event_name} (ID: {event_id})")
        return jsonify({"success": True, "message": f"Event selected: {event_name}"})
        
    except Exception as e:
        return jsonify({"success": False, "error": str(e)})

@app.route('/api/event/start', methods=['POST'])
def api_event_start():
    """API endpoint to start scanning."""
    try:
        if not scanner_state.selected_event_id:
            return jsonify({"success": False, "error": "No event selected"})
        
        scanner_state.is_scanning = True
        scanner_state.is_event_active = True
        
        print(f"Started scanning for event: {scanner_state.selected_event_name}")
        return jsonify({"success": True, "message": f"Started scanning for event: {scanner_state.selected_event_name}"})
        
    except Exception as e:
        return jsonify({"success": False, "error": str(e)})

@app.route('/api/event/stop', methods=['POST'])
def api_event_stop():
    """API endpoint to stop scanning."""
    try:
        if not scanner_state.is_scanning:
            return jsonify({"success": False, "error": "No event is currently being scanned"})
        
        scanner_state.is_scanning = False
        scanner_state.is_event_active = False
        
        print(f"Stopped scanning for event: {scanner_state.selected_event_name}")
        return jsonify({"success": True, "message": f"Stopped scanning for event: {scanner_state.selected_event_name}"})
        
    except Exception as e:
        return jsonify({"success": False, "error": str(e)})

@app.route('/api/dashboard')
def api_dashboard():
    """API endpoint for dashboard data."""
    return jsonify({
        "success": True,
        "totalScans": scanner_state.total_scans,
        "devicesFound": scanner_state.devices_found,
        "recordsLogged": scanner_state.records_logged,
        "recordsSynced": scanner_state.records_synced,
        "lastSyncTime": scanner_state.last_sync_time,
        "statusText": "Scanning Active" if scanner_state.is_scanning else "Idle",
        "statusClass": "status-active" if scanner_state.is_scanning else "status-idle",
        "errorMessage": scanner_state.error_message
    })

@app.route('/api/config', methods=['GET', 'POST'])
def api_config():
    """API endpoint for configuration."""
    try:
        if request.method == 'GET':
            config = load_config(CONFIG_PATH_DEFAULT)
            return jsonify({"success": True, "config": config})
        else:
            data = request.get_json()
            config = load_config(CONFIG_PATH_DEFAULT)
            config.update(data)
            save_config(CONFIG_PATH_DEFAULT, config)
            return jsonify({"success": True, "message": "Configuration updated"})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)})

# HTML Templates
DASHBOARD_TEMPLATE = """
<!DOCTYPE html>
<html>
<head>
    <title>Python Scanner Dashboard</title>
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; background: #f5f5f5; }
        .container { max-width: 800px; margin: 0 auto; background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .header { text-align: center; margin-bottom: 30px; }
        .nav { margin-bottom: 20px; }
        .nav a { padding: 8px 16px; background: #6c757d; color: white; text-decoration: none; border-radius: 4px; margin-right: 10px; }
        .status { padding: 10px; border-radius: 4px; margin: 10px 0; font-weight: bold; }
        .status-active { background: #d4edda; color: #155724; }
        .status-idle { background: #f8d7da; color: #721c24; }
        .stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 20px; margin: 20px 0; }
        .stat { text-align: center; padding: 15px; background: #f8f9fa; border-radius: 8px; }
        .stat-value { font-size: 24px; font-weight: bold; color: #007bff; }
        .stat-label { color: #666; margin-top: 5px; }
        .event-status { margin: 20px 0; padding: 15px; background: #f8f9fa; border-radius: 8px; border-left: 4px solid #007bff; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🐍 Python Scanner Dashboard</h1>
            <p>Interactive Event-Based Attendance Tracking</p>
        </div>
        
        <div class="nav">
            <a href="/">Dashboard</a>
            <a href="/events">Events</a>
            <a href="/config">Configuration</a>
        </div>
        
        <div id="status" class="status">Loading...</div>
        
        <div id="eventStatus" class="event-status">
            <h3 style="margin: 0 0 10px 0; color: #333;">Event Status</h3>
            <div id="eventInfo">Loading event information...</div>
        </div>
        
        <div class="stats">
            <div class="stat">
                <div class="stat-value" id="totalScans">-</div>
                <div class="stat-label">Total Scans</div>
            </div>
            <div class="stat">
                <div class="stat-value" id="devicesFound">-</div>
                <div class="stat-label">Devices Found</div>
            </div>
            <div class="stat">
                <div class="stat-value" id="recordsLogged">-</div>
                <div class="stat-label">Records Logged</div>
            </div>
            <div class="stat">
                <div class="stat-value" id="recordsSynced">-</div>
                <div class="stat-label">Records Synced</div>
            </div>
        </div>
    </div>
    
    <script>
        function updateDashboard() {
            fetch('/api/dashboard')
                .then(response => response.json())
                .then(data => {
                    document.getElementById('totalScans').textContent = data.totalScans;
                    document.getElementById('devicesFound').textContent = data.devicesFound;
                    document.getElementById('recordsLogged').textContent = data.recordsLogged;
                    document.getElementById('recordsSynced').textContent = data.recordsSynced;
                    
                    const statusEl = document.getElementById('status');
                    statusEl.textContent = data.statusText;
                    statusEl.className = 'status ' + data.statusClass;
                })
                .catch(error => console.error('Error:', error));
        }
        
        function updateEventStatus() {
            fetch('/api/events')
                .then(response => response.json())
                .then(data => {
                    const eventInfo = document.getElementById('eventInfo');
                    if (data.selectedEventId) {
                        eventInfo.innerHTML = `
                            <div style="margin-bottom: 10px;">
                                <strong>Selected Event:</strong> ${data.selectedEventName} (${data.selectedEventId})
                            </div>
                            <div style="margin-bottom: 10px;">
                                <strong>Status:</strong> 
                                <span style="color: ${data.isScanningForEvent ? '#28a745' : '#6c757d'};">
                                    ${data.isScanningForEvent ? 'Scanning Active' : 'Not Scanning'}
                                </span>
                            </div>
                            <div>
                                <a href="/events" style="color: #007bff; text-decoration: none;">Manage Events →</a>
                            </div>
                        `;
                    } else {
                        eventInfo.innerHTML = `
                            <div style="margin-bottom: 10px; color: #6c757d;">
                                No event selected
                            </div>
                            <div>
                                <a href="/events" style="color: #007bff; text-decoration: none;">Select Event →</a>
                            </div>
                        `;
                    }
                })
                .catch(error => {
                    document.getElementById('eventInfo').innerHTML = 'Error loading event status';
                    console.error('Error:', error);
                });
        }
        
        updateDashboard();
        updateEventStatus();
        setInterval(updateDashboard, 5000);
        setInterval(updateEventStatus, 10000);
    </script>
</body>
</html>
"""

EVENTS_TEMPLATE = """
<!DOCTYPE html>
<html>
<head>
    <title>Events - Python Scanner</title>
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; background: #f5f5f5; }
        .container { max-width: 800px; margin: 0 auto; background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .header { text-align: center; margin-bottom: 30px; }
        .event-card { border: 1px solid #ddd; border-radius: 8px; padding: 20px; margin: 15px 0; background: #fafafa; }
        .event-name { font-size: 18px; font-weight: bold; color: #333; margin-bottom: 10px; }
        .event-info { color: #666; margin: 5px 0; }
        .btn { background: #007bff; color: white; padding: 10px 20px; border: none; border-radius: 4px; cursor: pointer; margin: 5px; }
        .btn:hover { background: #0056b3; }
        .btn-success { background: #28a745; }
        .btn-danger { background: #dc3545; }
        .status { padding: 5px 10px; border-radius: 4px; font-size: 12px; font-weight: bold; }
        .status-active { background: #d4edda; color: #155724; }
        .status-inactive { background: #f8d7da; color: #721c24; }
        .selected-event { background: #e7f3ff; border-color: #007bff; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>📅 Available Events</h1>
            <p>Select an event to begin attendance tracking</p>
        </div>
        
        <div id="eventsList">
            <div class="event-card">
                <p>Loading events...</p>
            </div>
        </div>
        
        <div style="text-align: center; margin-top: 30px;">
            <a href="/" class="btn">Back to Dashboard</a>
        </div>
    </div>
    
    <script>
        function loadEvents() {
            fetch('/api/events')
                .then(response => response.json())
                .then(data => {
                    const eventsList = document.getElementById('eventsList');
                    
                    if (data.success && data.events.length > 0) {
                        let html = '';
                        data.events.forEach(event => {
                            const startTime = event.startTime ? new Date(event.startTime).toLocaleString() : 'TBD';
                            const endTime = event.endTime ? new Date(event.endTime).toLocaleString() : 'TBD';
                            const isActive = event.isActive;
                            
                            let cardClass = 'event-card';
                            if (event.id === data.selectedEventId) {
                                cardClass += ' selected-event';
                            }
                            
                            html += `
                                <div class="${cardClass}">
                                    <div class="event-name">${event.name}</div>
                                    <div class="event-info">Event ID: ${event.id}</div>
                                    <div class="event-info">Start: ${startTime}</div>
                                    <div class="event-info">End: ${endTime}</div>
                                    <div class="event-info">Status: <span class="status ${isActive ? 'status-active' : 'status-inactive'}">${isActive ? 'Active' : 'Inactive'}</span></div>
                            `;
                            
                            if (event.id === data.selectedEventId) {
                                if (data.isScanningForEvent) {
                                    html += `<button class="btn btn-danger" onclick="stopEvent()">Stop Scanning</button>`;
                                } else {
                                    html += `<button class="btn btn-success" onclick="startEvent()">Start Scanning</button>`;
                                }
                            } else {
                                html += `<button class="btn" onclick="selectEvent('${event.id}', '${event.name}')">Select Event</button>`;
                            }
                            
                            html += '</div>';
                        });
                        
                        eventsList.innerHTML = html;
                    } else {
                        eventsList.innerHTML = '<div class="event-card"><p>No events available. Please check your backend connection.</p></div>';
                    }
                })
                .catch(error => {
                    document.getElementById('eventsList').innerHTML = '<div class="event-card"><p>Error loading events: ' + error.message + '</p></div>';
                });
        }
        
        function selectEvent(eventId, eventName) {
            fetch('/api/event/select', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ eventId: eventId, eventName: eventName })
            }).then(() => loadEvents());
        }
        
        function startEvent() {
            fetch('/api/event/start', { method: 'POST' }).then(() => loadEvents());
        }
        
        function stopEvent() {
            fetch('/api/event/stop', { method: 'POST' }).then(() => loadEvents());
        }
        
        loadEvents();
        setInterval(loadEvents, 10000);
    </script>
</body>
</html>
"""

CONFIG_TEMPLATE = """
<!DOCTYPE html>
<html>
<head>
    <title>Configuration - Python Scanner</title>
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; background: #f5f5f5; }
        .container { max-width: 600px; margin: 0 auto; background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .form-group { margin-bottom: 15px; }
        label { display: block; margin-bottom: 5px; font-weight: bold; }
        input, select { width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px; box-sizing: border-box; }
        button { background: #007bff; color: white; padding: 10px 20px; border: none; border-radius: 4px; cursor: pointer; }
        button:hover { background: #0056b3; }
        .nav { margin-bottom: 20px; }
        .nav a { padding: 8px 16px; background: #6c757d; color: white; text-decoration: none; border-radius: 4px; margin-right: 10px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="nav">
            <a href="/">Dashboard</a>
            <a href="/events">Events</a>
            <a href="/config">Configuration</a>
        </div>
        
        <h2>Configuration</h2>
        
        <form id="configForm">
            <div class="form-group">
                <label for="backend_base_url">Backend URL:</label>
                <input type="url" id="backend_base_url" name="backend_base_url" required>
            </div>
            
            <div class="form-group">
                <label for="api_key">API Key:</label>
                <input type="text" id="api_key" name="api_key" required>
            </div>
            
            <div class="form-group">
                <label for="scanner_id">Scanner ID:</label>
                <input type="text" id="scanner_id" name="scanner_id" required>
            </div>
            
            <div class="form-group">
                <label for="uuid_prefix">UUID Prefix (optional):</label>
                <input type="text" id="uuid_prefix" name="uuid_prefix">
            </div>
            
            <div class="form-group">
                <label for="scan_interval_seconds">Scan Interval (seconds):</label>
                <input type="number" id="scan_interval_seconds" name="scan_interval_seconds" min="1" max="60" value="5">
            </div>
            
            <button type="submit">Save Configuration</button>
        </form>
    </div>
    
    <script>
        function loadConfig() {
            fetch('/api/config')
                .then(response => response.json())
                .then(data => {
                    if (data.success) {
                        const config = data.config;
                        document.getElementById('backend_base_url').value = config.backend_base_url || '';
                        document.getElementById('api_key').value = config.api_key || '';
                        document.getElementById('scanner_id').value = config.scanner_id || '';
                        document.getElementById('uuid_prefix').value = config.uuid_prefix || '';
                        document.getElementById('scan_interval_seconds').value = config.scan_interval_seconds || 5;
                    }
                })
                .catch(error => console.error('Error loading config:', error));
        }
        
        document.getElementById('configForm').addEventListener('submit', function(e) {
            e.preventDefault();
            
            const formData = new FormData(e.target);
            const config = Object.fromEntries(formData.entries());
            
            fetch('/api/config', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(config)
            })
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    alert('Configuration saved successfully!');
                } else {
                    alert('Error saving configuration: ' + data.error);
                }
            })
            .catch(error => {
                alert('Error saving configuration: ' + error.message);
            });
        });
        
        loadConfig();
    </script>
</body>
</html>
"""

@click.command()
@click.option('--config', 'config_path', default=CONFIG_PATH_DEFAULT, help='Path to config.json')
@click.option('--port', default=5000, help='Web server port')
@click.option('--host', default='0.0.0.0', help='Web server host')
def main(config_path: str, port: int, host: str):
    """Start the interactive web-based scanner."""
    try:
        # Load configuration
        config = load_config(config_path)
        
        # Start background workers
        scanning_thread = threading.Thread(target=scanning_worker, args=(config,), daemon=True)
        sync_thread = threading.Thread(target=sync_worker, args=(config,), daemon=True)
        
        scanning_thread.start()
        sync_thread.start()
        
        print(f"🐍 Python Scanner started!")
        print(f"📱 Web interface: http://{host}:{port}")
        print(f"📅 Events page: http://{host}:{port}/events")
        print(f"⚙️  Configuration: http://{host}:{port}/config")
        print("\nPress Ctrl+C to stop")
        
        # Start Flask app
        app.run(host=host, port=port, debug=False, use_reloader=False)
        
    except KeyboardInterrupt:
        print("\n👋 Scanner stopped")
    except Exception as e:
        print(f"❌ Error: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()
