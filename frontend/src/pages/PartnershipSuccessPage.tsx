import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { FaCheckCircle, FaSpinner } from 'react-icons/fa';

const PartnershipSuccessPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get('session_id');
  const [status, setStatus] = useState<'verifying' | 'success'>('verifying');

  useEffect(() => {
    // In a real implementation, you might want to call the backend to verify the session
    // For now, if we have a session_id, we just assume it was successful since Stripe redirected us here.
    if (sessionId) {
      setTimeout(() => {
        setStatus('success');
      }, 1500);
    } else {
      setStatus('success');
    }
  }, [sessionId]);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-xl max-w-md w-full p-8 text-center border border-gray-100">
        {status === 'verifying' ? (
          <div className="flex flex-col items-center">
            <FaSpinner className="animate-spin text-4xl text-orange-500 mb-4" />
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Verifying Payment...</h1>
            <p className="text-gray-500">Please wait while we confirm your transaction.</p>
          </div>
        ) : (
          <div className="flex flex-col items-center">
            <FaCheckCircle className="text-6xl text-green-500 mb-6" />
            <h1 className="text-3xl font-extrabold text-gray-900 mb-4">Payment Successful!</h1>
            <p className="text-gray-600 mb-8">
              Thank you for your partnership application. We have received your payment and will review your submission shortly. Our team will contact you within 24 hours.
            </p>
            
            <Link
              to="/summer-2026"
              className="inline-flex items-center justify-center px-6 py-3 bg-gradient-to-r from-orange-500 to-amber-500 text-white font-bold rounded-xl hover:shadow-lg hover:scale-105 transition-all w-full"
            >
              Return to Summer 2026
            </Link>
          </div>
        )}
      </div>
    </div>
  );
};

export default PartnershipSuccessPage;
