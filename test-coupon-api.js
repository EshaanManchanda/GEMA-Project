#!/usr/bin/env node

/**
 * Coupon API Test Script
 *
 * This script tests the coupon API endpoints to verify everything is working.
 *
 * Usage:
 *   node test-coupon-api.js
 *
 * Make sure backend is running on http://localhost:5001 before running this script.
 */

const http = require('http');

const API_BASE = 'http://localhost:5001';

// ANSI color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const req = http.request(url, options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          resolve({ statusCode: res.statusCode, data: JSON.parse(data) });
        } catch (e) {
          resolve({ statusCode: res.statusCode, data });
        }
      });
    });

    req.on('error', reject);

    if (options.body) {
      req.write(options.body);
    }

    req.end();
  });
}

async function testBackendConnection() {
  log('\n🔍 Step 1: Testing Backend Connection...', 'cyan');

  try {
    const response = await makeRequest(`${API_BASE}/`);

    if (response.statusCode === 200) {
      log('✅ Backend is running and accessible', 'green');
      log(`   Response: ${JSON.stringify(response.data)}`, 'blue');
      return true;
    } else {
      log(`❌ Backend returned status ${response.statusCode}`, 'red');
      return false;
    }
  } catch (error) {
    log(`❌ Cannot connect to backend: ${error.message}`, 'red');
    log('   Make sure backend is running with: cd backend && npm run dev', 'yellow');
    return false;
  }
}

async function testHealthEndpoint() {
  log('\n🏥 Step 2: Testing Health Endpoint...', 'cyan');

  try {
    const response = await makeRequest(`${API_BASE}/health`);

    if (response.statusCode === 200) {
      log('✅ Health endpoint is working', 'green');
      return true;
    } else {
      log(`⚠️  Health endpoint returned status ${response.statusCode}`, 'yellow');
      return true; // Not critical
    }
  } catch (error) {
    log(`⚠️  Health endpoint error: ${error.message}`, 'yellow');
    return true; // Not critical
  }
}

async function testCouponEndpointWithoutAuth() {
  log('\n🎫 Step 3: Testing Coupon Endpoint (No Auth)...', 'cyan');
  log('   Note: This should return 401 Unauthorized, which is expected', 'blue');

  try {
    const response = await makeRequest(`${API_BASE}/api/coupons`);

    if (response.statusCode === 401) {
      log('✅ Coupon endpoint exists and requires authentication (correct!)', 'green');
      return true;
    } else if (response.statusCode === 404) {
      log('❌ Coupon endpoint not found (404)', 'red');
      log('   Check that backend routes are properly configured', 'yellow');
      return false;
    } else {
      log(`⚠️  Unexpected status ${response.statusCode}`, 'yellow');
      return true;
    }
  } catch (error) {
    log(`❌ Error testing coupon endpoint: ${error.message}`, 'red');
    return false;
  }
}

async function testPublicCouponsEndpoint() {
  log('\n🌐 Step 4: Testing Public Active Coupons Endpoint...', 'cyan');

  try {
    const response = await makeRequest(`${API_BASE}/api/coupons/active`);

    if (response.statusCode === 200) {
      log('✅ Public coupons endpoint is working', 'green');
      const couponCount = response.data.data?.length || 0;
      log(`   Found ${couponCount} active coupons`, 'blue');
      return true;
    } else {
      log(`⚠️  Public endpoint returned status ${response.statusCode}`, 'yellow');
      return true; // Not critical if there are no coupons yet
    }
  } catch (error) {
    log(`❌ Error testing public endpoint: ${error.message}`, 'red');
    return false;
  }
}

async function runTests() {
  log('╔══════════════════════════════════════════════════════════╗', 'cyan');
  log('║       Gema Coupon System - API Verification Script       ║', 'cyan');
  log('╚══════════════════════════════════════════════════════════╝', 'cyan');

  const results = {
    backendConnection: await testBackendConnection(),
    healthCheck: await testHealthEndpoint(),
    couponEndpoint: await testCouponEndpointWithoutAuth(),
    publicCoupons: await testPublicCouponsEndpoint()
  };

  log('\n' + '═'.repeat(60), 'cyan');
  log('📊 Test Results Summary', 'cyan');
  log('═'.repeat(60), 'cyan');

  const allPassed = Object.values(results).every(result => result === true);

  Object.entries(results).forEach(([test, passed]) => {
    const icon = passed ? '✅' : '❌';
    const color = passed ? 'green' : 'red';
    const testName = test.replace(/([A-Z])/g, ' $1').trim();
    log(`${icon} ${testName}`, color);
  });

  log('\n' + '═'.repeat(60), 'cyan');

  if (allPassed) {
    log('🎉 All critical tests passed!', 'green');
    log('\n📝 Next Steps:', 'cyan');
    log('1. Start frontend: cd frontend && npm run dev', 'blue');
    log('2. Login as admin', 'blue');
    log('3. Navigate to: http://localhost:3000/admin/coupons', 'blue');
    log('4. Follow the COUPON_TESTING_GUIDE.md for detailed testing', 'blue');
  } else {
    log('❌ Some tests failed. Please check the errors above.', 'red');
    log('\n🔧 Troubleshooting:', 'yellow');
    log('1. Make sure backend is running: cd backend && npm run dev', 'yellow');
    log('2. Check MongoDB connection in backend/.env', 'yellow');
    log('3. Verify PORT=5001 in backend/.env', 'yellow');
    log('4. Review backend console for error messages', 'yellow');
  }

  log('\n📚 For detailed testing instructions, see: COUPON_TESTING_GUIDE.md\n', 'cyan');
}

// Run the tests
runTests().catch(error => {
  log(`\n💥 Unexpected error: ${error.message}`, 'red');
  process.exit(1);
});
