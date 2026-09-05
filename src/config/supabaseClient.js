/**
 * Anti-Gravity Supabase Client
 * Initialized according to official Supabase agent-skills best practices.
 */

// Polyfill WebSocket for Node versions without native WebSocket
if (typeof globalThis.WebSocket === 'undefined') {
  try {
    globalThis.WebSocket = require('ws');
  } catch (e) {}
}

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '').trim();
const supabaseKey = (
  process.env.SUPABASE_SERVICE_ROLE_KEY || 
  process.env.SUPABASE_ANON_KEY || 
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  ''
).trim();

let supabase = null;

if (supabaseUrl && supabaseKey) {
  supabase = createClient(supabaseUrl, supabaseKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  });
  console.log('✅ Supabase Client initialized successfully.');
} else {
  // Proxy fallback before user provides credentials
  supabase = {
    isConfigured: false,
    from: (table) => {
      return {
        select: async () => ({ data: null, error: new Error('Supabase not configured in .env. Set SUPABASE_URL and SUPABASE_ANON_KEY.') }),
        insert: async () => ({ data: null, error: new Error('Supabase not configured in .env. Set SUPABASE_URL and SUPABASE_ANON_KEY.') }),
        update: async () => ({ data: null, error: new Error('Supabase not configured in .env. Set SUPABASE_URL and SUPABASE_ANON_KEY.') }),
        delete: async () => ({ data: null, error: new Error('Supabase not configured in .env. Set SUPABASE_URL and SUPABASE_ANON_KEY.') })
      };
    }
  };
}

// Support both const supabase = require(...) and const { supabase } = require(...)
supabase.supabase = supabase;

module.exports = supabase;
