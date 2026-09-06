const http = require('http');

const payload = JSON.stringify({
  companyName: 'Twitch',
  boardSlug: 'twitch'
});

const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/api/jobs/ingest/greenhouse',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(payload)
  }
};

console.log('Sending Greenhouse ingestion request for Twitch to http://localhost:3000/api/jobs/ingest/greenhouse ...');

const req = http.request(options, (res) => {
  let body = '';
  res.on('data', chunk => body += chunk);
  res.on('end', () => {
    console.log(`\nHTTP Status: ${res.statusCode}`);
    try {
      const parsed = JSON.parse(body);
      console.log('Response Payload:\n', JSON.stringify(parsed, null, 2));
    } catch (e) {
      console.log('Raw Response:', body);
    }
  });
});

req.on('error', (e) => {
  console.error('Request Error:', e.message);
});

req.write(payload);
req.end();
