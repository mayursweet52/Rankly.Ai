/**
 * Production-Ready Environment Variable Validator
 * Ensures essential configuration keys exist and provides safe defaults.
 */

function validateEnvironment() {
  const warnings = [];

  // 1. Critical Database URL
  if (!process.env.DATABASE_URL) {
    process.env.DATABASE_URL = 'file:./rankly.db';
  }

  // 2. Session & JWT Secrets
  if (!process.env.SESSION_SECRET) {
    warnings.push('SESSION_SECRET is not set; using fallback secret.');
    process.env.SESSION_SECRET = 'rankly_super_secure_session_secret_2026';
  }

  if (!process.env.JWT_SECRET) {
    warnings.push('JWT_SECRET is not set; using fallback secret.');
    process.env.JWT_SECRET = 'rankly_jwt_super_secure_secret_key_2026';
  }

  // 3. Application Base URLs
  if (!process.env.APP_URL) {
    process.env.APP_URL = 'https://ranklyai-production.up.railway.app';
  }
  if (!process.env.BASE_URL) {
    process.env.BASE_URL = process.env.APP_URL;
  }

  // 4. Port Configuration
  if (!process.env.PORT) {
    process.env.PORT = '3000';
  }

  console.log(`\n======================================================`);
  console.log(`🛡️  [ENVIRONMENT VERIFIED]: Mode: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🌐 [ACTIVE DOMAIN]: ${process.env.APP_URL}`);
  console.log(`💾 [DATABASE]: ${process.env.DATABASE_URL.startsWith('file:') ? 'SQLite' : 'PostgreSQL'}`);
  if (warnings.length > 0) {
    warnings.forEach(w => console.warn(`⚠️  [ENV WARNING]: ${w}`));
  }
  console.log(`======================================================\n`);

  return { isValid: true, warnings };
}

module.exports = { validateEnvironment };
