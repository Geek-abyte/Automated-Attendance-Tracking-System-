"use client";

import Link from "next/link";
import { useState } from "react";

export default function SettingsPage() {
  const [settings, setSettings] = useState({
    scannerRange: 10,
    attendanceTimeout: 30,
    autoSync: true,
    notifications: true,
    exportFormat: 'csv',
    timezone: 'UTC'
  });

  const handleSettingChange = (key: string, value: any) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const handleSaveSettings = () => {
    // TODO: Implement settings save to backend
    console.log('Saving settings:', settings);
    alert('Settings saved successfully!');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <Link 
                href="/" 
                className="text-blue-600 hover:text-blue-800 text-sm font-medium"
              >
                ← Dashboard
              </Link>
              <h1 className="text-xl font-semibold text-gray-900">Settings</h1>
            </div>
            <button 
              onClick={handleSaveSettings}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium"
            >
              Save Settings
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-8">
          {/* Scanner Settings */}
          <div className="bg-white shadow rounded-lg">
            <div className="p-6 border-b">
              <h2 className="text-lg font-medium text-gray-900">Scanner Configuration</h2>
              <p className="text-sm text-gray-600 mt-1">
                Configure Bluetooth scanner behavior and parameters
              </p>
            </div>
            <div className="p-6 space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Scanner Range (meters)
                </label>
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={settings.scannerRange}
                  onChange={(e) => handleSettingChange('scannerRange', parseInt(e.target.value))}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Maximum distance for Bluetooth device detection
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Attendance Timeout (minutes)
                </label>
                <input
                  type="number"
                  min="1"
                  max="120"
                  value={settings.attendanceTimeout}
                  onChange={(e) => handleSettingChange('attendanceTimeout', parseInt(e.target.value))}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Time before marking a user as absent after leaving range
                </p>
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  checked={settings.autoSync}
                  onChange={(e) => handleSettingChange('autoSync', e.target.checked)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label className="ml-2 block text-sm text-gray-900">
                  Auto-sync attendance data
                </label>
              </div>
            </div>
          </div>

          {/* System Settings */}
          <div className="bg-white shadow rounded-lg">
            <div className="p-6 border-b">
              <h2 className="text-lg font-medium text-gray-900">System Configuration</h2>
              <p className="text-sm text-gray-600 mt-1">
                General system preferences and behavior
              </p>
            </div>
            <div className="p-6 space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Export Format
                </label>
                <select
                  value={settings.exportFormat}
                  onChange={(e) => handleSettingChange('exportFormat', e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="csv">CSV</option>
                  <option value="excel">Excel (XLSX)</option>
                  <option value="json">JSON</option>
                  <option value="pdf">PDF</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Timezone
                </label>
                <select
                  value={settings.timezone}
                  onChange={(e) => handleSettingChange('timezone', e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="UTC">UTC</option>
                  <option value="America/New_York">Eastern Time</option>
                  <option value="America/Chicago">Central Time</option>
                  <option value="America/Denver">Mountain Time</option>
                  <option value="America/Los_Angeles">Pacific Time</option>
                </select>
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  checked={settings.notifications}
                  onChange={(e) => handleSettingChange('notifications', e.target.checked)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label className="ml-2 block text-sm text-gray-900">
                  Enable email notifications
                </label>
              </div>
            </div>
          </div>

          {/* API Configuration */}
          <div className="bg-white shadow rounded-lg">
            <div className="p-6 border-b">
              <h2 className="text-lg font-medium text-gray-900">API Configuration</h2>
              <p className="text-sm text-gray-600 mt-1">
                Manage API keys and external integrations
              </p>
            </div>
            <div className="p-6 space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Scanner API Key
                </label>
                <div className="flex space-x-2">
                  <input
                    type="password"
                    placeholder="••••••••••••••••"
                    className="flex-1 border border-gray-300 rounded-md px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    readOnly
                  />
                  <button className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-md text-sm font-medium">
                    Generate New
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  API key for scanner devices to authenticate with the system
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Webhook URL
                </label>
                <input
                  type="url"
                  placeholder="https://your-webhook-endpoint.com/attendance"
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Optional webhook for real-time attendance notifications
                </p>
              </div>
            </div>
          </div>

          {/* System Status */}
          <div className="bg-white shadow rounded-lg">
            <div className="p-6 border-b">
              <h2 className="text-lg font-medium text-gray-900">System Status</h2>
              <p className="text-sm text-gray-600 mt-1">
                Current system health and statistics
              </p>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <div className="flex items-center">
                    <div className="w-3 h-3 bg-green-400 rounded-full mr-3"></div>
                    <span className="text-sm font-medium text-gray-900">Database Connection</span>
                  </div>
                  <p className="text-xs text-gray-500 ml-6">Connected to Convex backend</p>
                </div>

                <div>
                  <div className="flex items-center">
                    <div className="w-3 h-3 bg-green-400 rounded-full mr-3"></div>
                    <span className="text-sm font-medium text-gray-900">API Server</span>
                  </div>
                  <p className="text-xs text-gray-500 ml-6">Running on port 3210</p>
                </div>

                <div>
                  <div className="flex items-center">
                    <div className="w-3 h-3 bg-yellow-400 rounded-full mr-3"></div>
                    <span className="text-sm font-medium text-gray-900">Scanner Devices</span>
                  </div>
                  <p className="text-xs text-gray-500 ml-6">0 devices connected</p>
                </div>

                <div>
                  <div className="flex items-center">
                    <div className="w-3 h-3 bg-green-400 rounded-full mr-3"></div>
                    <span className="text-sm font-medium text-gray-900">System Uptime</span>
                  </div>
                  <p className="text-xs text-gray-500 ml-6">Running smoothly</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
