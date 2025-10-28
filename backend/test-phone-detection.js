/**
 * Phone Number Type Detection Test
 * Tests libphonenumber-js classification for specific Indian numbers
 */

const { parsePhoneNumber } = require('libphonenumber-js');

console.log('='.repeat(60));
console.log('PHONE NUMBER TYPE DETECTION TEST');
console.log('='.repeat(60));

// Test numbers
const testNumbers = [
  '+91 83770 12270',  // The reported number
  '+91 8377012270',   // Same number, different format
  '+91 9876543210',   // Known mobile (example)
  '+91 7876543210',   // Known mobile pattern
  '+91 6876543210',   // Known mobile pattern
  '+91 8076543210',   // 80x prefix (typically mobile)
  '+91 8376543210',   // 837x prefix (test similar range)
  '+91 8396543210',   // 839x prefix (test similar range)
];

console.log('\nTesting multiple Indian phone numbers...\n');

testNumbers.forEach((phone) => {
  console.log(`Testing: ${phone}`);
  console.log('-'.repeat(60));

  try {
    const phoneNumber = parsePhoneNumber(phone);

    if (!phoneNumber) {
      console.log('❌ Unable to parse phone number\n');
      return;
    }

    console.log(`✓ Parsed successfully`);
    console.log(`  Country: ${phoneNumber.country}`);
    console.log(`  National Number: ${phoneNumber.nationalNumber}`);
    console.log(`  E.164 Format: ${phoneNumber.number}`);
    console.log(`  Is Valid: ${phoneNumber.isValid()}`);
    console.log(`  Type: ${phoneNumber.getType() || 'UNKNOWN'}`);
    console.log(`  Possible Countries: ${phoneNumber.getPossibleCountries().join(', ')}`);

    const type = phoneNumber.getType();
    const isMobile = type === 'MOBILE' || type === 'FIXED_LINE_OR_MOBILE';

    if (isMobile) {
      console.log(`  ✓ Classification: MOBILE (SMS can be sent)`);
    } else if (type === 'FIXED_LINE') {
      console.log(`  ✗ Classification: LANDLINE (SMS cannot be sent)`);
    } else {
      console.log(`  ⚠ Classification: ${type || 'UNKNOWN'} (unclear if SMS can be sent)`);
    }

  } catch (error) {
    console.log(`❌ Error: ${error.message}`);
  }

  console.log();
});

// Additional info about Indian mobile numbers
console.log('='.repeat(60));
console.log('INDIAN MOBILE NUMBER INFORMATION');
console.log('='.repeat(60));
console.log(`
Indian mobile numbers follow these patterns:
- Total length: 10 digits (after country code +91)
- Mobile number ranges typically start with: 6, 7, 8, 9
- However, not ALL numbers starting with these digits are mobile

Common MOBILE prefixes in India:
- 60xxx, 70xxx, 75xxx, 76xxx, 77xxx, 78xxx, 79xxx
- 80xxx, 81xxx, 82xxx, 84xxx, 85xxx, 86xxx, 89xxx
- 90xxx, 91xxx, 92xxx, 93xxx, 94xxx, 95xxx, 96xxx, 97xxx, 98xxx, 99xxx

Common LANDLINE prefixes patterns:
- Usually start with area codes like 11, 20, 22, 33, 40, 44, 80, etc.
- Followed by 6-8 digits depending on the city
- Example: +91 11 2345 6789 (Delhi), +91 22 2345 6789 (Mumbai)

IMPORTANT: The 837xx range classification:
- This needs to be checked against current Indian numbering plan
- libphonenumber-js data may be outdated or incorrect for specific ranges
`);

console.log('='.repeat(60));
console.log('\nTest complete! Review the output above to determine if the');
console.log('number is correctly classified or if there\'s a detection issue.');
console.log('='.repeat(60));
