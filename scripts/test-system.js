const axios = require('axios');
const path = require('path');

async function testHealth() {
  const port = process.env.PORT || 80;
  const urls = [`http://localhost:${port}/health`, 'http://localhost:3000/health', 'http://rankly.ai/health'];
  for (const url of urls) {
    try {
      const res = await axios.get(url, { timeout: 3000 });
      if (res.data && res.data.status === 'ok') {
        console.log(`✓ System Health Check: OK via ${url} (${res.data.engine})`);
        return true;
      }
    } catch (err) {}
  }
  console.warn('⚠️ Server not responding on port 80 or 3000 (might be offline or initializing).');
  return false;
}

testHealth().then(ok => {
  if (!ok) process.exit(1);
  console.log('✅ System Diagnostics Complete');
});
