const http = require('http');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

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

async function runBudgetGoalTests() {
  console.log('\n======================================================');
  console.log('🧪 Starting Phase 6 Budget & Savings Goals API Tests');
  console.log('======================================================\n');

  process.env.NODE_ENV = 'test';
  const app = require('./server');

  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;

  const testUser = {
    name: 'Budget Test User',
    email: `budget_test_${Date.now()}@spendwise.com`,
    password: 'Password123!',
    currency: 'INR'
  };

  let sessionCookie = null;
  let budgetId = null;
  let goalId = null;

  try {
    // 1. Signup
    console.log('1️⃣  Registering test user...');
    const regRes = await makeRequest(server, { path: '/api/auth/signup', method: 'POST' }, testUser);
    sessionCookie = regRes.cookie;
    console.log('   ✅ User registered.');

    // 2. Insert test expenses
    console.log('2️⃣  Creating real expense transactions for current month...');
    await makeRequest(
      server,
      { path: '/api/transactions', method: 'POST' },
      { title: 'Dinner with friends', amount: 4000, type: 'expense', category: 'Food & Dining' },
      sessionCookie
    );
    await makeRequest(
      server,
      { path: '/api/transactions', method: 'POST' },
      { title: 'Concert Tickets', amount: 2500, type: 'expense', category: 'Entertainment' },
      sessionCookie
    );
    console.log('   ✅ Expense transactions created (Food: ₹4,000, Entertainment: ₹2,500).');

    // 3. Create Budgets
    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();

    console.log('3️⃣  Creating Monthly Budgets...');
    // Overall Budget
    await makeRequest(
      server,
      { path: '/api/budgets', method: 'POST' },
      { month: currentMonth, year: currentYear, category: 'Overall', amount: 20000 },
      sessionCookie
    );
    // Food & Dining Budget
    const foodBudgetRes = await makeRequest(
      server,
      { path: '/api/budgets', method: 'POST' },
      { month: currentMonth, year: currentYear, category: 'Food & Dining', amount: 10000 },
      sessionCookie
    );
    budgetId = foodBudgetRes.body.data._id;
    console.log('   ✅ Overall (₹20,000) and Food & Dining (₹10,000) budgets created.');

    // 4. Retrieve Budgets and test calculated real-time spent
    console.log('4️⃣  Testing GET /api/budgets (Verifying calculated spending)...');
    const getBudgetsRes = await makeRequest(
      server,
      { path: `/api/budgets?month=${currentMonth}&year=${currentYear}`, method: 'GET' },
      null,
      sessionCookie
    );
    const budgets = getBudgetsRes.body.data;
    const overall = budgets.find((b) => b.category === 'Overall');
    const food = budgets.find((b) => b.category === 'Food & Dining');

    if (!overall || overall.spent !== 6500 || overall.remaining !== 13500) {
      throw new Error(`Overall budget calculation mismatch: ${JSON.stringify(overall)}`);
    }
    if (!food || food.spent !== 4000 || food.remaining !== 6000 || food.percentage !== 40) {
      throw new Error(`Food budget calculation mismatch: ${JSON.stringify(food)}`);
    }
    console.log(`   ✅ Overall Budget calculated: Spent ₹${overall.spent}, Remaining ₹${overall.remaining}`);
    console.log(`   ✅ Category Budget calculated: Spent ₹${food.spent}, Remaining ₹${food.remaining} (${food.percentage}%)`);

    // 5. Update budget and check exceeded limit flag
    console.log('5️⃣  Updating Food Budget limit to ₹3,500 (Testing isExceeded warning)...');
    await makeRequest(
      server,
      { path: `/api/budgets/${budgetId}`, method: 'PUT' },
      { amount: 3500 },
      sessionCookie
    );
    const recheckBudgets = await makeRequest(
      server,
      { path: `/api/budgets?month=${currentMonth}&year=${currentYear}`, method: 'GET' },
      null,
      sessionCookie
    );
    const updatedFood = recheckBudgets.body.data.find((b) => b._id === budgetId);
    if (!updatedFood.isExceeded) {
      throw new Error('Expected isExceeded to be true since spent (4000) > amount (3500)');
    }
    console.log('   ✅ Exceeded warning triggered properly (isExceeded: true).');

    // 6. Delete Budget
    console.log('6️⃣  Deleting Budget...');
    const delBudgetRes = await makeRequest(
      server,
      { path: `/api/budgets/${budgetId}`, method: 'DELETE' },
      null,
      sessionCookie
    );
    if (delBudgetRes.statusCode === 200) {
      console.log('   ✅ Budget deleted successfully.');
    } else {
      throw new Error('Failed to delete budget');
    }

    // 7. Create Savings Goal
    console.log('7️⃣  Testing POST /api/goals (Create Japan Trip Goal)...');
    const goalRes = await makeRequest(
      server,
      { path: '/api/goals', method: 'POST' },
      {
        title: 'Japan Vacation Trip',
        targetAmount: 150000,
        currentAmount: 30000,
        targetDate: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000)
      },
      sessionCookie
    );
    if (goalRes.statusCode !== 201) throw new Error('Create goal failed');
    goalId = goalRes.body.data._id;
    console.log(`   ✅ Goal created with initial 20% progress (ID: ${goalId}).`);

    // 8. Deposit contribution into Goal
    console.log('8️⃣  Testing PUT /api/goals/:id (Add ₹15,000 contribution)...');
    const updateGoalRes = await makeRequest(
      server,
      { path: `/api/goals/${goalId}`, method: 'PUT' },
      { depositAmount: 15000 },
      sessionCookie
    );
    if (updateGoalRes.statusCode === 200 && updateGoalRes.body.data.currentAmount === 45000) {
      console.log(`   ✅ Deposit recorded. New saved amount: ₹${updateGoalRes.body.data.currentAmount}`);
    } else {
      throw new Error(`Goal deposit failed: ${JSON.stringify(updateGoalRes.body)}`);
    }

    // 9. Retrieve Goals
    console.log('9️⃣  Testing GET /api/goals...');
    const listGoalsRes = await makeRequest(server, { path: '/api/goals', method: 'GET' }, null, sessionCookie);
    const fetchedGoal = listGoalsRes.body.data.find((g) => g._id === goalId);
    if (!fetchedGoal || fetchedGoal.progressPercentage !== 30) {
      throw new Error(`Expected 30% progress, got ${fetchedGoal ? fetchedGoal.progressPercentage : 'none'}`);
    }
    console.log(`   ✅ Goal retrieved with automatic virtual progress: ${fetchedGoal.progressPercentage}%`);

    // 10. Delete Goal
    console.log('🔟 Deleting Savings Goal...');
    const delGoalRes = await makeRequest(server, { path: `/api/goals/${goalId}`, method: 'DELETE' }, null, sessionCookie);
    if (delGoalRes.statusCode === 200) {
      console.log('   ✅ Goal deleted successfully.');
    } else {
      throw new Error('Failed to delete goal');
    }

    // Cleanup
    const user = await User.findOne({ email: testUser.email });
    if (user) {
      await Budget.deleteMany({ userId: user._id });
      await SavingsGoal.deleteMany({ userId: user._id });
      await Transaction.deleteMany({ userId: user._id });
      await User.deleteOne({ _id: user._id });
    }
    console.log('\n🧹 [Cleanup] Test user, transactions, budgets, and goals purged.');

    console.log('\n🎉 ALL PHASE 6 BUDGET & SAVINGS GOALS TESTS PASSED!\n');
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

runBudgetGoalTests();
