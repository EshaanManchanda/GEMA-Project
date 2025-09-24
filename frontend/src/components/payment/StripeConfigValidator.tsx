import React, { useState, useEffect } from 'react';
import { CheckCircle, XCircle, AlertTriangle, RefreshCw } from 'lucide-react';
import { getStripeConfig, validateStripeKey, getKeyEnvironmentMismatchWarning } from '../../utils/stripeConfig';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/Card';
import Button from '../ui/Button';

interface StripeConfigValidatorProps {
  onValidationComplete?: (isValid: boolean) => void;
  showDetails?: boolean;
}

const StripeConfigValidator: React.FC<StripeConfigValidatorProps> = ({
  onValidationComplete,
  showDetails = false
}) => {
  const [isValidating, setIsValidating] = useState(false);
  const [validationResults, setValidationResults] = useState<any>(null);
  const [stripeInitialized, setStripeInitialized] = useState<boolean | null>(null);

  const runValidation = async () => {
    setIsValidating(true);

    try {
      const config = getStripeConfig();
      const keyValidation = validateStripeKey(config.publicKey);
      const environmentWarning = getKeyEnvironmentMismatchWarning();

      // Test Stripe initialization
      let stripeTest = null;
      try {
        const { loadStripe } = await import('@stripe/stripe-js');
        const stripe = await loadStripe(config.publicKey);
        stripeTest = stripe !== null;
        setStripeInitialized(stripeTest);
      } catch (error) {
        stripeTest = false;
        setStripeInitialized(false);
      }

      const results = {
        config,
        keyValidation,
        environmentWarning,
        stripeInitialized: stripeTest,
        overallValid: keyValidation.isValid && stripeTest && keyValidation.errors.length === 0,
      };

      setValidationResults(results);
      onValidationComplete?.(results.overallValid);

    } catch (error) {
      console.error('Validation error:', error);
      setValidationResults({
        overallValid: false,
        error: error instanceof Error ? error.message : 'Unknown validation error',
      });
      onValidationComplete?.(false);
    } finally {
      setIsValidating(false);
    }
  };

  useEffect(() => {
    runValidation();
  }, []);

  const getStatusIcon = (isValid: boolean, hasWarnings: boolean = false) => {
    if (!isValid) return <XCircle className="w-5 h-5 text-red-600" />;
    if (hasWarnings) return <AlertTriangle className="w-5 h-5 text-yellow-600" />;
    return <CheckCircle className="w-5 h-5 text-green-600" />;
  };

  const getStatusColor = (isValid: boolean, hasWarnings: boolean = false) => {
    if (!isValid) return 'text-red-600';
    if (hasWarnings) return 'text-yellow-600';
    return 'text-green-600';
  };

  if (isValidating) {
    return (
      <Card className="border-blue-200">
        <CardContent className="pt-6">
          <div className="flex items-center justify-center">
            <RefreshCw className="w-5 h-5 text-blue-600 animate-spin mr-2" />
            <span className="text-sm text-blue-600">Validating Stripe configuration...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!validationResults) {
    return null;
  }

  if (validationResults.error) {
    return (
      <Card className="border-red-200">
        <CardContent className="pt-6">
          <div className="flex items-center">
            <XCircle className="w-5 h-5 text-red-600 mr-2" />
            <span className="text-sm text-red-600">Validation failed: {validationResults.error}</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  const { config, keyValidation, environmentWarning, stripeInitialized, overallValid } = validationResults;
  const hasWarnings = keyValidation.warnings.length > 0 || Boolean(environmentWarning);

  return (
    <Card className={`${
      overallValid
        ? hasWarnings ? 'border-yellow-200' : 'border-green-200'
        : 'border-red-200'
    }`}>
      <CardHeader>
        <CardTitle className="flex items-center">
          {getStatusIcon(overallValid, hasWarnings)}
          <span className={`ml-2 ${getStatusColor(overallValid, hasWarnings)}`}>
            Stripe Configuration Status
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Summary */}
        <div className={`p-3 rounded-lg ${
          overallValid
            ? hasWarnings ? 'bg-yellow-50' : 'bg-green-50'
            : 'bg-red-50'
        }`}>
          <p className={`text-sm font-medium ${getStatusColor(overallValid, hasWarnings)}`}>
            {overallValid
              ? hasWarnings
                ? 'Configuration valid with warnings'
                : 'Configuration valid and ready'
              : 'Configuration has errors'
            }
          </p>
          <p className="text-xs text-gray-600 mt-1">
            Using {config.keyType} keys in {config.environment} environment
          </p>
        </div>

        {/* Detailed Results */}
        {showDetails && (
          <div className="space-y-3">
            {/* Key Validation */}
            <div className="flex items-center justify-between">
              <span className="text-sm">Stripe Key Format:</span>
              {getStatusIcon(keyValidation.isValid)}
            </div>

            {/* Stripe Initialization */}
            <div className="flex items-center justify-between">
              <span className="text-sm">Stripe SDK Loading:</span>
              {getStatusIcon(stripeInitialized === true)}
            </div>

            {/* Environment Check */}
            <div className="flex items-center justify-between">
              <span className="text-sm">Environment Match:</span>
              {getStatusIcon(!environmentWarning)}
            </div>

            {/* Compliance Mode */}
            <div className="flex items-center justify-between">
              <span className="text-sm">Compliance Mode:</span>
              <span className="text-xs text-gray-600">{config.complianceMode}</span>
            </div>
          </div>
        )}

        {/* Errors */}
        {keyValidation.errors.length > 0 && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm font-medium text-red-800 mb-1">Errors:</p>
            <ul className="text-sm text-red-700 list-disc list-inside">
              {keyValidation.errors.map((error, index) => (
                <li key={index}>{error}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Warnings */}
        {(keyValidation.warnings.length > 0 || environmentWarning) && (
          <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-sm font-medium text-yellow-800 mb-1">Warnings:</p>
            <ul className="text-sm text-yellow-700 list-disc list-inside">
              {keyValidation.warnings.map((warning, index) => (
                <li key={index}>{warning}</li>
              ))}
              {environmentWarning && <li>{environmentWarning}</li>}
            </ul>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={runValidation}
            disabled={isValidating}
          >
            Re-validate
          </Button>
          {!overallValid && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                console.log('Stripe Configuration Details:', validationResults);
              }}
            >
              Debug Info
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default StripeConfigValidator;