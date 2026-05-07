import React, { useState } from 'react';
import { Play, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';
import PaymentComplianceTester, { PaymentTestResult, PAYMENT_TEST_SCENARIOS } from '../../utils/paymentTesting';
import Button from '../ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card';

interface PaymentTestRunnerProps {
  onClose?: () => void;
}

const PaymentTestRunner: React.FC<PaymentTestRunnerProps> = ({ onClose }) => {
  const [isRunning, setIsRunning] = useState(false);
  const [results, setResults] = useState<PaymentTestResult[]>([]);
  const [selectedScenario, setSelectedScenario] = useState<string | null>(null);

  const runAllTests = async () => {
    setIsRunning(true);
    setResults([]);

    try {
      const testResults = await PaymentComplianceTester.runAllScenarios();
      setResults(testResults);
    } catch (error) {
      console.error('Test execution failed:', error);
    } finally {
      setIsRunning(false);
    }
  };

  const runSingleTest = async (scenarioId: string) => {
    setIsRunning(true);
    setSelectedScenario(scenarioId);

    try {
      const scenario = PAYMENT_TEST_SCENARIOS.find(s => s.id === scenarioId);
      if (scenario) {
        const result = await PaymentComplianceTester.runScenario(scenario);
        setResults(prev => {
          const updated = prev.filter(r => r.scenarioId !== scenarioId);
          return [...updated, result];
        });
      }
    } catch (error) {
      console.error('Test execution failed:', error);
    } finally {
      setIsRunning(false);
      setSelectedScenario(null);
    }
  };

  const generateReport = () => {
    const report = PaymentComplianceTester.generateTestReport(results);
    const blob = new Blob([report], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'payment-compliance-test-report.md';
    a.click();
    URL.revokeObjectURL(url);
  };

  const getResultIcon = (result: PaymentTestResult) => {
    if (result.passed && result.warnings.length === 0) {
      return <CheckCircle className="w-5 h-5 text-green-600" />;
    } else if (result.passed && result.warnings.length > 0) {
      return <AlertTriangle className="w-5 h-5 text-yellow-600" />;
    } else {
      return <XCircle className="w-5 h-5 text-red-600" />;
    }
  };

  const passedCount = results.filter(r => r.passed).length;
  const totalCount = results.length;

  return (
    <Card className="max-w-4xl mx-auto">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center">
            <Play className="w-5 h-5 mr-2" />
            Payment Compliance Test Runner
          </CardTitle>
          {onClose && (
            <Button variant="outline" size="sm" onClick={onClose}>
              Close
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Test Controls */}
        <div className="flex flex-wrap gap-3">
          <Button
            onClick={runAllTests}
            disabled={isRunning}
            loading={isRunning && !selectedScenario}
            variant="primary"
          >
            Run All Tests
          </Button>
          {results.length > 0 && (
            <Button onClick={generateReport} variant="outline">
              Download Report
            </Button>
          )}
        </div>

        {/* Test Results Summary */}
        {results.length > 0 && (
          <div className="p-4 bg-gray-50 rounded-lg">
            <h3 className="font-medium mb-2">Test Summary</h3>
            <p className="text-sm text-gray-600">
              {passedCount}/{totalCount} tests passed
              {results.some(r => r.warnings.length > 0) && (
                <span className="ml-2 text-yellow-600">
                  (with warnings)
                </span>
              )}
            </p>
          </div>
        )}

        {/* Test Scenarios */}
        <div className="space-y-4">
          <h3 className="font-medium">Available Test Scenarios</h3>
          {PAYMENT_TEST_SCENARIOS.map(scenario => {
            const result = results.find(r => r.scenarioId === scenario.id);
            const isRunningThis = isRunning && selectedScenario === scenario.id;

            return (
              <div key={scenario.id} className="border rounded-lg p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center mb-2">
                      {result && getResultIcon(result)}
                      <h4 className="font-medium ml-2">{scenario.name}</h4>
                    </div>
                    <p className="text-sm text-gray-600 mb-2">{scenario.description}</p>
                    <div className="text-xs text-gray-500">
                      <span className="font-medium">Region:</span> {scenario.region} |{' '}
                      <span className="font-medium">Mode:</span> {scenario.complianceMode} |{' '}
                      <span className="font-medium">Expected:</span> {scenario.expectedBehavior}
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => runSingleTest(scenario.id)}
                    disabled={isRunning}
                    loading={isRunningThis}
                  >
                    {result ? 'Re-run' : 'Run'}
                  </Button>
                </div>

                {/* Test Result Details */}
                {result && (
                  <div className="mt-4 p-3 bg-gray-50 rounded text-sm">
                    {result.errors.length > 0 && (
                      <div className="mb-2">
                        <strong className="text-red-600">Errors:</strong>
                        <ul className="list-disc list-inside ml-2">
                          {result.errors.map((error, index) => (
                            <li key={index} className="text-red-600">{error}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {result.warnings.length > 0 && (
                      <div className="mb-2">
                        <strong className="text-yellow-600">Warnings:</strong>
                        <ul className="list-disc list-inside ml-2">
                          {result.warnings.map((warning, index) => (
                            <li key={index} className="text-yellow-600">{warning}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    <div>
                      <strong>Details:</strong>
                      <div className="ml-2 font-mono text-xs">
                        <div>Preferred Method: {result.details.preferredMethod}</div>
                        <div>Shows Warning: {String(result.details.showWarning)}</div>
                        <div>Region: {result.details.region}</div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Manual Testing Instructions */}
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <h3 className="font-medium mb-2">Manual Testing</h3>
          <p className="text-sm text-blue-800 mb-2">
            For manual testing, check the browser console for detailed logs and use the following steps:
          </p>
          <ol className="text-sm text-blue-800 list-decimal list-inside space-y-1">
            <li>Navigate to booking page after running tests</li>
            <li>Verify payment methods match expected configuration</li>
            <li>Test Stripe payment with card 4242424242424242</li>
            <li>Verify regulatory error handling and fallback behavior</li>
            <li>Test successful test payment completion</li>
          </ol>
        </div>
      </CardContent>
    </Card>
  );
};

export default PaymentTestRunner;