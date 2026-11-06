const http = require('http');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '.env') });
const User = require('./models/User');
const Transaction = require('./models/Transaction');

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
    if (postData) req.write(JSON.stringify(postData));
    req.end();
  });
}

async function runTransactionTests() {
  console.log('\n===============================================');
  console.log('🧪 Starting Phase 5 Transaction & Isolation Tests');
  console.log('===============================================\n');

  process.env.NODE_ENV = 'test';
  const app = require('./server');

  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;
  console.log(`[Test Server] Running on ephemeral port ${port}`);

  const userAData = {
    name: 'User Alpha',
    email: `alpha_${Date.now()}@spendwise.com`,
    password: 'Password123!',
    currency: 'INR'
  };

  const userBData = {
    name: 'User Beta',
    email: `beta_${Date.now()}@spendwise.com`,
    password: 'Password123!',
    currency: 'INR'
  };

  let cookieA = null;
  let cookieB = null;
  let transactionAId = null;

  try {
    // 1. Register User A
    console.log('1️⃣  Registering User A...');
    const regARes = await makeRequest(
      server,
      { path: '/api/auth/signup', method: 'POST' },
      userAData
    );
    cookieA = regARes.cookie;
    console.log('   ✅ User A registered with session.');

    // 2. Register User B
    console.log('2️⃣  Registering User B...');
    const regBRes = await makeRequest(
      server,
      { path: '/api/auth/signup', method: 'POST' },
      userBData
    );
    cookieB = regBRes.cookie;
    console.log('   ✅ User B registered with session.');

    // 3. User A creates Income
    console.log('3️⃣  User A creates Income transaction (+₹75,000 Salary)...');
    const incRes = await makeRequest(
      server,
      { path: '/api/transactions', method: 'POST' },
      {
        title: 'Monthly Tech Salary',
        amount: 75000,
        type: 'income',
        category: 'Salary',
        paymentMethod: 'Bank Transfer',
        description: 'November Salary payout'
      },
      cookieA
    );
    if (incRes.statusCode !== 201) throw new Error(`Create income failed: ${JSON.stringify(incRes.body)}`);
    console.log('   ✅ Income transaction created successfully.');

    // 4. User A creates Expense
    console.log('4️⃣  User A creates Expense transaction (-₹4,500 Groceries)...');
    const expRes = await makeRequest(
      server,
      { path: '/api/transactions', method: 'POST' },
      {
        title: 'Weekly Organic Groceries',
        amount: 4500,
        type: 'expense',
        category: 'Food & Dining',
        paymentMethod: 'Credit Card',
        description: 'Supermarket supplies'
      },
      cookieA
    );
    if (expRes.statusCode !== 201) throw new Error(`Create expense failed: ${JSON.stringify(expRes.body)}`);
    transactionAId = expRes.body.data._id;
    console.log(`   ✅ Expense transaction created (ID: ${transactionAId}).`);

    // 5. User A retrieves transactions with filters
    console.log('5️⃣  User A retrieves transactions with filter type=expense...');
    const filterRes = await makeRequest(
      server,
      { path: '/api/transactions?type=expense', method: 'GET' },
      null,
      cookieA
    );
    if (filterRes.statusCode === 200 && filterRes.body.data.length === 1) {
      console.log('   ✅ Filter by type=expense returned exactly 1 record.');
    } else {
      throw new Error(`Filter test failed: ${JSON.stringify(filterRes.body)}`);
    }

    // 6. User A updates transaction
    console.log('6️⃣  User A updates Expense transaction amount to ₹5,200...');
    const updateRes = await makeRequest(
      server,
      { path: `/api/transactions/${transactionAId}`, method: 'PUT' },
      { amount: 5200, description: 'Updated receipt amount' },
      cookieA
    );
    if (updateRes.statusCode === 200 && updateRes.body.data.amount === 5200) {
      console.log('   ✅ Transaction updated successfully to ₹5,200.');
    } else {
      throw new Error(`Update failed: ${JSON.stringify(updateRes.body)}`);
    }

    // 7. USER ISOLATION CHECK: User B attempts to access User A's transaction
    console.log('\n🔒 --- RIGOROUS USER ISOLATION TESTS ---');
    console.log('7️⃣  User B tries to GET User A\'s transaction (Expect 404 Not Found)...');
    const breachGet = await makeRequest(
      server,
      { path: `/api/transactions/${transactionAId}`, method: 'GET' },
      null,
      cookieB
    );
    if (breachGet.statusCode === 404) {
      console.log('   ✅ [Isolation Verified] User B cannot read User A\'s transaction (404 Not Found).');
    } else {
      throw new Error(`ISOLATION BREACH! User B received status ${breachGet.statusCode}`);
    }

    console.log('8️⃣  User B tries to PUT (modify) User A\'s transaction (Expect 404)...');
    const breachPut = await makeRequest(
      server,
      { path: `/api/transactions/${transactionAId}`, method: 'PUT' },
      { title: 'Hacked Title', amount: 1 },
      cookieB
    );
    if (breachPut.statusCode === 404) {
      console.log('   ✅ [Isolation Verified] User B cannot modify User A\'s transaction (404 Not Found).');
    } else {
      throw new Error(`ISOLATION BREACH! User B modified User A's data!`);
    }

    console.log('9️⃣  User B tries to DELETE User A\'s transaction (Expect 404)...');
    const breachDel = await makeRequest(
      server,
      { path: `/api/transactions/${transactionAId}`, method: 'DELETE' },
      null,
      cookieB
    );
    if (breachDel.statusCode === 404) {
      console.log('   ✅ [Isolation Verified] User B cannot delete User A\'s transaction (404 Not Found).');
    } else {
      throw new Error(`ISOLATION BREACH! User B deleted User A's data!`);
    }

    console.log('🔟 User B lists transactions (Expect 0 items)...');
    const listB = await makeRequest(
      server,
      { path: '/api/transactions', method: 'GET' },
      null,
      cookieB
    );
    if (listB.statusCode === 200 && listB.body.data.length === 0) {
      console.log('   ✅ [Isolation Verified] User B transaction list is completely empty (0 items).');
    } else {
      throw new Error(`ISOLATION BREACH! User B saw User A's transactions in list!`);
    }

    // 11. User A deletes transaction
    console.log('\n1️⃣1️⃣ User A deletes their own transaction...');
    const delRes = await makeRequest(
      server,
      { path: `/api/transactions/${transactionAId}`, method: 'DELETE' },
      null,
      cookieA
    );
    if (delRes.statusCode === 200) {
      console.log('   ✅ User A successfully deleted their transaction.');
    } else {
      throw new Error(`Delete failed: ${JSON.stringify(delRes.body)}`);
    }

    // Cleanup
    const uA = await User.findOne({ email: userAData.email });
    const uB = await User.findOne({ email: userBData.email });
    if (uA) await Transaction.deleteMany({ userId: uA._id });
    if (uB) await Transaction.deleteMany({ userId: uB._id });
    await User.deleteMany({ email: { $in: [userAData.email, userBData.email] } });
    console.log('\n🧹 [Cleanup] Test users and transactions purged safely.');

    console.log('\n🎉 ALL PHASE 5 TRANSACTION & ISOLATION TESTS PASSED!\n');
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

runTransactionTests();
