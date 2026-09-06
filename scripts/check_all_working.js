const http = require('http');

const endpoints = [
  '/',
  '/index-3.html',
  '/health',
  '/api/health/diagnostics',
  '/api/leaves/calculate-days?start_date=2026-09-10&end_date=2026-09-15',
  '/api/candidate/jobs',
  '/api/candidate/profile',
  '/api/pipeline/queue',
  '/api/notifications',
  '/api/notifications/unread-count',
  '/api/export/candidates?format=xlsx',
  '/api/export/attendance?format=xlsx',
  '/api/export/leaves?format=xlsx'
];

async function check() {
  console.log('Testing endpoints on http://localhost:3000...\n');
  for (const ep of endpoints) {
    await new Promise(resolve => {
      http.get('http://localhost:3000' + ep, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          const preview = data.slice(0, 100).replace(/\r?\n|\r/g, ' ');
          console.log(`[${res.statusCode}] ${ep} (${data.length} bytes) -> ${preview.slice(0, 60)}...`);
          resolve();
        });
      }).on('error', err => {
        console.log(`[ERR] ${ep}: ${err.message}`);
        resolve();
      });
    });
  }
}

check();
