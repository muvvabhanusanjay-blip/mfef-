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

async function runDashboardAnalyticsTests() {
  console.log('\n==========================================================');
  console.log('🧪 Starting Phase 7 Dashboard & Analytics Calculations Test');
  console.log('==========================================================\n');

  process.env.NODE_ENV = 'test';
  const app = require('./server');

  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;

  const testUser = {
    name: 'Dashboard Analyst',
    email: `dash_test_${Date.now()}@spendwise.com`,
    password: 'Password123!',
    currency: 'INR'
  };

  let sessionCookie = null;

  try {
    // 1. Signup
    console.log('1️⃣  Registering analyst user...');
    const regRes = await makeRequest(server, { path: '/api/auth/signup', method: 'POST' }, testUser);
    sessionCookie = regRes.cookie;
    console.log('   ✅ Analyst user registered.');

    // 2. Insert test transactions
    console.log('2️⃣  Inserting income & categorized expense records...');
    await makeRequest(
      server,
      { path: '/api/transactions', method: 'POST' },
      { title: 'Full-time Salary', amount: 100000, type: 'income', category: 'Salary' },
      sessionCookie
    );
    await makeRequest(
      server,
      { path: '/api/transactions', method: 'POST' },
      { title: 'Apartment Rent', amount: 25000, type: 'expense', category: 'Housing' },
      sessionCookie
    );
    await makeRequest(
      server,
      { path: '/api/transactions', method: 'POST' },
      { title: 'Grocery & Organic Market', amount: 12000, type: 'expense', category: 'Food & Dining' },
      sessionCookie
    );
    await makeRequest(
      server,
      { path: '/api/transactions', method: 'POST' },
      { title: 'Electronics Upgrade', amount: 8000, type: 'expense', category: 'Shopping' },
      sessionCookie
    );
    console.log('   ✅ Transactions created: 1 Income (₹100,000), 3 Expenses totaling ₹45,000.');

    // 3. Test Dashboard Summary
    console.log('3️⃣  Testing GET /api/dashboard/summary (Verifying 4 metric cards)...');
    const summaryRes = await makeRequest(
      server,
      { path: '/api/dashboard/summary?period=1M', method: 'GET' },
      null,
      sessionCookie
    );
    if (summaryRes.statusCode !== 200) throw new Error(`Summary failed: ${JSON.stringify(summaryRes.body)}`);
    const { metrics } = summaryRes.body;

    if (metrics.netCashBalance.value !== 55000) {
      throw new Error(`Expected Net Cash Balance ₹55,000, got ${metrics.netCashBalance.value}`);
    }
    if (metrics.monthlyIncome.value !== 100000) {
      throw new Error(`Expected Monthly Income ₹100,000, got ${metrics.monthlyIncome.value}`);
    }
    if (metrics.totalSpent.value !== 45000) {
      throw new Error(`Expected Total Spent ₹45,000, got ${metrics.totalSpent.value}`);
    }
    if (metrics.savingsRate.value !== 55) {
      throw new Error(`Expected Savings Rate 55%, got ${metrics.savingsRate.value}%`);
    }
    console.log(`   ✅ Net Cash Balance: ₹${metrics.netCashBalance.value}`);
    console.log(`   ✅ Monthly Income: ₹${metrics.monthlyIncome.value}`);
    console.log(`   ✅ Total Spent: ₹${metrics.totalSpent.value}`);
    console.log(`   ✅ Savings Rate: ${metrics.savingsRate.value}%`);

    // 4. Test Cash Flow Overview
    console.log('4️⃣  Testing GET /api/dashboard/cashflow...');
    const cashflowRes = await makeRequest(
      server,
      { path: '/api/dashboard/cashflow?period=1M', method: 'GET' },
      null,
      sessionCookie
    );
    if (cashflowRes.statusCode !== 200) throw new Error('Cashflow failed');
    const cf = cashflowRes.body;
    if (cf.summary.totalIncome !== 100000 || cf.summary.totalExpense !== 45000) {
      throw new Error(`Cashflow totals mismatch: ${JSON.stringify(cf.summary)}`);
    }
    console.log(`   ✅ Cashflow chart verified: ${cf.chartData.labels.length} timeline buckets generated.`);

    // 5. Test Spending Doughnut Breakdown
    console.log('5️⃣  Testing GET /api/dashboard/spending...');
    const spendingRes = await makeRequest(
      server,
      { path: '/api/dashboard/spending?period=1M', method: 'GET' },
      null,
      sessionCookie
    );
    if (spendingRes.statusCode !== 200) throw new Error('Spending failed');
    const sp = spendingRes.body;
    if (sp.totalSpending !== 45000) {
      throw new Error(`Expected total spending ₹45,000, got ${sp.totalSpending}`);
    }
    const housing = sp.categories.find((c) => c.category === 'Housing');
    if (!housing || housing.amount !== 25000 || housing.percentage !== 56) {
      throw new Error(`Housing category breakdown mismatch: ${JSON.stringify(housing)}`);
    }
    console.log(`   ✅ Doughnut chart verified: Top category is ${housing.category} (₹${housing.amount}, ${housing.percentage}%).`);

    // 6. Test Analytics Overview
    console.log('6️⃣  Testing GET /api/analytics/overview...');
    const anaRes = await makeRequest(server, { path: '/api/analytics/overview', method: 'GET' }, null, sessionCookie);
    if (anaRes.statusCode !== 200) throw new Error('Analytics failed');
    const ana = anaRes.body;
    if (ana.summary.highestSpendingCategory.name !== 'Housing') {
      throw new Error(`Expected highest category Housing, got ${JSON.stringify(ana.summary.highestSpendingCategory)}`);
    }
    console.log(`   ✅ Analytics verified: Top category is ${ana.summary.highestSpendingCategory.name}.`);

    // 7. Test Category Analytics
    console.log('7️⃣  Testing GET /api/analytics/categories...');
    const catRes = await makeRequest(server, { path: '/api/analytics/categories', method: 'GET' }, null, sessionCookie);
    if (catRes.statusCode !== 200) throw new Error('Category analytics failed');
    console.log(`   ✅ Category breakdown returned ${catRes.body.categories.length} categories.`);

    // Cleanup
    const user = await User.findOne({ email: testUser.email });
    if (user) {
      await Transaction.deleteMany({ userId: user._id });
      await User.deleteOne({ _id: user._id });
    }
    console.log('\n🧹 [Cleanup] Analyst test user and transactions purged.');

    console.log('\n🎉 ALL PHASE 7 DASHBOARD & ANALYTICS TESTS PASSED!\n');
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

runDashboardAnalyticsTests();
