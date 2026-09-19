const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

exports.getDocumentTypes = async (req, res) => {
  try {
    const types = await prisma.documentType.findMany({
      where: { isActive: true, organizationId: req.session.organizationId || req.user.organizationId },
      orderBy: { sortOrder: 'asc' },
    });
    res.json(types);
  } catch(err) { res.status(500).json({error: err.message}); }
};

exports.createDocumentType = async (req, res) => {
  try {
    const { name, description, isMandatory, sortOrder } = req.body;
    if (!name?.trim()) return res.status(400).json({ error: 'Name required' });

    const type = await prisma.documentType.create({
      data: {
        name: name.trim(),
        description,
        isMandatory: isMandatory || false,
        sortOrder: sortOrder || 0,
        createdBy: req.user.id,
        organizationId: req.session.organizationId || req.user.organizationId
      },
    });
    res.status(201).json(type);
  } catch(err) { res.status(500).json({error: err.message}); }
};

exports.updateDocumentType = async (req, res) => {
  try {
    const type = await prisma.documentType.update({
      where: { id: req.params.id },
      data: req.body,
    });
    res.json(type);
  } catch(err) { res.status(500).json({error: err.message}); }
};

exports.deleteDocumentType = async (req, res) => {
  try {
    await prisma.documentType.update({
      where: { id: req.params.id },
      data: { isActive: false },
    });
    res.json({ success: true });
  } catch(err) { res.status(500).json({error: err.message}); }
};
