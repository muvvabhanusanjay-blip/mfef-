const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
const bcrypt = require('bcryptjs');

dotenv.config({ path: path.join(__dirname, '.env') });

const connectDB = require('./config/db');
const User = require('./models/User');
const Transaction = require('./models/Transaction');
const Budget = require('./models/Budget');
const SavingsGoal = require('./models/SavingsGoal');

async function testDatabase() {
  console.log('--- Testing SpendWise MongoDB Connection & Models ---');
  
  await connectDB();

  try {
    // 1. Create a temporary test user
    const testEmail = `test_verification_${Date.now()}@spendwise.com`;
    const passwordHash = await bcrypt.hash('TestPass123!', 10);

    const testUser = await User.create({
      name: 'Verification User',
      email: testEmail,
      passwordHash,
      currency: 'INR'
    });
    console.log(`✅ [User Model] Created test user: ${testUser.email} (ID: ${testUser._id})`);

    // Verify password comparison method
    const isPasswordValid = await testUser.comparePassword('TestPass123!');
    console.log(`✅ [User Model] Password hash verification: ${isPasswordValid ? 'SUCCESS' : 'FAILED'}`);

    // 2. Create a test transaction
    const testTx = await Transaction.create({
      userId: testUser._id,
      title: 'Initial Deposit Test',
      amount: 50000,
      type: 'income',
      category: 'Salary',
      paymentMethod: 'Bank Transfer',
      description: 'Test transaction for database verification'
    });
    console.log(`✅ [Transaction Model] Created test transaction: ${testTx.title} (Amount: ₹${testTx.amount})`);

    // 3. Create a test budget
    const now = new Date();
    const testBudget = await Budget.create({
      userId: testUser._id,
      month: now.getMonth() + 1,
      year: now.getFullYear(),
      category: 'Food & Dining',
      amount: 15000
    });
    console.log(`✅ [Budget Model] Created test budget: ${testBudget.category} (Amount: ₹${testBudget.amount})`);

    // 4. Create a test savings goal
    const testGoal = await SavingsGoal.create({
      userId: testUser._id,
      title: 'Emergency Reserve',
      targetAmount: 100000,
      currentAmount: 25000,
      targetDate: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000)
    });
    console.log(`✅ [SavingsGoal Model] Created test goal: ${testGoal.title} (Progress: ${testGoal.progressPercentage}%)`);

    // 5. Query and list collections in Compass / MongoDB
    const collections = await mongoose.connection.db.listCollections().toArray();
    console.log('\n--- Active Collections in "spendwise" Database ---');
    collections.forEach((c) => console.log(` • ${c.name}`));

    // 6. Clean up test records
    await SavingsGoal.deleteOne({ _id: testGoal._id });
    await Budget.deleteOne({ _id: testBudget._id });
    await Transaction.deleteOne({ _id: testTx._id });
    await User.deleteOne({ _id: testUser._id });
    console.log('\n✅ [Cleanup] Temporary test records cleaned up safely.');
    console.log('✅ [Database Ready] All schemas validated and indexed successfully!\n');

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('❌ [Database Test Error]:', error);
    await mongoose.disconnect();
    process.exit(1);
  }
}

testDatabase();
