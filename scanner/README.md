# Scanner (Interactive BLE Attendance Tracker)

An enhanced Python scanner that provides interactive event management and Bluetooth Low Energy (BLE) scanning for automated attendance tracking.

## Features

- **🌐 Web Interface**: Modern web-based interface for easy management
- **📅 Interactive Event Selection**: Fetch and select from active events via web UI
- **🔍 Bluetooth Scanning**: Scans for BLE devices and logs unique sightings
- **⚡ Real-time Management**: Start/stop events remotely with live updates
- **💾 Offline-First Logging**: Logs unique sightings to a local JSONL file while offline
- **🔄 Batch Sync**: Syncs all records to the backend `/batch-checkin` endpoint
- **🚫 Deduplication**: Prevents duplicate logging within time windows
- **📱 Mobile-Friendly**: Responsive design that works on all devices

## Requirements

- Python 3.10+
- Packages in `requirements.txt`

## Install

```bash
cd scanner
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

## Configure

Copy `config.example.json` to `config.json` and fill values:

```json
{
  "backend_base_url": "http://127.0.0.1:3210/http",
  "api_key": "REPLACE_WITH_SCANNER_API_KEY",
  "scanner_id": "Entrance-Scanner-01",
  "event_id": "EVENT_ID_FROM_CONVEX",
  "log_path": "./attendance_log.jsonl",
  "uuid_prefix": "", 
  "scan_interval_seconds": 5
}
```

Notes:
- `uuid_prefix` can be used to filter devices by advertised name/UUID prefix if needed.
- `event_id` must be a valid Convex `events` document id string.

## Usage

### Web Interface (Recommended)
```bash
# Start the web-based scanner
python web_scanner.py

# Or use the quick launcher
python start_web_scanner.py

# Custom host/port
python web_scanner.py --host 0.0.0.0 --port 8080
```

The web interface provides:
- **Dashboard**: Real-time statistics and event status
- **Events Page**: Select and manage events
- **Configuration**: Update scanner settings
- **Mobile-friendly**: Works on phones and tablets

Access the interface at `http://localhost:5000` (or your configured host/port)

### Interactive Scanning (CLI)
```bash
# Interactive mode: fetch events, select one, and start scanning
python scanner.py interactive-scan

# Interactive mode with time limit
python scanner.py interactive-scan --duration 300  # 5 minutes
```

### Traditional Scanning
```bash
# Scan for devices (requires event_id in config)
python scanner.py scan --duration 60  # Scan for 60 seconds
python scanner.py scan  # Scan indefinitely
```

### Event Management
```bash
# List all active events
python scanner.py list-events

# Start an event
python scanner.py event-control <event-id> start

# Stop an event
python scanner.py event-control <event-id> stop
```

### Sync logs to backend
```bash
python scanner.py sync
python scanner.py sync --clear  # Clear local log after successful sync
```

## Workflow

### Web Interface Workflow
1. **Start the scanner**: `python web_scanner.py`
2. **Open web interface**: Navigate to `http://localhost:5000`
3. **Select an event**: Go to Events page and choose an event
4. **Start scanning**: Click "Start Scanning" for the selected event
5. **Monitor progress**: Watch real-time statistics on the dashboard
6. **Stop when done**: Click "Stop Scanning" or select a different event
7. **Auto-sync**: Data automatically syncs to the backend every 30 seconds

### CLI Workflow
1. **Start the scanner**: `python scanner.py interactive-scan`
2. **Select an event**: Choose from the list of active events
3. **Begin scanning**: The scanner will start detecting BLE devices
4. **Monitor progress**: See real-time device detection and logging
5. **Stop when done**: Press Ctrl+C to stop scanning
6. **Sync data**: Upload logs to the backend with `python scanner.py sync`

## How it works

### Interactive Mode
1. Fetches active events from `{backend_base_url}/active-events`
2. Displays a menu for event selection
3. Starts scanning for BLE devices with the selected event ID
4. Logs unique device sightings to JSONL format
5. Provides real-time feedback on scanning progress

### Traditional Mode
1. Uses pre-configured `event_id` from config
2. Discovers BLE devices and extracts/filters for `bleUuid`
3. Writes attendance records to JSONL

### Log Format
Each log entry contains:
```json
{"bleUuid": "...", "timestamp": 1721471400000, "eventId": "...", "scannerSource": "..."}
```

### Sync Process
1. `sync` mode reads all lines from JSONL
2. Groups into `records` array
3. POSTs to `{backend_base_url}/batch-checkin` with header `x-api-key`
4. Backend validates the key and records attendance via `internal.attendance.batchRecordAttendance`

## Backend Integration

The scanner integrates with the backend through these endpoints:
- `GET /active-events` - Fetch active events
- `POST /event-control` - Start/stop events  
- `POST /batch-checkin` - Upload attendance logs



