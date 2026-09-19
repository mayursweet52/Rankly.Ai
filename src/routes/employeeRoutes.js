const express = require('express');
const router = express.Router();
const { isAuthenticated } = require('../middleware/auth');
const { requirePermission } = require('../middleware/rbac');
const empCtrl = require('../controllers/employeeController');
const docCtrl = require('../controllers/employeeDocumentController');

router.use(isAuthenticated);

// Stats
router.get('/stats', requirePermission('employee', 'view'), empCtrl.getEmployeeStats);

// Employee CRUD
router.get('/', requirePermission('employee', 'view'), empCtrl.getEmployees);
router.get('/:id', requirePermission('employee', 'view'), empCtrl.getEmployee);
router.post('/', requirePermission('employee', 'add'), empCtrl.createEmployee);
router.put('/:id', requirePermission('employee', 'edit'), empCtrl.updateEmployee);
router.delete('/:id', requirePermission('employee', 'delete'), empCtrl.deleteEmployee);

// Documents
router.get('/:id/documents', requirePermission('employee', 'view'), docCtrl.getDocuments);
router.post('/:id/documents', requirePermission('employee', 'edit'), docCtrl.upload.single('file'), docCtrl.uploadDocument);
router.put('/:id/documents/:docId/verify', requirePermission('employee', 'edit'), docCtrl.verifyDocument);
router.delete('/:id/documents/:docId', requirePermission('employee', 'delete'), docCtrl.deleteDocument);

module.exports = router;
