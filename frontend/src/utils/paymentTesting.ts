// Payment testing utilities for regulatory compliance scenarios
// Provides test cases and scenarios for payment system validation

export interface PaymentTestScenario {
  id: string;
  name: string;
  description: string;
  region: string;
  complianceMode: string;
  expectedBehavior: string;
  testSteps: string[];
  expectedPaymentMethods: string[];
  preferredMethod: string;
  shouldShowWarning: boolean;
}

export const PAYMENT_TEST_SCENARIOS: PaymentTestScenario[] = [
  {
    id: 'india-compliance',
    name: 'India Regulatory Compliance',
    description: 'Test payment behavior under Indian regulatory restrictions',
    region: 'IN',
    complianceMode: 'india',
    expectedBehavior: 'Test Payment should be preferred, Stripe should show warnings',
    testSteps: [
      'Set VITE_PAYMENT_REGION=IN',
      'Set VITE_STRIPE_COMPLIANCE_MODE=india',
      'Load payment form',
      'Verify Test Payment is recommended',
      'Verify Stripe shows regulatory warning',
      'Test fallback from Stripe to Test Payment',
    ],
    expectedPaymentMethods: ['test', 'stripe'],
    preferredMethod: 'test',
    shouldShowWarning: true,
  },
  {
    id: 'international-standard',
    name: 'International Standard Mode',
    description: 'Test payment behavior in standard international mode',
    region: 'US',
    complianceMode: 'standard',
    expectedBehavior: 'All payment methods available, Stripe preferred',
    testSteps: [
      'Set VITE_PAYMENT_REGION=US',
      'Set VITE_STRIPE_COMPLIANCE_MODE=standard',
      'Load payment form',
      'Verify Stripe is recommended',
      'Verify no regulatory warnings',
      'Test normal payment flow',
    ],
    expectedPaymentMethods: ['test', 'stripe', 'paypal'],
    preferredMethod: 'stripe',
    shouldShowWarning: false,
  },
  {
    id: 'development-mode',
    name: 'Development Testing Mode',
    description: 'Test payment behavior in development environment',
    region: 'DEV',
    complianceMode: 'development',
    expectedBehavior: 'Test Payment only, all other methods disabled',
    testSteps: [
      'Set VITE_ENABLE_STRIPE_PAYMENTS=false',
      'Set VITE_ENABLE_PAYPAL_PAYMENTS=false',
      'Set VITE_ENABLE_TEST_PAYMENTS=true',
      'Load payment form',
      'Verify only Test Payment is available',
      'Test successful test payment',
    ],
    expectedPaymentMethods: ['test'],
    preferredMethod: 'test',
    shouldShowWarning: false,
  },
];

export interface PaymentTestResult {
  scenarioId: string;
  passed: boolean;
  errors: string[];
  warnings: string[];
  details: Record<string, any>;
}

export class PaymentComplianceTester {
  static async runScenario(scenario: PaymentTestScenario): Promise<PaymentTestResult> {
    const result: PaymentTestResult = {
      scenarioId: scenario.id,
      passed: true,
      errors: [],
      warnings: [],
      details: {},
    };

    try {
      // Set environment variables (in a real test, this would be done via test setup)
      result.details.region = scenario.region;
      result.details.complianceMode = scenario.complianceMode;

      // Import payment config dynamically to simulate environment changes
      const { getPaymentConfig, getRegionalPaymentMethods, getPreferredPaymentMethod, shouldShowRegulatoryWarning } = await import('./paymentConfig');

      // Simulate environment setup
      const mockEnv = {
        VITE_PAYMENT_REGION: scenario.region,
        VITE_STRIPE_COMPLIANCE_MODE: scenario.complianceMode,
        VITE_ENABLE_STRIPE_PAYMENTS: 'true',
        VITE_ENABLE_PAYPAL_PAYMENTS: 'true',
        VITE_ENABLE_TEST_PAYMENTS: 'true',
        VITE_PREFERRED_PAYMENT_METHOD: scenario.preferredMethod,
      };

      // Store original env
      const originalEnv = { ...import.meta.env };

      // Apply mock environment
      Object.assign(import.meta.env, mockEnv);

      try {
        // Test payment configuration
        const config = getPaymentConfig();
        const regionalMethods = getRegionalPaymentMethods();
        const preferredMethod = getPreferredPaymentMethod();
        const showWarning = shouldShowRegulatoryWarning();

        result.details.config = config;
        result.details.regionalMethods = regionalMethods;
        result.details.preferredMethod = preferredMethod;
        result.details.showWarning = showWarning;

        // Validate preferred method
        if (preferredMethod !== scenario.preferredMethod) {
          result.errors.push(`Expected preferred method '${scenario.preferredMethod}', got '${preferredMethod}'`);
          result.passed = false;
        }

        // Validate warning display
        if (showWarning !== scenario.shouldShowWarning) {
          result.errors.push(`Expected warning display ${scenario.shouldShowWarning}, got ${showWarning}`);
          result.passed = false;
        }

        // Validate available payment methods
        const enabledMethods = Object.keys(regionalMethods).filter(key => regionalMethods[key as keyof typeof regionalMethods].enabled);
        const missingMethods = scenario.expectedPaymentMethods.filter(method => !enabledMethods.includes(method));
        const extraMethods = enabledMethods.filter(method => !scenario.expectedPaymentMethods.includes(method));

        if (missingMethods.length > 0) {
          result.errors.push(`Missing expected payment methods: ${missingMethods.join(', ')}`);
          result.passed = false;
        }

        if (extraMethods.length > 0) {
          result.warnings.push(`Unexpected payment methods enabled: ${extraMethods.join(', ')}`);
        }

      } finally {
        // Restore original environment
        Object.assign(import.meta.env, originalEnv);
      }

    } catch (error: any) {
      result.errors.push(`Test execution failed: ${error.message}`);
      result.passed = false;
    }

    return result;
  }

  static async runAllScenarios(): Promise<PaymentTestResult[]> {
    const results: PaymentTestResult[] = [];

    for (const scenario of PAYMENT_TEST_SCENARIOS) {
      const result = await this.runScenario(scenario);
      results.push(result);
    }

    return results;
  }

  static generateTestReport(results: PaymentTestResult[]): string {
    const totalTests = results.length;
    const passedTests = results.filter(r => r.passed).length;
    const failedTests = totalTests - passedTests;

    let report = `# Payment Compliance Test Report\n\n`;
    report += `**Summary:** ${passedTests}/${totalTests} tests passed\n\n`;

    if (failedTests > 0) {
      report += `## ❌ Failed Tests (${failedTests})\n\n`;
      results.filter(r => !r.passed).forEach(result => {
        report += `### ${result.scenarioId}\n`;
        report += `**Errors:**\n`;
        result.errors.forEach(error => {
          report += `- ${error}\n`;
        });
        if (result.warnings.length > 0) {
          report += `**Warnings:**\n`;
          result.warnings.forEach(warning => {
            report += `- ${warning}\n`;
          });
        }
        report += '\n';
      });
    }

    report += `## ✅ Passed Tests (${passedTests})\n\n`;
    results.filter(r => r.passed).forEach(result => {
      report += `- **${result.scenarioId}**: All tests passed\n`;
      if (result.warnings.length > 0) {
        report += `  - Warnings: ${result.warnings.join(', ')}\n`;
      }
    });

    report += '\n## Test Details\n\n';
    results.forEach(result => {
      report += `### ${result.scenarioId}\n`;
      report += `- **Preferred Method:** ${result.details.preferredMethod}\n`;
      report += `- **Shows Warning:** ${result.details.showWarning}\n`;
      report += `- **Region:** ${result.details.region}\n`;
      report += `- **Compliance Mode:** ${result.details.complianceMode}\n`;
      report += '\n';
    });

    return report;
  }
}

// Manual testing utilities
export const manualTestInstructions = {
  indiaCompliance: [
    '1. Set environment variables:',
    '   - VITE_PAYMENT_REGION=IN',
    '   - VITE_STRIPE_COMPLIANCE_MODE=india',
    '   - VITE_PREFERRED_PAYMENT_METHOD=test',
    '2. Restart development server',
    '3. Navigate to booking page',
    '4. Verify Test Payment is recommended (green badge)',
    '5. Verify Stripe shows regulatory warning',
    '6. Select Stripe and attempt payment',
    '7. Verify error shows fallback button',
    '8. Test fallback to Test Payment works',
  ],

  errorHandling: [
    '1. Ensure India compliance settings are active',
    '2. Navigate to booking page',
    '3. Select Stripe payment method',
    '4. Enter test card: 4242424242424242',
    '5. Complete payment form and submit',
    '6. Verify regulatory error is displayed with amber styling',
    '7. Verify "Switch to Test Payment" button appears',
    '8. Click fallback button and verify it switches methods',
    '9. Verify external link to Stripe India docs works',
  ],

  configurationTesting: [
    '1. Test with VITE_ENABLE_STRIPE_PAYMENTS=false',
    '2. Verify Stripe is not available in payment methods',
    '3. Test with VITE_ENABLE_TEST_PAYMENTS=false',
    '4. Verify Test Payment is not available',
    '5. Test with all methods disabled',
    '6. Verify graceful handling of no payment methods',
  ],
};

export default PaymentComplianceTester;