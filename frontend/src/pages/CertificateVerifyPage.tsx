import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { certificateAPI, type CertVerifyResult } from '../services/api/reviewLinkAPI';

const CertificateVerifyPage: React.FC = () => {
  const { serialNumber } = useParams<{ serialNumber: string }>();
  const [result, setResult] = useState<CertVerifyResult | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!serialNumber) return;
    certificateAPI
      .verify(serialNumber)
      .then((res) => setResult(res.data.data))
      .catch(() => setResult({ valid: false }))
      .finally(() => setLoading(false));
  }, [serialNumber]);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-lg p-8 text-center">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Certificate Verification</h1>

        {loading && (
          <div className="flex justify-center py-8">
            <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {!loading && result?.valid && (
          <div className="space-y-4">
            <div className="text-5xl">🏆</div>
            <div className="bg-green-50 border border-green-200 rounded-xl p-5 text-left space-y-2">
              <Row label="Status" value="✓ Valid" valueClass="text-green-600 font-semibold" />
              <Row label="Recipient" value={result.recipientName || '—'} />
              <Row label="Event" value={result.eventTitle || '—'} />
              <Row label="Serial" value={result.serialNumber || '—'} mono />
              {result.issuedAt && (
                <Row
                  label="Issued"
                  value={new Date(result.issuedAt).toLocaleDateString('en-GB', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                  })}
                />
              )}
            </div>
          </div>
        )}

        {!loading && result && !result.valid && (
          <div className="space-y-3">
            <div className="text-5xl">❌</div>
            <p className="text-gray-700 font-medium">Certificate not found or revoked.</p>
            <p className="text-gray-400 text-sm">
              Serial: <span className="font-mono">{serialNumber}</span>
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

const Row: React.FC<{
  label: string;
  value: string;
  valueClass?: string;
  mono?: boolean;
}> = ({ label, value, valueClass = 'text-gray-900', mono }) => (
  <div className="flex justify-between items-baseline gap-2 text-sm">
    <span className="text-gray-500 shrink-0">{label}</span>
    <span className={`${valueClass} ${mono ? 'font-mono text-xs' : ''} text-right`}>{value}</span>
  </div>
);

export default CertificateVerifyPage;
