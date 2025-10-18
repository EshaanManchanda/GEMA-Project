// Script to seed test accounts for Postman collection
require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const MONGODB_URI = process.env.MONGODB_URI;

// Define User schema (minimal)
const UserSchema = new mongoose.Schema({
  firstName: String,
  lastName: String,
  email: String,
  passwordHash: String,
  role: String,
  status: String,
  isEmailVerified: Boolean,
  isPhoneVerified: Boolean
}, { timestamps: true });

const User = mongoose.model('User', UserSchema);

// Test accounts from Postman collection
const TEST_ACCOUNTS = [
  {
    email: 'customer@gema.com',
    password: 'Customer123@@',
    role: 'customer',
    firstName: 'Test',
    lastName: 'Customer'
  },
  {
    email: 'vendor@gema.com',
    password: 'Vendor123@@',
    role: 'vendor',
    firstName: 'Test',
    lastName: 'Vendor'
  },
  {
    email: 'admin@gema.com',
    password: 'Admin123@@',
    role: 'admin',
    firstName: 'Test',
    lastName: 'Admin'
  },
  {
    email: 'employee@gema.com',
    password: 'Employee123!',
    role: 'employee',
    firstName: 'Test',
    lastName: 'Employee'
  }
];

async function seedTestAccounts() {
  try {
    // Connect to MongoDB
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    console.log('🌱 Seeding test accounts from Postman collection...\n');

    for (const account of TEST_ACCOUNTS) {
      console.log(`📧 Processing ${account.email} (${account.role})...`);

      // Check if user exists
      const existingUser = await User.findOne({ email: account.email });

      // Hash the password
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(account.password, salt);

      if (existingUser) {
        // Update existing user
        await User.updateOne(
          { _id: existingUser._id },
          {
            $set: {
              passwordHash: hashedPassword,
              role: account.role,
              firstName: account.firstName,
              lastName: account.lastName,
              status: 'active',
              isEmailVerified: true,
              isPhoneVerified: false
            }
          }
        );
        console.log(`   ✏️  Updated existing account`);
      } else {
        // Create new user
        await User.create({
          firstName: account.firstName,
          lastName: account.lastName,
          email: account.email,
          passwordHash: hashedPassword,
          role: account.role,
          status: 'active',
          isEmailVerified: true,
          isPhoneVerified: false
        });
        console.log(`   ➕ Created new account`);
      }

      // Verify the password works
      const testUser = await User.findOne({ email: account.email });
      const isMatch = await bcrypt.compare(account.password, testUser.passwordHash);

      if (isMatch) {
        console.log(`   ✅ Password verification: SUCCESS`);
        console.log(`   📋 Role: ${testUser.role}`);
        console.log(`   📊 Status: ${testUser.status}`);
      } else {
        console.log(`   ❌ Password verification: FAILED`);
      }

      console.log('');
    }

    console.log('🎉 All test accounts seeded successfully!\n');
    console.log('📝 Summary:');
    console.log('   • customer@gema.com / Customer123@@ (customer role)');
    console.log('   • vendor@gema.com / Vendor123@@ (vendor role)');
    console.log('   • admin@gema.com / Admin123@@ (admin role)');
    console.log('   • employee@gema.com / Employee123! (employee role)');
    console.log('\n✨ You can now test login with these credentials in Postman!\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

seedTestAccounts();
