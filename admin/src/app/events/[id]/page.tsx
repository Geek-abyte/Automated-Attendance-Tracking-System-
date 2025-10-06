"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { format } from "date-fns";
import { useState } from "react";

// Define types
type Event = {
  _id: string;
  _creationTime: number;
  name: string;
  description: string;
  date: string;
  startTime: string;
  endTime: string;
  location: string;
  isActive: boolean;
};

type User = {
  _id: string;
  name: string;
  email: string;
  bleUuid: string;
};

export default function EventDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const eventId = params.id as string;

  // Validate eventId format - Convex IDs have a specific format (start with j, k, or other letters followed by alphanumeric)
  const isValidId = eventId && typeof eventId === 'string' && eventId.length > 10 && /^[a-z][a-z0-9_]+$/i.test(eventId);

  const event = useQuery(
    api.events.getEvent, 
    isValidId ? { eventId: eventId as any } : "skip"
  ) as Event | undefined | null;
  
  const users = useQuery(api.users.listUsers, {}) as User[] | undefined;
  
  // Get attendance data with user details included
  const attendance = useQuery(
    api.attendance.getEventAttendance, 
    isValidId ? { eventId: eventId as any, includeUserDetails: true } : "skip"
  ) as any[] | undefined | null;
  
  // Get attendance summaries with percentages
  const attendanceSummaries = useQuery(
    api.attendance.getEventAttendanceSummaries, 
    isValidId ? { eventId: eventId as any } : "skip"
  ) as any[] | undefined | null;
  
  const setEventActive = useMutation(api.events.setEventActive);
  const deleteEvent = useMutation(api.events.deleteEvent);
  
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const handleToggleActive = async () => {
    if (!event) return;
    try {
      await setEventActive({ eventId: event._id, isActive: !event.isActive });
    } catch (error) {
      console.error("Failed to toggle event status:", error);
    }
  };

  const handleDelete = async () => {
    if (!event) return;
    setIsDeleting(true);
    try {
      await deleteEvent({ eventId: event._id });
      router.push("/events");
    } catch (error) {
      console.error("Failed to delete event:", error);
      setIsDeleting(false);
    }
  };

  // Handle invalid ID
  if (!isValidId) {
    return (
      <div className="min-h-screen bg-gray-50">
        <header className="bg-white shadow-sm border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              <div className="flex items-center space-x-4">
                <Link
                  href="/events"
                  className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                >
                  ← Events
                </Link>
                <h1 className="text-xl font-semibold text-gray-900">Invalid Event ID</h1>
              </div>
            </div>
          </div>
        </header>
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center">
            <p className="text-gray-600">The event ID in the URL is invalid.</p>
          </div>
        </main>
      </div>
    );
  }

  if (event === undefined) {
    return (
      <div className="min-h-screen bg-gray-50">
        <header className="bg-white shadow-sm border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              <div className="flex items-center space-x-4">
                <Link
                  href="/events"
                  className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                >
                  ← Events
                </Link>
                <h1 className="text-xl font-semibold text-gray-900">Loading...</h1>
              </div>
            </div>
          </div>
        </header>
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded mb-4"></div>
            <div className="h-32 bg-gray-200 rounded"></div>
          </div>
        </main>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="min-h-screen bg-gray-50">
        <header className="bg-white shadow-sm border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              <div className="flex items-center space-x-4">
                <Link
                  href="/events"
                  className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                >
                  ← Events
                </Link>
                <h1 className="text-xl font-semibold text-gray-900">Event Not Found</h1>
              </div>
            </div>
          </div>
        </header>
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center">
            <p className="text-gray-600">The requested event could not be found.</p>
          </div>
        </main>
      </div>
    );
  }

  // Calculate statistics from summaries, with fallback to raw attendance
  const rawUniqueUserCount = attendance ? new Set(attendance.map((r: any) => r.userId)).size : 0;
  const uniqueAttendees = (attendanceSummaries && attendanceSummaries.length > 0)
    ? attendanceSummaries.length
    : rawUniqueUserCount;
  const averageAttendancePercentage = (attendanceSummaries && attendanceSummaries.length > 0 && uniqueAttendees > 0)
    ? attendanceSummaries.reduce((sum: number, s: any) => sum + s.attendancePercentage, 0) / uniqueAttendees
    : 0;

  // Get unique users from attendance records (for backward compatibility)
  const uniqueUsers = attendance ? [...new Map(attendance.map((record: any) => [record.user?.name || record.userId, record])).values()] : [];
  const attendanceCount = uniqueUsers.length;

  // Build client-side summaries if server summaries are not available
  const clientSummaries = (() => {
    if (!attendance || attendance.length === 0) return [] as any[];
    const byUser = new Map<string, any>();
    for (const rec of attendance) {
      const key = String(rec.userId);
      const existing = byUser.get(key) || {
        userId: rec.userId,
        user: rec.user || null,
        totalScans: 0,
        presentScans: 0,
        firstSeen: undefined as number | undefined,
        lastSeen: undefined as number | undefined,
      };
      const ts = rec.scanTime ?? rec.timestamp ?? rec._creationTime;
      existing.totalScans += 1;
      existing.presentScans += rec.isPresent ? 1 : 0;
      existing.firstSeen = existing.firstSeen === undefined ? ts : Math.min(existing.firstSeen, ts);
      existing.lastSeen = existing.lastSeen === undefined ? ts : Math.max(existing.lastSeen, ts);
      byUser.set(key, existing);
    }
    return Array.from(byUser.values());
  })();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <Link
                href="/events"
                className="text-blue-600 hover:text-blue-800 text-sm font-medium"
              >
                ← Events
              </Link>
              <h1 className="text-xl font-semibold text-gray-900">{event.name}</h1>
              <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                event.isActive 
                  ? "bg-green-100 text-green-800" 
                  : "bg-gray-100 text-gray-800"
              }`}>
                {event.isActive ? "Active" : "Inactive"}
              </span>
            </div>
            <div className="flex space-x-3">
              <button
                onClick={handleToggleActive}
                className={`px-4 py-2 rounded-md text-sm font-medium ${
                  event.isActive
                    ? "bg-red-600 hover:bg-red-700 text-white"
                    : "bg-green-600 hover:bg-green-700 text-white"
                }`}
              >
                {event.isActive ? "Deactivate" : "Activate"}
              </button>
              <Link
                href={`/events/${eventId}/edit`}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium"
              >
                Edit Event
              </Link>
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md text-sm font-medium"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Event Details */}
          <div className="lg:col-span-2">
            <div className="bg-white shadow rounded-lg mb-8">
              <div className="p-6 border-b">
                <h2 className="text-lg font-medium text-gray-900">Event Details</h2>
              </div>
              <div className="p-6">
                <dl className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Event Name</dt>
                    <dd className="mt-1 text-sm text-gray-900">{event.name}</dd>
                  </div>
                  
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Location</dt>
                    <dd className="mt-1 text-sm text-gray-900">{event.location}</dd>
                  </div>
                  
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Date</dt>
                    <dd className="mt-1 text-sm text-gray-900">
                      {event.startTime 
                        ? format(new Date(event.startTime), "EEEE, MMMM dd, yyyy")
                        : "No date set"
                      }
                    </dd>
                  </div>
                  
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Time</dt>
                    <dd className="mt-1 text-sm text-gray-900">
                      {event.startTime && event.endTime
                        ? `${format(new Date(event.startTime), "h:mm a")} - ${format(new Date(event.endTime), "h:mm a")}`
                        : event.startTime
                        ? `${format(new Date(event.startTime), "h:mm a")} - No end time`
                        : "No time set"
                      }
                    </dd>
                  </div>
                  
                  <div className="sm:col-span-2">
                    <dt className="text-sm font-medium text-gray-500">Description</dt>
                    <dd className="mt-1 text-sm text-gray-900">{event.description}</dd>
                  </div>
                  
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Created</dt>
                    <dd className="mt-1 text-sm text-gray-900">
                      {event._creationTime 
                        ? format(new Date(event._creationTime), "MMM dd, yyyy 'at' h:mm a")
                        : "Unknown"
                      }
                    </dd>
                  </div>
                  
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Status</dt>
                    <dd className="mt-1">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                        event.isActive 
                          ? "bg-green-100 text-green-800" 
                          : "bg-gray-100 text-gray-800"
                      }`}>
                        {event.isActive ? "Active" : "Inactive"}
                      </span>
                    </dd>
                  </div>
                </dl>
              </div>
            </div>

            {/* Attendance List with Percentages */}
            <div className="bg-white shadow rounded-lg">
              <div className="p-6 border-b">
                <h2 className="text-lg font-medium text-gray-900">Attendance Records</h2>
                <p className="text-sm text-gray-600 mt-1">
                  {uniqueAttendees} attendees recorded
                </p>
              </div>
              
              {attendanceSummaries && attendanceSummaries.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          User
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Attendance %
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Scans
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          First Seen
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Last Seen
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {attendanceSummaries.map((summary: any) => (
                        <tr key={summary._id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                                <span className="text-blue-600 font-semibold text-xs">
                                  {summary.user?.name?.charAt(0)?.toUpperCase() || "?"}
                                </span>
                              </div>
                              <div className="ml-3">
                                <div className="text-sm font-medium text-gray-900">
                                  {summary.user?.name || "Unknown User"}
                                </div>
                                <div className="text-sm text-gray-500">
                                  {summary.user?.email || "N/A"}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className="flex-1 bg-gray-200 rounded-full h-2 mr-2">
                                <div 
                                  className={`h-2 rounded-full ${
                                    summary.attendancePercentage >= 80 ? 'bg-green-500' :
                                    summary.attendancePercentage >= 60 ? 'bg-yellow-500' :
                                    'bg-red-500'
                                  }`}
                                  style={{ width: `${Math.min(100, summary.attendancePercentage)}%` }}
                                ></div>
                              </div>
                              <span className="text-sm font-medium text-gray-900">
                                {summary.attendancePercentage.toFixed(1)}%
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {summary.presentScans} / {summary.totalScans}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {summary.firstSeen ? format(new Date(summary.firstSeen), "MMM dd, HH:mm") : "N/A"}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {summary.lastSeen ? format(new Date(summary.lastSeen), "MMM dd, HH:mm") : "N/A"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : clientSummaries && clientSummaries.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Scans</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">First Seen</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Last Seen</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {clientSummaries.map((summary: any) => (
                        <tr key={String(summary.userId)} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">{summary.user?.name || 'Unknown User'}</div>
                            <div className="text-sm text-gray-500">{summary.user?.email || 'N/A'}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{summary.presentScans} / {summary.totalScans}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{summary.firstSeen ? format(new Date(summary.firstSeen), "MMM dd, HH:mm") : 'N/A'}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{summary.lastSeen ? format(new Date(summary.lastSeen), "MMM dd, HH:mm") : 'N/A'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="p-12 text-center">
                  <div className="text-gray-400 mb-4">
                    <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No attendance recorded</h3>
                  <p className="text-gray-600">Attendance will appear here once users check in.</p>
                </div>
              )}
            </div>

            {/* Recent Scans (raw attendance records) */}
            <div className="bg-white shadow rounded-lg mt-8">
              <div className="p-6 border-b">
                <h2 className="text-lg font-medium text-gray-900">Recent Scans</h2>
                <p className="text-sm text-gray-600 mt-1">All records for this event, including synced and realtime</p>
              </div>
              {attendance && attendance.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Time</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Scanner</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {(attendance
                        ?.slice()
                        .sort((a: any, b: any) => {
                          const at = a.scanTime ?? a.timestamp ?? a._creationTime ?? 0;
                          const bt = b.scanTime ?? b.timestamp ?? b._creationTime ?? 0;
                          return bt - at;
                        }) || []).map((record: any) => (
                        <tr key={record._id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {format(new Date(record.scanTime ?? record.timestamp ?? record._creationTime), "MMM dd, yyyy 'at' h:mm a")}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">{record.user?.name || 'Unknown User'}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{record.user?.email || 'N/A'}</td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-2 py-1 text-xs font-medium rounded-full ${record.synced ? 'bg-purple-100 text-purple-800' : 'bg-green-100 text-green-800'}`}>
                              {record.synced ? 'Synced' : 'Realtime'}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{record.scannerSource || record.deviceId || 'unknown'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="p-12 text-center">
                  <div className="text-gray-400 mb-4">
                    <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No scans yet</h3>
                  <p className="text-gray-600">Scans will appear here as they are recorded.</p>
                </div>
              )}
            </div>
          </div>

          {/* Stats Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-white shadow rounded-lg mb-6">
              <div className="p-6 border-b">
                <h3 className="text-lg font-medium text-gray-900">Statistics</h3>
              </div>
              <div className="p-6 space-y-6">
                <div>
                  <div className="text-2xl font-semibold text-gray-900">{uniqueAttendees}</div>
                  <div className="text-sm text-gray-600">Total Attendees</div>
                </div>
                
                <div>
                  <div className="text-2xl font-semibold text-gray-900">{averageAttendancePercentage.toFixed(1)}%</div>
                  <div className="text-sm text-gray-600">Avg Attendance</div>
                </div>
                
                <div>
                  <div className="text-2xl font-semibold text-gray-900">{users?.length || 0}</div>
                  <div className="text-sm text-gray-600">Total Users</div>
                </div>
              </div>
            </div>

            <div className="bg-white shadow rounded-lg">
              <div className="p-6 border-b">
                <h3 className="text-lg font-medium text-gray-900">Quick Actions</h3>
              </div>
              <div className="p-6 space-y-3">
                <button
                  onClick={handleToggleActive}
                  className={`w-full px-4 py-2 rounded-md text-sm font-medium ${
                    event.isActive
                      ? "bg-red-100 text-red-800 hover:bg-red-200"
                      : "bg-green-100 text-green-800 hover:bg-green-200"
                  }`}
                >
                  {event.isActive ? "Deactivate Event" : "Activate Event"}
                </button>
                
                <Link
                  href={`/events/${eventId}/edit`}
                  className="w-full bg-blue-100 text-blue-800 hover:bg-blue-200 px-4 py-2 rounded-md text-sm font-medium text-center block"
                >
                  Edit Event
                </Link>
                
                <button className="w-full bg-gray-100 text-gray-800 hover:bg-gray-200 px-4 py-2 rounded-md text-sm font-medium">
                  Export Attendance
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg max-w-md w-full mx-4">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Delete Event</h3>
            <p className="text-sm text-gray-600 mb-6">
              Are you sure you want to delete "{event.name}"? This action cannot be undone and will remove all associated attendance records.
            </p>
            <div className="flex space-x-3">
              <button
                onClick={handleDelete}
                disabled={isDeleting}
                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md text-sm font-medium disabled:opacity-50"
              >
                {isDeleting ? "Deleting..." : "Delete"}
              </button>
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="bg-gray-300 text-gray-700 hover:bg-gray-400 px-4 py-2 rounded-md text-sm font-medium"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
