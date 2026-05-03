import React, { useState, useEffect, useCallback } from 'react';
import { Award, Search, XCircle, CheckCircle, RefreshCw, ExternalLink, Mail, Eye, Layout, Trash2, Pencil, RotateCcw, Upload, Users } from 'lucide-react';
import { certificateAPI, type CertVerifyResult } from '../../services/api/reviewLinkAPI';
import adminAPI from '../../services/api/adminAPI';
import api from '../../services/api';
import toast from 'react-hot-toast';
import logger from '@/utils/logger';
import VisualTemplateBuilder from '../../components/admin/VisualTemplateBuilder';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Template { _id: string; name: string; slug: string; active: boolean; createdAt: string; mode?: 'html' | 'visual'; html?: string; css?: string; description?: string; backgroundImageUrl?: string; canvasWidth?: number; canvasHeight?: number; fields?: any[] }
interface EventOption { _id: string; title: string }
interface CertType { name: string; slug: string; templateId?: string; isDefault?: boolean; description?: string }

type TabKey = 'list' | 'create' | 'templates' | 'audit' | 'bulkImport';
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
  const [retrying, setRetrying] = useState<string | null>(null);
  const [events, setEvents] = useState<EventOption[]>([]);
  const [studentIdFilter, setStudentIdFilter] = useState('');
  const [studentEmailInput, setStudentEmailInput] = useState('');
  const [linkedStudent, setLinkedStudent] = useState<{ _id: string; firstName: string; lastName: string; grade?: string } | null>(null);
  const [studentSearching, setStudentSearching] = useState(false);
  const [studentSearchError, setStudentSearchError] = useState('');

  const [editingCert, setEditingCert] = useState<any | null>(null);
  const [editForm, setEditForm] = useState({ recipientName: '', recipientEmail: '', status: 'pending', certificateTypeSlug: '', dataText: '' });
  const [saving, setSaving] = useState(false);
  const [hardDeleting, setHardDeleting] = useState<string | null>(null);

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
      if (studentIdFilter) params.studentId = studentIdFilter;
      const res = await certificateAPI.list(params);
      const data = res.data?.data;
      setCerts(data?.certificates || []);
      setTotalPages(data?.pagination?.totalPages || 1);
    } catch (err) {
      logger.error('Failed to fetch certificates', err);
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter, eventFilter, studentIdFilter]);

  useEffect(() => { fetchCerts(); }, [fetchCerts]);

  const handleRetry = async (cert: CertVerifyResult) => {
    if (!cert._id) return;
    setRetrying(cert._id);
    try {
      await certificateAPI.retryGenerate(cert._id);
      toast.success('Certificate queued for regeneration');
      fetchCerts();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to retry');
    } finally {
      setRetrying(null);
    }
  };

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

  const handleStudentSearch = async () => {
    if (!studentEmailInput.trim()) return;
    setStudentSearching(true);
    setStudentSearchError('');
    setLinkedStudent(null);
    setStudentIdFilter('');
    try {
      const res = await api.get('/students', { params: { email: studentEmailInput.trim(), limit: 1 } });
      const student = (res.data?.data?.students || res.data?.students || [])[0];
      if (!student) {
        setStudentSearchError('No student found with that email');
      } else {
        setLinkedStudent({ _id: student._id, firstName: student.firstName, lastName: student.lastName, grade: student.grade });
        setStudentIdFilter(student._id);
        setPage(1);
      }
    } catch {
      setStudentSearchError('Failed to search for student');
    } finally {
      setStudentSearching(false);
    }
  };

  const clearStudentFilter = () => {
    setStudentIdFilter('');
    setLinkedStudent(null);
    setStudentEmailInput('');
    setStudentSearchError('');
    setPage(1);
  };

  const openEdit = (cert: any) => {
    const dataLines = Object.entries(cert.data || {}).map(([k, v]) => `${k}=${v}`).join('\n');
    setEditForm({
      recipientName: cert.recipient?.name || cert.recipientName || '',
      recipientEmail: cert.recipient?.email || '',
      status: cert.status || 'pending',
      certificateTypeSlug: cert.certificateTypeSlug || '',
      dataText: dataLines,
    });
    setEditingCert(cert);
  };

  const handleSaveEdit = async () => {
    if (!editingCert?._id) return;
    setSaving(true);
    try {
      const dataObj: Record<string, string> = {};
      editForm.dataText.split('\n').forEach(line => {
        const [k, ...v] = line.split('=');
        if (k?.trim()) dataObj[k.trim()] = v.join('=').trim();
      });
      await api.put(`/certificates/${editingCert._id}`, {
        recipient: { name: editForm.recipientName, email: editForm.recipientEmail },
        status: editForm.status,
        certificateTypeSlug: editForm.certificateTypeSlug || undefined,
        data: dataObj,
      });
      toast.success('Certificate updated');
      setEditingCert(null);
      fetchCerts();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to update');
    } finally {
      setSaving(false);
    }
  };

  const handleHardDelete = async (cert: any) => {
    if (!cert._id) return;
    if (!confirm(`Permanently DELETE certificate ${cert.serialNumber || cert._id}?\n\nThis cannot be undone and removes all records.`)) return;
    setHardDeleting(cert._id);
    try {
      await api.delete(`/certificates/${cert._id}`);
      toast.success('Certificate permanently deleted');
      fetchCerts();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to delete');
    } finally {
      setHardDeleting(null);
    }
  };

  const filtered = search
    ? certs.filter(c => {
        const q = search.toLowerCase();
        const name = (c.recipient?.name || c.recipientName || '').toLowerCase();
        const event = (typeof c.eventId === 'object' ? c.eventId?.title : c.eventTitle || '').toLowerCase();
        return (
          c.serialNumber?.toLowerCase().includes(q) ||
          name.includes(q) ||
          event.includes(q) ||
          c.recipient?.email?.toLowerCase().includes(q) ||
          c.certificateTypeSlug?.toLowerCase().includes(q)
        );
      })
    : certs;

  return (
    <div className="space-y-4">
      {/* Edit Modal */}
      {editingCert && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-gray-900">Edit Certificate</h3>
              <button type="button" onClick={() => setEditingCert(null)} className="text-gray-400 hover:text-gray-600">
                <XCircle className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Recipient Name</label>
                  <input type="text" value={editForm.recipientName}
                    onChange={e => setEditForm(f => ({ ...f, recipientName: e.target.value }))}
                    className="w-full text-sm px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Recipient Email</label>
                  <input type="email" value={editForm.recipientEmail}
                    onChange={e => setEditForm(f => ({ ...f, recipientEmail: e.target.value }))}
                    className="w-full text-sm px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Status</label>
                  <select value={editForm.status} onChange={e => setEditForm(f => ({ ...f, status: e.target.value }))}
                    className="w-full text-sm px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500">
                    {['pending','generating','generated','emailed','failed','revoked'].map(s => (
                      <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Cert Type Slug</label>
                  <input type="text" value={editForm.certificateTypeSlug} placeholder="participation"
                    onChange={e => setEditForm(f => ({ ...f, certificateTypeSlug: e.target.value }))}
                    className="w-full text-sm px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Data Fields <span className="text-gray-400 font-normal">(key=value, one per line)</span></label>
                <textarea value={editForm.dataText} rows={6}
                  onChange={e => setEditForm(f => ({ ...f, dataText: e.target.value }))}
                  placeholder={"grade=Grade 5\nschool=Example School\ntotal=64\nteam_name=Team Alpha"}
                  className="w-full text-sm font-mono px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 resize-none" />
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 pt-1">
              <button type="button" onClick={() => setEditingCert(null)}
                className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50">
                Cancel
              </button>
              <button type="button" onClick={handleSaveEdit} disabled={saving}
                className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50">
                {saving ? 'Saving…' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

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
        <div className="flex items-center gap-2">
          <div className="relative">
            <Users className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="email"
              value={studentEmailInput}
              onChange={e => setStudentEmailInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleStudentSearch()}
              placeholder="Student email…"
              className="pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 w-48"
            />
          </div>
          <button
            type="button"
            onClick={handleStudentSearch}
            disabled={studentSearching || !studentEmailInput.trim()}
            className="px-3 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 flex items-center"
            title="Filter by student"
          >
            {studentSearching ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
          </button>
          {linkedStudent && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 border border-indigo-200 rounded-lg text-xs text-indigo-700">
              <Users className="w-3.5 h-3.5" />
              <span className="font-medium">{linkedStudent.firstName} {linkedStudent.lastName}</span>
              {linkedStudent.grade && <span className="text-indigo-400">· {linkedStudent.grade}</span>}
              <button type="button" onClick={clearStudentFilter} className="ml-1 text-indigo-400 hover:text-indigo-600" title="Clear filter">
                <XCircle className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
          {studentSearchError && <p className="text-xs text-red-500">{studentSearchError}</p>}
        </div>
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
                    <p className="font-medium text-gray-900">{cert.recipient?.name || cert.recipientName || '—'}</p>
                    <p className="text-xs text-gray-400">{cert.recipient?.email || '—'}</p>
                    {(cert as any).studentInfo ? (
                      <div className="flex items-center gap-1 mt-0.5">
                        <Users className="w-3 h-3 text-indigo-400 shrink-0" />
                        <span className="text-xs text-indigo-600 font-medium">
                          {(cert as any).studentInfo.firstName} {(cert as any).studentInfo.lastName}
                        </span>
                        {(cert as any).studentInfo.grade && (
                          <span className="text-xs bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded">
                            {(cert as any).studentInfo.grade}
                          </span>
                        )}
                      </div>
                    ) : (cert as any).data?.grade ? (
                      <span className="text-xs bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded mt-0.5 inline-block">
                        {(cert as any).data.grade}
                      </span>
                    ) : null}
                  </td>
                  <td className="px-4 py-3 text-gray-700 max-w-[180px] truncate">
                    {(typeof cert.eventId === 'object' && cert.eventId?.title) || cert.eventTitle || '—'}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500">
                    {cert.certificateTypeSlug
                      ? <span className="capitalize">{cert.certificateTypeSlug.replace(/-/g, ' ')}</span>
                      : (typeof cert.templateId === 'object' && cert.templateId?.name)
                        ? <span className="text-gray-400">{cert.templateId.name}</span>
                        : '—'}
                  </td>
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
                    <div className="flex items-center gap-1.5 flex-wrap">
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
                      {cert._id && (
                        <button type="button" onClick={() => openEdit(cert)} className="p-1.5 text-gray-500 hover:bg-gray-100 rounded" title="Edit">
                          <Pencil className="w-4 h-4" />
                        </button>
                      )}
                      {cert._id && (cert.status === 'pending' || cert.status === 'failed') && (
                        <button type="button" onClick={() => handleRetry(cert)} disabled={retrying === cert._id} className="p-1.5 text-amber-500 hover:bg-amber-50 rounded disabled:opacity-50" title="Retry Generation">
                          {retrying === cert._id ? <RefreshCw className="w-4 h-4 animate-spin" /> : <RotateCcw className="w-4 h-4" />}
                        </button>
                      )}
                      {cert._id && (cert.status === 'generated' || cert.status === 'emailed') && (
                        <button type="button" onClick={() => handleResendEmail(cert)} disabled={resending === cert._id} className="p-1.5 text-blue-500 hover:bg-blue-50 rounded disabled:opacity-50" title="Resend Email">
                          {resending === cert._id ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
                        </button>
                      )}
                      {cert.status !== 'revoked' && cert._id && (
                        <button type="button" onClick={() => handleRevoke(cert)} disabled={revoking === cert._id} className="p-1.5 text-orange-500 hover:bg-orange-50 rounded disabled:opacity-50" title="Revoke (soft)">
                          <XCircle className="w-4 h-4" />
                        </button>
                      )}
                      {cert._id && (
                        <button type="button" onClick={() => handleHardDelete(cert)} disabled={hardDeleting === cert._id} className="p-1.5 text-red-600 hover:bg-red-50 rounded disabled:opacity-50" title="Delete permanently">
                          {hardDeleting === cert._id ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
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
  const [eventsLoading, setEventsLoading] = useState(true);

  const [selectedEventId, setSelectedEventId] = useState('');
  const [eventCertTypes, setEventCertTypes] = useState<CertType[]>([]);
  const [certTypesLoading, setCertTypesLoading] = useState(false);
  const [selectedCertTypeSlug, setSelectedCertTypeSlug] = useState('');
  const [fallbackTemplates, setFallbackTemplates] = useState<Template[]>([]);
  const [isFallback, setIsFallback] = useState(false);
  const [selectedFallbackTemplateId, setSelectedFallbackTemplateId] = useState('');

  const [recipientName, setRecipientName] = useState('');
  const [recipientEmail, setRecipientEmail] = useState('');
  const [userId, setUserId] = useState('');
  const [extraData, setExtraData] = useState('');

  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [userSearchResults, setUserSearchResults] = useState<{ _id: string; firstName: string; lastName: string; email: string }[]>([]);
  const [userSearchLoading, setUserSearchLoading] = useState(false);
  const [userSearchTimeout, setUserSearchTimeout] = useState<ReturnType<typeof setTimeout> | null>(null);
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [sendEmail, setSendEmail] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [successSerial, setSuccessSerial] = useState<string | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      setEventsLoading(true);
      try {
        const res = await api.get('/events/admin/for-certificates');
        const list: EventOption[] = (res.data?.data?.events || []).map((e: any) => ({ _id: e._id || e.id, title: e.title }));
        setEvents(list);
      } catch {
        try {
          const evRes: any = await adminAPI.getEvents({ limit: 200 });
          const list: EventOption[] = (evRes?.events || evRes?.data?.events || []).map((e: any) => ({ _id: e._id || e.id, title: e.title }));
          setEvents(list);
        } catch { /* silent */ }
      } finally {
        setEventsLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    if (!selectedEventId) {
      setEventCertTypes([]);
      setSelectedCertTypeSlug('');
      setFallbackTemplates([]);
      setIsFallback(false);
      setSelectedFallbackTemplateId('');
      return;
    }
    (async () => {
      setCertTypesLoading(true);
      try {
        const res = await api.get(`/events/${selectedEventId}/certificate-types`);
        const types: CertType[] = res.data?.data || [];
        if (types.length > 0) {
          setEventCertTypes(types);
          setIsFallback(false);
          const defaultType = types.find(t => t.isDefault) || types[0];
          setSelectedCertTypeSlug(defaultType.slug);
          setFallbackTemplates([]);
          setSelectedFallbackTemplateId('');
        } else {
          setEventCertTypes([]);
          setIsFallback(true);
          setSelectedCertTypeSlug('');
          const tmplRes = await certificateAPI.listTemplates();
          const tmplList: Template[] = tmplRes?.data?.data?.templates || [];
          setFallbackTemplates(tmplList);
          setSelectedFallbackTemplateId(tmplList[0]?._id || '');
        }
      } catch {
        setEventCertTypes([]);
        setIsFallback(false);
      } finally {
        setCertTypesLoading(false);
      }
    })();
  }, [selectedEventId]);

  const selectedCertType = eventCertTypes.find(t => t.slug === selectedCertTypeSlug);
  const activeTemplateId = isFallback ? selectedFallbackTemplateId : (selectedCertType?.templateId || '');
  const activeCertTypeSlug = isFallback ? undefined : selectedCertTypeSlug;
  const canGenerate = !!selectedEventId && (isFallback ? !!selectedFallbackTemplateId : !!selectedCertTypeSlug);

  useEffect(() => {
    if (userSearchTimeout) clearTimeout(userSearchTimeout);
    if (!userSearchQuery.trim() || userSearchQuery.length < 3) {
      setUserSearchResults([]);
      return;
    }
    const timeout = setTimeout(async () => {
      setUserSearchLoading(true);
      try {
        const res = await api.get('/admin/users/search', { params: { q: userSearchQuery, limit: 10 } });
        setUserSearchResults(res.data?.data?.users || res.data?.users || []);
      } catch {
        setUserSearchResults([]);
      } finally {
        setUserSearchLoading(false);
      }
    }, 300);
    setUserSearchTimeout(timeout);
    return () => { if (timeout) clearTimeout(timeout); };
  }, [userSearchQuery]);

  const handleSelectUser = (user: { _id: string; firstName: string; lastName: string; email: string }) => {
    setUserId(user._id);
    setUserSearchQuery(`${user.firstName} ${user.lastName} (${user.email})`);
    setShowUserDropdown(false);
    setUserSearchResults([]);
  };

  const handleClearUser = () => {
    setUserId('');
    setUserSearchQuery('');
    setUserSearchResults([]);
  };

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
    if (!canGenerate || !recipientName || !recipientEmail) {
      setError('Event, certificate type, name and email are required.');
      return;
    }
    setSubmitting(true);
    setError('');
    setSuccessSerial(null);
    try {
      const res = await api.post('/certificates/generate', {
        eventId: selectedEventId,
        userId: userId || undefined,
        templateId: activeTemplateId || undefined,
        certificateTypeSlug: activeCertTypeSlug,
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

  return (
    <div className="max-w-2xl space-y-6">
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-800">
        One event can have <strong>multiple certificate types</strong> — select an event to see its types (e.g. Participation, Winner, Merit).
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
        <h3 className="font-semibold text-gray-800">1. Select Event &amp; Certificate Type</h3>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Event *</label>
          {eventsLoading ? (
            <p className="text-sm text-gray-400">Loading events…</p>
          ) : events.length === 0 ? (
            <p className="text-sm text-orange-600">No approved events found. Create and approve an event first.</p>
          ) : (
            <select
              value={selectedEventId}
              onChange={e => setSelectedEventId(e.target.value)}
              className="w-full text-sm px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">-- Select event --</option>
              {events.map(ev => <option key={ev._id} value={ev._id}>{ev.title}</option>)}
            </select>
          )}
        </div>

        {selectedEventId && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Certificate Type *</label>
            {certTypesLoading ? (
              <p className="text-sm text-gray-400">Loading certificate types…</p>
            ) : !isFallback ? (
              eventCertTypes.length > 0 ? (
                <>
                  <select
                    value={selectedCertTypeSlug}
                    onChange={e => setSelectedCertTypeSlug(e.target.value)}
                    className="w-full text-sm px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  >
                    {eventCertTypes.map(t => (
                      <option key={t.slug} value={t.slug}>{t.name} ({t.slug}){t.isDefault ? ' — default' : ''}</option>
                    ))}
                  </select>
                  {selectedCertType?.description && (
                    <p className="text-xs text-gray-400 mt-1">{selectedCertType.description}</p>
                  )}
                  {!selectedCertType?.templateId && (
                    <p className="text-xs text-amber-600 mt-1">⚠ This certificate type has no template linked. Certificate will be issued without a PDF.</p>
                  )}
                </>
              ) : null
            ) : (
              <>
                {fallbackTemplates.length === 0 ? (
                  <p className="text-sm text-orange-600">No templates found. Create one in the Templates tab first.</p>
                ) : (
                  <select
                    value={selectedFallbackTemplateId}
                    onChange={e => setSelectedFallbackTemplateId(e.target.value)}
                    className="w-full text-sm px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="">-- Select template --</option>
                    {fallbackTemplates.map(t => <option key={t._id} value={t._id}>{t.name} ({t.slug})</option>)}
                  </select>
                )}
                <p className="text-xs text-gray-400 mt-1">This event has no certificate types configured — selecting a template directly.</p>
              </>
            )}
          </div>
        )}
      </div>

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
        <div className="relative">
          <label className="block text-sm font-medium text-gray-700 mb-1">Link to User Account <span className="text-gray-400 font-normal">(optional)</span></label>
          {userId ? (
            <div className="flex items-center gap-2 p-2 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex-1">
                <span className="text-sm text-green-800 font-medium">User linked</span>
                <span className="text-xs text-green-600 ml-2 font-mono">{userId.slice(0, 12)}...</span>
              </div>
              <button type="button" onClick={handleClearUser} className="text-green-600 hover:text-green-800 text-sm">Clear</button>
            </div>
          ) : (
            <>
              <input
                type="text"
                value={userSearchQuery}
                onChange={e => { setUserSearchQuery(e.target.value); setShowUserDropdown(true); }}
                onFocus={() => setShowUserDropdown(true)}
                placeholder="Search by name or email..."
                className="w-full text-sm px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
              />
              {showUserDropdown && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-auto">
                  {userSearchLoading ? (
                    <div className="p-3 text-sm text-gray-500 text-center">Searching...</div>
                  ) : userSearchResults.length > 0 ? (
                    userSearchResults.map(user => (
                      <button key={user._id} type="button" onClick={() => handleSelectUser(user)} className="w-full text-left px-3 py-2 hover:bg-indigo-50 border-b border-gray-100 last:border-b-0">
                        <div className="text-sm font-medium text-gray-900">{user.firstName} {user.lastName}</div>
                        <div className="text-xs text-gray-500">{user.email}</div>
                      </button>
                    ))
                  ) : userSearchQuery.length >= 3 ? (
                    <div className="p-3 text-sm text-gray-500 text-center">No users found</div>
                  ) : (
                    <div className="p-3 text-sm text-gray-400 text-center">Type at least 3 characters to search</div>
                  )}
                </div>
              )}
              <p className="text-xs text-gray-400 mt-1">Search for an existing user or leave empty to issue without linking</p>
            </>
          )}
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
        <button type="submit" disabled={submitting || !canGenerate} className="px-6 py-2.5 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700 disabled:opacity-50">
          {submitting ? 'Queuing…' : 'Issue Certificate'}
        </button>
      </form>
    </div>
  );
};

// ─── Bulk Import Tab ──────────────────────────────────────────────────────────

interface BulkImportResult { serial: string; recipientName: string; email: string; studentLinked: boolean }
interface BulkImportFailedRow { row: number; email?: string; error: string }

const BulkImportTab: React.FC = () => {
  const [events, setEvents] = useState<EventOption[]>([]);
  const [eventsLoading, setEventsLoading] = useState(true);
  const [selectedEventId, setSelectedEventId] = useState('');
  const [eventCertTypes, setEventCertTypes] = useState<CertType[]>([]);
  const [certTypesLoading, setCertTypesLoading] = useState(false);
  const [selectedCertTypeSlug, setSelectedCertTypeSlug] = useState('');
  const [fallbackTemplates, setFallbackTemplates] = useState<Template[]>([]);
  const [isFallback, setIsFallback] = useState(false);
  const [selectedFallbackTemplateId, setSelectedFallbackTemplateId] = useState('');

  const [csv, setCsv] = useState('');
  const [sendEmail, setSendEmail] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [results, setResults] = useState<BulkImportResult[] | null>(null);
  const [failedRows, setFailedRows] = useState<BulkImportFailedRow[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      setEventsLoading(true);
      try {
        const res = await api.get('/events/admin/for-certificates');
        const list: EventOption[] = (res.data?.data?.events || []).map((e: any) => ({ _id: e._id || e.id, title: e.title }));
        setEvents(list);
      } catch {
        try {
          const evRes: any = await adminAPI.getEvents({ limit: 200 });
          const list: EventOption[] = (evRes?.events || evRes?.data?.events || []).map((e: any) => ({ _id: e._id || e.id, title: e.title }));
          setEvents(list);
        } catch { /* silent */ }
      } finally {
        setEventsLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    if (!selectedEventId) {
      setEventCertTypes([]);
      setSelectedCertTypeSlug('');
      setFallbackTemplates([]);
      setIsFallback(false);
      setSelectedFallbackTemplateId('');
      return;
    }
    (async () => {
      setCertTypesLoading(true);
      try {
        const res = await api.get(`/events/${selectedEventId}/certificate-types`);
        const types: CertType[] = res.data?.data || [];
        if (types.length > 0) {
          setEventCertTypes(types);
          setIsFallback(false);
          const defaultType = types.find(t => t.isDefault) || types[0];
          setSelectedCertTypeSlug(defaultType.slug);
          setFallbackTemplates([]);
          setSelectedFallbackTemplateId('');
        } else {
          setEventCertTypes([]);
          setIsFallback(true);
          setSelectedCertTypeSlug('');
          const tmplRes = await certificateAPI.listTemplates();
          const tmplList: Template[] = tmplRes?.data?.data?.templates || [];
          setFallbackTemplates(tmplList);
          setSelectedFallbackTemplateId(tmplList[0]?._id || '');
        }
      } catch {
        setEventCertTypes([]);
        setIsFallback(false);
      } finally {
        setCertTypesLoading(false);
      }
    })();
  }, [selectedEventId]);

  const selectedCertType = eventCertTypes.find(t => t.slug === selectedCertTypeSlug);
  const activeTemplateId = isFallback ? selectedFallbackTemplateId : (selectedCertType?.templateId || '');
  const activeCertTypeSlug = isFallback ? undefined : selectedCertTypeSlug;
  const csvLines = csv.trim().split('\n').filter(l => l.trim());
  const dataLineCount = csvLines.length > 1 ? csvLines.length - 1 : 0;
  const canSubmit = !!selectedEventId && (isFallback ? !!selectedFallbackTemplateId : !!selectedCertTypeSlug) && dataLineCount > 0;

  const handleImport = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    setError('');
    setResults(null);
    setFailedRows([]);
    try {
      const res = await api.post('/certificates/bulk-import', {
        eventId: selectedEventId,
        certificateTypeSlug: activeCertTypeSlug,
        templateId: activeTemplateId || undefined,
        sendEmail,
        csv: csv.trim(),
      });
      const data = res.data?.data;
      setResults(data?.results || []);
      setFailedRows(data?.failedRows || []);
      if ((data?.processed ?? 0) > 0) toast.success(`${data.processed} certificate(s) queued`);
      if ((data?.failed ?? 0) > 0) toast.error(`${data.failed} row(s) failed — see results below`);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Import failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl space-y-6">
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-800">
        Upload CSV to issue certificates in bulk. Existing students are auto-linked by email.
      </div>

      {/* Step 1: Event + CertType */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
        <h3 className="font-semibold text-gray-800">1. Select Event &amp; Certificate Type</h3>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Event *</label>
          {eventsLoading ? (
            <p className="text-sm text-gray-400">Loading events…</p>
          ) : (
            <select value={selectedEventId} onChange={e => setSelectedEventId(e.target.value)}
              className="w-full text-sm px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500">
              <option value="">-- Select event --</option>
              {events.map(ev => <option key={ev._id} value={ev._id}>{ev.title}</option>)}
            </select>
          )}
        </div>
        {selectedEventId && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Certificate Type *</label>
            {certTypesLoading ? (
              <p className="text-sm text-gray-400">Loading…</p>
            ) : !isFallback ? (
              eventCertTypes.length > 0 ? (
                <select value={selectedCertTypeSlug} onChange={e => setSelectedCertTypeSlug(e.target.value)}
                  className="w-full text-sm px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500">
                  {eventCertTypes.map(t => (
                    <option key={t.slug} value={t.slug}>{t.name}{t.isDefault ? ' — default' : ''}</option>
                  ))}
                </select>
              ) : null
            ) : (
              <select value={selectedFallbackTemplateId} onChange={e => setSelectedFallbackTemplateId(e.target.value)}
                className="w-full text-sm px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500">
                <option value="">-- Select template --</option>
                {fallbackTemplates.map(t => <option key={t._id} value={t._id}>{t.name}</option>)}
              </select>
            )}
          </div>
        )}
      </div>

      {/* Step 2: CSV */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
        <h3 className="font-semibold text-gray-800">2. Paste CSV Data</h3>
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 font-mono text-xs text-gray-500 leading-relaxed">
          student_name,email,school_name,issue_date,certificate_type,team_name,grade,category,total<br />
          Alice Smith,alice@school.edu,Example School,23-03-2026,Participation,Team Alpha,Grade 5,Grades 3-5,64<br />
          Bob Jones,bob@school.edu,Another School,23-03-2026,Winner,Team Beta,Grade 7,,92
        </div>
        <p className="text-xs text-gray-400">
          Mandatory: <code className="bg-gray-100 px-1 rounded">student_name</code>, <code className="bg-gray-100 px-1 rounded">email</code>, <code className="bg-gray-100 px-1 rounded">school_name</code>, <code className="bg-gray-100 px-1 rounded">issue_date</code>, <code className="bg-gray-100 px-1 rounded">certificate_type</code>.
          All other columns are optional and stored as certificate data. Quoted fields with commas are supported.
        </p>
        <textarea
          value={csv}
          onChange={e => setCsv(e.target.value)}
          rows={8}
          placeholder={"student_name,email,school_name,issue_date,certificate_type,team_name,grade,total\nAlice Smith,alice@example.com,Example School,23-03-2026,Participation,Team A,Grade 5,64\nBob Jones,bob@example.com,Other School,23-03-2026,Winner,Team B,Grade 7,92"}
          className="w-full text-sm font-mono px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 resize-none"
        />
        <div className="flex items-center gap-2">
          <input type="checkbox" id="bulkSendEmail" checked={sendEmail} onChange={e => setSendEmail(e.target.checked)} className="h-4 w-4 text-indigo-600 border-gray-300 rounded" />
          <label htmlFor="bulkSendEmail" className="text-sm text-gray-700">Send certificate to each recipient via email</label>
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button type="button" onClick={handleImport} disabled={submitting || !canSubmit}
          className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700 disabled:opacity-50">
          {submitting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
          {submitting ? 'Processing…' : `Import${dataLineCount > 0 ? ` (${dataLineCount} rows)` : ''}`}
        </button>
      </div>

      {/* Results */}
      {results !== null && (
        <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
          <h3 className="font-semibold text-gray-800">Results</h3>
          <div className="flex gap-4 text-sm">
            <span className="text-green-700 font-medium">✓ {results.length} issued</span>
            {failedRows.length > 0 && <span className="text-red-600 font-medium">✗ {failedRows.length} failed</span>}
          </div>
          {results.length > 0 && (
            <div className="overflow-auto max-h-64 rounded-lg border border-gray-100">
              <table className="w-full text-xs">
                <thead className="bg-gray-50 sticky top-0">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium text-gray-600">Serial</th>
                    <th className="px-3 py-2 text-left font-medium text-gray-600">Name</th>
                    <th className="px-3 py-2 text-left font-medium text-gray-600">Email</th>
                    <th className="px-3 py-2 text-left font-medium text-gray-600">Student Linked</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {results.map((r, i) => (
                    <tr key={i} className="hover:bg-gray-50">
                      <td className="px-3 py-2 font-mono text-gray-700">{r.serial}</td>
                      <td className="px-3 py-2 text-gray-700">{r.recipientName}</td>
                      <td className="px-3 py-2 text-gray-500">{r.email}</td>
                      <td className="px-3 py-2">
                        {r.studentLinked
                          ? <span className="text-green-600 font-medium">✓ Yes</span>
                          : <span className="text-gray-400">—</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {failedRows.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 space-y-1">
              <p className="text-xs font-semibold text-red-700 mb-2">Failed Rows:</p>
              {failedRows.map((f, i) => (
                <p key={i} className="text-xs text-red-600">
                  Row {f.row}{f.email ? ` (${f.email})` : ''}: {f.error}
                </p>
              ))}
            </div>
          )}
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
    { key: 'bulkImport', label: 'Bulk Import' },
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
      {activeTab === 'bulkImport' && <BulkImportTab />}
      {activeTab === 'templates' && <TemplatesTab />}
      {activeTab === 'audit' && <AuditLogTab />}
    </div>
  );
};

export default AdminCertificatesPage;
