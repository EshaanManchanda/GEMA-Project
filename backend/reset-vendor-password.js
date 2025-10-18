// Script to reset vendor password
require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const MONGODB_URI = process.env.MONGODB_URI;

// Define User schema (minimal)
const UserSchema = new mongoose.Schema({
  email: String,
  passwordHash: String,
  role: String
}, { timestamps: true });

const User = mongoose.model('User', UserSchema);

async function resetPassword() {
  try {
    // Connect to MongoDB
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    // Find the vendor user
    const vendorEmail = 'vendor02@gema.com';
    const newPassword = 'Vendor123@@'; // Use the same password they're trying

    const user = await User.findOne({ email: vendorEmail });
    if (!user) {
      console.log(`User ${vendorEmail} not found`);
      process.exit(1);
    }

    console.log('User found:', {
      email: user.email,
      role: user.role,
      oldHashLength: user.passwordHash?.length
    });

    // Hash the new password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    // Update the password
    user.passwordHash = hashedPassword;

    // Save WITHOUT triggering pre-save hook (direct update)
    await User.updateOne(
      { _id: user._id },
      { $set: { passwordHash: hashedPassword } }
    );

    console.log('Password reset successfully!');
    console.log('New hash length:', hashedPassword.length);
    console.log('You can now login with:', vendorEmail, '/', newPassword);

    // Verify the password works
    const testUser = await User.findOne({ email: vendorEmail });
    const isMatch = await bcrypt.compare(newPassword, testUser.passwordHash);
    console.log('Password verification test:', isMatch ? '✅ SUCCESS' : '❌ FAILED');

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

resetPassword();
