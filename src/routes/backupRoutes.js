/**
 * Rankly.ai - Database Backup & Restoration Routes
 * Specification: Lead Vaibhav (Module 3.3)
 */

'use strict';

const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const dbBackupService = require('../services/dbBackupService');

/**
 * POST /api/backup/trigger
 * Manually generate an encrypted backup snapshot
 */
router.post('/trigger', async (req, res) => {
  try {
    const { encrypted = true } = req.body || {};
    const result = await dbBackupService.createBackup({
      encrypted: encrypted !== false,
      automated: false
    });

    return res.json({
      success: true,
      message: 'Encrypted database backup created successfully.',
      backup: result.manifest
    });
  } catch (err) {
    console.error('Backup Trigger Error:', err);
    return res.status(500).json({
      success: false,
      error: 'Failed to create database backup',
      message: err.message
    });
  }
});

/**
 * GET /api/backup/list
 * List all backup snapshots in the backups directory
 */
router.get('/list', (req, res) => {
  try {
    const backups = dbBackupService.listBackups();
    return res.json({
      success: true,
      count: backups.length,
      backups
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: 'Failed to list backups',
      message: err.message
    });
  }
});

/**
 * GET /api/backup/download/:filename
 * Securely download a specific backup snapshot
 */
router.get('/download/:filename', (req, res) => {
  try {
    const { filename } = req.params;
    // Sanitize filename to prevent directory traversal
    const safeFilename = path.basename(filename);
    const filePath = path.join(dbBackupService.backupDir, safeFilename);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        success: false,
        error: 'Backup file not found.'
      });
    }

    res.setHeader('Content-Disposition', `attachment; filename="${safeFilename}"`);
    res.setHeader('Content-Type', 'application/octet-stream');
    return fs.createReadStream(filePath).pipe(res);
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: 'Download error',
      message: err.message
    });
  }
});

/**
 * POST /api/backup/verify/:filename
 * Verify snapshot integrity and AES-256 decipherability
 */
router.post('/verify/:filename', (req, res) => {
  try {
    const { filename } = req.params;
    const safeFilename = path.basename(filename);
    const result = dbBackupService.verifyBackup(safeFilename);

    return res.json({
      success: true,
      message: 'Backup integrity verified successfully.',
      verification: result
    });
  } catch (err) {
    return res.status(400).json({
      success: false,
      error: 'Backup verification failed',
      message: err.message
    });
  }
});

module.exports = router;
