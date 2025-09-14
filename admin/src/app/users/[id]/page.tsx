"use client";

import { useQuery, useMutation } from "convex/react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { format } from "date-fns";
import { useState } from "react";

// Define types
type User = {
  _id: string;
  _creationTime: number;
  name: string;
  email: string;
  bleUuid: string;
};

type AttendanceRecord = {
  _id: string;
  eventId: string;
  eventName: string;
  timestamp: number;
  isPresent: boolean;
};

export default function UserDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const userId = params.id as string;

  const user = useQuery("users:getUser" as any, { userId }) as User | undefined;
  // Get user attendance history with event details included
  const userAttendance = useQuery("attendance:getUserAttendance" as any, { 
    userId,
    includeEventDetails: true 
  }) as any[] | undefined;
  
  const updateUser = useMutation("users:updateUser" as any);
  const deleteUser = useMutation("users:deleteUser" as any);
  
  const [isEditing, setIsEditing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [editForm, setEditForm] = useState({
    name: "",
    email: "",
    bleUuid: "",
  });

  const handleEdit = () => {
    if (!user) return;
    setEditForm({
      name: user.name,
      email: user.email,
      bleUuid: user.bleUuid,
    });
    setIsEditing(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    
    try {
      await updateUser({
        userId: user._id,
        name: editForm.name,
        email: editForm.email,
        bleUuid: editForm.bleUuid,
      });
      setIsEditing(false);
    } catch (error) {
      console.error("Failed to update user:", error);
    }
  };

  const handleDelete = async () => {
    if (!user) return;
    setIsDeleting(true);
    try {
      await deleteUser({ userId: user._id });
      router.push("/users");
    } catch (error) {
      console.error("Failed to delete user:", error);
      setIsDeleting(false);
    }
  };

  const generateBleUuid = () => {
    const uuid = "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(
      /[xy]/g,
      function (c) {
        const r = (Math.random() * 16) | 0;
        const v = c == "x" ? r : (r & 0x3) | 0x8;
        return v.toString(16);
      }
    );
    setEditForm((prev) => ({ ...prev, bleUuid: uuid }));
  };

  if (user === undefined) {
    return (
      <div className="min-h-screen bg-gray-50">
        <header className="bg-white shadow-sm border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              <div className="flex items-center space-x-4">
                <Link
                  href="/users"
                  className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                >
                  ← Users
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

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50">
        <header className="bg-white shadow-sm border-b">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              <div className="flex items-center space-x-4">
                <Link
                  href="/users"
                  className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                >
                  ← Users
                </Link>
                <h1 className="text-xl font-semibold text-gray-900">User Not Found</h1>
              </div>
            </div>
          </div>
        </header>
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center">
            <p className="text-gray-600">The requested user could not be found.</p>
          </div>
        </main>
      </div>
    );
  }

  const attendanceCount = userAttendance?.length || 0;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <Link
                href="/users"
                className="text-blue-600 hover:text-blue-800 text-sm font-medium"
              >
                ← Users
              </Link>
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                  <span className="text-blue-600 font-semibold text-sm">
                    {user.name.charAt(0).toUpperCase()}
                  </span>
                </div>
                <h1 className="text-xl font-semibold text-gray-900">{user.name}</h1>
              </div>
            </div>
            <div className="flex space-x-3">
              {!isEditing ? (
                <>
                  <button
                    onClick={handleEdit}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium"
                  >
                    Edit User
                  </button>
                  <button
                    onClick={() => setShowDeleteConfirm(true)}
                    className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md text-sm font-medium"
                  >
                    Delete
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={handleSave}
                    className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md text-sm font-medium"
                  >
                    Save Changes
                  </button>
                  <button
                    onClick={() => setIsEditing(false)}
                    className="bg-gray-300 text-gray-700 hover:bg-gray-400 px-4 py-2 rounded-md text-sm font-medium"
                  >
                    Cancel
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* User Details */}
          <div className="lg:col-span-2">
            <div className="bg-white shadow rounded-lg mb-8">
              <div className="p-6 border-b">
                <h2 className="text-lg font-medium text-gray-900">User Details</h2>
              </div>
              <div className="p-6">
                {!isEditing ? (
                  <dl className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Full Name</dt>
                      <dd className="mt-1 text-sm text-gray-900">{user.name}</dd>
                    </div>
                    
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Email Address</dt>
                      <dd className="mt-1 text-sm text-gray-900">{user.email}</dd>
                    </div>
                    
                    <div className="sm:col-span-2">
                      <dt className="text-sm font-medium text-gray-500">Bluetooth UUID</dt>
                      <dd className="mt-1 text-sm font-mono text-gray-900 bg-gray-100 px-2 py-1 rounded">
                        {user.bleUuid}
                      </dd>
                    </div>
                    
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Created</dt>
                      <dd className="mt-1 text-sm text-gray-900">
                        {user._creationTime 
                          ? format(new Date(user._creationTime), "MMM dd, yyyy 'at' h:mm a")
                          : "Unknown"
                        }
                      </dd>
                    </div>
                    
                    <div>
                      <dt className="text-sm font-medium text-gray-500">User ID</dt>
                      <dd className="mt-1 text-sm font-mono text-gray-500">{user._id}</dd>
                    </div>
                  </dl>
                ) : (
                  <form onSubmit={handleSave} className="space-y-6">
                    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Full Name
                        </label>
                        <input
                          type="text"
                          required
                          value={editForm.name}
                          onChange={(e) =>
                            setEditForm((prev) => ({ ...prev, name: e.target.value }))
                          }
                          className="w-full border border-gray-300 rounded-md px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Email Address
                        </label>
                        <input
                          type="email"
                          required
                          value={editForm.email}
                          onChange={(e) =>
                            setEditForm((prev) => ({ ...prev, email: e.target.value }))
                          }
                          className="w-full border border-gray-300 rounded-md px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>

                      <div className="sm:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Bluetooth UUID
                        </label>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            required
                            value={editForm.bleUuid}
                            onChange={(e) =>
                              setEditForm((prev) => ({ ...prev, bleUuid: e.target.value }))
                            }
                            className="flex-1 border border-gray-300 rounded-md px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx"
                          />
                          <button
                            type="button"
                            onClick={generateBleUuid}
                            className="bg-gray-500 text-white px-4 py-2 rounded-md hover:bg-gray-600 transition-colors"
                          >
                            Generate
                          </button>
                        </div>
                      </div>
                    </div>
                  </form>
                )}
              </div>
            </div>

            {/* Attendance History */}
            <div className="bg-white shadow rounded-lg">
              <div className="p-6 border-b">
                <h2 className="text-lg font-medium text-gray-900">Attendance History</h2>
                <p className="text-sm text-gray-600 mt-1">
                  {attendanceCount} events attended
                </p>
              </div>
              
              {userAttendance && userAttendance.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Event
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Check-in Time
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {userAttendance.map((record) => (
                        <tr key={record._id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">
                              {record.event?.name || "Unknown Event"}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {record.timestamp 
                              ? format(new Date(record.timestamp), "MMM dd, yyyy 'at' h:mm a")
                              : "Unknown"
                            }
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">
                              Present
                            </span>
                          </td>
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
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No attendance records</h3>
                  <p className="text-gray-600">This user hasn't attended any events yet.</p>
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
                  <div className="text-2xl font-semibold text-gray-900">{attendanceCount}</div>
                  <div className="text-sm text-gray-600">Events Attended</div>
                </div>
                
                <div>
                  <div className="text-2xl font-semibold text-gray-900">
                    {userAttendance?.length || 0}
                  </div>
                  <div className="text-sm text-gray-600">Present Records</div>
                </div>
                
                <div>
                  <div className="text-2xl font-semibold text-gray-900">
                    {user._creationTime 
                      ? format(new Date(user._creationTime), "MMM yyyy")
                      : "Unknown"
                    }
                  </div>
                  <div className="text-sm text-gray-600">Member Since</div>
                </div>
              </div>
            </div>

            <div className="bg-white shadow rounded-lg">
              <div className="p-6 border-b">
                <h3 className="text-lg font-medium text-gray-900">Quick Actions</h3>
              </div>
              <div className="p-6 space-y-3">
                <button
                  onClick={handleEdit}
                  className="w-full bg-blue-100 text-blue-800 hover:bg-blue-200 px-4 py-2 rounded-md text-sm font-medium"
                >
                  Edit User Details
                </button>
                
                <button className="w-full bg-gray-100 text-gray-800 hover:bg-gray-200 px-4 py-2 rounded-md text-sm font-medium">
                  Export Attendance
                </button>
                
                <button className="w-full bg-gray-100 text-gray-800 hover:bg-gray-200 px-4 py-2 rounded-md text-sm font-medium">
                  Reset Bluetooth UUID
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
            <h3 className="text-lg font-medium text-gray-900 mb-4">Delete User</h3>
            <p className="text-sm text-gray-600 mb-6">
              Are you sure you want to delete "{user.name}"? This action cannot be undone and will remove all associated attendance records.
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
