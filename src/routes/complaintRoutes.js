const express = require('express');
const router = express.Router();
const { isAuthenticated } = require('../middleware/auth');
const { authorizeRoles } = require('../middleware/rbac');
const { supabase } = require('../config/supabaseClient');

// 1. कर्मचारी द्वारा नई शिकायत दर्ज करना (Complaint Submit)
router.post('/submit', isAuthenticated, async (req, res) => {
    try {
        const { category, subject, description, is_anonymous } = req.body;
        let employeeId = is_anonymous ? null : req.user.id; // अगर गुप्त है तो आईडी सेव नहीं होगी

        // If employee_id is not already an integer, resolve integer ID from Supabase employees table
        if (!is_anonymous && req.user) {
            if (req.user.employee_id) {
                employeeId = req.user.employee_id;
            } else if (typeof req.user.id === 'number' || /^\d+$/.test(req.user.id)) {
                employeeId = parseInt(req.user.id, 10);
            } else if (req.user.email) {
                const { data: emp } = await supabase
                    .from('employees')
                    .select('employee_id')
                    .eq('email', req.user.email.toLowerCase())
                    .single();
                if (emp) {
                    employeeId = emp.employee_id;
                } else {
                    employeeId = null;
                }
            }
        }

        const { data, error } = await supabase
            .from('complaints')
            .insert([
                {
                    employee_id: employeeId,
                    category: category || 'General',
                    subject: subject ? subject.trim() : 'General Inquiry',
                    description: description ? description.trim() : '',
                    is_anonymous: is_anonymous || false,
                    status: 'Pending'
                }
            ])
            .select();

        if (error) throw error;

        return res.status(201).json({
            success: true,
            message: 'Complaint submitted successfully and securely sent to Admin.',
            data: data && data[0] ? data[0] : data
        });
    } catch (err) {
        return res.status(500).json({ success: false, error: err.message });
    }
});

// 2. केवल Admin के लिए: सभी शिकायतें देखने का रूट
router.get('/admin/all', isAuthenticated, authorizeRoles('admin', 'hr', 'hr_manager'), async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('complaints')
            .select('*, employees(name, email)')
            .order('created_at', { ascending: false });

        if (error) throw error;

        return res.status(200).json({ success: true, data });
    } catch (err) {
        return res.status(500).json({ success: false, error: err.message });
    }
});

module.exports = router;
