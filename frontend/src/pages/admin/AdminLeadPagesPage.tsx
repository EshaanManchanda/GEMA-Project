import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  FaSearch, FaExternalLinkAlt, FaTrash,
  FaUsers, FaEye, FaChevronDown, FaChevronUp, FaCopy, FaFilter,
  FaPhone, FaEnvelope, FaBullhorn, FaCalendarAlt, FaPowerOff, FaBan,
} from 'react-icons/fa';
import {
  getAdminLeadPages,
  toggleLeadPage,
  deleteLeadPage,
  deleteLead,
  ILeadPage as LeadPage,
  Lead,
} from '../../services/api/leadPageAPI';
import { getEventImageFromEvent } from '../../utils/imageFallbacks';

const AdminLeadPagesPage: React.FC = () => {
  const navigate = useNavigate();
  const [leadPages, setLeadPages] = useState<LeadPage[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const fetchLeadPages = async () => {
    setLoading(true);
    try {
      const data = await getAdminLeadPages();
      setLeadPages(data);
    } catch (err) {
      toast.error('Failed to load lead pages');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeadPages();
  }, []);

  const filtered = useMemo(() => {
    return leadPages.filter((lp) => {
      const matchSearch =
        !search || lp.event?.title?.toLowerCase().includes(search.toLowerCase());
      const matchStatus =
        statusFilter === 'all' ||
        (statusFilter === 'active' && lp.isActive) ||
        (statusFilter === 'inactive' && !lp.isActive);
      return matchSearch && matchStatus;
    });
  }, [leadPages, search, statusFilter]);

  const toggleExpand = (id: string) => {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleToggle = async (id: string) => {
    try {
      const updated = await toggleLeadPage(id);
      setLeadPages((prev) =>
        prev.map((lp) => (lp._id === id ? { ...lp, isActive: updated.isActive } : lp))
      );
      toast.success(`Lead page ${updated.isActive ? 'activated' : 'deactivated'}`);
    } catch {
      toast.error('Failed to toggle');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteLeadPage(id);
      setLeadPages((prev) => prev.filter((lp) => lp._id !== id));
      setDeleteConfirm(null);
      toast.success('Lead page deleted');
    } catch {
      toast.error('Failed to delete');
    }
  };

  const handleDeleteLead = async (leadPageId: string, leadId: string) => {
    try {
      await deleteLead(leadPageId, leadId);
      setLeadPages((prev) =>
        prev.map((lp) =>
          lp._id === leadPageId
            ? { ...lp, leads: lp.leads.filter((l: any) => l._id !== leadId) }
            : lp
        )
      );
      toast.success('Lead deleted');
    } catch {
      toast.error('Failed to delete lead');
    }
  };

  const copyLink = (eventId: string) => {
    const url = `${window.location.origin}/lead-page?eventId=${eventId}`;
    navigator.clipboard.writeText(url).then(() => toast.success('Link copied!'));
  };

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });

  const totalLeads = leadPages.reduce((acc, lp) => acc + (lp.leads?.length || 0), 0);
  const activeCount = leadPages.filter((lp) => lp.isActive).length;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-pink-600 rounded-xl flex items-center justify-center shadow-lg">
            <FaBullhorn className="text-white" size={18} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Lead Pages</h1>
            <p className="text-sm text-gray-500">Manage event promotional pages and track leads</p>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        {[
          { label: 'Total Lead Pages', value: leadPages.length, color: 'from-blue-500 to-indigo-600', icon: '📄' },
          { label: 'Active Pages', value: activeCount, color: 'from-green-500 to-emerald-600', icon: '✅' },
          { label: 'Total Leads Captured', value: totalLeads, color: 'from-orange-500 to-pink-600', icon: '👥' },
        ].map((stat) => (
          <div
            key={stat.label}
            className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 flex items-center gap-4"
          >
            <div className={`w-12 h-12 bg-gradient-to-br ${stat.color} rounded-xl flex items-center justify-center text-xl shadow`}>
              {stat.icon}
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
              <p className="text-sm text-gray-500">{stat.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 mb-5 flex flex-col sm:flex-row gap-3 items-start sm:items-center">
        <div className="relative flex-1 min-w-0">
          <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
          <input
            type="text"
            placeholder="Search by event name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 bg-gray-50"
          />
        </div>
        <div className="flex items-center gap-2">
          <FaFilter size={13} className="text-gray-400" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="pl-3 pr-8 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 bg-gray-50 cursor-pointer"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
        <button
          onClick={() => {
            const csvRows = [
              ['Event', 'Lead Name', 'Email', 'Phone', 'Message', 'Submitted At']
            ];
            filtered.forEach(lp => {
              const eventName = lp.event?.title?.replace(/,/g, '') || 'Unknown';
              (lp.leads || []).forEach(lead => {
                csvRows.push([
                  eventName,
                  lead.name?.replace(/,/g, '') || '',
                  lead.email || '',
                  lead.phone || '',
                  lead.message?.replace(/,/g, '') || '',
                  new Date(lead.submittedAt).toLocaleDateString()
                ]);
              });
            });
            const csvContent = "data:text/csv;charset=utf-8," + csvRows.map(e => e.join(",")).join("\n");
            const encodedUri = encodeURI(csvContent);
            const link = document.createElement("a");
            link.setAttribute("href", encodedUri);
            link.setAttribute("download", "lead_pages_export.csv");
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
          }}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-gray-100 text-gray-700 text-sm font-medium rounded-xl hover:bg-gray-200 transition whitespace-nowrap"
        >
          <FaCopy size={12} />
          Export CSV
        </button>
        <button
          onClick={() => navigate('/lead-page')}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-orange-500 to-pink-600 text-white text-sm font-medium rounded-xl hover:opacity-90 transition whitespace-nowrap shadow"
        >
          <FaExternalLinkAlt size={12} />
          View Lead Page
        </button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center">
            <div className="w-10 h-10 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-gray-500 text-sm">Loading lead pages...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-16 text-center">
            <FaBullhorn size={40} className="text-gray-200 mx-auto mb-4" />
            <p className="text-gray-500 font-medium">No lead pages found</p>
            <p className="text-sm text-gray-400 mt-1">Go to Events and click "Create Lead Page" to add one</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="text-left px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Event</th>
                  <th className="text-left px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                  <th className="text-left px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Leads</th>
                  <th className="text-left px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Created</th>
                  <th className="text-left px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map((lp) => (
                  <React.Fragment key={lp._id}>
                    <tr className="hover:bg-gray-50 transition-colors">
                      {/* Event */}
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <img
                            src={getEventImageFromEvent(lp.event as any, 100, 100)}
                            alt={lp.event?.title}
                            className="w-10 h-10 rounded-lg object-cover flex-shrink-0 border border-gray-100"
                            onError={(e) => { e.currentTarget.src = '/default-event.jpg'; }}
                          />
                          <div className="min-w-0">
                            <button 
                              onClick={() => navigate(`/admin/events/${lp.event?._id}`)}
                              className="text-sm font-semibold text-gray-900 truncate max-w-[180px] hover:text-orange-600 transition block text-left"
                            >
                              {lp.event?.title || 'Unknown Event'}
                            </button>
                            <p className="text-xs text-gray-400">
                              {lp.event?.location?.city || ''}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Status */}
                      <td className="px-5 py-4">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
                            lp.isActive
                              ? 'bg-green-100 text-green-700'
                              : 'bg-gray-100 text-gray-500'
                          }`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${lp.isActive ? 'bg-green-500' : 'bg-gray-400'}`} />
                          {lp.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>

                      {/* Leads Count */}
                      <td className="px-5 py-4">
                        <div className="flex flex-col items-start gap-1">
                          <span className="text-sm font-semibold text-gray-900 bg-gray-100 px-3 py-1 rounded-full">
                            {lp.leads?.length || 0}
                          </span>
                          {lp.leads?.length > 0 && (
                            <button
                              onClick={() => toggleExpand(lp._id)}
                              className="text-xs text-blue-600 hover:text-blue-800 transition-colors mt-1 font-medium flex items-center gap-1"
                            >
                              View all leads {expandedRows.has(lp._id) ? <FaChevronUp size={8}/> : <FaChevronDown size={8}/>}
                            </button>
                          )}
                        </div>
                      </td>

                      {/* Created */}
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-1.5 text-sm text-gray-500">
                          <FaCalendarAlt size={11} className="text-gray-300" />
                          {formatDate(lp.createdAt)}
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          {/* View Event */}
                          <button
                            onClick={() => navigate(`/admin/events/${lp.event?._id}`)}
                            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-purple-100 text-purple-600 hover:bg-purple-50 transition-colors"
                            title="View Event details"
                          >
                            <FaEye size={13} />
                          </button>

                          {/* Copy link */}
                          <button
                            onClick={() => copyLink(lp.event?._id)}
                            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-blue-100 text-blue-600 hover:bg-blue-50 transition-colors"
                            title="Copy lead page link"
                          >
                            <FaCopy size={13} />
                          </button>

                          {/* Open in new tab */}
                          <button
                            onClick={() => window.open(`/lead-page?eventId=${lp.event?._id}`, '_blank')}
                            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-indigo-100 text-indigo-600 hover:bg-indigo-50 transition-colors"
                            title="Open lead page"
                          >
                            <FaExternalLinkAlt size={12} />
                          </button>

                          {/* Toggle active */}
                          <button
                            onClick={() => handleToggle(lp._id)}
                            className={`inline-flex h-9 w-9 items-center justify-center rounded-lg border transition-colors ${
                              lp.isActive
                                ? 'border-green-200 text-green-600 hover:bg-green-50'
                                : 'border-gray-200 text-gray-400 hover:bg-gray-50'
                            }`}
                            title={lp.isActive ? 'Deactivate' : 'Activate'}
                          >
                          {lp.isActive ? <FaPowerOff size={14} /> : <FaBan size={14} />}
                          </button>

                          {/* Delete */}
                          <button
                            onClick={() => setDeleteConfirm(lp._id)}
                            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-red-100 text-red-500 hover:bg-red-50 transition-colors"
                            title="Delete lead page"
                          >
                            <FaTrash size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>

                    {/* Expanded Leads */}
                    {expandedRows.has(lp._id) && lp.leads?.length > 0 && (
                      <tr>
                        <td colSpan={6} className="bg-orange-50 border-t border-orange-100">
                          <div className="px-5 py-4">
                            <p className="text-xs font-semibold text-orange-600 uppercase tracking-wide mb-3 flex items-center gap-2">
                              <FaUsers size={11} />
                              Leads ({lp.leads.length})
                            </p>
                            <div className="overflow-x-auto">
                              <table className="w-full text-sm">
                                <thead>
                                  <tr className="text-xs text-gray-500">
                                    <th className="text-left pb-2 font-medium pr-6">Name</th>
                                    <th className="text-left pb-2 font-medium pr-6">Contact</th>
                                    <th className="text-left pb-2 font-medium pr-6">Message</th>
                                    <th className="text-left pb-2 font-medium pr-6">Date</th>
                                    <th className="text-left pb-2 font-medium"></th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-orange-100">
                                  {lp.leads.map((lead: Lead) => (
                                    <tr key={lead._id} className="text-gray-700">
                                      <td className="py-2 pr-6 font-medium">{lead.name}</td>
                                      <td className="py-2 pr-6">
                                        <div className="flex flex-col gap-0.5">
                                          {lead.email && (
                                            <span className="flex items-center gap-1.5 text-xs">
                                              <FaEnvelope size={10} className="text-gray-400" />
                                              {lead.email}
                                            </span>
                                          )}
                                          {lead.phone && (
                                            <span className="flex items-center gap-1.5 text-xs">
                                              <FaPhone size={10} className="text-gray-400" />
                                              {lead.phone}
                                            </span>
                                          )}
                                        </div>
                                      </td>
                                      <td className="py-2 pr-6 text-xs text-gray-500 max-w-[200px] truncate">
                                        {lead.message || '—'}
                                      </td>
                                      <td className="py-2 pr-6 text-xs text-gray-400">
                                        {formatDate(lead.submittedAt)}
                                      </td>
                                      <td className="py-2">
                                        <button
                                          onClick={() => handleDeleteLead(lp._id, lead._id)}
                                          className="text-red-400 hover:text-red-600 transition-colors"
                                          title="Delete lead"
                                        >
                                          <FaTrash size={11} />
                                        </button>
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl">
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <FaTrash className="text-red-500" size={18} />
            </div>
            <h3 className="text-lg font-bold text-gray-900 text-center mb-2">Delete Lead Page?</h3>
            <p className="text-sm text-gray-500 text-center mb-6">
              This will permanently remove the lead page and all collected leads. This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 transition"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deleteConfirm)}
                className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-xl text-sm font-medium hover:bg-red-700 transition shadow"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminLeadPagesPage;
