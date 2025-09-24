const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// MongoDB connection string from backend config
const MONGODB_URI = 'mongodb+srv://eshaanmanchanda01:admissionDetails01@cluster0.x0iqu.mongodb.net/gema';

// User schema matching the backend
const userSchema = new mongoose.Schema({
  firstName: { type: String, required: true },
  lastName: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  passwordHash: { type: String, required: true },
  phone: String,
  role: { type: String, enum: ['admin', 'customer', 'vendor', 'employee'], default: 'customer' },
  status: { type: String, enum: ['active', 'inactive', 'suspended', 'pending'], default: 'pending' },
  isEmailVerified: { type: Boolean, default: false },
  isPhoneVerified: { type: Boolean, default: false }
}, { timestamps: true });

const User = mongoose.model('User', userSchema);

async function updateUserToAdmin() {
  console.log('🔐 Updating user role to admin...\n');

  try {
    // Connect to MongoDB
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Find and update the user to admin role
    const adminEmail = 'blogadmin@gema.com';
    console.log(`\n👤 Looking for user: ${adminEmail}`);

    const user = await User.findOne({ email: adminEmail });

    if (!user) {
      console.log('❌ User not found. Creating admin user...');

      // Create admin user if not exists
      const hashedPassword = await bcrypt.hash('BlogAdmin123!', 12);
      const adminUser = await User.create({
        firstName: 'Blog',
        lastName: 'Admin',
        email: adminEmail,
        passwordHash: hashedPassword,
        phone: '+971501234567',
        role: 'admin',
        status: 'active',
        isEmailVerified: true,
        isPhoneVerified: true
      });

      console.log('✅ Admin user created successfully');
      console.log(`👤 User ID: ${adminUser._id}`);
      console.log(`📧 Email: ${adminUser.email}`);
      console.log(`🎭 Role: ${adminUser.role}`);
      console.log(`📊 Status: ${adminUser.status}`);
    } else {
      console.log('✅ User found, updating role to admin...');

      // Update user role to admin
      user.role = 'admin';
      user.status = 'active';
      user.isEmailVerified = true;
      user.isPhoneVerified = true;

      await user.save();

      console.log('✅ User role updated successfully');
      console.log(`👤 User ID: ${user._id}`);
      console.log(`📧 Email: ${user.email}`);
      console.log(`🎭 Role: ${user.role}`);
      console.log(`📊 Status: ${user.status}`);
    }

    console.log('\n🎉 User setup completed successfully!');
    console.log('\n🔑 Admin Credentials:');
    console.log(`Email: ${adminEmail}`);
    console.log('Password: BlogAdmin123!');

  } catch (error) {
    console.error('❌ Setup failed:', error.message);
    console.error('Full error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

// Run the setup
updateUserToAdmin();