import React, { useState, useEffect, useCallback } from 'react';
import { Award, Search, ExternalLink, CheckCircle, RefreshCw, Mail, Download } from 'lucide-react';
import { useSelector } from 'react-redux';
import { RootState } from '../store';
import api from '../services/api';

interface CertSummary {
  _id: string;
  serialNumber?: string;
  recipientName: string;
  eventTitle?: string;
  status: string;
  issuedAt?: string;
  pdfUrl?: string;
  certificateTypeSlug?: string;
}

const STATUS_BADGE: Record<string, string> = {
  pending:    'bg-gray-100 text-gray-700',
  generating: 'bg-blue-100 text-blue-700',
  generated:  'bg-green-100 text-green-700',
  emailed:    'bg-emerald-100 text-emerald-700',
  failed:     'bg-red-100 text-red-700',
};

const STATUS_LABEL: Record<string, string> = {
  pending:    'Pending',
  generating: 'Generating',
  generated:  'Ready',
  emailed:    'Sent',
  failed:     'Failed',
};

const downloadPDF = async (pdfUrl: string, recipientName: string) => {
  const filename = `certificate-${recipientName.replace(/\s+/g, '-').toLowerCase()}.pdf`;
  try {
    const res = await fetch(pdfUrl);
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  } catch {
    window.open(pdfUrl, '_blank');
  }
};

const StudentCertificatesPage: React.FC = () => {
  const authUser = useSelector((state: RootState) => state.auth?.user);

  const [email, setEmail] = useState('');
  const [certs, setCerts] = useState<CertSummary[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [searched, setSearched] = useState(false);

  const fetchCerts = useCallback(async (emailAddr: string) => {
    if (!emailAddr.trim()) return;
    setLoading(true);
    setError('');
    setCerts(null);
    setSearched(false);
    try {
      const res = await api.get('/certificates/public/by-email', {
        params: { email: emailAddr.trim().toLowerCase() },
      });
      setCerts(res.data?.data?.certificates || []);
      setSearched(true);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to load certificates. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  // Pre-fill email from auth + auto-search if logged in
  useEffect(() => {
    if (authUser?.email) {
      setEmail(authUser.email);
      fetchCerts(authUser.email);
    }
  }, [authUser?.email, fetchCerts]);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    fetchCerts(email);
  };

  const handleDownload = async (cert: CertSummary) => {
    if (!cert.pdfUrl) return;
    setDownloading(cert._id);
    try {
      await downloadPDF(cert.pdfUrl, cert.recipientName);
    } finally {
      setDownloading(null);
    }
  };

  const isReady = (status: string) => status === 'generated' || status === 'emailed';

  return (
    <div className="bg-gradient-to-br from-indigo-50 via-white to-purple-50 min-h-[calc(100vh-72px)]">
      <div className="max-w-3xl mx-auto px-4 py-10 space-y-8">
        {/* Hero */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-indigo-100 rounded-full">
            <Award className="w-10 h-10 text-indigo-600" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900">My Certificates</h1>
          <p className="text-gray-500 max-w-md mx-auto text-sm">
            {authUser
              ? `Showing certificates for ${authUser.email}`
              : 'Enter the email you registered with to view and download your certificates.'}
          </p>
        </div>

        {/* Search card */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
          <form onSubmit={handleSearch} className="space-y-4">
            <div>
              <label htmlFor="cert-email" className="block text-sm font-medium text-gray-700 mb-1">
                Email Address
              </label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input
                    id="cert-email"
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    required
                    placeholder="you@example.com"
                    className="w-full pl-10 pr-4 py-2.5 text-sm border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading || !email.trim()}
                  className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white text-sm font-medium rounded-xl hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                >
                  {loading
                    ? <RefreshCw className="w-4 h-4 animate-spin" />
                    : <Search className="w-4 h-4" />}
                  {loading ? 'Searching…' : 'Search'}
                </button>
              </div>
            </div>
            {error && (
              <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                {error}
              </p>
            )}
          </form>
        </div>

        {/* Results */}
        {loading && (
          <div className="text-center py-10 text-gray-400">
            <RefreshCw className="w-8 h-8 mx-auto animate-spin mb-2 opacity-40" />
            <p className="text-sm">Looking up certificates…</p>
          </div>
        )}

        {!loading && searched && certs !== null && (
          certs.length === 0 ? (
            <div className="text-center py-14 text-gray-400">
              <Award className="w-12 h-12 mx-auto mb-3 opacity-25" />
              <p className="font-medium text-gray-600">No certificates found</p>
              <p className="text-sm mt-1">
                Nothing linked to <span className="font-mono text-gray-500">{email}</span>
              </p>
              <p className="text-xs mt-2 text-gray-400">Check the email you used when registering for the event.</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-500">
                  <span className="font-semibold text-gray-800">{certs.length}</span>{' '}
                  certificate{certs.length !== 1 ? 's' : ''} found
                </p>
                <p className="text-xs text-gray-400 font-mono">{email}</p>
              </div>

              {certs.map((cert, i) => (
                <div
                  key={cert._id || i}
                  className="bg-white rounded-2xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow"
                >
                  <div className="p-5 flex items-start gap-4">
                    {/* Icon */}
                    <div className="shrink-0 w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center mt-0.5">
                      <Award className="w-5 h-5 text-indigo-600" />
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        {cert.status && (
                          <span className={`px-2 py-0.5 text-xs rounded-full font-medium ${STATUS_BADGE[cert.status] || 'bg-gray-100 text-gray-700'}`}>
                            {STATUS_LABEL[cert.status] || cert.status}
                          </span>
                        )}
                        {cert.certificateTypeSlug && (
                          <span className="px-2 py-0.5 text-xs rounded-full bg-indigo-50 text-indigo-600 font-medium capitalize">
                            {cert.certificateTypeSlug.replace(/-/g, ' ')}
                          </span>
                        )}
                      </div>
                      <h3 className="font-semibold text-gray-900 text-sm truncate">
                        {cert.eventTitle || 'Certificate'}
                      </h3>
                      <p className="text-xs text-gray-500 mt-0.5">
                        Issued to: <span className="text-gray-700 font-medium">{cert.recipientName}</span>
                      </p>
                      {cert.issuedAt && (
                        <p className="text-xs text-gray-400 mt-0.5">
                          {new Date(cert.issuedAt).toLocaleDateString('en-GB', {
                            day: 'numeric', month: 'long', year: 'numeric',
                          })}
                        </p>
                      )}
                      {cert.serialNumber && (
                        <p className="text-xs font-mono text-gray-300 mt-1">{cert.serialNumber}</p>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex flex-col items-end gap-2 shrink-0">
                      {cert.pdfUrl && isReady(cert.status) ? (
                        <>
                          <button
                            type="button"
                            onClick={() => handleDownload(cert)}
                            disabled={downloading === cert._id}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 text-white text-xs font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-60 transition-colors"
                          >
                            {downloading === cert._id
                              ? <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                              : <Download className="w-3.5 h-3.5" />}
                            Download
                          </button>
                          <a
                            href={cert.pdfUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-indigo-600 border border-indigo-200 rounded-lg hover:bg-indigo-50 transition-colors"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                            View PDF
                          </a>
                        </>
                      ) : cert.status === 'pending' || cert.status === 'generating' ? (
                        <span className="text-xs text-gray-400 italic">Generating…</span>
                      ) : null}
                      {cert.serialNumber && (
                        <a
                          href={`/certificates/verify/${cert.serialNumber}`}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-green-700 border border-green-200 rounded-lg hover:bg-green-50 transition-colors"
                        >
                          <CheckCircle className="w-3.5 h-3.5" />
                          Verify
                        </a>
                      )}
                    </div>
                  </div>

                  {/* Footer strip for pending certs */}
                  {(cert.status === 'pending' || cert.status === 'generating') && (
                    <div className="border-t border-gray-100 px-5 py-2.5 bg-gray-50 rounded-b-2xl">
                      <p className="text-xs text-gray-400">
                        Your certificate is being generated. Check back shortly or refresh this page.
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )
        )}
      </div>
    </div>
  );
};

export default StudentCertificatesPage;
