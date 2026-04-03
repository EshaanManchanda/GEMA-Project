import React, { useState, useEffect, useCallback } from 'react';
import {
    Mail,
    Bell,
    Search,
    Trash2,
    CheckCheck,
    MessageSquare,
    Eye,
    X,
    ChevronLeft,
    ChevronRight,
    Users,
    MailOpen,
    Send,
    UserCheck,
    UserX,
    RefreshCw
} from 'lucide-react';
import toast from 'react-hot-toast';
import contactAPI, { Contact, ContactStats } from '@/services/api/contactAPI';
import newsletterAPI from '@/services/api/newsletterAPI';
import partnershipAPI, { Partnership, PartnershipStats } from '@/services/api/partnershipAPI';
import PrivatePageSEO from '@/components/common/PrivatePageSEO';

// ─── Types ────────────────────────────────────────────────────────────────────

interface NewsletterSubscriber {
    _id: string;
    email: string;
    name?: string;
    city?: string;
    ageOfChildren?: string;
    isActive: boolean;
    source: string;
    subscriptionDate: string;
    preferences?: {
        frequency: string;
        receivePromotions: boolean;
    };
    createdAt: string;
}

interface Pagination {
    currentPage: number;
    totalPages: number;
    totalCount: number;
    limit: number;
    hasNext: boolean;
    hasPrev: boolean;
}

// ─── Status Badge ─────────────────────────────────────────────────────────────

function ContactStatusBadge({ status }: { status: 'new' | 'read' | 'responded' }) {
    const map = {
        new: 'bg-blue-100 text-blue-800 border border-blue-200',
        read: 'bg-yellow-100 text-yellow-800 border border-yellow-200',
        responded: 'bg-green-100 text-green-800 border border-green-200'
    };
    return (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${map[status]}`}>
            {status.charAt(0).toUpperCase() + status.slice(1)}
        </span>
    );
}

function ActiveBadge({ isActive }: { isActive: boolean }) {
    return (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${isActive ? 'bg-green-100 text-green-800 border border-green-200' : 'bg-gray-100 text-gray-600 border border-gray-200'
            }`}>
            {isActive ? 'Active' : 'Inactive'}
        </span>
    );
}

// ─── Stat Card ────────────────────────────────────────────────────────────────

function StatCard({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: number; color: string }) {
    return (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 flex items-center gap-4">
            <div className={`flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center ${color}`}>
                {icon}
            </div>
            <div>
                <p className="text-sm text-gray-500">{label}</p>
                <p className="text-2xl font-bold text-gray-900">{value.toLocaleString()}</p>
            </div>
        </div>
    );
}

// ─── Pagination ───────────────────────────────────────────────────────────────

function PaginationBar({ pagination, onPage }: { pagination: Pagination; onPage: (p: number) => void }) {
    if (pagination.totalPages <= 1) return null;
    return (
        <div className="flex items-center justify-between mt-4 text-sm text-gray-600">
            <span>Showing page {pagination.currentPage} of {pagination.totalPages} ({pagination.totalCount} total)</span>
            <div className="flex items-center gap-1">
                <button
                    onClick={() => onPage(pagination.currentPage - 1)}
                    disabled={!pagination.hasPrev}
                    className="p-1.5 rounded-lg border border-gray-300 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                    <ChevronLeft className="w-4 h-4" />
                </button>
                {Array.from({ length: Math.min(pagination.totalPages, 7) }, (_, i) => {
                    const page = i + 1;
                    return (
                        <button
                            key={page}
                            onClick={() => onPage(page)}
                            className={`px-3 py-1.5 rounded-lg border text-sm ${page === pagination.currentPage
                                ? 'bg-blue-600 text-white border-blue-600'
                                : 'border-gray-300 hover:bg-gray-50'
                                }`}
                        >
                            {page}
                        </button>
                    );
                })}
                <button
                    onClick={() => onPage(pagination.currentPage + 1)}
                    disabled={!pagination.hasNext}
                    className="p-1.5 rounded-lg border border-gray-300 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                    <ChevronRight className="w-4 h-4" />
                </button>
            </div>
        </div>
    );
}

// ─── Contact Detail Modal ─────────────────────────────────────────────────────

function ContactDetailModal({
    contact,
    onClose,
    onMarkRead,
    onMarkResponded,
    onDelete
}: {
    contact: Contact;
    onClose: () => void;
    onMarkRead: (id: string) => Promise<void>;
    onMarkResponded: (id: string, notes: string) => Promise<void>;
    onDelete: (id: string) => Promise<void>;
}) {
    const [notes, setNotes] = useState(contact.notes || '');
    const [loading, setLoading] = useState(false);

    const handleMarkRead = async () => {
        setLoading(true);
        await onMarkRead(contact._id);
        setLoading(false);
    };

    const handleMarkResponded = async () => {
        setLoading(true);
        await onMarkResponded(contact._id, notes);
        setLoading(false);
    };

    const handleDelete = async () => {
        if (!confirm('Are you sure you want to delete this submission?')) return;
        setLoading(true);
        await onDelete(contact._id);
        setLoading(false);
        onClose();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-gray-100">
                    <div>
                        <h2 className="text-lg font-semibold text-gray-900">{contact.name}</h2>
                        <p className="text-sm text-gray-500">{contact.email}</p>
                    </div>
                    <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100 transition-colors">
                        <X className="w-5 h-5 text-gray-500" />
                    </button>
                </div>

                {/* Body */}
                <div className="p-6 space-y-4">
                    <div className="flex items-center gap-3">
                        <span className="text-sm font-medium text-gray-600 w-24 flex-shrink-0">Subject</span>
                        <span className="text-sm text-gray-900 bg-gray-50 px-3 py-1.5 rounded-lg flex-1">{contact.subject}</span>
                    </div>
                    <div className="flex items-center gap-3">
                        <span className="text-sm font-medium text-gray-600 w-24 flex-shrink-0">Status</span>
                        <ContactStatusBadge status={contact.status} />
                    </div>
                    <div className="flex items-center gap-3">
                        <span className="text-sm font-medium text-gray-600 w-24 flex-shrink-0">Submitted</span>
                        <span className="text-sm text-gray-900">{new Date(contact.createdAt).toLocaleString()}</span>
                    </div>
                    {contact.readAt && (
                        <div className="flex items-center gap-3">
                            <span className="text-sm font-medium text-gray-600 w-24 flex-shrink-0">Read At</span>
                            <span className="text-sm text-gray-900">{new Date(contact.readAt).toLocaleString()}</span>
                        </div>
                    )}
                    {contact.respondedAt && (
                        <div className="flex items-center gap-3">
                            <span className="text-sm font-medium text-gray-600 w-24 flex-shrink-0">Responded</span>
                            <span className="text-sm text-gray-900">{new Date(contact.respondedAt).toLocaleString()}</span>
                        </div>
                    )}

                    <div>
                        <p className="text-sm font-medium text-gray-600 mb-2">Message</p>
                        <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">
                            {contact.message}
                        </div>
                    </div>

                    <div>
                        <p className="text-sm font-medium text-gray-600 mb-2">Admin Notes</p>
                        <textarea
                            value={notes}
                            onChange={e => setNotes(e.target.value)}
                            rows={3}
                            placeholder="Add notes about this submission…"
                            className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                        />
                    </div>
                </div>

                {/* Footer Actions */}
                <div className="flex flex-wrap gap-2 px-6 pb-6">
                    {contact.status === 'new' && (
                        <button
                            onClick={handleMarkRead}
                            disabled={loading}
                            className="inline-flex items-center gap-2 px-4 py-2 bg-yellow-500 hover:bg-yellow-600 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                        >
                            <MailOpen className="w-4 h-4" /> Mark as Read
                        </button>
                    )}
                    {contact.status !== 'responded' && (
                        <button
                            onClick={handleMarkResponded}
                            disabled={loading}
                            className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                        >
                            <Send className="w-4 h-4" /> Mark as Responded
                        </button>
                    )}
                    <button
                        onClick={handleDelete}
                        disabled={loading}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50 ml-auto"
                    >
                        <Trash2 className="w-4 h-4" /> Delete
                    </button>
                </div>
            </div>
        </div>
    );
}

// ─── Contact Tab ──────────────────────────────────────────────────────────────

function ContactTab() {
    const [contacts, setContacts] = useState<Contact[]>([]);
    const [pagination, setPagination] = useState<Pagination | null>(null);
    const [stats, setStats] = useState<ContactStats | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [page, setPage] = useState(1);
    const [selectedContact, setSelectedContact] = useState<Contact | null>(null);

    const fetchContacts = useCallback(async () => {
        setIsLoading(true);
        try {
            const res = await contactAPI.getAllContacts({
                page,
                limit: 20,
                status: statusFilter as any || undefined
            });
            setContacts(res.contacts || []);
            setPagination(res.pagination || null);
            setStats(res.stats || null);
        } catch (err: any) {
            toast.error(err.message || 'Failed to fetch contact submissions');
        } finally {
            setIsLoading(false);
        }
    }, [page, statusFilter]);

    useEffect(() => { fetchContacts(); }, [fetchContacts]);

    // Client-side search filter (server doesn't support search on contacts)
    const filtered = search
        ? contacts.filter(c =>
            c.name.toLowerCase().includes(search.toLowerCase()) ||
            c.email.toLowerCase().includes(search.toLowerCase()) ||
            c.subject.toLowerCase().includes(search.toLowerCase())
        )
        : contacts;

    const handleMarkRead = async (id: string) => {
        try {
            await contactAPI.markAsRead(id);
            toast.success('Marked as read');
            fetchContacts();
        } catch (err: any) {
            toast.error('Failed to update status');
        }
    };

    const handleMarkResponded = async (id: string, notes: string) => {
        try {
            await contactAPI.markAsResponded(id, notes);
            toast.success('Marked as responded');
            fetchContacts();
            setSelectedContact(null);
        } catch (err: any) {
            toast.error('Failed to update status');
        }
    };

    const handleDelete = async (id: string) => {
        try {
            await contactAPI.deleteContact(id);
            toast.success('Submission deleted');
            fetchContacts();
        } catch (err: any) {
            toast.error('Failed to delete');
        }
    };

    // Build stats counts
    const total = stats?.totalCount?.[0]?.total ?? 0;
    const newCount = stats?.statusCounts?.find(s => s._id === 'new')?.count ?? 0;
    const readCount = stats?.statusCounts?.find(s => s._id === 'read')?.count ?? 0;
    const respondedCount = stats?.statusCounts?.find(s => s._id === 'responded')?.count ?? 0;

    return (
        <div className="space-y-6">
            {/* Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard icon={<Mail className="w-5 h-5 text-blue-600" />} label="Total" value={total} color="bg-blue-50" />
                <StatCard icon={<Bell className="w-5 h-5 text-purple-600" />} label="New" value={newCount} color="bg-purple-50" />
                <StatCard icon={<MailOpen className="w-5 h-5 text-yellow-600" />} label="Read" value={readCount} color="bg-yellow-50" />
                <StatCard icon={<CheckCheck className="w-5 h-5 text-green-600" />} label="Responded" value={respondedCount} color="bg-green-50" />
            </div>

            {/* Filters */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
                <div className="flex flex-col sm:flex-row gap-3">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                        <input
                            type="text"
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            placeholder="Search by name, email, subject…"
                            className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                    </div>
                    <select
                        value={statusFilter}
                        onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
                        className="px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                    >
                        <option value="">All Statuses</option>
                        <option value="new">New</option>
                        <option value="read">Read</option>
                        <option value="responded">Responded</option>
                    </select>
                    <button onClick={fetchContacts} className="p-2.5 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2 text-sm text-gray-600">
                        <RefreshCw className="w-4 h-4" /> Refresh
                    </button>
                </div>
            </div>

            {/* Table */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                {isLoading ? (
                    <div className="flex items-center justify-center py-16">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 text-gray-400">
                        <Mail className="w-12 h-12 mb-3 opacity-40" />
                        <p className="text-lg font-medium">No submissions found</p>
                        <p className="text-sm mt-1">Contact form submissions will appear here.</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-gray-50 border-b border-gray-200">
                                <tr>
                                    <th className="text-left px-4 py-3 font-medium text-gray-600">Name / Email</th>
                                    <th className="text-left px-4 py-3 font-medium text-gray-600">Subject</th>
                                    <th className="text-left px-4 py-3 font-medium text-gray-600 hidden md:table-cell">Message</th>
                                    <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
                                    <th className="text-left px-4 py-3 font-medium text-gray-600 hidden lg:table-cell">Date</th>
                                    <th className="text-right px-4 py-3 font-medium text-gray-600">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {filtered.map(contact => (
                                    <tr key={contact._id} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-4 py-3">
                                            <p className="font-medium text-gray-900">{contact.name}</p>
                                            <p className="text-gray-500 text-xs">{contact.email}</p>
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className="text-gray-700 text-xs bg-gray-100 px-2 py-1 rounded-md">{contact.subject}</span>
                                        </td>
                                        <td className="px-4 py-3 hidden md:table-cell max-w-xs">
                                            <p className="text-gray-600 truncate">{contact.message}</p>
                                        </td>
                                        <td className="px-4 py-3">
                                            <ContactStatusBadge status={contact.status} />
                                        </td>
                                        <td className="px-4 py-3 hidden lg:table-cell text-gray-500 whitespace-nowrap">
                                            {new Date(contact.createdAt).toLocaleDateString()}
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex items-center justify-end gap-1">
                                                <button
                                                    onClick={() => setSelectedContact(contact)}
                                                    className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-600 transition-colors"
                                                    title="View details"
                                                >
                                                    <Eye className="w-4 h-4" />
                                                </button>
                                                {contact.status === 'new' && (
                                                    <button
                                                        onClick={() => handleMarkRead(contact._id)}
                                                        className="p-1.5 rounded-lg hover:bg-yellow-50 text-yellow-600 transition-colors"
                                                        title="Mark as read"
                                                    >
                                                        <MailOpen className="w-4 h-4" />
                                                    </button>
                                                )}
                                                {contact.status !== 'responded' && (
                                                    <button
                                                        onClick={() => handleMarkResponded(contact._id, '')}
                                                        className="p-1.5 rounded-lg hover:bg-green-50 text-green-600 transition-colors"
                                                        title="Mark as responded"
                                                    >
                                                        <MessageSquare className="w-4 h-4" />
                                                    </button>
                                                )}
                                                <button
                                                    onClick={async () => {
                                                        if (!confirm('Delete this submission?')) return;
                                                        await handleDelete(contact._id);
                                                    }}
                                                    className="p-1.5 rounded-lg hover:bg-red-50 text-red-500 transition-colors"
                                                    title="Delete"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {pagination && !isLoading && (
                    <div className="border-t border-gray-100 px-4 py-3">
                        <PaginationBar pagination={pagination} onPage={p => setPage(p)} />
                    </div>
                )}
            </div>

            {/* Detail Modal */}
            {selectedContact && (
                <ContactDetailModal
                    contact={selectedContact}
                    onClose={() => setSelectedContact(null)}
                    onMarkRead={async (id) => { await handleMarkRead(id); setSelectedContact(null); }}
                    onMarkResponded={handleMarkResponded}
                    onDelete={handleDelete}
                />
            )}
        </div>
    );
}

// ─── Newsletter Tab ───────────────────────────────────────────────────────────

function NewsletterTab() {
    const [subscribers, setSubscribers] = useState<NewsletterSubscriber[]>([]);
    const [pagination, setPagination] = useState<Pagination | null>(null);
    const [stats, setStats] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [activeFilter, setActiveFilter] = useState('');
    const [sourceFilter, setSourceFilter] = useState('');
    const [page, setPage] = useState(1);

    const fetchSubscribers = useCallback(async () => {
        setIsLoading(true);
        try {
            const res = await newsletterAPI.admin.getSubscribers({
                page,
                limit: 20,
                search: search || undefined,
                isActive: activeFilter || undefined,
                source: sourceFilter || undefined
            });
            setSubscribers(res.subscribers || []);
            setPagination(res.pagination || null);
            setStats(res.stats || null);
        } catch (err: any) {
            toast.error(err.message || 'Failed to fetch newsletter subscribers');
        } finally {
            setIsLoading(false);
        }
    }, [page, search, activeFilter, sourceFilter]);

    useEffect(() => { fetchSubscribers(); }, [fetchSubscribers]);

    // Debounce search
    const [searchInput, setSearchInput] = useState('');
    useEffect(() => {
        const t = setTimeout(() => { setSearch(searchInput); setPage(1); }, 400);
        return () => clearTimeout(t);
    }, [searchInput]);

    const totalSubs = stats?.totalSubscribers ?? 0;
    const activeSubs = stats?.activeSubscribers ?? 0;
    const inactiveSubs = stats?.inactiveSubscribers ?? 0;

    return (
        <div className="space-y-6">
            {/* Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <StatCard icon={<Users className="w-5 h-5 text-indigo-600" />} label="Total Subscribers" value={totalSubs} color="bg-indigo-50" />
                <StatCard icon={<UserCheck className="w-5 h-5 text-green-600" />} label="Active" value={activeSubs} color="bg-green-50" />
                <StatCard icon={<UserX className="w-5 h-5 text-red-500" />} label="Unsubscribed" value={inactiveSubs} color="bg-red-50" />
            </div>

            {/* Filters */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
                <div className="flex flex-col sm:flex-row gap-3">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                        <input
                            type="text"
                            value={searchInput}
                            onChange={e => setSearchInput(e.target.value)}
                            placeholder="Search by email, name, city…"
                            className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                    </div>
                    <select
                        value={activeFilter}
                        onChange={e => { setActiveFilter(e.target.value); setPage(1); }}
                        className="px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                    >
                        <option value="">All Statuses</option>
                        <option value="true">Active</option>
                        <option value="false">Inactive</option>
                    </select>
                    <select
                        value={sourceFilter}
                        onChange={e => { setSourceFilter(e.target.value); setPage(1); }}
                        className="px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                    >
                        <option value="">All Sources</option>
                        <option value="blog">Blog</option>
                        <option value="footer">Footer</option>
                        <option value="popup">Popup</option>
                        <option value="checkout">Checkout</option>
                        <option value="profile">Profile</option>
                        <option value="api">API</option>
                    </select>
                    <button onClick={fetchSubscribers} className="p-2.5 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2 text-sm text-gray-600">
                        <RefreshCw className="w-4 h-4" /> Refresh
                    </button>
                </div>
            </div>

            {/* Table */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                {isLoading ? (
                    <div className="flex items-center justify-center py-16">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
                    </div>
                ) : subscribers.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 text-gray-400">
                        <Bell className="w-12 h-12 mb-3 opacity-40" />
                        <p className="text-lg font-medium">No subscribers found</p>
                        <p className="text-sm mt-1">Newsletter sign-ups will appear here.</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-gray-50 border-b border-gray-200">
                                <tr>
                                    <th className="text-left px-4 py-3 font-medium text-gray-600">Email</th>
                                    <th className="text-left px-4 py-3 font-medium text-gray-600 hidden sm:table-cell">Name</th>
                                    <th className="text-left px-4 py-3 font-medium text-gray-600 hidden md:table-cell">City</th>
                                    <th className="text-left px-4 py-3 font-medium text-gray-600 hidden md:table-cell">Children Age</th>
                                    <th className="text-left px-4 py-3 font-medium text-gray-600 hidden lg:table-cell">Source</th>
                                    <th className="text-left px-4 py-3 font-medium text-gray-600 hidden lg:table-cell">Frequency</th>
                                    <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
                                    <th className="text-left px-4 py-3 font-medium text-gray-600 hidden xl:table-cell">Subscribed</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {subscribers.map(sub => (
                                    <tr key={sub._id} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-4 py-3">
                                            <span className="font-medium text-gray-900">{sub.email}</span>
                                        </td>
                                        <td className="px-4 py-3 hidden sm:table-cell text-gray-700">
                                            {sub.name || <span className="text-gray-400 italic">—</span>}
                                        </td>
                                        <td className="px-4 py-3 hidden md:table-cell text-gray-700">
                                            {sub.city || <span className="text-gray-400 italic">—</span>}
                                        </td>
                                        <td className="px-4 py-3 hidden md:table-cell text-gray-700">
                                            {sub.ageOfChildren || <span className="text-gray-400 italic">—</span>}
                                        </td>
                                        <td className="px-4 py-3 hidden lg:table-cell">
                                            <span className="capitalize text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded-md">{sub.source}</span>
                                        </td>
                                        <td className="px-4 py-3 hidden lg:table-cell">
                                            <span className="capitalize text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded-md">
                                                {sub.preferences?.frequency || '—'}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3">
                                            <ActiveBadge isActive={sub.isActive} />
                                        </td>
                                        <td className="px-4 py-3 hidden xl:table-cell text-gray-500 whitespace-nowrap">
                                            {new Date(sub.subscriptionDate || sub.createdAt).toLocaleDateString()}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {pagination && !isLoading && (
                    <div className="border-t border-gray-100 px-4 py-3">
                        <PaginationBar pagination={pagination} onPage={p => setPage(p)} />
                    </div>
                )}
            </div>
        </div>
    );
}

// ─── Partnership Detail Modal ───────────────────────────────────────────────────

function PartnershipDetailModal({
    partnership,
    onClose,
    onUpdateStatus,
    onDelete
}: {
    partnership: Partnership;
    onClose: () => void;
    onUpdateStatus: (id: string, status: string, notes: string) => Promise<void>;
    onDelete: (id: string) => Promise<void>;
}) {
    const [notes, setNotes] = useState(partnership.notes || '');
    const [status, setStatus] = useState(partnership.status);
    const [loading, setLoading] = useState(false);

    const handleSave = async () => {
        setLoading(true);
        await onUpdateStatus(partnership._id, status, notes);
        setLoading(false);
        onClose();
    };

    const handleDelete = async () => {
        if (!confirm('Are you sure you want to delete this submission?')) return;
        setLoading(true);
        await onDelete(partnership._id);
        setLoading(false);
        onClose();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between p-6 border-b border-gray-100">
                    <div>
                        <h2 className="text-lg font-semibold text-gray-900">{partnership.name}</h2>
                        <p className="text-sm text-gray-500">{partnership.email}</p>
                    </div>
                    <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100 transition-colors">
                        <X className="w-5 h-5 text-gray-500" />
                    </button>
                </div>

                <div className="p-6 space-y-4">
                    <div className="flex items-center gap-3">
                        <span className="text-sm font-medium text-gray-600 w-24 flex-shrink-0">Type</span>
                        <span className="text-sm text-gray-900 bg-gray-50 px-3 py-1.5 rounded-lg flex-1 capitalize">{partnership.partnershipType}</span>
                    </div>
                    <div className="flex items-center gap-3">
                        <span className="text-sm font-medium text-gray-600 w-24 flex-shrink-0">Organization</span>
                        <span className="text-sm text-gray-900">{partnership.organization || '—'}</span>
                    </div>
                    <div className="flex items-center gap-3">
                        <span className="text-sm font-medium text-gray-600 w-24 flex-shrink-0">Phone</span>
                        <span className="text-sm text-gray-900">{partnership.phone || '—'}</span>
                    </div>
                    {partnership.website && (
                        <div className="flex items-center gap-3">
                            <span className="text-sm font-medium text-gray-600 w-24 flex-shrink-0">Website</span>
                            <span className="text-sm text-blue-600 hover:underline">
                                <a href={partnership.website.startsWith('http') ? partnership.website : `https://${partnership.website}`} target="_blank" rel="noopener noreferrer">
                                    {partnership.website}
                                </a>
                            </span>
                        </div>
                    )}
                    <div className="flex items-center gap-3">
                        <span className="text-sm font-medium text-gray-600 w-24 flex-shrink-0">Status</span>
                        <select
                            value={status}
                            onChange={(e) => setStatus(e.target.value as any)}
                            className="bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-200 text-sm focus:ring-blue-500"
                        >
                            <option value="pending">Pending</option>
                            <option value="contacted">Contacted</option>
                            <option value="approved">Approved</option>
                            <option value="rejected">Rejected</option>
                        </select>
                    </div>

                    <div>
                        <p className="text-sm font-medium text-gray-600 mb-2">Message</p>
                        <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 text-sm text-gray-800 whitespace-pre-wrap leading-relaxed">
                            {partnership.message}
                        </div>
                    </div>

                    <div>
                        <p className="text-sm font-medium text-gray-600 mb-2">Admin Notes</p>
                        <textarea
                            value={notes}
                            onChange={e => setNotes(e.target.value)}
                            rows={3}
                            placeholder="Add notes..."
                            className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 resize-none"
                        />
                    </div>
                </div>

                <div className="flex flex-wrap gap-2 px-6 pb-6">
                    <button
                        onClick={handleSave}
                        disabled={loading || (status === partnership.status && notes === partnership.notes)}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                    >
                        Save Changes
                    </button>
                    <button
                        onClick={handleDelete}
                        disabled={loading}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50 ml-auto"
                    >
                        <Trash2 className="w-4 h-4" /> Delete
                    </button>
                </div>
            </div>
        </div>
    );
}

// ─── Partnership Tab ──────────────────────────────────────────────────────────

function PartnershipTab() {
    const [partnerships, setPartnerships] = useState<Partnership[]>([]);
    const [pagination, setPagination] = useState<Pagination | null>(null);
    const [stats, setStats] = useState<PartnershipStats | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [typeFilter, setTypeFilter] = useState('');
    const [page, setPage] = useState(1);
    const [selectedPartnership, setSelectedPartnership] = useState<Partnership | null>(null);

    const fetchPartnerships = useCallback(async () => {
        setIsLoading(true);
        try {
            const res = await partnershipAPI.getAll({
                page,
                limit: 20,
                status: statusFilter || undefined,
                type: typeFilter || undefined,
                search: search || undefined
            });
            setPartnerships(res.partnerships || []);
            setPagination(res.pagination || null);
            setStats(res.stats || null);
        } catch (err: any) {
            toast.error(err.message || 'Failed to fetch partnerships');
        } finally {
            setIsLoading(false);
        }
    }, [page, statusFilter, typeFilter, search]);

    useEffect(() => { fetchPartnerships(); }, [fetchPartnerships]);

    const [searchInput, setSearchInput] = useState('');
    useEffect(() => {
        const t = setTimeout(() => { setSearch(searchInput); setPage(1); }, 400);
        return () => clearTimeout(t);
    }, [searchInput]);

    const handleUpdateStatus = async (id: string, status: string, notes: string) => {
        try {
            await partnershipAPI.updateStatus(id, { status, notes });
            toast.success('Partnership updated');
            fetchPartnerships();
        } catch (err: any) {
            toast.error('Failed to update partnership');
        }
    };

    const handleDelete = async (id: string) => {
        try {
            await partnershipAPI.delete(id);
            toast.success('Partnership deleted');
            fetchPartnerships();
        } catch (err: any) {
            toast.error('Failed to delete');
        }
    };

    const total = stats?.totalCount?.[0]?.total ?? 0;
    const pendingCount = stats?.statusCounts?.find(s => s._id === 'pending')?.count ?? 0;
    const approvedCount = stats?.statusCounts?.find(s => s._id === 'approved')?.count ?? 0;
    const rejectedCount = stats?.statusCounts?.find(s => s._id === 'rejected')?.count ?? 0;

    return (
        <div className="space-y-6">
            {/* Stats */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard icon={<Users className="w-5 h-5 text-blue-600" />} label="Total" value={total} color="bg-blue-50" />
                <StatCard icon={<Bell className="w-5 h-5 text-yellow-600" />} label="Pending" value={pendingCount} color="bg-yellow-50" />
                <StatCard icon={<CheckCheck className="w-5 h-5 text-green-600" />} label="Approved" value={approvedCount} color="bg-green-50" />
                <StatCard icon={<UserX className="w-5 h-5 text-red-600" />} label="Rejected" value={rejectedCount} color="bg-red-50" />
            </div>

            {/* Filters */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
                <div className="flex flex-col sm:flex-row gap-3">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                        <input
                            type="text"
                            value={searchInput}
                            onChange={e => setSearchInput(e.target.value)}
                            placeholder="Search organization, name, email…"
                            className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                    </div>
                    <select
                        value={statusFilter}
                        onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
                        className="px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                    >
                        <option value="">All Statuses</option>
                        <option value="pending">Pending</option>
                        <option value="contacted">Contacted</option>
                        <option value="approved">Approved</option>
                        <option value="rejected">Rejected</option>
                    </select>
                    <select
                        value={typeFilter}
                        onChange={e => { setTypeFilter(e.target.value); setPage(1); }}
                        className="px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                    >
                        <option value="">All Types</option>
                        <option value="vendor">Vendor</option>
                        <option value="influencer">Influencer</option>
                        <option value="school">School</option>
                        <option value="affiliate">Affiliate</option>
                        <option value="other">Other</option>
                    </select>
                    <button onClick={fetchPartnerships} className="p-2.5 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-2 text-sm text-gray-600">
                        <RefreshCw className="w-4 h-4" /> Refresh
                    </button>
                </div>
            </div>

            {/* Table */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                {isLoading ? (
                    <div className="flex items-center justify-center py-16">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
                    </div>
                ) : partnerships.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 text-gray-400">
                        <UserCheck className="w-12 h-12 mb-3 opacity-40" />
                        <p className="text-lg font-medium">No partnerships found</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-gray-50 border-b border-gray-200">
                                <tr>
                                    <th className="text-left px-4 py-3 font-medium text-gray-600">Organization / Name</th>
                                    <th className="text-left px-4 py-3 font-medium text-gray-600">Type</th>
                                    <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
                                    <th className="text-left px-4 py-3 font-medium text-gray-600 hidden md:table-cell">Date</th>
                                    <th className="text-right px-4 py-3 font-medium text-gray-600">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {partnerships.map(p => (
                                    <tr key={p._id} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-4 py-3">
                                            <p className="font-medium text-gray-900">{p.organization || p.name}</p>
                                            <p className="text-gray-500 text-xs">{p.email}</p>
                                        </td>
                                        <td className="px-4 py-3">
                                            <span className="capitalize text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded-md">{p.partnershipType}</span>
                                        </td>
                                        <td className="px-4 py-3">
                                            <ContactStatusBadge status={p.status as any} />
                                        </td>
                                        <td className="px-4 py-3 hidden md:table-cell text-gray-500">
                                            {new Date(p.createdAt).toLocaleDateString()}
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex justify-end gap-1">
                                                <button
                                                    onClick={() => setSelectedPartnership(p)}
                                                    className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-600 transition-colors"
                                                >
                                                    <Eye className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
                {pagination && !isLoading && (
                    <div className="border-t border-gray-100 px-4 py-3">
                        <PaginationBar pagination={pagination} onPage={p => setPage(p)} />
                    </div>
                )}
            </div>

            {selectedPartnership && (
                <PartnershipDetailModal
                    partnership={selectedPartnership}
                    onClose={() => setSelectedPartnership(null)}
                    onUpdateStatus={handleUpdateStatus}
                    onDelete={handleDelete}
                />
            )}
        </div>
    );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

type TabId = 'contact' | 'newsletter' | 'partnership';

const TABS: { id: TabId; label: string; icon: React.ReactNode }[] = [
    {
        id: 'contact',
        label: 'Contact',
        icon: <Mail className="w-4 h-4" />
    },
    {
        id: 'newsletter',
        label: 'Newsletter',
        icon: <Bell className="w-4 h-4" />
    },
    {
        id: 'partnership',
        label: 'Partnerships',
        icon: <UserCheck className="w-4 h-4" />
    }
];

const AdminSubmissionsPage: React.FC = () => {
    const [activeTab, setActiveTab] = useState<TabId>('contact');

    return (
        <>
            <PrivatePageSEO title="Admin – Form Submissions | Kidrove" description="View all form submissions including contact messages and newsletter sign-ups." />

            <div className="p-6 space-y-6">
                {/* Page Header */}
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Form Submissions</h1>
                    <p className="text-gray-500 mt-1 text-sm">View and manage all incoming submissions from your public-facing forms.</p>
                </div>

                {/* Tab Bar */}
                <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit">
                    {TABS.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${activeTab === tab.id
                                ? 'bg-white text-gray-900 shadow-sm'
                                : 'text-gray-500 hover:text-gray-700'
                                }`}
                        >
                            {tab.icon}
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* Tab Content */}
                {activeTab === 'contact' && <ContactTab />}
                {activeTab === 'newsletter' && <NewsletterTab />}
                {activeTab === 'partnership' && <PartnershipTab />}
            </div>
        </>
    );
};

export default AdminSubmissionsPage;
