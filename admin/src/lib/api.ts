// Temporary API connector until Convex generates proper types
export const tempApi = {
  users: {
    listUsers: 'users:listUsers',
    createUser: 'users:createUser', 
    updateUser: 'users:updateUser',
    getUserByEmail: 'users:getUserByEmail',
    getUserByBleUuid: 'users:getUserByBleUuid'
  },
  events: {
    listEvents: 'events:listEvents',
    createEvent: 'events:createEvent',
    setEventActive: 'events:setEventActive',
    getActiveEvents: 'events:getActiveEvents'
  },
  attendance: {
    recordAttendance: 'attendance:recordAttendance',
    batchRecordAttendance: 'attendance:batchRecordAttendance',
    getEventAttendance: 'attendance:getEventAttendance'
  }
} as const
