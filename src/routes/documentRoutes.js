/**
 * Internal HRMS Company Document Routes
 * All endpoints are strictly locked behind isAuthenticated and requireHRMS middleware.
 * Candidate / Normal users are rejected with 403 Forbidden.
 */

const express = require('express');
const router = express.Router();
const documentController = require('../controllers/documentController');
const upload = require('../middleware/upload');
const { optionalAuth, isAuthenticated, requireHRMS, requireRole } = require('../middleware/auth');
const { authorizeRoles } = require('../middleware/rbac');
const { publicLimiter, aiLimiter } = require('../middleware/rateLimit');

// ---------------------------------------------------------
// Internal HRMS Document Engine (Supabase + Local Ollama Nemotron)
// Strictly locked behind HRMS RBAC (Admin & HR only for modifications/AI)
// ---------------------------------------------------------
router.post('/internal/upload', isAuthenticated, requireHRMS, authorizeRoles('admin', 'hr', 'hr_manager'), publicLimiter, upload.single('document'), documentController.uploadInternalDocument);
router.post('/internal/process', isAuthenticated, requireHRMS, authorizeRoles('admin', 'hr', 'hr_manager'), aiLimiter, documentController.processDocumentWithAi);
router.post('/internal/summarize', isAuthenticated, requireHRMS, authorizeRoles('admin', 'hr', 'hr_manager'), aiLimiter, documentController.summarizeDocumentWithAi);
router.get('/internal', isAuthenticated, requireHRMS, publicLimiter, documentController.listInternalDocuments);
router.get('/internal/:id', isAuthenticated, requireHRMS, publicLimiter, documentController.getInternalDocumentById);
router.delete('/internal/:id', isAuthenticated, requireHRMS, authorizeRoles('admin', 'hr', 'hr_manager'), publicLimiter, documentController.deleteInternalDocument);


// ---------------------------------------------------------
// Core Company Document CRUD (Locked behind HRMS Auth)
// ---------------------------------------------------------
// GET all company documents (HRMS personnel only)
router.get('/', isAuthenticated, requireHRMS, publicLimiter, documentController.listDocuments);

// POST create a new company document (Admin / HR only)
router.post('/', isAuthenticated, requireHRMS, requireRole(['admin', 'hr']), publicLimiter, documentController.createDocument);

// GET single company document by ID (HRMS personnel only)
router.get('/:id', isAuthenticated, requireHRMS, publicLimiter, documentController.getDocumentById);

// PUT update company document by ID (Admin / HR only)
router.put('/:id', isAuthenticated, requireHRMS, requireRole(['admin', 'hr']), publicLimiter, documentController.updateDocument);

// DELETE company document by ID (Admin / HR only)
router.delete('/:id', isAuthenticated, requireHRMS, requireRole(['admin', 'hr']), publicLimiter, documentController.deleteDocument);

module.exports = router;
