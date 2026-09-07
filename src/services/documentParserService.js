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
 * Multi-Language Vocabulary Map for Cross-Lingual Resume Normalization
 */
const MULTILINGUAL_DICTIONARY = {
  // Hindi (Devanagari & Transliterated)
  hi: {
    experience: ['अनुभव', 'कार्य अनुभव', 'रोजगार इतिहास', 'anubhav', 'karya anubhav'],
    skills: ['कौशल', 'तकनीकी ज्ञान', 'योग्यता', 'kaushal', 'dakshata'],
    education: ['शिक्षा', 'शैक्षणिक योग्यता', 'shiksha', 'padhai'],
    projects: ['परियोजनाएं', 'प्रोजेक्ट', 'projects', 'karya'],
    certifications: ['प्रमाणपत्र', 'प्रमाणीकरण', 'pramanpatra'],
    contact: ['संपर्क', 'ईमेल', 'फोन', 'sampark', 'pata']
  },
  // Spanish
  es: {
    experience: ['experiencia laboral', 'experiencia profesional', 'historial laboral'],
    skills: ['habilidades técnicas', 'competencias', 'conocimientos'],
    education: ['educación', 'formación académica', 'estudios'],
    projects: ['proyectos', 'proyectos destacados'],
    certifications: ['certificaciones', 'diplomas'],
    contact: ['contacto', 'teléfono', 'correo electrónico']
  },
  // French
  fr: {
    experience: ['expérience professionnelle', 'parcours professionnel'],
    skills: ['compétences techniques', 'aptitudes', 'savoir-faire'],
    education: ['formation', 'éducation', 'diplômes'],
    projects: ['projets', 'réalisations'],
    certifications: ['certifications', 'certificats'],
    contact: ['contact', 'coordonnées']
  },
  // German
  de: {
    experience: ['berufserfahrung', 'werdegang', 'arbeitserfahrung'],
    skills: ['fachkenntnisse', 'fähigkeiten', 'kompetenzen'],
    education: ['ausbildung', 'studium', 'schulbildung'],
    projects: ['projekte', 'referenzen'],
    certifications: ['zertifikate', 'zertifizierungen'],
    contact: ['kontakt', 'kontaktinformationen']
  }
};

/**
 * Detect Language and Normalize Multilingual Resume Content into English Structured Tokens
 * @param {string} rawText
 * @returns {{ language: string, confidence: number, normalizedText: string, detectedSections: object }}
 */
function detectAndNormalizeLanguage(rawText) {
  if (!rawText || typeof rawText !== 'string') {
    return { language: 'en', confidence: 1.0, normalizedText: '', detectedSections: {} };
  }

  const sample = rawText.toLowerCase();
  let detectedLang = 'en';
  let maxMatches = 0;

  // 1. Detect language by vocabulary matches
  for (const [lang, dict] of Object.entries(MULTILINGUAL_DICTIONARY)) {
    let matches = 0;
    for (const terms of Object.values(dict)) {
      for (const term of terms) {
        if (sample.includes(term)) matches++;
      }
    }
    if (matches > maxMatches) {
      maxMatches = matches;
      detectedLang = lang;
    }
  }

  // Devanagari script detection check
  if (/[\u0900-\u097F]/.test(rawText)) {
    detectedLang = 'hi';
  }

  let normalizedText = rawText;
  const detectedSections = {
    experience: false,
    skills: false,
    education: false,
    projects: false,
    certifications: false
  };

  // 2. Map language-specific headers to canonical English section headers
  if (detectedLang !== 'en' && MULTILINGUAL_DICTIONARY[detectedLang]) {
    const dict = MULTILINGUAL_DICTIONARY[detectedLang];
    for (const [canonical, variants] of Object.entries(dict)) {
      for (const variant of variants) {
        if (normalizedText.toLowerCase().includes(variant.toLowerCase())) {
          detectedSections[canonical] = true;
          // Escape special regex chars
          const escaped = variant.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          const regex = new RegExp(escaped, 'gi');
          normalizedText = normalizedText.replace(regex, `\n\n--- [SECTION: ${canonical.toUpperCase()}] ---\n`);
        }
      }
    }
  }

  const confidenceScore = maxMatches > 0 ? Math.min(0.98, 0.6 + maxMatches * 0.1) : (detectedLang === 'hi' ? 0.95 : 0.85);

  return {
    language: detectedLang,
    detectedLanguage: detectedLang,
    confidence: confidenceScore,
    languageConfidence: confidenceScore,
    normalizedText,
    detectedSections,
    normalizedSections: detectedSections
  };
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
  detectAndNormalizeLanguage,
  formatFileSize,
  MULTILINGUAL_DICTIONARY
};

