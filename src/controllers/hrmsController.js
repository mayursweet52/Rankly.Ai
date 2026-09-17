const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

exports.getShifts = async (req, res) => {
  try {
    const shifts = await prisma.shift.findMany({
      orderBy: { createdAt: 'desc' }
    });
    return res.status(200).json({ success: true, data: shifts });
  } catch (error) {
    console.error('Error fetching shifts:', error);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.getTimesheets = async (req, res) => {
  try {
    const { employeeId } = req.query;
    if (!employeeId) {
      return res.status(400).json({ success: false, message: 'Employee ID is required' });
    }

    const timesheets = await prisma.timesheet.findMany({
      where: { employeeId },
      include: { project: { include: { client: true } } },
      orderBy: { date: 'desc' },
      take: 50 // Limit for performance
    });
    
    return res.status(200).json({ success: true, data: timesheets });
  } catch (error) {
    console.error('Error fetching timesheets:', error);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

exports.submitTimesheet = async (req, res) => {
  try {
    const { employeeId, projectId, date, hoursWorked, billable } = req.body;
    
    if (!employeeId || !projectId || !date || hoursWorked == null) {
      return res.status(400).json({ success: false, message: 'Missing required fields' });
    }

    const timesheet = await prisma.timesheet.create({
      data: {
        employeeId,
        projectId,
        date: new Date(date),
        hoursWorked: parseFloat(hoursWorked),
        billable: billable !== undefined ? billable : true,
        status: 'pending'
      }
    });

    return res.status(201).json({ success: true, data: timesheet });
  } catch (error) {
    console.error('Error submitting timesheet:', error);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};

// --- Geofencing Helpers ---
function calculateHaversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371e3; // Earth radius in meters
  const toRad = Math.PI / 180;
  const dLat = (lat2 - lat1) * toRad;
  const dLon = (lon2 - lon1) * toRad;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * toRad) * Math.cos(lat2 * toRad) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // Distance in meters
}

exports.punchAttendance = async (req, res) => {
  try {
    const { employeeId, type, latitude, longitude } = req.body;
    // type: 'checkIn' | 'checkOut'

    if (!employeeId || !type) {
      return res.status(400).json({ success: false, message: 'Missing employeeId or type' });
    }

    const employee = await prisma.employee.findUnique({
      where: { id: employeeId },
      include: { organization: true }
    });

    if (!employee) return res.status(404).json({ success: false, message: 'Employee not found' });

    let isGeofenceValid = false;
    let distance = null;
    let message = 'Punch recorded successfully';

    if (latitude && longitude && employee.organization.officeLatitude && employee.organization.officeLongitude) {
      distance = calculateHaversineDistance(
        parseFloat(latitude), parseFloat(longitude),
        employee.organization.officeLatitude, employee.organization.officeLongitude
      );
      const radius = employee.organization.geofenceRadius || 100;
      isGeofenceValid = distance <= radius;
      
      if (!isGeofenceValid) {
         message = 'Punch recorded, but you are outside the geofenced office area.';
      } else {
         message = 'Punch recorded securely within office geofence.';
      }
    } else {
      message = 'Punch recorded without geographical verification.';
    }

    // Upsert attendance for today
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const existingAttendance = await prisma.attendance.findFirst({
      where: {
        employeeId,
        date: {
           gte: startOfDay
        }
      }
    });

    let attendanceRecord;
    const now = new Date();

    if (type === 'checkIn') {
       if (existingAttendance && existingAttendance.checkIn) {
          return res.status(400).json({ success: false, message: 'Already checked in today' });
       }
       attendanceRecord = await prisma.attendance.create({
         data: {
           employeeId,
           date: startOfDay,
           checkIn: now,
           status: 'present',
           latitude: latitude ? parseFloat(latitude) : null,
           longitude: longitude ? parseFloat(longitude) : null,
           isGeofenceValid
         }
       });
    } else if (type === 'checkOut') {
       if (!existingAttendance) {
          return res.status(400).json({ success: false, message: 'No check-in found for today' });
       }
       
       let workHours = 0;
       if (existingAttendance.checkIn) {
          workHours = (now.getTime() - existingAttendance.checkIn.getTime()) / (1000 * 60 * 60);
       }

       attendanceRecord = await prisma.attendance.update({
         where: { id: existingAttendance.id },
         data: {
           checkOut: now,
           workHours,
           latitude: latitude ? parseFloat(latitude) : existingAttendance.latitude,
           longitude: longitude ? parseFloat(longitude) : existingAttendance.longitude,
           isGeofenceValid: existingAttendance.isGeofenceValid || isGeofenceValid
         }
       });
    }

    return res.status(200).json({ success: true, data: attendanceRecord, isGeofenceValid, distance, message });
  } catch (error) {
    console.error('Error punching attendance:', error);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
};
