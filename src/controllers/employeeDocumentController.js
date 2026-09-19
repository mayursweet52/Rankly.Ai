const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(process.cwd(), `uploads/employees/${req.params.id}`);
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const uniqueName = `${Date.now()}-${file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
    cb(null, uniqueName);
  },
});

exports.upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    const allowed = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'];
    if (allowed.includes(file.mimetype)) cb(null, true);
    else cb(new Error('Only PDF, JPG, PNG allowed'));
  },
});

exports.uploadDocument = async (req, res) => {
  try {
    const employeeId = req.params.id;
    const { documentTypeId, expiryDate } = req.body;
    const file = req.file;

    if (!file) return res.status(400).json({ error: 'File required' });
    if (!documentTypeId) return res.status(400).json({ error: 'documentTypeId required' });

    const doc = await prisma.employeeDocument.create({
      data: {
        employeeId,
        documentTypeId,
        fileName: file.originalname,
        fileUrl: `/uploads/employees/${employeeId}/${file.filename}`,
        fileSize: file.size,
        mimeType: file.mimetype,
        expiryDate: expiryDate ? new Date(expiryDate) : null,
        uploadedBy: req.user.id,
      },
      include: { documentType: true },
    });

    res.status(201).json(doc);
  } catch(err) { res.status(500).json({error: err.message}); }
};

exports.getDocuments = async (req, res) => {
  try {
    const docs = await prisma.employeeDocument.findMany({
      where: { employeeId: req.params.id },
      include: { documentType: true },
      orderBy: { uploadedAt: 'desc' },
    });
    res.json(docs);
  } catch(err) { res.status(500).json({error: err.message}); }
};

exports.verifyDocument = async (req, res) => {
  try {
    const doc = await prisma.employeeDocument.update({
      where: { id: req.params.docId },
      data: {
        verified: true,
        verifiedBy: req.user.id,
        verifiedAt: new Date(),
      },
    });
    res.json(doc);
  } catch(err) { res.status(500).json({error: err.message}); }
};

exports.deleteDocument = async (req, res) => {
  try {
    const doc = await prisma.employeeDocument.findUnique({
      where: { id: req.params.docId },
    });

    if (!doc) return res.status(404).json({ error: 'Document not found' });

    const filePath = path.join(process.cwd(), doc.fileUrl);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);

    await prisma.employeeDocument.delete({ where: { id: req.params.docId } });
    res.json({ success: true });
  } catch(err) { res.status(500).json({error: err.message}); }
};
