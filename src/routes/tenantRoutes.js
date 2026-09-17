const express = require('express');
const router = express.Router();
const prisma = require('../config/database');

// Resolve Company Code to verify Tenant exists
router.get('/resolve', async (req, res) => {
    const { code } = req.query;
    if (!code) return res.status(400).json({ success: false, message: 'Company Code is required' });

    try {
        const org = await prisma.organization.findUnique({
            where: { tenantCode: code }
        });

        if (!org) {
            return res.status(404).json({ success: false, message: 'Invalid Company Code' });
        }

        return res.json({
            success: true,
            data: {
                tenantCode: org.tenantCode,
                companyName: org.name,
                // Do NOT expose ID or internal DB strings here for security
            }
        });
    } catch (e) {
        return res.status(500).json({ success: false, message: 'Server error resolving tenant' });
    }
});

module.exports = router;
