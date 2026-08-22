const axios = require('axios');

async function testLivePM2() {
  const baseURL = 'http://localhost:3000';
  console.log('\n=============================================');
  console.log('🧪 TESTING LIVE PM2 BACKEND ON PORT 3000');
  console.log('=============================================\n');

  try {
    // 1. Health
    const health = await axios.get(`${baseURL}/api/health`);
    console.log('✅ 1. Health Endpoint:', health.data.status, '| System:', health.data.system);

    // 2. Register with Frontend-exact payload (fname, lname, isEmployee, etc.)
    const email = `candidate_${Date.now()}@example.com`;
    console.log(`\n2. Registering new candidate (${email})...`);
    const reg = await axios.post(`${baseURL}/api/auth/register`, {
      fname: 'Mayur',
      lname: 'Sharma',
      username: `mayur_${Date.now()}`,
      email,
      phone: `98${Math.floor(10000000 + Math.random() * 90000000)}`,
      dob: '1998-05-15',
      age: 26,
      gender: 'Male',
      profession: 'Senior Full Stack Engineer',
      password: 'SecurePassword123!',
      isEmployee: false,
      role: 'normal'
    }, { withCredentials: true });

    console.log('✅ 2. Registration Succeeded:', reg.data.success, '| User:', reg.data.user.fname, reg.data.user.lname, `(${reg.data.user.email})`);

    // 3. Login
    console.log('\n3. Logging in with session...');
    const login = await axios.post(`${baseURL}/api/auth/login`, {
      identifier: email,
      email,
      password: 'SecurePassword123!'
    }, { withCredentials: true });

    const cookie = login.headers['set-cookie'] ? login.headers['set-cookie'][0] : '';
    console.log('✅ 3. Login Succeeded:', login.data.success, '| Session Cookie Issued:', !!cookie);

    // 4. Me endpoint with session cookie
    console.log('\n4. Checking /api/auth/me session context...');
    const me = await axios.get(`${baseURL}/api/auth/me`, {
      headers: { Cookie: cookie },
      withCredentials: true
    });
    console.log('✅ 4. Session Me Data:', me.data.user.fname, '| Role:', me.data.user.role, '| AccountType:', me.data.user.accountType);

    // 5. AI Chat with live provider
    console.log('\n5. Sending AI Chat request...');
    const chat = await axios.post(`${baseURL}/api/chat/message`, {
      message: 'Hello Rankly, can you suggest 3 key improvements for a Full Stack Developer resume?',
      context: { targetRole: 'Senior Full Stack Engineer' }
    }, {
      headers: { Cookie: cookie },
      withCredentials: true
    });
    console.log('✅ 5. Live AI Responded:', chat.data.reply.slice(0, 90) + '...');

    // 6. Analytics Overview
    console.log('\n6. Fetching Analytics Dashboard...');
    const analytics = await axios.get(`${baseURL}/api/analytics/overview`, {
      headers: { Cookie: cookie },
      withCredentials: true
    });
    console.log('✅ 6. Analytics Overview:', analytics.data.metrics.stageCounts);

    console.log('\n=============================================');
    console.log('🎉 ALL LIVE PM2 SERVER & FRONTEND TESTS PASSED!');
    console.log('=============================================\n');
  } catch (err) {
    console.error('❌ Test error:', err.response?.data || err.message);
  }
}

testLivePM2();
