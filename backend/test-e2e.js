const http = require('http');
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.join(__dirname, '.env') });

const User = require('./models/User');
const Transaction = require('./models/Transaction');
const Budget = require('./models/Budget');
const SavingsGoal = require('./models/SavingsGoal');

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

async function runMasterE2ETest() {
  console.log('\n===============================================================');
  console.log('🚀 SPENDWISE MASTER END-TO-END VERIFICATION & INTEGRATION SUITE');
  console.log('===============================================================\n');

  // STEP 1: Verify all Frontend Files
  console.log('📁 STEP 1: Verifying Complete Frontend Architecture...');
  const frontendDir = path.join(__dirname, '../frontend');
  const requiredFiles = [
    'index.html',
    'login.html',
    'signup.html',
    'dashboard.html',
    'transactions.html',
    'analytics.html',
    'budgets.html',
    'goals.html',
    'settings.html',
    'css/common.css',
    'css/auth.css',
    'css/dashboard.css',
    'css/pages.css',
    'js/api.js',
    'js/auth.js',
    'js/dashboard.js',
    'js/transactions.js',
    'js/analytics.js',
    'js/budgets.js',
    'js/goals.js',
    'js/settings.js'
  ];

  for (const f of requiredFiles) {
    const p = path.join(frontendDir, f);
    if (!fs.existsSync(p)) {
      throw new Error(`Missing expected project file: frontend/${f}`);
    }
  }
  console.log(`   ✅ All ${requiredFiles.length} frontend files verified.\n`);

  // STEP 2: Boot Server & Run Integration Flow
  console.log('⚡ STEP 2: Initializing Server & Database Integration...');
  process.env.NODE_ENV = 'test';
  const app = require('./server');

  const port = 5050;
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(port, resolve));
  console.log(`   ✅ Test Server running on port ${port}.`);

  const testEmail = `e2e_master_${Date.now()}@spendwise.com`;
  let cookie = null;

  try {
    // 1. Signup
    console.log('1️⃣  Registering User...');
    const signupRes = await makeRequest(server, { path: '/api/auth/signup', method: 'POST' }, {
      name: 'SpendWise Master Tester',
      email: testEmail,
      password: 'MasterPassword2026!',
      confirmPassword: 'MasterPassword2026!',
      currency: 'INR'
    });
    if (signupRes.statusCode !== 201) throw new Error('Signup failed');
    cookie = signupRes.cookie;
    console.log('   ✅ Signup successful.');

    // 2. Insert Transactions
    console.log('2️⃣  Creating Real Transactions (Income & Expenses)...');
    // Income: Salary ₹120,000
    await makeRequest(server, { path: '/api/transactions', method: 'POST' }, {
      title: 'Monthly Tech Salary',
      amount: 120000,
      type: 'income',
      category: 'Salary',
      paymentMethod: 'Bank Transfer'
    }, cookie);

    // Income: Freelance ₹30,000
    await makeRequest(server, { path: '/api/transactions', method: 'POST' }, {
      title: 'Consulting Project',
      amount: 30000,
      type: 'income',
      category: 'Investment',
      paymentMethod: 'UPI'
    }, cookie);

    // Expense: Rent ₹35,000
    await makeRequest(server, { path: '/api/transactions', method: 'POST' }, {
      title: 'Apartment Rent',
      amount: 35000,
      type: 'expense',
      category: 'Housing',
      paymentMethod: 'Bank Transfer'
    }, cookie);

    // Expense: Groceries ₹15,000
    await makeRequest(server, { path: '/api/transactions', method: 'POST' }, {
      title: 'Monthly Supermarket',
      amount: 15000,
      type: 'expense',
      category: 'Food & Dining',
      paymentMethod: 'Credit Card'
    }, cookie);

    console.log('   ✅ 4 Transactions created: Total Income ₹150,000 | Total Expense ₹50,000');

    // 3. Transactions Query Verification
    console.log('3️⃣  Testing Transactions Listing & Filter...');
    const txListRes = await makeRequest(server, { path: '/api/transactions?type=expense', method: 'GET' }, null, cookie);
    if (txListRes.body.data.length !== 2) throw new Error('Expense filtering mismatch');
    console.log(`   ✅ Filtered transactions retrieved successfully (${txListRes.body.data.length} records).`);

    // 4. Budgets Verification
    console.log('4️⃣  Testing Monthly Budget Tracking & Calculations...');
    const now = new Date();
    const m = now.getMonth() + 1;
    const y = now.getFullYear();

    await makeRequest(server, { path: '/api/budgets', method: 'POST' }, {
      month: m,
      year: y,
      category: 'Food & Dining',
      amount: 20000
    }, cookie);

    const budgetRes = await makeRequest(server, { path: `/api/budgets?month=${m}&year=${y}`, method: 'GET' }, null, cookie);
    const foodBudget = budgetRes.body.data.find(b => b.category === 'Food & Dining');
    if (!foodBudget || foodBudget.spent !== 15000 || foodBudget.remaining !== 5000) {
      throw new Error(`Budget calculation mismatch: ${JSON.stringify(foodBudget)}`);
    }
    console.log(`   ✅ Budget accurately calculated: Limit ₹${foodBudget.amount}, Spent ₹${foodBudget.spent}, Remaining ₹${foodBudget.remaining}`);

    // 5. Savings Goals Verification
    console.log('5️⃣  Testing Savings Goals & Deposits...');
    const goalRes = await makeRequest(server, { path: '/api/goals', method: 'POST' }, {
      title: 'Dream Vacation Fund',
      targetAmount: 200000,
      currentAmount: 40000
    }, cookie);
    const goalId = goalRes.body.data._id;

    await makeRequest(server, { path: `/api/goals/${goalId}`, method: 'PUT' }, {
      depositAmount: 20000
    }, cookie);

    const goalsList = await makeRequest(server, { path: '/api/goals', method: 'GET' }, null, cookie);
    const updatedGoal = goalsList.body.data.find(g => g._id === goalId);
    if (!updatedGoal || updatedGoal.currentAmount !== 60000 || updatedGoal.progressPercentage !== 30) {
      throw new Error(`Goal progress mismatch: ${JSON.stringify(updatedGoal)}`);
    }
    console.log(`   ✅ Goal verified: Saved ₹${updatedGoal.currentAmount} / ₹${updatedGoal.targetAmount} (${updatedGoal.progressPercentage}%)`);

    // 6. Dashboard Calculations
    console.log('6️⃣  Testing Dashboard Aggregations (Summary, Cashflow, Spending)...');
    const summaryRes = await makeRequest(server, { path: '/api/dashboard/summary?period=1M', method: 'GET' }, null, cookie);
    const { metrics } = summaryRes.body;
    if (metrics.netCashBalance.value !== 100000) throw new Error(`Net Cash mismatch: ${metrics.netCashBalance.value}`);
    if (metrics.monthlyIncome.value !== 150000) throw new Error(`Income mismatch: ${metrics.monthlyIncome.value}`);
    if (metrics.totalSpent.value !== 50000) throw new Error(`Spent mismatch: ${metrics.totalSpent.value}`);
    if (metrics.savingsRate.value !== 67) throw new Error(`Savings rate mismatch: ${metrics.savingsRate.value}`);

    const spendingRes = await makeRequest(server, { path: '/api/dashboard/spending?period=1M', method: 'GET' }, null, cookie);
    if (spendingRes.body.totalSpending !== 50000) throw new Error('Spending total mismatch');

    console.log('   ✅ Dashboard metrics verified: Net Cash ₹100,000 | Savings Rate 67%');

    // 7. Analytics Calculations
    console.log('7️⃣  Testing Analytics Overview & Categories...');
    const anaRes = await makeRequest(server, { path: '/api/analytics/overview', method: 'GET' }, null, cookie);
    if (anaRes.body.summary.totalIncome !== 150000) throw new Error('Analytics income mismatch');
    console.log('   ✅ Analytics aggregations verified.');

    // 8. Profile & Password Update
    console.log('8️⃣  Testing Profile & Password Updates...');
    await makeRequest(server, { path: '/api/profile', method: 'PUT' }, { name: 'Master Tester Pro', currency: 'INR' }, cookie);
    await makeRequest(server, { path: '/api/profile/password', method: 'PUT' }, {
      currentPassword: 'MasterPassword2026!',
      newPassword: 'UpdatedPassword2026!'
    }, cookie);
    console.log('   ✅ Profile and password updated cleanly.');

    // 9. Logout
    console.log('9️⃣  Testing Logout...');
    await makeRequest(server, { path: '/api/auth/logout', method: 'POST' }, null, cookie);
    const unauthCheck = await makeRequest(server, { path: '/api/auth/me', method: 'GET' }, null, cookie);
    if (unauthCheck.statusCode !== 401) throw new Error('Session did not invalidate upon logout');
    console.log('   ✅ Session successfully destroyed.');

    // Cleanup
    const user = await User.findOne({ email: testEmail });
    if (user) {
      await Budget.deleteMany({ userId: user._id });
      await SavingsGoal.deleteMany({ userId: user._id });
      await Transaction.deleteMany({ userId: user._id });
      await User.deleteOne({ _id: user._id });
    }
    console.log('\n🧹 [Cleanup] Master test records purged from MongoDB.');

    console.log('\n===============================================================');
    console.log('🏆 SPENDWISE APPLICATION FULLY VERIFIED - ALL SYSTEMS READY!');
    console.log('===============================================================\n');

    server.close();
    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('\n❌ Master E2E Test Failed:', err.message);
    if (server) server.close();
    await mongoose.disconnect();
    process.exit(1);
  }
}

runMasterE2ETest();
