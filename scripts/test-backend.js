const axios = require('axios');
const prisma = require('../src/config/database');

async function testBackend() {
  // Start server as child process or require
  const { app, server } = require('../server');

  await new Promise(r => setTimeout(r, 1000));

  const baseURL = 'http://localhost:3000';
  console.log('Testing Rankly.ai Backend API...\n');

  try {
    // 1. Health
    const health = await axios.get(`${baseURL}/api/health`);
    console.log('✅ 1. Health Check:', health.data);

    // 2. Register
    const email = `test_${Date.now()}@example.com`;
    const reg = await axios.post(`${baseURL}/api/auth/register`, {
      firstName: 'Mayur',
      lastName: 'Dev',
      email,
      password: 'SecurePassword123!',
      accountType: 'normal_user',
      profession: 'Full Stack Engineer'
    });
    console.log('✅ 2. Registration Succeeded:', reg.data.user.email);

    // 3. Login
    const login = await axios.post(`${baseURL}/api/auth/login`, {
      email,
      password: 'SecurePassword123!'
    });
    const cookie = login.headers['set-cookie'] ? login.headers['set-cookie'][0] : '';
    console.log('✅ 3. Session Login Succeeded! Cookie:', cookie.split(';')[0]);

    // 4. Session Me
    const me = await axios.get(`${baseURL}/api/auth/me`, {
      headers: { Cookie: cookie }
    });
    console.log('✅ 4. Authenticated /api/auth/me:', me.data.user.firstName, `(${me.data.user.email})`);

    // 5. Chat
    const chat = await axios.post(`${baseURL}/api/chat/message`, {
      message: 'Hello Rankly AI, what are the top skills for a backend engineer?',
      context: { targetRole: 'Backend Engineer' }
    });
    console.log('✅ 5. AI Chat Responded:', chat.data.reply.slice(0, 75) + '...');

    // 6. Analytics
    const analytics = await axios.get(`${baseURL}/api/analytics/overview`);
    console.log('✅ 6. Analytics Overview Metrics:', analytics.data.metrics.stageCounts);

    console.log('\n=============================================');
    console.log('🏆 ALL 6 BACKEND TESTS PASSED CLEANLY & 100%!');
    console.log('=============================================\n');
  } catch (err) {
    console.error('❌ Test error:', err.response?.data || err.message);
  } finally {
    server.close();
    await prisma.$disconnect();
    setTimeout(() => process.exit(0), 500);
  }
}

testBackend();
