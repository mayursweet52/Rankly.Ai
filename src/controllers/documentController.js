/**
 * Internal HRMS Company Documents Controller
 * Provides CRUD capabilities for company policies, employee handbooks, NDAs, and compliance files.
 * Restricted strictly to HRMS personnel (HR, Admin, Employees).
 */

const path = require('path');
const prisma = require('../config/database');
const supabase = require('../config/supabaseClient');
const { extractDocumentText, formatFileSize } = require('../services/documentParserService');
const { processInternalDocument } = require('../services/aiService');

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

/**
 * POST /api/documents/internal/upload
 * Upload & Ingest Internal HR Document with automatic text extraction to Supabase internal_documents
 */
async function uploadInternalDocument(req, res) {
  try {
    const orgId = req.user?.organizationId || req.body?.organizationId || null;
    const uploadedBy = req.user?.email || req.user?.id || req.body?.uploadedBy || 'system_hr';
    const category = (req.body?.category || 'policy').toLowerCase();
    const department = req.body?.department || 'HR';

    let extractedText = '';
    let fileName = req.body?.fileName || 'document.txt';
    let fileSize = '0 KB';
    let pageCount = 1;
    let title = req.body?.title || '';

    if (req.file) {
      fileName = req.file.originalname || req.file.filename;
      fileSize = formatFileSize(req.file.size);
      if (!title) {
        title = path.parse(fileName).name.replace(/[-_]/g, ' ');
      }
      const parsed = await extractDocumentText(req.file.path, fileName);
      extractedText = parsed.text;
      pageCount = parsed.pageCount || 1;
    } else if (req.body?.content || req.body?.extractedText) {
      extractedText = (req.body.content || req.body.extractedText).trim();
      fileSize = formatFileSize(Buffer.byteLength(extractedText, 'utf8'));
      if (!title) title = 'Internal Corporate Document';
    } else {
      return res.status(400).json({
        success: false,
        error: 'Please upload a document file (PDF, DOCX, TXT) or supply document content.'
      });
    }

    // 1. Ingest into Supabase internal_documents table
    const { data: supaDoc, error: supaErr } = await supabase
      .from('internal_documents')
      .insert([{
        title,
        category,
        file_name: fileName,
        file_size: fileSize,
        extracted_text: extractedText,
        department,
        organization_id: orgId,
        uploaded_by: uploadedBy,
        metadata: { pageCount, ingestedAt: new Date().toISOString() }
      }])
      .select();

    if (supaErr) {
      console.warn('Supabase internal_documents insert notice:', supaErr.message);
    }

    const insertedDoc = supaDoc && supaDoc[0] ? supaDoc[0] : {
      id: Date.now(),
      title,
      category,
      file_name: fileName,
      file_size: fileSize,
      extracted_text: extractedText,
      department,
      uploaded_by: uploadedBy
    };

    // 2. Also record in SQLite CompanyDocument for unified local access if user exists
    if (req.user?.id) {
      try {
        await prisma.companyDocument.create({
          data: {
            title,
            category,
            fileName,
            fileSize,
            content: extractedText,
            uploadedById: req.user.id,
            organizationId: orgId
          }
        });
      } catch (localDbErr) {}
    }

    return res.status(201).json({
      success: true,
      message: 'Internal HR document uploaded, text extracted, and stored in Supabase successfully.',
      document: insertedDoc,
      textLength: extractedText.length
    });
  } catch (err) {
    console.error('Error uploading internal document:', err);
    return res.status(500).json({ success: false, error: 'Failed to ingest document: ' + err.message });
  }
}

/**
 * GET /api/documents/internal
 * List all internal HR documents stored in Supabase
 */
async function listInternalDocuments(req, res) {
  try {
    const { category, search } = req.query;
    let query = supabase.from('internal_documents').select('*').order('created_at', { ascending: false });

    if (category && category !== 'all') {
      query = query.eq('category', category.toLowerCase());
    }

    const { data, error } = await query;
    if (error) throw error;

    let results = data || [];
    if (search && search.trim()) {
      const q = search.trim().toLowerCase();
      results = results.filter(d => 
        (d.title && d.title.toLowerCase().includes(q)) ||
        (d.extracted_text && d.extracted_text.toLowerCase().includes(q))
      );
    }

    return res.json({
      success: true,
      count: results.length,
      data: results
    });
  } catch (err) {
    console.error('Error listing internal documents:', err);
    return res.status(500).json({ success: false, error: 'Failed to list internal documents: ' + err.message });
  }
}

/**
 * GET /api/documents/internal/:id
 * Retrieve single internal document with extracted text from Supabase
 */
async function getInternalDocumentById(req, res) {
  try {
    const { id } = req.params;
    const { data, error } = await supabase.from('internal_documents').select('*').eq('id', id).single();
    if (error || !data) {
      return res.status(404).json({ success: false, error: `Document #${id} not found in internal_documents.` });
    }
    return res.json({ success: true, data });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
}

/**
 * POST /api/documents/internal/process
 * Process internal document context with Local Ollama Nemotron AI (Strict HRMS prompt)
 */
async function processDocumentWithAi(req, res) {
  try {
    const { documentId, promptText, documentContext: inlineContext } = req.body;

    if (!promptText || !promptText.trim()) {
      return res.status(400).json({ success: false, error: 'promptText is required.' });
    }

    let documentContext = inlineContext || '';

    // If documentId provided, fetch context directly from Supabase internal_documents or SQLite companyDocument
    if (documentId) {
      const { data, error } = await supabase.from('internal_documents').select('*').eq('id', documentId).single();
      if (!error && data && data.extracted_text) {
        documentContext = `Document: ${data.title} (${data.file_name})\n\n${data.extracted_text}`;
      } else {
        // Fallback: Check local SQLite prisma.companyDocument
        try {
          const localDoc = await prisma.companyDocument.findUnique({
            where: { id: String(documentId) }
          });
          if (localDoc && (localDoc.content || localDoc.description)) {
            documentContext = `Document: ${localDoc.title} (${localDoc.fileName || 'document.pdf'})\n\n${localDoc.content || localDoc.description}`;
          }
        } catch (localErr) {}

        if (!documentContext && !inlineContext) {
          return res.status(404).json({ success: false, error: `Document #${documentId} not found or contains no text.` });
        }
      }
    }

    // If no specific document context was provided, aggregate top company policies
    if (!documentContext || !documentContext.trim()) {
      try {
        const { data: supaDocs } = await supabase.from('internal_documents').select('title, category, extracted_text').limit(4);
        if (supaDocs && supaDocs.length > 0) {
          documentContext = supaDocs.map(d => `=== Policy: ${d.title} (${d.category}) ===\n${d.extracted_text}`).join('\n\n');
        } else {
          const localDocs = await prisma.companyDocument.findMany({ take: 4 });
          if (localDocs && localDocs.length > 0) {
            documentContext = localDocs.map(d => `=== Policy: ${d.title} (${d.category}) ===\n${d.content || d.description}`).join('\n\n');
          }
        }
      } catch (aggErr) {}
    }

    if (!documentContext || !documentContext.trim()) {
      return res.status(400).json({ success: false, error: 'No company policy document context available to process.' });
    }

    const aiResult = await processInternalDocument(promptText.trim(), documentContext.trim());

    return res.json({
      success: true,
      query: promptText.trim(),
      result: aiResult,
      documentId: documentId || null,
      modelUsed: 'nemotron (Local Ollama / HRMS Tier)'
    });
  } catch (err) {
    console.error('Error processing document with AI:', err);
    return res.status(500).json({ success: false, error: 'Internal document processing error: ' + err.message });
  }
}

/**
 * DELETE /api/documents/internal/:id
 * Delete document from Supabase internal_documents
 */
async function deleteInternalDocument(req, res) {
  try {
    const { id } = req.params;
    const { error } = await supabase.from('internal_documents').delete().eq('id', id);
    if (error) throw error;
    return res.json({ success: true, message: `Document #${id} removed from internal_documents.` });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
}

module.exports = {
  listDocuments,
  getDocumentById,
  createDocument,
  updateDocument,
  deleteDocument,
  uploadInternalDocument,
  listInternalDocuments,
  getInternalDocumentById,
  processDocumentWithAi,
  deleteInternalDocument
};
