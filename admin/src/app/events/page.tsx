"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import Link from "next/link";
import { format } from "date-fns";
import { useState } from "react";

type EventItem = {
  _id: string;
  name?: string;
  location?: string;
  startTime?: number;
  endTime?: number;
  isActive?: boolean;
};

export default function EventsPage() {
  const events = (useQuery(api.events.listEvents, {}) || []) as EventItem[];
  const setEventActive = useMutation(api.events.setEventActive);
  const [loading, setLoading] = useState<string | null>(null);

  // Add error boundary for events data
  if (!Array.isArray(events)) {
    console.error("Events data is not an array:", events);
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-red-600">Error Loading Events</h2>
          <p className="text-gray-600 mt-2">There was an error loading the events data.</p>
        </div>
      </div>
    );
  }

  const handleToggleActive = async (eventId: string, isActive: boolean) => {
    setLoading(eventId);
    try {
      await setEventActive({ eventId, isActive: !isActive });
    } catch (error) {
      console.error("Failed to toggle event status:", error);
    } finally {
      setLoading(null);
    }
  };

  const renderTime = (event: EventItem) => {
    const hasStart = typeof event.startTime === "number" && !isNaN(event.startTime);
    const hasEnd = typeof event.endTime === "number" && !isNaN(event.endTime);
    
    if (!hasStart && !hasEnd) return <span className="text-gray-400">Scanner-controlled</span>;
    
    const formatDate = (timestamp?: number) => {
      try {
        if (typeof timestamp !== "number") return null;
        const date = new Date(timestamp);
        if (isNaN(date.getTime())) return "Invalid Date";
        return date;
      } catch (error) {
        console.error("Error formatting date:", error);
        return null;
      }
    };
    
    return (
      <>
        <div className="text-sm text-gray-900">
          {hasStart ? (() => {
            const date = formatDate(event.startTime);
            return date ? format(date, "MMM dd, yyyy") : "Invalid Date";
          })() : "—"}
        </div>
        <div className="text-sm text-gray-500">
          {hasStart ? (() => {
            const date = formatDate(event.startTime);
            return date ? format(date, "HH:mm") : "Invalid Time";
          })() : "—"} - {hasEnd ? (() => {
            const date = formatDate(event.endTime);
            return date ? format(date, "HH:mm") : "Invalid Time";
          })() : "—"}
        </div>
      </>
    );
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
              <h1 className="text-xl font-semibold text-gray-900">Events</h1>
            </div>
            <Link
              href="/events/new"
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium"
            >
              Create Event
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Events List */}
        <div className="bg-white shadow rounded-lg">
          <div className="p-6 border-b">
            <h2 className="text-lg font-medium text-gray-900">All Events</h2>
            <p className="text-sm text-gray-600 mt-1">
              Manage your attendance tracking events
            </p>
          </div>
          
          {events.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Event
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date & Time
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {events.map((event: EventItem) => {
                    // Safety check for event data
                    if (!event || typeof event !== 'object') {
                      console.warn("Invalid event data:", event);
                      return null;
                    }
                    
                    return (
                    <tr key={event._id || Math.random()} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <Link 
                            href={`/events/${event._id}`}
                            className="text-sm font-medium text-blue-600 hover:text-blue-900"
                          >
                            {event.name || 'Unnamed Event'}
                          </Link>
                          <div className="text-sm text-gray-500 mt-1">
                            {event.location || 'No location specified'}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {renderTime(event)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          event.isActive === true
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {event.isActive === true ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                        <button
                          onClick={() => handleToggleActive(event._id, !!event.isActive)}
                          disabled={loading === event._id}
                          className={`inline-flex items-center px-3 py-1 rounded text-sm ${
                            event.isActive === true
                              ? 'bg-red-100 text-red-800 hover:bg-red-200'
                              : 'bg-green-100 text-green-800 hover:bg-green-200'
                          } disabled:opacity-50`}
                        >
                          {loading === event._id ? 'Loading...' : (
                            event.isActive === true ? 'Deactivate' : 'Activate'
                          )}
                        </button>
                        <Link
                          href={`/events/${event._id}`}
                          className="inline-flex items-center px-3 py-1 bg-blue-100 text-blue-800 hover:bg-blue-200 rounded text-sm"
                        >
                          View Details
                        </Link>
                      </td>
                    </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-6 text-center">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3a4 4 0 118 0v4m-4 10a3 3 0 100-6 3 3 0 000 6z" />
              </svg>
              <h3 className="mt-2 text-sm font-medium text-gray-900">No events</h3>
              <p className="mt-1 text-sm text-gray-500">
                Get started by creating your first event.
              </p>
              <div className="mt-6">
                <Link
                  href="/events/new"
                  className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                >
                  Create Event
                </Link>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
