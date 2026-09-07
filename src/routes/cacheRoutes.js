/**
 * Rankly.ai - Cache Management & Telemetry API
 * Specification: Lead Vaibhav (Module 3.2)
 */

'use strict';

const express = require('express');
const router = express.Router();
const redisCacheService = require('../services/redisCacheService');

/**
 * GET /api/cache/stats
 * Telemetry endpoint for cache hit ratio, memory usage, key count, and active engine
 */
router.get('/stats', (req, res) => {
  try {
    const stats = redisCacheService.getStats();
    return res.json({
      success: true,
      data: stats
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: 'Failed to retrieve cache stats',
      message: err.message
    });
  }
});

/**
 * POST /api/cache/clear
 * Clear all cache or keys matching a specific pattern
 */
router.post('/clear', async (req, res) => {
  try {
    const { pattern } = req.body || {};
    if (pattern) {
      const clearedCount = await redisCacheService.delPattern(pattern);
      return res.json({
        success: true,
        message: `Cleared ${clearedCount} cached keys matching pattern "${pattern}".`,
        clearedCount
      });
    }

    await redisCacheService.flush();
    return res.json({
      success: true,
      message: 'All application caches flushed successfully.'
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: 'Failed to clear cache',
      message: err.message
    });
  }
});

module.exports = router;
