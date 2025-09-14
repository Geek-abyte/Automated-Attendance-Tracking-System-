#!/usr/bin/env python3
import asyncio
import json
import os
import sys
import time
from datetime import datetime
from typing import Dict, Any, List, Set, Optional

import click
import requests

try:
    from bleak import BleakScanner
except Exception:
    BleakScanner = None  # Allows running sync without BLE deps on headless systems

CONFIG_PATH_DEFAULT = os.path.join(os.path.dirname(__file__), "config.json")


def load_config(config_path: str) -> Dict[str, Any]:
    if not os.path.exists(config_path):
        raise FileNotFoundError(f"Config not found at {config_path}. Copy config.example.json to config.json and edit values.")
    with open(config_path, "r", encoding="utf-8") as f:
        return json.load(f)


def append_jsonl(path: str, obj: Dict[str, Any]) -> None:
    os.makedirs(os.path.dirname(path) or ".", exist_ok=True)
    with open(path, "a", encoding="utf-8") as f:
        f.write(json.dumps(obj, separators=(",", ":")) + "\n")


def read_jsonl(path: str) -> List[Dict[str, Any]]:
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


def clear_file(path: str) -> None:
    if os.path.exists(path):
        os.remove(path)


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
            click.echo(f"Failed to fetch events: {response.status_code} {response.text}")
            return []
    except requests.RequestException as e:
        click.echo(f"Error fetching events: {e}")
        return []


def fetch_event_registrations(base_url: str, api_key: str, event_id: str) -> Set[str]:
    """Fetch registered BLE UUIDs for a specific event."""
    # Note: This would need a new endpoint in the backend
    # For now, we'll return an empty set and rely on the existing logic
    # In a full implementation, you'd add an endpoint like /event-registrations/{event_id}
    return set()


def display_events_menu(events: List[Dict[str, Any]]) -> Optional[str]:
    """Display events menu and return selected event ID."""
    if not events:
        click.echo("No active events found.")
        return None
    
    click.echo("\n=== Active Events ===")
    for i, event in enumerate(events, 1):
        start_time = datetime.fromtimestamp(event.get("startTime", 0) / 1000).strftime("%Y-%m-%d %H:%M") if event.get("startTime") else "Not set"
        end_time = datetime.fromtimestamp(event.get("endTime", 0) / 1000).strftime("%Y-%m-%d %H:%M") if event.get("endTime") else "Not set"
        status = "Active" if event.get("isActive") else "Inactive"
        
        click.echo(f"{i}. {event['name']} ({status})")
        click.echo(f"   Start: {start_time}, End: {end_time}")
        click.echo(f"   ID: {event['id']}")
        click.echo()
    
    while True:
        try:
            choice = click.prompt("Select an event (number) or 'q' to quit", type=str)
            if choice.lower() == 'q':
                return None
            
            choice_num = int(choice)
            if 1 <= choice_num <= len(events):
                selected_event = events[choice_num - 1]
                click.echo(f"Selected: {selected_event['name']}")
                return selected_event['id']
            else:
                click.echo("Invalid choice. Please try again.")
        except ValueError:
            click.echo("Invalid input. Please enter a number or 'q'.")
        except KeyboardInterrupt:
            click.echo("\nExiting...")
            return None


@click.group()
@click.option("--config", "config_path", default=CONFIG_PATH_DEFAULT, help="Path to config.json")
@click.pass_context
def cli(ctx, config_path):
    """Scanner CLI: Interactive event selection and Bluetooth scanning for attendance tracking."""
    ctx.ensure_object(dict)
    ctx.obj["config_path"] = config_path
    ctx.obj["config"] = load_config(config_path)


@cli.command()
@click.option("--duration", default=0, type=int, help="Scan duration in seconds (0 = infinite)")
@click.pass_context
def scan(ctx, duration: int):
    """Scan for BLE devices and append unique sightings to JSONL."""
    if BleakScanner is None:
        click.echo("Bleak is not available. Install requirements or run on a BLE-capable system.")
        sys.exit(1)

    cfg = ctx.obj["config"]
    log_path = cfg.get("log_path", "./attendance_log.jsonl")
    scanner_id = cfg.get("scanner_id", "Scanner-01")
    event_id = cfg.get("event_id")
    uuid_prefix = cfg.get("uuid_prefix", "")
    interval = int(cfg.get("scan_interval_seconds", 5))

    if not event_id:
        click.echo("event_id missing in config.json")
        sys.exit(1)

    seen_in_window: Set[str] = set()
    window_reset_at = time.time() + 300  # 5 minutes

    async def run_scan():
        nonlocal seen_in_window, window_reset_at
        start_time = time.time()
        while True:
            if duration and (time.time() - start_time) >= duration:
                break

            devices = await BleakScanner.discover(timeout=interval)
            now_ms = int(time.time() * 1000)

            # Simple heuristic: use device.name as bleUuid when matching prefix, else skip
            for d in devices:
                candidate = (d.name or "").strip()
                if uuid_prefix and not candidate.startswith(uuid_prefix):
                    continue
                if not candidate:
                    continue

                ble_uuid = candidate
                if ble_uuid in seen_in_window:
                    continue

                seen_in_window.add(ble_uuid)
                append_jsonl(log_path, {
                    "bleUuid": ble_uuid,
                    "timestamp": now_ms,
                    "eventId": event_id,
                    "scannerSource": scanner_id,
                })
                click.echo(f"Logged {ble_uuid} at {datetime.now().isoformat(timespec='seconds')}")

            # Periodically reset dedupe window
            if time.time() >= window_reset_at:
                seen_in_window.clear()
                window_reset_at = time.time() + 300

    asyncio.run(run_scan())


@cli.command()
@click.option("--duration", default=0, type=int, help="Scan duration in seconds (0 = infinite)")
@click.pass_context
def interactive_scan(ctx, duration: int):
    """Interactive scanner: fetch events, select one, and start scanning."""
    if BleakScanner is None:
        click.echo("Bleak is not available. Install requirements or run on a BLE-capable system.")
        sys.exit(1)

    cfg = ctx.obj["config"]
    base_url = cfg.get("backend_base_url")
    api_key = cfg.get("api_key")
    
    if not base_url or not api_key:
        click.echo("backend_base_url or api_key missing in config.json")
        sys.exit(1)

    # Fetch active events
    click.echo("Fetching active events...")
    events = fetch_active_events(base_url, api_key)
    
    # Display events menu and get selection
    selected_event_id = display_events_menu(events)
    if not selected_event_id:
        click.echo("No event selected. Exiting.")
        return

    # Update config with selected event
    cfg["event_id"] = selected_event_id
    
    # Find the selected event details
    selected_event = next((e for e in events if e["id"] == selected_event_id), None)
    if not selected_event:
        click.echo("Selected event not found. Exiting.")
        return

    click.echo(f"\nStarting scanner for event: {selected_event['name']}")
    click.echo("Press Ctrl+C to stop scanning...")
    
    # Start scanning
    log_path = cfg.get("log_path", "./attendance_log.jsonl")
    scanner_id = cfg.get("scanner_id", "Scanner-01")
    uuid_prefix = cfg.get("uuid_prefix", "")
    interval = int(cfg.get("scan_interval_seconds", 5))

    seen_in_window: Set[str] = set()
    window_reset_at = time.time() + 300  # 5 minutes

    async def run_scan():
        nonlocal seen_in_window, window_reset_at
        start_time = time.time()
        scan_count = 0
        
        while True:
            if duration and (time.time() - start_time) >= duration:
                break

            scan_count += 1
            click.echo(f"Scan #{scan_count} - Discovering devices...")
            
            devices = await BleakScanner.discover(timeout=interval)
            now_ms = int(time.time() * 1000)
            devices_found = 0

            # Filter devices by prefix if specified
            for d in devices:
                candidate = (d.name or "").strip()
                if uuid_prefix and not candidate.startswith(uuid_prefix):
                    continue
                if not candidate:
                    continue

                ble_uuid = candidate
                if ble_uuid in seen_in_window:
                    continue

                seen_in_window.add(ble_uuid)
                devices_found += 1
                
                # Log the device detection
                append_jsonl(log_path, {
                    "bleUuid": ble_uuid,
                    "timestamp": now_ms,
                    "eventId": selected_event_id,
                    "scannerSource": scanner_id,
                })
                click.echo(f"  ✓ Logged {ble_uuid} at {datetime.now().isoformat(timespec='seconds')}")

            click.echo(f"  Found {devices_found} new devices in this scan")

            # Periodically reset dedupe window
            if time.time() >= window_reset_at:
                seen_in_window.clear()
                window_reset_at = time.time() + 300
                click.echo("  Reset deduplication window")

    try:
        asyncio.run(run_scan())
    except KeyboardInterrupt:
        click.echo("\n\nScanning stopped by user.")
        click.echo(f"Total devices logged: {len(seen_in_window)}")
        click.echo(f"Log file: {log_path}")


@cli.command()
@click.argument("event_id")
@click.argument("action", type=click.Choice(["start", "stop"]))
@click.pass_context
def event_control(ctx, event_id: str, action: str):
    """Start or stop an event (activate/deactivate)."""
    cfg = ctx.obj["config"]
    base_url = cfg.get("backend_base_url")
    api_key = cfg.get("api_key")
    
    if not base_url or not api_key:
        click.echo("backend_base_url or api_key missing in config.json")
        sys.exit(1)

    url = base_url.rstrip("/") + "/event-control"
    try:
        response = requests.post(
            url,
            headers={
                "Content-Type": "application/json",
                "x-api-key": api_key,
            },
            data=json.dumps({
                "eventId": event_id,
                "action": action,
            }),
            timeout=10,
        )
        
        if response.status_code == 200:
            data = response.json()
            click.echo(f"✓ Event {action}ped successfully")
            click.echo(f"Event: {data.get('event', {}).get('name', 'Unknown')}")
            click.echo(f"Status: {'Active' if data.get('event', {}).get('isActive') else 'Inactive'}")
        else:
            click.echo(f"Failed to {action} event: {response.status_code} {response.text}")
            sys.exit(1)
            
    except requests.RequestException as e:
        click.echo(f"Error controlling event: {e}")
        sys.exit(1)


@cli.command()
@click.pass_context
def list_events(ctx):
    """List all active events from the backend."""
    cfg = ctx.obj["config"]
    base_url = cfg.get("backend_base_url")
    api_key = cfg.get("api_key")
    
    if not base_url or not api_key:
        click.echo("backend_base_url or api_key missing in config.json")
        sys.exit(1)

    events = fetch_active_events(base_url, api_key)
    if not events:
        click.echo("No active events found.")
        return
    
    click.echo("\n=== Active Events ===")
    for event in events:
        start_time = datetime.fromtimestamp(event.get("startTime", 0) / 1000).strftime("%Y-%m-%d %H:%M") if event.get("startTime") else "Not set"
        end_time = datetime.fromtimestamp(event.get("endTime", 0) / 1000).strftime("%Y-%m-%d %H:%M") if event.get("endTime") else "Not set"
        status = "Active" if event.get("isActive") else "Inactive"
        
        click.echo(f"• {event['name']} ({status})")
        click.echo(f"  Start: {start_time}, End: {end_time}")
        click.echo(f"  ID: {event['id']}")
        click.echo()


@cli.command()
@click.option("--clear", is_flag=True, help="Clear local log if sync succeeds")
@click.pass_context
def sync(ctx, clear: bool):
    """Upload JSONL records to backend batch endpoint."""
    cfg = ctx.obj["config"]
    log_path = cfg.get("log_path", "./attendance_log.jsonl")
    base_url = cfg.get("backend_base_url")
    api_key = cfg.get("api_key")

    if not base_url or not api_key:
        click.echo("backend_base_url or api_key missing in config.json")
        sys.exit(1)

    records = read_jsonl(log_path)
    if not records:
        click.echo("No records to sync.")
        return

    url = base_url.rstrip("/") + "/batch-checkin"
    try:
        resp = requests.post(
            url,
            headers={
                "Content-Type": "application/json",
                "x-api-key": api_key,
            },
            data=json.dumps({"records": records}),
            timeout=30,
        )
        if resp.status_code == 200:
            result = resp.json()
            click.echo(f"Synced: processed={result.get('processed')} success={result.get('successful')} duplicates={result.get('duplicates')} errors={result.get('errors')}")
            if clear:
                clear_file(log_path)
                click.echo("Cleared local log.")
        else:
            click.echo(f"Sync failed: {resp.status_code} {resp.text}")
            sys.exit(1)
    except requests.RequestException as e:
        click.echo(f"Sync error: {e}")
        sys.exit(1)


if __name__ == "__main__":
    cli()

