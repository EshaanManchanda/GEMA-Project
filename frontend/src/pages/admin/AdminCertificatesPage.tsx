import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Award, Search, XCircle, CheckCircle, RefreshCw, ExternalLink, Mail, Eye, Layout, Trash2, Pencil } from 'lucide-react';
import { certificateAPI, type CertVerifyResult } from '../../services/api/reviewLinkAPI';
import adminAPI from '../../services/api/adminAPI';
import api from '../../services/api';
import toast from 'react-hot-toast';
import logger from '@/utils/logger';
import VisualTemplateBuilder from '../../components/admin/VisualTemplateBuilder';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Template { _id: string; name: string; slug: string; active: boolean; createdAt: string; mode?: 'html' | 'visual'; html?: string; css?: string; description?: string; backgroundImageUrl?: string; canvasWidth?: number; canvasHeight?: number; fields?: any[] }
interface EventOption { _id: string; title: string }

type TabKey = 'list' | 'create' | 'templates' | 'audit';
type StatusFilter = 'all' | 'pending' | 'generating' | 'generated' | 'emailed' | 'failed' | 'revoked';

const STATUS_BADGE: Record<string, string> = {
  pending:    'bg-gray-100 text-gray-700',
  generating: 'bg-blue-100 text-blue-700',
  generated:  'bg-green-100 text-green-700',
  emailed:    'bg-emerald-100 text-emerald-700',
  failed:     'bg-red-100 text-red-700',
  revoked:    'bg-orange-100 text-orange-700',
};

const STATUS_OPTIONS: StatusFilter[] = ['all', 'pending', 'generating', 'generated', 'emailed', 'failed', 'revoked'];

// ─── Certificate List Tab ─────────────────────────────────────────────────────

const CertListTab: React.FC = () => {
  const [certs, setCerts] = useState<CertVerifyResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [eventFilter, setEventFilter] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [revoking, setRevoking] = useState<string | null>(null);
  const [resending, setResending] = useState<string | null>(null);
  const [events, setEvents] = useState<EventOption[]>([]);

  const LIMIT = 20;

  useEffect(() => {
    adminAPI.getEvents({ limit: 200 }).then((res: any) => {
      const list: EventOption[] = (res?.events || res?.data?.events || []).map((e: any) => ({ _id: e._id || e.id, title: e.title }));
      setEvents(list);
    }).catch(() => {});
  }, []);

  const fetchCerts = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, any> = { page, limit: LIMIT };
      if (statusFilter !== 'all') params.status = statusFilter;
      if (eventFilter) params.eventId = eventFilter;
      const res = await certificateAPI.list(params);
      const data = res.data?.data;
      setCerts(data?.certificates || []);
      setTotalPages(data?.pagination?.totalPages || 1);
    } catch (err) {
      logger.error('Failed to fetch certificates', err);
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter, eventFilter]);

  useEffect(() => { fetchCerts(); }, [fetchCerts]);

  const handleRevoke = async (cert: CertVerifyResult) => {
    if (!cert._id) return;
    if (!confirm(`Revoke certificate ${cert.serialNumber}?`)) return;
    setRevoking(cert._id);
    try {
      await certificateAPI.revoke(cert._id);
      toast.success('Certificate revoked');
      fetchCerts();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to revoke');
    } finally {
      setRevoking(null);
    }
  };

  const handleResendEmail = async (cert: CertVerifyResult) => {
    if (!cert._id) return;
    setResending(cert._id);
    try {
      await certificateAPI.resendEmail(cert._id);
      toast.success('Email queued for resend');
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to resend email');
    } finally {
      setResending(null);
    }
  };

  const filtered = search
    ? certs.filter(c =>
        c.serialNumber?.toLowerCase().includes(search.toLowerCase()) ||
        c.recipientName?.toLowerCase().includes(search.toLowerCase()) ||
        c.eventTitle?.toLowerCase().includes(search.toLowerCase()) ||
        c.recipient?.email?.toLowerCase().includes(search.toLowerCase())
      )
    : certs;

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search serial, name, event, email…"
            className="w-full pl-9 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        <select
          value={eventFilter}
          onChange={e => { setEventFilter(e.target.value); setPage(1); }}
          className="text-sm px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="">All Events</option>
          {events.map(e => <option key={e._id} value={e._id}>{e.title}</option>)}
        </select>
        <div className="flex gap-1 flex-wrap">
          {STATUS_OPTIONS.map(s => (
            <button
              key={s}
              onClick={() => { setStatusFilter(s); setPage(1); }}
              className={`px-3 py-1.5 text-xs rounded-full font-medium border transition-colors ${statusFilter === s ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-gray-600 border-gray-300 hover:border-indigo-400'}`}
            >
              {s === 'all' ? 'All' : s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>
        <button onClick={fetchCerts} className="flex items-center gap-1 px-3 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50">
          <RefreshCw className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="text-center py-12 text-gray-400">Loading…</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <Award className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <p>No certificates found</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Serial</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Recipient</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Event</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Type</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Status</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Issued</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map((cert, i) => (
                <tr key={cert._id || i} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-mono text-xs text-gray-700">{cert.serialNumber || '—'}</td>
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-900">{cert.recipientName || cert.recipient?.name || '—'}</p>
                    <p className="text-xs text-gray-400">{cert.recipient?.email || '—'}</p>
                  </td>
                  <td className="px-4 py-3 text-gray-700 max-w-[180px] truncate">{cert.eventTitle || '—'}</td>
                  <td className="px-4 py-3 text-xs text-gray-500">{(cert as any).templateName || '—'}</td>
                  <td className="px-4 py-3">
                    {cert.status ? (
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${STATUS_BADGE[cert.status] || 'bg-gray-100 text-gray-700'}`}>
                        {cert.status}
                      </span>
                    ) : '—'}
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs">
                    {cert.issuedAt ? new Date(cert.issuedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      {cert.pdfUrl && (
                        <a href={cert.pdfUrl} target="_blank" rel="noreferrer" className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded" title="View PDF">
                          <ExternalLink className="w-4 h-4" />
                        </a>
                      )}
                      {cert.serialNumber && (
                        <a href={`/certificates/verify/${cert.serialNumber}`} target="_blank" rel="noreferrer" className="p-1.5 text-green-600 hover:bg-green-50 rounded" title="Verify">
                          <CheckCircle className="w-4 h-4" />
                        </a>
                      )}
                      {cert._id && (cert.status === 'generated' || cert.status === 'emailed') && (
                        <button type="button" onClick={() => handleResendEmail(cert)} disabled={resending === cert._id} className="p-1.5 text-blue-500 hover:bg-blue-50 rounded disabled:opacity-50" title="Resend Email">
                          {resending === cert._id ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
                        </button>
                      )}
                      {cert.status !== 'revoked' && cert._id && (
                        <button type="button" onClick={() => handleRevoke(cert)} disabled={revoking === cert._id} className="p-1.5 text-red-500 hover:bg-red-50 rounded disabled:opacity-50" title="Revoke">
                          <XCircle className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {totalPages > 1 && (
          <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-between">
            <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg disabled:opacity-40 hover:bg-gray-50">Previous</button>
            <span className="text-sm text-gray-500">Page {page} of {totalPages}</span>
            <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)} className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg disabled:opacity-40 hover:bg-gray-50">Next</button>
          </div>
        )}
      </div>
    </div>
  );
};

// ─── Create Certificate Tab ───────────────────────────────────────────────────

const CreateCertTab: React.FC = () => {
  const [events, setEvents] = useState<EventOption[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loadingDeps, setLoadingDeps] = useState(true);

  const [selectedEvent, setSelectedEvent] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [recipientName, setRecipientName] = useState('');
  const [recipientEmail, setRecipientEmail] = useState('');
  const [userId, setUserId] = useState('');
  const [extraData, setExtraData] = useState('');   // JSON key=value fields
  const [sendEmail, setSendEmail] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [successSerial, setSuccessSerial] = useState<string | null>(null);
  const [error, setError] = useState('');

  // Bulk mode
  const [bulkMode, setBulkMode] = useState(false);
  const [bulkCsv, setBulkCsv] = useState('');  // name,email,userId per line
  const [bulkProgress, setBulkProgress] = useState<{ total: number; processed: number; failed: number } | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    Promise.all([
      adminAPI.getEvents({ limit: 200 }),
      certificateAPI.listTemplates(),
    ]).then(([evRes, tmplRes]: any) => {
      const evList: EventOption[] = (evRes?.events || evRes?.data?.events || []).map((e: any) => ({ _id: e._id || e.id, title: e.title }));
      const tmplList: Template[] = tmplRes?.data?.data?.templates || [];
      setEvents(evList);
      setTemplates(tmplList);
    }).catch(() => {}).finally(() => setLoadingDeps(false));
  }, []);

  const parsedData = () => {
    const d: Record<string, string> = {};
    extraData.split('\n').forEach(line => {
      const [k, ...v] = line.split('=');
      if (k?.trim()) d[k.trim()] = v.join('=').trim();
    });
    return d;
  };

  const handleSingle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEvent || !selectedTemplate || !recipientName || !recipientEmail) {
      setError('Event, template, name and email are required.');
      return;
    }
    setSubmitting(true);
    setError('');
    setSuccessSerial(null);
    try {
      const res = await api.post('/certificates/generate', {
        eventId: selectedEvent,
        userId: userId || undefined,
        templateId: selectedTemplate,
        recipient: { name: recipientName, email: recipientEmail },
        data: parsedData(),
        options: { sendEmail },
      });
      const serial = res.data?.data?.certificate?.serialNumber;
      setSuccessSerial(serial || 'Created');
      setRecipientName('');
      setRecipientEmail('');
      setUserId('');
      setExtraData('');
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to create certificate');
    } finally {
      setSubmitting(false);
    }
  };

  const handleBulk = async () => {
    if (!selectedEvent || !selectedTemplate || !bulkCsv.trim()) {
      setError('Event, template and CSV rows are required.');
      return;
    }
    const rows = bulkCsv.trim().split('\n').map(l => l.split(',').map(s => s.trim())).filter(r => r[0] && r[1]);
    if (!rows.length) { setError('No valid rows found.'); return; }
    setSubmitting(true);
    setError('');
    setBulkProgress(null);
    try {
      const res = await certificateAPI.bulk({
        templateId: selectedTemplate,
        eventId: selectedEvent,
        inputs: rows.map(r => ({ recipientName: r[0], recipientEmail: r[1], userId: r[2] || undefined, data: parsedData() })),
        options: { sendEmail },
      });
      const requestId = res.data?.data?.requestId;
      const total = res.data?.data?.total || rows.length;
      setBulkProgress({ total, processed: 0, failed: 0 });
      toast.success(res.data?.data?.message || `${total} certificates queued`);
      setBulkCsv('');

      // Poll progress every 3s
      if (requestId) {
        pollRef.current = setInterval(async () => {
          try {
            const pRes = await certificateAPI.getBulkStatus(requestId);
            const prog = pRes.data?.data?.request?.progress;
            const status = pRes.data?.data?.request?.status;
            if (prog) setBulkProgress(prog);
            if (status === 'completed' || status === 'failed' || (prog && prog.processed + prog.failed >= prog.total)) {
              clearInterval(pollRef.current!);
              pollRef.current = null;
            }
          } catch { clearInterval(pollRef.current!); pollRef.current = null; }
        }, 3000);
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to queue bulk generation');
    } finally {
      setSubmitting(false);
    }
  };

  useEffect(() => () => { if (pollRef.current) clearInterval(pollRef.current); }, []);

  if (loadingDeps) return <div className="py-12 text-center text-gray-400">Loading…</div>;

  return (
    <div className="max-w-2xl space-y-6">
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-800">
        One event can have <strong>multiple certificate types</strong> — choose a different template for each type (e.g. Participation, Winner, Merit).
      </div>

      {/* Event + Template */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
        <h3 className="font-semibold text-gray-800">1. Select Event &amp; Certificate Type</h3>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Event *</label>
          <select value={selectedEvent} onChange={e => setSelectedEvent(e.target.value)} className="w-full text-sm px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500">
            <option value="">-- Select event --</option>
            {events.map(ev => <option key={ev._id} value={ev._id}>{ev.title}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Certificate Type / Template *</label>
          {templates.length === 0 ? (
            <p className="text-sm text-orange-600">No templates found. Create one in the Templates tab first.</p>
          ) : (
            <select value={selectedTemplate} onChange={e => setSelectedTemplate(e.target.value)} className="w-full text-sm px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500">
              <option value="">-- Select certificate type --</option>
              {templates.map(t => <option key={t._id} value={t._id}>{t.name} ({t.slug})</option>)}
            </select>
          )}
          <p className="text-xs text-gray-400 mt-1">Each template = one certificate type. Multiple types can be issued for the same event.</p>
        </div>
      </div>

      {/* Mode toggle */}
      <div className="flex gap-2">
        <button type="button" onClick={() => setBulkMode(false)} className={`px-4 py-2 text-sm rounded-lg border font-medium ${!bulkMode ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-gray-600 border-gray-300'}`}>Single Recipient</button>
        <button type="button" onClick={() => setBulkMode(true)} className={`px-4 py-2 text-sm rounded-lg border font-medium ${bulkMode ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-gray-600 border-gray-300'}`}>Bulk (CSV)</button>
      </div>

      {!bulkMode ? (
        <form onSubmit={handleSingle} className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
          <h3 className="font-semibold text-gray-800">2. Recipient Details</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Full Name *</label>
              <input type="text" value={recipientName} onChange={e => setRecipientName(e.target.value)} className="w-full text-sm px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
              <input type="email" value={recipientEmail} onChange={e => setRecipientEmail(e.target.value)} className="w-full text-sm px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500" required />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">User ID <span className="text-gray-400 font-normal">(optional — links to account)</span></label>
            <input type="text" value={userId} onChange={e => setUserId(e.target.value)} placeholder="MongoDB ObjectId" className="w-full text-sm font-mono px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Template Variables <span className="text-gray-400 font-normal">(one per line: key=value)</span></label>
            <textarea value={extraData} onChange={e => setExtraData(e.target.value)} rows={3} placeholder={'rank=1st Place\nschool=ABC School'} className="w-full text-sm font-mono px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 resize-none" />
            <p className="text-xs text-gray-400 mt-1">These replace {'{{key}}'} placeholders in the template.</p>
          </div>
          <div className="flex items-center gap-2">
            <input type="checkbox" id="sendEmail" checked={sendEmail} onChange={e => setSendEmail(e.target.checked)} className="h-4 w-4 text-indigo-600 border-gray-300 rounded" />
            <label htmlFor="sendEmail" className="text-sm text-gray-700">Send certificate to recipient via email</label>
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          {successSerial && <p className="text-sm text-green-600">✓ Certificate queued — Serial: <span className="font-mono">{successSerial}</span></p>}
          <button type="submit" disabled={submitting || !selectedEvent || !selectedTemplate} className="px-6 py-2.5 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700 disabled:opacity-50">
            {submitting ? 'Queuing…' : 'Issue Certificate'}
          </button>
        </form>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
          <h3 className="font-semibold text-gray-800">2. Bulk Recipients (CSV)</h3>
          <p className="text-xs text-gray-500">One recipient per line: <code className="bg-gray-100 px-1 rounded">Full Name,email@example.com,optionalUserId</code></p>
          <textarea
            value={bulkCsv}
            onChange={e => setBulkCsv(e.target.value)}
            rows={8}
            placeholder={"Alice Smith,alice@example.com\nBob Jones,bob@example.com,507f1f77bcf86cd799439011"}
            className="w-full text-sm font-mono px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 resize-none"
          />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Template Variables (shared for all)</label>
            <textarea value={extraData} onChange={e => setExtraData(e.target.value)} rows={2} placeholder={'rank=Participant\nschool=ABC School'} className="w-full text-sm font-mono px-3 py-2 border border-gray-300 rounded-lg resize-none" />
          </div>
          <div className="flex items-center gap-2">
            <input type="checkbox" id="sendEmailBulk" checked={sendEmail} onChange={e => setSendEmail(e.target.checked)} className="h-4 w-4 text-indigo-600 border-gray-300 rounded" />
            <label htmlFor="sendEmailBulk" className="text-sm text-gray-700">Send certificate to each recipient via email</label>
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          {bulkProgress && (
            <div className="space-y-1">
              <div className="flex justify-between text-xs text-gray-500">
                <span>Progress: {bulkProgress.processed}/{bulkProgress.total} processed{bulkProgress.failed > 0 ? `, ${bulkProgress.failed} failed` : ''}</span>
                <span>{Math.round((bulkProgress.processed + bulkProgress.failed) / bulkProgress.total * 100)}%</span>
              </div>
              <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-indigo-500 transition-all duration-500"
                  style={{ width: `${Math.round((bulkProgress.processed + bulkProgress.failed) / bulkProgress.total * 100)}%` }}
                />
              </div>
            </div>
          )}
          <button type="button" onClick={handleBulk} disabled={submitting || !selectedEvent || !selectedTemplate || !bulkCsv.trim()} className="px-6 py-2.5 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700 disabled:opacity-50">
            {submitting ? 'Queuing…' : `Issue to All (${bulkCsv.trim().split('\n').filter(Boolean).length} rows)`}
          </button>
        </div>
      )}
    </div>
  );
};

// ─── Templates Tab ────────────────────────────────────────────────────────────

const TemplatesTab: React.FC = () => {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [showVisualBuilder, setShowVisualBuilder] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);
  const [previewing, setPreviewing] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [expandedVersions, setExpandedVersions] = useState<string | null>(null);
  const [versions, setVersions] = useState<Record<string, Array<{ _id: string; version: number; createdAt: string; createdBy?: { firstName: string; lastName: string } }>>>({});
  const [loadingVersions, setLoadingVersions] = useState<string | null>(null);
  const [rollingBack, setRollingBack] = useState<string | null>(null);

  const fetchTemplates = async () => {
    setLoading(true);
    try {
      const res = await certificateAPI.listTemplates();
      setTemplates(res.data?.data?.templates || []);
    } catch { } finally { setLoading(false); }
  };

  useEffect(() => { fetchTemplates(); }, []);

  const openEdit = async (t: Template) => {
    try {
      const res = await api.get(`/certificates/templates/${t._id}/full`);
      setEditingTemplate(res.data?.data?.template || t);
    } catch {
      setEditingTemplate(t);
    }
  };

  const handlePreview = async (templateId: string) => {
    setPreviewing(templateId);
    try {
      const res = await certificateAPI.previewTemplate(templateId);
      const url = res.data?.data?.previewUrl;
      if (url) window.open(url, '_blank');
      else toast.error('Preview not available');
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to generate preview');
    } finally {
      setPreviewing(null);
    }
  };

  const handleDelete = async (t: Template) => {
    if (!confirm(`Delete template "${t.name}"? This cannot be undone.`)) return;
    setDeleting(t._id);
    try {
      await certificateAPI.deleteTemplate(t._id);
      toast.success('Template deleted');
      fetchTemplates();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to delete template');
    } finally {
      setDeleting(null);
    }
  };

  const loadVersions = async (templateId: string) => {
    if (versions[templateId]) return;
    setLoadingVersions(templateId);
    try {
      const res = await certificateAPI.listTemplateVersions(templateId);
      setVersions(v => ({ ...v, [templateId]: res.data?.data?.versions || [] }));
    } catch {
      toast.error('Failed to load version history');
    } finally {
      setLoadingVersions(null);
    }
  };

  const handleRollback = async (templateId: string, versionNumber: number) => {
    if (!confirm(`Roll back to version ${versionNumber}? Current version will be saved as a new snapshot.`)) return;
    setRollingBack(`${templateId}-${versionNumber}`);
    try {
      await certificateAPI.rollbackTemplate(templateId, versionNumber);
      toast.success(`Rolled back to version ${versionNumber}`);
      setVersions(v => { const n = { ...v }; delete n[templateId]; return n; });
      fetchTemplates();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Rollback failed');
    } finally {
      setRollingBack(null);
    }
  };

  useEffect(() => {
    if (expandedVersions) loadVersions(expandedVersions);
  }, [expandedVersions]);

  return (
    <div className="space-y-5 max-w-3xl">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <p className="text-sm text-gray-500">Templates define the layout of a certificate.</p>
        <button
          onClick={() => { setEditingTemplate(null); setShowVisualBuilder(true); }}
          className="flex items-center gap-1.5 px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
        >
          <Layout className="w-4 h-4" /> New Template
        </button>
      </div>

      {showVisualBuilder && (
        <VisualTemplateBuilder
          onClose={() => setShowVisualBuilder(false)}
          onSaved={() => { setShowVisualBuilder(false); setEditingTemplate(null); fetchTemplates(); }}
          editTemplate={editingTemplate ?? undefined}
        />
      )}

      {loading ? (
        <div className="py-8 text-center text-gray-400">Loading templates…</div>
      ) : templates.length === 0 ? (
        <div className="py-8 text-center text-gray-400">No templates yet. Create one above.</div>
      ) : (
        <div className="space-y-2">
          {templates.map(t => (
            <div key={t._id} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="p-4 flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-900">{t.name}</p>
                  <p className="text-xs text-gray-400 font-mono mt-0.5">{t.slug}</p>
                  {t.description && <p className="text-xs text-gray-500 mt-0.5">{t.description}</p>}
                </div>
                <div className="flex items-center gap-2 flex-wrap justify-end">
                  <span className="px-2 py-0.5 text-xs rounded-full font-medium bg-purple-100 text-purple-700">Visual</span>
                  <span className={`px-2 py-0.5 text-xs rounded-full ${t.active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>{t.active ? 'Active' : 'Inactive'}</span>
                  <span className="text-xs text-gray-400">{new Date(t.createdAt).toLocaleDateString()}</span>
                  <button
                    type="button"
                    onClick={async () => { await openEdit(t); setShowVisualBuilder(true); }}
                    className="flex items-center gap-1 px-3 py-1.5 text-xs text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
                  >
                    <Pencil className="w-3 h-3" /> Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => handlePreview(t._id)}
                    disabled={previewing === t._id}
                    className="flex items-center gap-1 px-3 py-1.5 text-xs text-indigo-600 border border-indigo-300 rounded-lg hover:bg-indigo-50 disabled:opacity-50"
                  >
                    {previewing === t._id ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Eye className="w-3 h-3" />}
                    Preview
                  </button>
                  <button
                    type="button"
                    onClick={() => setExpandedVersions(v => v === t._id ? null : t._id)}
                    className="flex items-center gap-1 px-3 py-1.5 text-xs text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
                  >
                    History
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(t)}
                    disabled={deleting === t._id}
                    className="flex items-center gap-1 px-3 py-1.5 text-xs text-red-600 border border-red-300 rounded-lg hover:bg-red-50 disabled:opacity-50"
                  >
                    {deleting === t._id ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
                    Delete
                  </button>
                </div>
              </div>
              {expandedVersions === t._id && (
                <div className="border-t border-gray-100 bg-gray-50 p-4">
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">Version History</p>
                  {loadingVersions === t._id ? (
                    <p className="text-xs text-gray-400">Loading…</p>
                  ) : !versions[t._id]?.length ? (
                    <p className="text-xs text-gray-400">No previous versions saved yet.</p>
                  ) : (
                    <div className="space-y-1.5">
                      {versions[t._id].map(v => (
                        <div key={v._id} className="flex items-center justify-between bg-white rounded-lg border border-gray-200 px-3 py-2">
                          <div>
                            <span className="text-xs font-mono text-gray-700">v{v.version}</span>
                            <span className="text-xs text-gray-400 ml-2">{new Date(v.createdAt).toLocaleString()}</span>
                            {v.createdBy && <span className="text-xs text-gray-400 ml-2">by {v.createdBy.firstName} {v.createdBy.lastName}</span>}
                          </div>
                          <button
                            type="button"
                            onClick={() => handleRollback(t._id, v.version)}
                            disabled={rollingBack === `${t._id}-${v.version}`}
                            className="text-xs px-2.5 py-1 text-orange-600 border border-orange-300 rounded hover:bg-orange-50 disabled:opacity-50"
                          >
                            {rollingBack === `${t._id}-${v.version}` ? 'Rolling back…' : 'Restore'}
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// ─── Audit Log Tab ────────────────────────────────────────────────────────────

const AuditLogTab: React.FC = () => {
  const [logs, setLogs] = useState<Array<{ _id: string; action: string; entityId: string; actor?: { firstName: string; lastName: string; email: string }; meta?: Record<string, any>; at: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [actionFilter, setActionFilter] = useState('');

  const ACTIONS = ['', 'certificate.generated', 'certificate.emailed', 'certificate.failed', 'certificate.revoked', 'certificate.email_resent'];

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, any> = { page, limit: 50 };
      if (actionFilter) params.action = actionFilter;
      const res = await certificateAPI.listAuditLogs(params);
      const data = res.data?.data;
      setLogs(data?.logs || []);
      setTotalPages(data?.pagination?.totalPages || 1);
    } catch (err) {
      logger.error('Failed to fetch audit logs', err);
    } finally {
      setLoading(false);
    }
  }, [page, actionFilter]);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  const ACTION_COLOR: Record<string, string> = {
    'certificate.generated':   'bg-green-100 text-green-700',
    'certificate.emailed':     'bg-emerald-100 text-emerald-700',
    'certificate.failed':      'bg-red-100 text-red-700',
    'certificate.revoked':     'bg-orange-100 text-orange-700',
    'certificate.email_resent':'bg-blue-100 text-blue-700',
  };

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-3">
        <select
          value={actionFilter}
          onChange={e => { setActionFilter(e.target.value); setPage(1); }}
          className="text-sm px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
        >
          {ACTIONS.map(a => <option key={a} value={a}>{a || 'All Actions'}</option>)}
        </select>
        <button onClick={fetchLogs} className="flex items-center gap-1 px-3 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50">
          <RefreshCw className="w-3.5 h-3.5" />
        </button>
        <span className="text-xs text-gray-400 ml-auto">Showing latest 50 per page</span>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="text-center py-10 text-gray-400">Loading…</div>
        ) : logs.length === 0 ? (
          <div className="text-center py-10 text-gray-400">No audit logs found</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Action</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Certificate ID</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Actor</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Meta</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {logs.map(log => (
                <tr key={log._id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 text-xs rounded-full font-medium ${ACTION_COLOR[log.action] || 'bg-gray-100 text-gray-600'}`}>
                      {log.action.replace('certificate.', '')}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-gray-500">{log.entityId}</td>
                  <td className="px-4 py-3 text-xs text-gray-600">
                    {log.actor ? `${log.actor.firstName} ${log.actor.lastName}` : <span className="text-gray-400">System</span>}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500 max-w-[200px] truncate">
                    {log.meta ? JSON.stringify(log.meta) : '—'}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500">
                    {new Date(log.at).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {totalPages > 1 && (
          <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-between">
            <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg disabled:opacity-40 hover:bg-gray-50">Previous</button>
            <span className="text-sm text-gray-500">Page {page} of {totalPages}</span>
            <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)} className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg disabled:opacity-40 hover:bg-gray-50">Next</button>
          </div>
        )}
      </div>
    </div>
  );
};

// ─── Page Shell ──────────────────────────────────────────────────────────────

const AdminCertificatesPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabKey>('list');

  const TABS: { key: TabKey; label: string }[] = [
    { key: 'list', label: 'All Certificates' },
    { key: 'create', label: '+ Issue Certificate' },
    { key: 'templates', label: 'Templates' },
    { key: 'audit', label: 'Audit Log' },
  ];

  return (
    <div className="p-6">
      <div className="flex items-center gap-3 mb-6">
        <Award className="text-indigo-600 w-7 h-7" />
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Certificates</h1>
          <p className="text-sm text-gray-500">Issue, manage and verify participant certificates</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 mb-6 w-fit">
        {TABS.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-5 py-2 text-sm font-medium rounded-lg transition-colors ${activeTab === tab.key ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-600 hover:text-gray-900'}`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'list' && <CertListTab />}
      {activeTab === 'create' && <CreateCertTab />}
      {activeTab === 'templates' && <TemplatesTab />}
      {activeTab === 'audit' && <AuditLogTab />}
    </div>
  );
};

export default AdminCertificatesPage;
