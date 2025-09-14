#!/usr/bin/env python3
"""
Quick launcher for the web-based Python scanner
"""

import sys
import os
import subprocess

def main():
    """Launch the web scanner with proper setup."""
    print("🐍 Starting Python Web Scanner...")
    
    # Check if we're in the right directory
    if not os.path.exists("web_scanner.py"):
        print("❌ Error: web_scanner.py not found. Please run from the scanner directory.")
        sys.exit(1)
    
    # Check if config exists
    if not os.path.exists("config.json"):
        if os.path.exists("config.example.json"):
            print("📋 Creating config.json from example...")
            subprocess.run(["cp", "config.example.json", "config.json"])
        else:
            print("❌ Error: No config.json found. Please create one.")
            sys.exit(1)
    
    # Install requirements if needed
    try:
        import flask
        import bleak
        import click
        import requests
    except ImportError:
        print("📦 Installing requirements...")
        subprocess.run([sys.executable, "-m", "pip", "install", "-r", "requirements.txt"])
    
    # Start the web scanner
    print("🚀 Launching web interface...")
    subprocess.run([sys.executable, "web_scanner.py"])

if __name__ == "__main__":
    main()
