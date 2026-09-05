/**
 * Rankly.ai — Internal HRMS Document Parsing Service
 * Extracts text from PDF, DOCX, and Plaintext corporate files
 */

const fs = require('fs');
const path = require('path');
const pdfParse = require('pdf-parse');
const mammoth = require('mammoth');

/**
 * Extract text from a document buffer or file path
 * @param {Buffer|string} source - Buffer or absolute file path
 * @param {string} originalName - Original file name with extension
 * @returns {Promise<{ text: string, pageCount?: number, format: string }>}
 */
async function extractDocumentText(source, originalName = '') {
  let buffer = Buffer.isBuffer(source) ? source : null;
  if (!buffer && typeof source === 'string') {
    if (fs.existsSync(source)) {
      buffer = fs.readFileSync(source);
      if (!originalName) originalName = path.basename(source);
    } else {
      throw new Error(`Document file not found at path: ${source}`);
    }
  }

  if (!buffer) {
    throw new Error('Valid document buffer or file path is required for extraction.');
  }

  const ext = (path.extname(originalName || '').toLowerCase() || '').replace('.', '');

  // 1. PDF Parsing
  if (ext === 'pdf') {
    try {
      const pdfData = await pdfParse(buffer);
      return {
        text: (pdfData.text || '').trim(),
        pageCount: pdfData.numpages || 1,
        format: 'pdf'
      };
    } catch (err) {
      console.error('PDF parsing error:', err.message);
      throw new Error(`Failed to parse PDF document: ${err.message}`);
    }
  }

  // 2. Word (.docx / .doc) Parsing via Mammoth
  if (ext === 'docx' || ext === 'doc') {
    try {
      const result = await mammoth.extractRawText({ buffer });
      return {
        text: (result.value || '').trim(),
        pageCount: 1,
        format: ext
      };
    } catch (err) {
      console.error('DOCX parsing error:', err.message);
      throw new Error(`Failed to parse Word document: ${err.message}`);
    }
  }

  // 3. Plaintext, Markdown, HTML, CSV fallback
  try {
    const textContent = buffer.toString('utf-8').trim();
    return {
      text: textContent,
      pageCount: 1,
      format: ext || 'txt'
    };
  } catch (err) {
    throw new Error(`Failed to extract text from plain document: ${err.message}`);
  }
}

/**
 * Format bytes into human readable string
 */
function formatFileSize(bytes) {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

module.exports = {
  extractDocumentText,
  formatFileSize
};
