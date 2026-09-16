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
