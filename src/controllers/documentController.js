/**
 * Internal HRMS Company Documents Controller
 * Provides CRUD capabilities for company policies, employee handbooks, NDAs, and compliance files.
 * Restricted strictly to HRMS personnel (HR, Admin, Employees).
 */

const prisma = require('../config/database');

/**
 * GET /api/documents
 * List all company documents with optional category and search filters
 */
async function listDocuments(req, res) {
  try {
    const { category, search } = req.query;
    const orgId = req.user?.organizationId || null;

    const where = {};
    if (orgId) {
      where.OR = [
        { organizationId: orgId },
        { organizationId: null }
      ];
    }

    if (category && category !== 'all') {
      where.category = category.toLowerCase();
    }

    if (search && search.trim()) {
      const q = search.trim();
      where.AND = [
        ...(where.AND || []),
        {
          OR: [
            { title: { contains: q } },
            { description: { contains: q } },
            { content: { contains: q } }
          ]
        }
      ];
    }

    let documents = await prisma.companyDocument.findMany({
      where,
      include: {
        uploadedBy: {
          select: { id: true, firstName: true, lastName: true, username: true, email: true, role: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    // If no documents exist in the system yet, provide standard starter company templates
    if (documents.length === 0 && !search && (!category || category === 'all')) {
      const defaultDocs = [
        {
          title: 'Code of Conduct & Workplace Ethics Policy',
          category: 'policy',
          description: 'Official corporate code of conduct, anti-harassment guidelines, and professional ethics standard.',
          content: 'This policy defines the expected professional standards and values across all teams. All employees must maintain confidentiality, respect diversity, and avoid conflicts of interest.',
          fileName: 'Code_of_Conduct_2026.pdf',
          fileSize: '420 KB',
          uploadedById: req.user.id,
          organizationId: orgId
        },
        {
          title: 'Employee Handbook & Leave Guidelines 2026',
          category: 'handbook',
          description: 'Comprehensive guide covering working hours, PTO policies, hybrid work protocols, and medical leaves.',
          content: 'Annual leave quota consists of 18 paid vacation days, 10 sick leaves, and public holidays. Core business collaboration hours are 10:00 AM - 4:00 PM.',
          fileName: 'Employee_Handbook_2026.pdf',
          fileSize: '1.2 MB',
          uploadedById: req.user.id,
          organizationId: orgId
        },
        {
          title: 'Standard Non-Disclosure Agreement (NDA)',
          category: 'nda',
          description: 'Proprietary IP protection, client confidentiality, and data handling non-disclosure agreement.',
          content: 'Signees acknowledge that all algorithms, candidate profiles, and enterprise client metrics are proprietary property of the company.',
          fileName: 'Master_NDA_Template.pdf',
          fileSize: '280 KB',
          uploadedById: req.user.id,
          organizationId: orgId
        },
        {
          title: 'Information Security & Data Protection Policy (ISO/GDPR)',
          category: 'compliance',
          description: 'Compliance guidelines for handling sensitive personal information, OAuth credentials, and SOC-2 data.',
          content: 'Multi-factor authentication (MFA) is mandatory. Access to production candidate databases is restricted to authorized operations engineers.',
          fileName: 'InfoSec_Compliance_v4.pdf',
          fileSize: '850 KB',
          uploadedById: req.user.id,
          organizationId: orgId
        }
      ];

      // Prompt 02 Optimization: Batch Multi-Row Insert instead of sequential loop inserts
      await prisma.companyDocument.createMany({
        data: defaultDocs
      });

      documents = await prisma.companyDocument.findMany({
        where,
        include: {
          uploadedBy: {
            select: { id: true, firstName: true, lastName: true, username: true, email: true, role: true }
          }
        },
        orderBy: { createdAt: 'desc' }
      });
    }

    return res.json({
      success: true,
      count: documents.length,
      data: documents
    });
  } catch (error) {
    console.error('Error listing company documents:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to retrieve company documents: ' + error.message
    });
  }
}

/**
 * GET /api/documents/:id
 * Retrieve a specific company document
 */
async function getDocumentById(req, res) {
  try {
    const { id } = req.params;
    const document = await prisma.companyDocument.findUnique({
      where: { id },
      include: {
        uploadedBy: {
          select: { id: true, firstName: true, lastName: true, username: true, email: true, role: true }
        }
      }
    });

    if (!document) {
      return res.status(404).json({
        success: false,
        error: `Document with ID '${id}' not found.`
      });
    }

    return res.json({
      success: true,
      data: document
    });
  } catch (error) {
    console.error('Error fetching document:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch document: ' + error.message
    });
  }
}

/**
 * POST /api/documents
 * Create a new company document (Policy, Handbook, Contract, NDA, Compliance)
 * Admin and HR only
 */
async function createDocument(req, res) {
  try {
    const { title, category, description, fileUrl, fileName, fileSize, content, isRestricted } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({
        success: false,
        error: 'Document title is required.'
      });
    }

    const orgId = req.user?.organizationId || null;
    const docCategory = category ? category.toLowerCase() : 'policy';

    const newDoc = await prisma.companyDocument.create({
      data: {
        title: title.trim(),
        category: docCategory,
        description: description ? description.trim() : null,
        fileUrl: fileUrl || null,
        fileName: fileName || `${title.trim().replace(/\s+/g, '_')}.pdf`,
        fileSize: fileSize || '350 KB',
        content: content ? content.trim() : null,
        isRestricted: Boolean(isRestricted),
        uploadedById: req.user.id,
        organizationId: orgId
      },
      include: {
        uploadedBy: {
          select: { id: true, firstName: true, lastName: true, username: true, email: true, role: true }
        }
      }
    });

    return res.status(201).json({
      success: true,
      message: 'Company document published successfully.',
      data: newDoc
    });
  } catch (error) {
    console.error('Error creating document:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to create document: ' + error.message
    });
  }
}

/**
 * PUT /api/documents/:id
 * Update an existing company document
 * Admin and HR only
 */
async function updateDocument(req, res) {
  try {
    const { id } = req.params;
    const { title, category, description, fileUrl, fileName, fileSize, content, isRestricted } = req.body;

    const existing = await prisma.companyDocument.findUnique({
      where: { id }
    });

    if (!existing) {
      return res.status(404).json({
        success: false,
        error: `Document with ID '${id}' not found.`
      });
    }

    const updatedDoc = await prisma.companyDocument.update({
      where: { id },
      data: {
        ...(title !== undefined && { title: title.trim() }),
        ...(category !== undefined && { category: category.toLowerCase() }),
        ...(description !== undefined && { description: description.trim() }),
        ...(fileUrl !== undefined && { fileUrl }),
        ...(fileName !== undefined && { fileName }),
        ...(fileSize !== undefined && { fileSize }),
        ...(content !== undefined && { content: content.trim() }),
        ...(isRestricted !== undefined && { isRestricted: Boolean(isRestricted) })
      },
      include: {
        uploadedBy: {
          select: { id: true, firstName: true, lastName: true, username: true, email: true, role: true }
        }
      }
    });

    return res.json({
      success: true,
      message: 'Company document updated successfully.',
      data: updatedDoc
    });
  } catch (error) {
    console.error('Error updating document:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to update document: ' + error.message
    });
  }
}

/**
 * DELETE /api/documents/:id
 * Remove a company document
 * Admin and HR only
 */
async function deleteDocument(req, res) {
  try {
    const { id } = req.params;
    const existing = await prisma.companyDocument.findUnique({
      where: { id }
    });

    if (!existing) {
      return res.status(404).json({
        success: false,
        error: `Document with ID '${id}' not found.`
      });
    }

    await prisma.companyDocument.delete({
      where: { id }
    });

    return res.json({
      success: true,
      message: `Document '${existing.title}' deleted successfully.`
    });
  } catch (error) {
    console.error('Error deleting document:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to delete document: ' + error.message
    });
  }
}

module.exports = {
  listDocuments,
  getDocumentById,
  createDocument,
  updateDocument,
  deleteDocument
};
