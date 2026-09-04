/**
 * Internal HRMS Company Document Routes
 * All endpoints are strictly locked behind isAuthenticated and requireHRMS middleware.
 * Candidate / Normal users are rejected with 403 Forbidden.
 */

const express = require('express');
const router = express.Router();
const documentController = require('../controllers/documentController');
const { isAuthenticated, requireHRMS, requireRole } = require('../middleware/auth');
const { publicLimiter } = require('../middleware/rateLimit');

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
