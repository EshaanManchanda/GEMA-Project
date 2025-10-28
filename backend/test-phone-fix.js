/**
 * Test the fixed phone validation logic
 */

const { validatePhoneNumber, isMobileNumber } = require('./src/utils/phoneValidation');

console.log('='.repeat(60));
console.log('TESTING FIXED PHONE VALIDATION');
console.log('='.repeat(60));

const testCases = [
  { phone: '+91 83770 12270', description: 'Original reported number' },
  { phone: '+91 9876543210', description: 'Standard IN mobile (9xx)' },
  { phone: '+91 7876543210', description: 'Standard IN mobile (7xx)' },
  { phone: '+91 6876543210', description: 'Standard IN mobile (6xx)' },
  { phone: '+91 8076543210', description: 'Standard IN mobile (80x)' },
  { phone: '+1 234 567 8900', description: 'US number' },
];

console.log('\nTesting validation results:\n');

testCases.forEach(({ phone, description }) => {
  console.log(`📱 ${description}: ${phone}`);
  console.log('-'.repeat(60));

  const validation = validatePhoneNumber(phone);
  const isMobile = isMobileNumber(phone);

  console.log(`  isValid: ${validation.isValid}`);
  console.log(`  isMobile: ${validation.isMobile} (helper: ${isMobile})`);
  console.log(`  e164Format: ${validation.e164Format || 'N/A'}`);
  console.log(`  country: ${validation.country || 'N/A'}`);
  console.log(`  nationalNumber: ${validation.nationalNumber || 'N/A'}`);

  if (validation.isMobile) {
    console.log(`  ✅ PASS: Number is accepted as mobile`);
  } else {
    console.log(`  ❌ FAIL: Number rejected (not mobile)`);
    console.log(`  Error: ${validation.error || 'N/A'}`);
  }

  console.log();
});

console.log('='.repeat(60));
console.log('Test complete!');
console.log('='.repeat(60));
