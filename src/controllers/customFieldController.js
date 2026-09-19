const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

exports.getCustomFields = async (req, res) => {
  try {
    const fields = await prisma.customField.findMany({
      where: { isActive: true, organizationId: req.session.organizationId || req.user.organizationId },
      orderBy: [{ section: 'asc' }, { sortOrder: 'asc' }],
    });
    res.json(fields);
  } catch(err) { res.status(500).json({error: err.message}); }
};

exports.createCustomField = async (req, res) => {
  try {
    const {
      key, label, fieldType, options, placeholder, helpText,
      isRequired, section, defaultValue, validation, sortOrder,
    } = req.body;

    if (!key?.trim() || !label?.trim() || !fieldType) {
      return res.status(400).json({ error: 'key, label, fieldType required' });
    }

    if (!/^[a-z0-9_]+$/.test(key)) {
      return res.status(400).json({ error: 'Key must be lowercase alphanumeric with underscores' });
    }

    const orgId = req.session.organizationId || req.user.organizationId;
    const exists = await prisma.customField.findFirst({ where: { key, organizationId: orgId } });
    if (exists) return res.status(400).json({ error: 'Field key already exists' });

    const field = await prisma.customField.create({
      data: {
        key, label, fieldType,
        options: options ? JSON.stringify(options) : null,
        placeholder, helpText,
        isRequired: isRequired || false,
        section: section || 'General',
        defaultValue,
        validation: validation ? JSON.stringify(validation) : null,
        sortOrder: sortOrder || 0,
        createdBy: req.user.id,
        organizationId: orgId
      },
    });

    res.status(201).json(field);
  } catch(err) { res.status(500).json({error: err.message}); }
};

exports.updateCustomField = async (req, res) => {
  try {
    const field = await prisma.customField.update({
      where: { id: req.params.id },
      data: {
        ...req.body,
        options: req.body.options ? JSON.stringify(req.body.options) : undefined,
        validation: req.body.validation ? JSON.stringify(req.body.validation) : undefined
      },
    });
    res.json(field);
  } catch(err) { res.status(500).json({error: err.message}); }
};

exports.deleteCustomField = async (req, res) => {
  try {
    await prisma.customField.update({
      where: { id: req.params.id },
      data: { isActive: false },
    });
    res.json({ success: true });
  } catch(err) { res.status(500).json({error: err.message}); }
};

exports.reorderCustomFields = async (req, res) => {
  try {
    const { order } = req.body;
    for (const item of order) {
      await prisma.customField.update({
        where: { id: item.id },
        data: { sortOrder: item.sortOrder },
      });
    }
    res.json({ success: true });
  } catch(err) { res.status(500).json({error: err.message}); }
};
