const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/roleController');
const { isAuthenticated } = require('../middleware/auth'); // Check auth middleware name
const { requirePermission } = require('../middleware/rbac');

router.use(isAuthenticated);

// Modules
router.get('/modules', ctrl.getModules);

// Roles
router.get('/', requirePermission('role', 'view'), ctrl.getRoles);
router.get('/:id', requirePermission('role', 'view'), ctrl.getRole);
router.post('/', requirePermission('role', 'add'), ctrl.createRole);
router.put('/:id', requirePermission('role', 'edit'), ctrl.updateRole);
router.delete('/:id', requirePermission('role', 'delete'), ctrl.deleteRole);

// Assignment
router.post('/assign', requirePermission('role', 'edit'), ctrl.assignRole);
router.post('/remove', requirePermission('role', 'edit'), ctrl.removeRole);
router.get('/user/:userId/roles', ctrl.getUserRoles);

// Current user's permissions
router.get('/me/permissions', ctrl.getMyPermissions);

module.exports = router;
