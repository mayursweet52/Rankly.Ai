const express = require('express');
const router = express.Router();
const { isAuthenticated } = require('../middleware/auth');
const { requirePermission } = require('../middleware/rbac');
const cfCtrl = require('../controllers/customFieldController');
const dtCtrl = require('../controllers/documentTypeController');

router.use(isAuthenticated);

// Custom Fields
router.get('/custom-fields', cfCtrl.getCustomFields);
router.post('/custom-fields', requirePermission('employee', 'add'), cfCtrl.createCustomField);
router.put('/custom-fields/:id', requirePermission('employee', 'edit'), cfCtrl.updateCustomField);
router.delete('/custom-fields/:id', requirePermission('employee', 'edit'), cfCtrl.deleteCustomField);
router.post('/custom-fields/reorder', requirePermission('employee', 'edit'), cfCtrl.reorderCustomFields);

// Document Types
router.get('/document-types', dtCtrl.getDocumentTypes);
router.post('/document-types', requirePermission('employee', 'add'), dtCtrl.createDocumentType);
router.put('/document-types/:id', requirePermission('employee', 'edit'), dtCtrl.updateDocumentType);
router.delete('/document-types/:id', requirePermission('employee', 'edit'), dtCtrl.deleteDocumentType);

module.exports = router;
