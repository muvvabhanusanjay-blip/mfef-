const http = require('http');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '.env') });
const User = require('./models/User');

// Helper function to send HTTP requests with cookie retention
function makeRequest(server, options, postData, sessionCookie = null) {
  return new Promise((resolve, reject) => {
    const reqOptions = {
      hostname: '127.0.0.1',
      port: server.address().port,
      path: options.path,
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(sessionCookie ? { Cookie: sessionCookie } : {})
      }
    };

    const req = http.request(reqOptions, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        let parsed = null;
        try {
          parsed = JSON.parse(data);
        } catch (e) {
          parsed = data;
        }

        // Extract set-cookie if present
        let newCookie = sessionCookie;
        const setCookieHeader = res.headers['set-cookie'];
        if (setCookieHeader && setCookieHeader.length > 0) {
          newCookie = setCookieHeader[0].split(';')[0];
        }

        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: parsed,
          cookie: newCookie
        });
      });
    });

    req.on('error', reject);

    if (postData) {
      req.write(JSON.stringify(postData));
    }
    req.end();
  });
}

async function runAuthTests() {
  console.log('\n==========================================');
  console.log('🧪 Starting Phase 4 Authentication API Tests');
  console.log('==========================================\n');

  process.env.NODE_ENV = 'test';
  const app = require('./server');

  // Start test server on ephemeral random port
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;
  console.log(`[Test Server] Running on temporary port ${port}`);

  const testUser = {
    name: 'Juhitha Developer',
    email: `auth_test_${Date.now()}@spendwise.com`,
    password: 'SecurePassword123!',
    confirmPassword: 'SecurePassword123!',
    currency: 'INR'
  };

  let sessionCookie = null;

  try {
    // Test 1: Signup
    console.log('1️⃣  Testing POST /api/auth/signup...');
    const signupRes = await makeRequest(
      server,
      { path: '/api/auth/signup', method: 'POST' },
      testUser
    );
    if (signupRes.statusCode === 201 && signupRes.body.success) {
      sessionCookie = signupRes.cookie;
      console.log('   ✅ Signup succeeded. Session cookie acquired:', sessionCookie);
    } else {
      throw new Error(`Signup failed with status ${signupRes.statusCode}: ${JSON.stringify(signupRes.body)}`);
    }

    // Test 2: Duplicate email rejection
    console.log('2️⃣  Testing Duplicate Email Prevention (Expect 409)...');
    const dupRes = await makeRequest(
      server,
      { path: '/api/auth/signup', method: 'POST' },
      testUser
    );
    if (dupRes.statusCode === 409) {
      console.log('   ✅ Duplicate signup properly rejected (409 Conflict)');
    } else {
      throw new Error(`Expected 409 for duplicate signup, got ${dupRes.statusCode}`);
    }

    // Test 3: Protected route with session
    console.log('3️⃣  Testing GET /api/auth/me (Authenticated)...');
    const meRes = await makeRequest(
      server,
      { path: '/api/auth/me', method: 'GET' },
      null,
      sessionCookie
    );
    if (meRes.statusCode === 200 && meRes.body.user.email === testUser.email) {
      console.log(`   ✅ Protected route returned profile: ${meRes.body.user.name} (${meRes.body.user.email})`);
      if (meRes.body.user.passwordHash) {
        throw new Error('SECURITY VIOLATION: passwordHash was leaked in profile response!');
      }
      console.log('   ✅ Password hash safely excluded from response.');
    } else {
      throw new Error(`Protected route failed: ${JSON.stringify(meRes.body)}`);
    }

    // Test 4: Protected route without session (Expect 401)
    console.log('4️⃣  Testing GET /api/auth/me without Cookie (Expect 401)...');
    const unauthRes = await makeRequest(server, { path: '/api/auth/me', method: 'GET' }, null, null);
    if (unauthRes.statusCode === 401) {
      console.log('   ✅ Unauthorized request correctly blocked (401 Unauthorized)');
    } else {
      throw new Error(`Expected 401 Unauthorized, got ${unauthRes.statusCode}`);
    }

    // Test 5: Update Profile
    console.log('5️⃣  Testing PUT /api/profile (Name & Currency Update)...');
    const updateRes = await makeRequest(
      server,
      { path: '/api/profile', method: 'PUT' },
      { name: 'Juhitha Updated', currency: 'USD' },
      sessionCookie
    );
    if (updateRes.statusCode === 200 && updateRes.body.user.currency === 'USD') {
      console.log('   ✅ Profile updated successfully: currency is now USD');
    } else {
      throw new Error(`Profile update failed: ${JSON.stringify(updateRes.body)}`);
    }

    // Test 6: Update Password
    console.log('6️⃣  Testing PUT /api/profile/password...');
    const newPassword = 'NewSecretPassword456!';
    const pwdRes = await makeRequest(
      server,
      { path: '/api/profile/password', method: 'PUT' },
      { currentPassword: testUser.password, newPassword },
      sessionCookie
    );
    if (pwdRes.statusCode === 200) {
      console.log('   ✅ Password changed successfully');
    } else {
      throw new Error(`Password change failed: ${JSON.stringify(pwdRes.body)}`);
    }

    // Test 7: Logout
    console.log('7️⃣  Testing POST /api/auth/logout...');
    const logoutRes = await makeRequest(
      server,
      { path: '/api/auth/logout', method: 'POST' },
      null,
      sessionCookie
    );
    if (logoutRes.statusCode === 200) {
      console.log('   ✅ Session destroyed and logged out');
    } else {
      throw new Error(`Logout failed: ${JSON.stringify(logoutRes.body)}`);
    }

    // Test 8: Verify access blocked after logout
    console.log('8️⃣  Testing GET /api/auth/me After Logout (Expect 401)...');
    const afterLogoutRes = await makeRequest(
      server,
      { path: '/api/auth/me', method: 'GET' },
      null,
      sessionCookie
    );
    if (afterLogoutRes.statusCode === 401) {
      console.log('   ✅ Session successfully invalidated (401 Unauthorized)');
    } else {
      throw new Error(`Expected 401 after logout, got ${afterLogoutRes.statusCode}`);
    }

    // Test 9: Login with new password
    console.log('9️⃣  Testing POST /api/auth/login with New Password...');
    const loginRes = await makeRequest(
      server,
      { path: '/api/auth/login', method: 'POST' },
      { email: testUser.email, password: newPassword }
    );
    if (loginRes.statusCode === 200 && loginRes.body.success) {
      console.log('   ✅ Re-login with new password succeeded!');
    } else {
      throw new Error(`Login with new password failed: ${JSON.stringify(loginRes.body)}`);
    }

    // Cleanup: Remove test user
    await User.deleteOne({ email: testUser.email });
    console.log('\n🧹 [Cleanup] Test user removed from database.');

    console.log('\n🎉 ALL PHASE 4 AUTHENTICATION TESTS PASSED!\n');
    server.close();
    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('\n❌ Test Execution Failed:', err.message);
    if (server) server.close();
    await mongoose.disconnect();
    process.exit(1);
  }
}

runAuthTests();
