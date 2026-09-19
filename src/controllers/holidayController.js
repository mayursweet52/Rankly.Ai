const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

exports.getHolidays = async (req, res) => {
  try {
    const orgId = req.session.organizationId || req.user.organizationId;
    const year = Number(req.query.year) || new Date().getFullYear();
    const locationId = req.query.locationId;

    const holidays = await prisma.holiday.findMany({
      where: {
        organizationId: orgId,
        year,
        isActive: true,
        OR: locationId
          ? [{ locationId: null }, { locationId }]
          : [{ locationId: null }],
      },
      orderBy: { date: 'asc' },
    });
    res.json(holidays);
  } catch (err) { res.status(500).json({error: err.message}); }
};

exports.createHoliday = async (req, res) => {
  try {
    const orgId = req.session.organizationId || req.user.organizationId;
    const { name, date, locationId, isOptional, description } = req.body;
    if (!name?.trim() || !date) {
      return res.status(400).json({ error: 'Name and date required' });
    }

    const d = new Date(date);
    const holiday = await prisma.holiday.create({
      data: {
        organizationId: orgId,
        name: name.trim(),
        date: d,
        year: d.getFullYear(),
        locationId: locationId || null,
        isOptional: isOptional || false,
        description,
        createdBy: req.user.id,
      },
    });
    res.status(201).json(holiday);
  } catch (err) { res.status(500).json({error: err.message}); }
};

exports.updateHoliday = async (req, res) => {
  try {
    const h = await prisma.holiday.update({
      where: { id: req.params.id },
      data: req.body,
    });
    res.json(h);
  } catch (err) { res.status(500).json({error: err.message}); }
};

exports.deleteHoliday = async (req, res) => {
  try {
    await prisma.holiday.update({
      where: { id: req.params.id },
      data: { isActive: false },
    });
    res.json({ success: true });
  } catch (err) { res.status(500).json({error: err.message}); }
};
