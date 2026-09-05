const express = require('express');
const router = express.Router();
const ExcelJS = require('exceljs');
const { PDFDocument, rgb, StandardFonts } = require('pdf-lib');
const prisma = require('../config/database');
const pgDb = require('../config/pgDatabase');
const { optionalAuth } = require('../middleware/auth');

async function generateSimplePdfReport({ title, subtitle, columns, rows }) {
  const pdfDoc = await PDFDocument.create();
  let page = pdfDoc.addPage([842, 595]); // A4 Landscape
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);

  const primaryColor = rgb(0.09, 0.23, 0.20);
  const grayColor = rgb(0.4, 0.4, 0.4);
  const borderColor = rgb(0.85, 0.85, 0.82);
  const rowAltColor = rgb(0.97, 0.97, 0.96);

  let y = 550;

  page.drawText('Rankly.ai', { x: 40, y, size: 20, font: fontBold, color: primaryColor });
  y -= 16;
  page.drawText(title, { x: 40, y, size: 14, font: fontBold, color: rgb(0.1, 0.1, 0.1) });
  y -= 14;
  page.drawText(`${subtitle} • Generated on ${new Date().toLocaleString('en-IN')}`, {
    x: 40,
    y,
    size: 9,
    font: fontRegular,
    color: grayColor
  });
  y -= 20;

  const startX = 40;
  const totalWidth = 762;
  const colWidth = totalWidth / columns.length;
  const rowHeight = 22;

  page.drawRectangle({
    x: startX,
    y: y - 5,
    width: totalWidth,
    height: rowHeight,
    color: primaryColor
  });

  columns.forEach((col, i) => {
    page.drawText(col.label, {
      x: startX + (i * colWidth) + 6,
      y: y + 2,
      size: 9,
      font: fontBold,
      color: rgb(1, 1, 1)
    });
  });
  y -= rowHeight;

  for (let rIdx = 0; rIdx < rows.length; rIdx++) {
    if (y < 40) {
      page = pdfDoc.addPage([842, 595]);
      y = 550;
    }

    const row = rows[rIdx];
    if (rIdx % 2 === 1) {
      page.drawRectangle({
        x: startX,
        y: y - 5,
        width: totalWidth,
        height: rowHeight,
        color: rowAltColor
      });
    }

    page.drawLine({
      start: { x: startX, y: y - 5 },
      end: { x: startX + totalWidth, y: y - 5 },
      thickness: 0.5,
      color: borderColor
    });

    columns.forEach((col, i) => {
      const val = String(row[col.key] ?? '').slice(0, 30);
      page.drawText(val, {
        x: startX + (i * colWidth) + 6,
        y: y + 2,
        size: 8.5,
        font: fontRegular,
        color: rgb(0.15, 0.15, 0.15)
      });
    });

    y -= rowHeight;
  }

  return await pdfDoc.save();
}

router.get('/candidates', optionalAuth, async (req, res) => {
  try {
    const format = (req.query.format || 'xlsx').toLowerCase().trim();
    const stageFilter = req.query.stage || null;
    const roleFilter = req.query.role || null;

    const where = {};
    if (stageFilter && stageFilter !== 'all') {
      if (stageFilter === 'shortlisted') {
        where.stage = { in: ['interview', 'offered', 'hired', 'ai_screened'] };
      } else {
        where.stage = stageFilter;
      }
    }
    if (roleFilter && roleFilter !== 'all') {
      where.targetRole = { contains: roleFilter };
    }

    const candidates = await prisma.candidate.findMany({
      where,
      orderBy: [{ score: 'desc' }, { createdAt: 'desc' }]
    });

    const rows = candidates.map(c => ({
      name: c.name || 'Unnamed Candidate',
      email: c.email || 'N/A',
      phone: c.phone || 'N/A',
      targetRole: c.targetRole || 'General Applicant',
      score: c.score ? `${Math.round(c.score)}%` : '0%',
      stage: (c.stage || 'applied').toUpperCase().replace('_', ' '),
      fitVerdict: c.fitVerdict || 'Evaluated',
      skillsScore: c.skillsScore ? `${Math.round(c.skillsScore)}%` : '0%',
      experienceScore: c.experienceScore ? `${Math.round(c.experienceScore)}%` : '0%',
      appliedAt: c.createdAt ? new Date(c.createdAt).toLocaleDateString('en-IN') : 'N/A',
      notes: (c.notes || '').replace(/[\r\n]+/g, ' ')
    }));

    if (format === 'pdf') {
      const pdfBytes = await generateSimplePdfReport({
        title: 'Candidate Talent Pipeline & Shortlist Report',
        subtitle: `Total Records: ${rows.length} candidates`,
        columns: [
          { key: 'name', label: 'Candidate Name' },
          { key: 'email', label: 'Email Address' },
          { key: 'targetRole', label: 'Target Role' },
          { key: 'score', label: 'ATS Score' },
          { key: 'stage', label: 'Pipeline Stage' },
          { key: 'fitVerdict', label: 'AI Fit Verdict' },
          { key: 'appliedAt', label: 'Applied Date' }
        ],
        rows
      });

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', 'attachment; filename="Rankly_Candidates_Report.pdf"');
      return res.send(Buffer.from(pdfBytes));
    }

    if (format === 'csv') {
      const headers = ['Candidate Name', 'Email', 'Phone', 'Target Role', 'ATS Score', 'Stage', 'Fit Verdict', 'Skills Score', 'Experience Score', 'Applied Date', 'Notes'];
      const csvLines = [headers.join(',')];
      rows.forEach(r => {
        csvLines.push([
          `"${r.name.replace(/"/g, '""')}"`,
          `"${r.email.replace(/"/g, '""')}"`,
          `"${r.phone.replace(/"/g, '""')}"`,
          `"${r.targetRole.replace(/"/g, '""')}"`,
          `"${r.score}"`,
          `"${r.stage}"`,
          `"${r.fitVerdict}"`,
          `"${r.skillsScore}"`,
          `"${r.experienceScore}"`,
          `"${r.appliedAt}"`,
          `"${r.notes.replace(/"/g, '""')}"`
        ].join(','));
      });
      const csvContent = '\uFEFF' + csvLines.join('\n');
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', 'attachment; filename="Rankly_Candidates_Export.csv"');
      return res.send(csvContent);
    }

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Rankly.ai Talent Intelligence';
    workbook.created = new Date();

    const sheet = workbook.addWorksheet('Candidates Pipeline', {
      views: [{ state: 'frozen', ySplit: 1 }]
    });

    sheet.columns = [
      { header: 'Candidate Name', key: 'name', width: 24 },
      { header: 'Email Address', key: 'email', width: 26 },
      { header: 'Phone Number', key: 'phone', width: 16 },
      { header: 'Target Role', key: 'targetRole', width: 22 },
      { header: 'ATS Score', key: 'score', width: 14 },
      { header: 'Pipeline Stage', key: 'stage', width: 18 },
      { header: 'AI Fit Verdict', key: 'fitVerdict', width: 18 },
      { header: 'Skills Score', key: 'skillsScore', width: 14 },
      { header: 'Experience Score', key: 'experienceScore', width: 16 },
      { header: 'Applied Date', key: 'appliedAt', width: 15 },
      { header: 'Notes & Remarks', key: 'notes', width: 32 }
    ];

    const headerRow = sheet.getRow(1);
    headerRow.height = 28;
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF183B33' }
    };
    headerRow.alignment = { vertical: 'middle', horizontal: 'center' };

    rows.forEach((r, idx) => {
      const row = sheet.addRow(r);
      row.height = 22;
      row.alignment = { vertical: 'middle' };
      if (idx % 2 === 1) {
        row.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFF9FAF8' }
        };
      }
    });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="Rankly_Candidates_Shortlist.xlsx"');

    await workbook.xlsx.write(res);
    return res.end();
  } catch (err) {
    console.error('Candidate Export Error:', err);
    return res.status(500).json({ success: false, message: 'Failed to export candidates: ' + err.message });
  }
});

router.get('/employees', optionalAuth, async (req, res) => {
  try {
    const format = (req.query.format || 'xlsx').toLowerCase().trim();
    const deptFilter = req.query.department || null;
    const statusFilter = req.query.status || null;

    let employees = [];
    try {
      let q = 'SELECT * FROM employees';
      const conds = [];
      const params = [];
      if (deptFilter && deptFilter !== 'all') {
        params.push(deptFilter);
        conds.push(`department = $${params.length}`);
      }
      if (statusFilter && statusFilter !== 'all') {
        params.push(statusFilter);
        conds.push(`status = $${params.length}`);
      }
      if (conds.length > 0) {
        q += ' WHERE ' + conds.join(' AND ');
      }
      q += ' ORDER BY employee_id ASC;';
      const pgRes = await pgDb.query(q, params);
      employees = pgRes.rows || [];
    } catch (e) {
      console.warn('PG employee fetch failed, falling back to prisma:', e.message);
      employees = await prisma.employee.findMany().catch(() => []);
    }

    const rows = employees.map(e => ({
      code: `EMP-${String(e.employee_id || e.id).padStart(3, '0')}`,
      fullName: e.full_name || e.name || 'Staff Member',
      email: e.email || 'N/A',
      department: e.department || 'General Operations',
      role: e.role || e.designation || 'Specialist',
      status: (e.status || 'Active').toUpperCase(),
      phone: e.contact_number || e.phone || 'N/A',
      joined: e.joining_date ? new Date(e.joining_date).toLocaleDateString('en-IN') : '2024-01-15'
    }));

    if (format === 'pdf') {
      const pdfBytes = await generateSimplePdfReport({
        title: 'Staff Workforce & Employee Directory',
        subtitle: `Total Headcount: ${rows.length} active employees`,
        columns: [
          { key: 'code', label: 'ID Code' },
          { key: 'fullName', label: 'Employee Name' },
          { key: 'email', label: 'Corporate Email' },
          { key: 'department', label: 'Department' },
          { key: 'role', label: 'Job Role' },
          { key: 'status', label: 'Employment Status' },
          { key: 'joined', label: 'Joining Date' }
        ],
        rows
      });

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', 'attachment; filename="Rankly_Employees_Roster.pdf"');
      return res.send(Buffer.from(pdfBytes));
    }

    if (format === 'csv') {
      const headers = ['Employee ID', 'Full Name', 'Corporate Email', 'Department', 'Job Role', 'Status', 'Phone Number', 'Joining Date'];
      const csvLines = [headers.join(',')];
      rows.forEach(r => {
        csvLines.push([
          `"${r.code}"`,
          `"${r.fullName.replace(/"/g, '""')}"`,
          `"${r.email.replace(/"/g, '""')}"`,
          `"${r.department.replace(/"/g, '""')}"`,
          `"${r.role.replace(/"/g, '""')}"`,
          `"${r.status}"`,
          `"${r.phone}"`,
          `"${r.joined}"`
        ].join(','));
      });
      const csvContent = '\uFEFF' + csvLines.join('\n');
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', 'attachment; filename="Rankly_Employees_Export.csv"');
      return res.send(csvContent);
    }

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Rankly.ai HRMS';
    workbook.created = new Date();

    const sheet = workbook.addWorksheet('Staff Directory', {
      views: [{ state: 'frozen', ySplit: 1 }]
    });

    sheet.columns = [
      { header: 'Employee ID', key: 'code', width: 16 },
      { header: 'Full Name', key: 'fullName', width: 24 },
      { header: 'Corporate Email', key: 'email', width: 28 },
      { header: 'Department', key: 'department', width: 22 },
      { header: 'Job Role & Designation', key: 'role', width: 26 },
      { header: 'Status', key: 'status', width: 14 },
      { header: 'Contact Number', key: 'phone', width: 18 },
      { header: 'Joining Date', key: 'joined', width: 16 }
    ];

    const headerRow = sheet.getRow(1);
    headerRow.height = 28;
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF183B33' }
    };
    headerRow.alignment = { vertical: 'middle', horizontal: 'center' };

    rows.forEach((r, idx) => {
      const row = sheet.addRow(r);
      row.height = 22;
      row.alignment = { vertical: 'middle' };
      if (idx % 2 === 1) {
        row.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFF9FAF8' }
        };
      }
    });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="Rankly_Employees_Directory.xlsx"');

    await workbook.xlsx.write(res);
    return res.end();
  } catch (err) {
    console.error('Employees Export Error:', err);
    return res.status(500).json({ success: false, message: 'Failed to export employees: ' + err.message });
  }
});

module.exports = router;
