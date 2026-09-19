const express = require('express');
const router = express.Router();
const { isAuthenticated } = require('../middleware/auth');
const { requirePermission } = require('../middleware/rbac');
const orgCtrl = require('../controllers/orgController');

router.use(isAuthenticated);

// Departments
router.get('/departments', orgCtrl.getDepartments);
router.post('/departments', requirePermission('employee', 'add'), orgCtrl.createDepartment);
router.put('/departments/:id', requirePermission('employee', 'edit'), orgCtrl.updateDepartment);
router.delete('/departments/:id', requirePermission('employee', 'delete'), orgCtrl.deleteDepartment);

// Designations
router.get('/designations', orgCtrl.getDesignations);
router.post('/designations', requirePermission('employee', 'add'), orgCtrl.createDesignation);
router.put('/designations/:id', requirePermission('employee', 'edit'), orgCtrl.updateDesignation);
router.delete('/designations/:id', requirePermission('employee', 'delete'), orgCtrl.deleteDesignation);

// Locations
router.get('/locations', orgCtrl.getLocations);
router.post('/locations', requirePermission('employee', 'add'), orgCtrl.createLocation);
router.put('/locations/:id', requirePermission('employee', 'edit'), orgCtrl.updateLocation);
router.delete('/locations/:id', requirePermission('employee', 'delete'), orgCtrl.deleteLocation);

module.exports = router;
