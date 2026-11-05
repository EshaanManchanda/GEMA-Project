import React, { useState, useEffect, useCallback } from 'react';
import {
    Search,
    Trash2,
    Eye,
    X,
    RefreshCw,
    Snowflake
} from 'lucide-react';
import toast from 'react-hot-toast';
import winterCampAPI, { WinterCampRegistrationItem } from '@/services/api/winterCampAPI';

export const WinterCampTab: React.FC = () => {
    const [registrations, setRegistrations] = useState<WinterCampRegistrationItem[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [page, setPage] = useState(1);
    const [pagination, setPagination] = useState<{ total: number; page: number; limit: number; pages: number } | null>(null);
    const [selectedReg, setSelectedReg] = useState<WinterCampRegistrationItem | null>(null);
    const [updatingStatus, setUpdatingStatus] = useState(false);

    const fetchRegistrations = useCallback(async () => {
        setIsLoading(true);
        try {
            const res = await winterCampAPI.getRegistrations({
                page,
                limit: 15,
                status: statusFilter,
                search
            });
            if (res?.data?.data) {
                setRegistrations(res.data.data.registrations || []);
                setPagination(res.data.data.pagination);
            }
        } catch (err: any) {
            toast.error(err?.response?.data?.message || 'Failed to fetch winter camp registrations');
        } finally {
            setIsLoading(false);
        }
    }, [page, statusFilter, search]);

    useEffect(() => {
        fetchRegistrations();
    }, [fetchRegistrations]);

    const handleUpdateStatus = async (id: string, newStatus: string) => {
        setUpdatingStatus(true);
        try {
            await winterCampAPI.updateStatus(id, newStatus);
            toast.success('Registration status updated');
            fetchRegistrations();
            if (selectedReg && selectedReg._id === id) {
                setSelectedReg(prev => prev ? { ...prev, status: newStatus as any } : null);
            }
        } catch (err: any) {
            toast.error(err?.response?.data?.message || 'Failed to update status');
        } finally {
            setUpdatingStatus(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this winter camp registration?')) return;
        try {
            await winterCampAPI.deleteRegistration(id);
            toast.success('Registration deleted');
            setSelectedReg(null);
            fetchRegistrations();
        } catch (err: any) {
            toast.error(err?.response?.data?.message || 'Failed to delete');
        }
    };

    return (
        <div className="space-y-6">
            {/* Top Toolbar */}
            <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
                <div className="flex flex-1 gap-3 w-full sm:w-auto">
                    <div className="relative flex-1 max-w-sm">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search student, email, grade..."
                            value={search}
                            onChange={e => { setSearch(e.target.value); setPage(1); }}
                            className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-500"
                        />
                    </div>
                    <select
                        value={statusFilter}
                        onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
                        className="border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-sky-500/20"
                    >
                        <option value="all">All Statuses</option>
                        <option value="pending">Pending</option>
                        <option value="contacted">Contacted</option>
                        <option value="enrolled">Enrolled</option>
                        <option value="cancelled">Cancelled</option>
                    </select>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        onClick={fetchRegistrations}
                        className="p-2 border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 text-sm flex items-center gap-1.5"
                    >
                        <RefreshCw className="w-4 h-4" />
                        <span className="hidden sm:inline">Refresh</span>
                    </button>
                </div>
            </div>

            {/* Registrations Table */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
                {isLoading ? (
                    <div className="py-20 text-center text-gray-400">Loading registrations...</div>
                ) : registrations.length === 0 ? (
                    <div className="py-20 text-center text-gray-400">
                        <Snowflake className="w-8 h-8 mx-auto text-sky-400 mb-2 opacity-50" />
                        <p className="text-base font-medium text-gray-700">No winter camp registrations found</p>
                        <p className="text-xs text-gray-400 mt-1">Registrations submitted from /winter-camp will show up here.</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm text-gray-700">
                            <thead className="bg-gray-50 border-b border-gray-200 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                <tr>
                                    <th className="px-5 py-3">Student Name</th>
                                    <th className="px-5 py-3">Emails</th>
                                    <th className="px-5 py-3">Grade</th>
                                    <th className="px-5 py-3">Selected Programs</th>
                                    <th className="px-5 py-3">Status</th>
                                    <th className="px-5 py-3">Submitted</th>
                                    <th className="px-5 py-3 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {registrations.map(reg => (
                                    <tr key={reg._id} className="hover:bg-gray-50/70 transition-colors">
                                        <td className="px-5 py-4 font-semibold text-gray-900">
                                            {reg.studentName}
                                            {reg.parentPhone && (
                                                <div className="text-xs font-normal text-gray-400">{reg.parentPhone}</div>
                                            )}
                                        </td>
                                        <td className="px-5 py-4 text-xs space-y-0.5">
                                            <div className="text-gray-900">{reg.studentEmail}</div>
                                            <div className="text-gray-400">Parent: {reg.parentEmail}</div>
                                        </td>
                                        <td className="px-5 py-4">
                                            <span className="px-2.5 py-1 rounded-md text-xs font-semibold bg-sky-50 text-sky-700 border border-sky-100">
                                                {reg.grade}
                                            </span>
                                        </td>
                                        <td className="px-5 py-4 max-w-xs">
                                            {reg.selectedPrograms && reg.selectedPrograms.length > 0 ? (
                                                <div className="flex flex-wrap gap-1">
                                                    {reg.selectedPrograms.map((p, idx) => (
                                                        <span key={idx} className="text-[11px] bg-gray-100 text-gray-700 px-2 py-0.5 rounded">
                                                            {p}
                                                        </span>
                                                    ))}
                                                </div>
                                            ) : (
                                                <span className="text-xs text-gray-400 italic">General Interest</span>
                                            )}
                                        </td>
                                        <td className="px-5 py-4">
                                            <select
                                                disabled={updatingStatus}
                                                value={reg.status}
                                                onChange={e => handleUpdateStatus(reg._id, e.target.value)}
                                                className={`text-xs font-bold px-2.5 py-1 rounded-full border focus:outline-none ${
                                                    reg.status === 'enrolled'
                                                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                                        : reg.status === 'contacted'
                                                        ? 'bg-sky-50 text-sky-700 border-sky-200'
                                                        : reg.status === 'cancelled'
                                                        ? 'bg-rose-50 text-rose-700 border-rose-200'
                                                        : 'bg-amber-50 text-amber-700 border-amber-200'
                                                }`}
                                            >
                                                <option value="pending">Pending</option>
                                                <option value="contacted">Contacted</option>
                                                <option value="enrolled">Enrolled</option>
                                                <option value="cancelled">Cancelled</option>
                                            </select>
                                        </td>
                                        <td className="px-5 py-4 text-xs text-gray-400 whitespace-nowrap">
                                            {new Date(reg.createdAt).toLocaleDateString()}
                                        </td>
                                        <td className="px-5 py-4 text-right space-x-2">
                                            <button
                                                onClick={() => setSelectedReg(reg)}
                                                className="p-1.5 text-gray-500 hover:text-sky-600 rounded-lg hover:bg-gray-100"
                                                title="View Details"
                                            >
                                                <Eye className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(reg._id)}
                                                className="p-1.5 text-gray-400 hover:text-rose-600 rounded-lg hover:bg-gray-100"
                                                title="Delete"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {pagination && !isLoading && pagination.pages > 1 && (
                    <div className="border-t border-gray-100 px-5 py-3 flex items-center justify-between text-xs text-gray-500">
                        <span>Total {pagination.total} registrations</span>
                        <div className="flex gap-1">
                            <button
                                disabled={pagination.page <= 1}
                                onClick={() => setPage(p => Math.max(1, p - 1))}
                                className="px-3 py-1.5 border rounded disabled:opacity-40"
                            >
                                Previous
                            </button>
                            <span className="px-3 py-1.5 font-semibold text-gray-700">
                                {pagination.page} / {pagination.pages}
                            </span>
                            <button
                                disabled={pagination.page >= pagination.pages}
                                onClick={() => setPage(p => p + 1)}
                                className="px-3 py-1.5 border rounded disabled:opacity-40"
                            >
                                Next
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Modal Detail View */}
            {selectedReg && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl max-w-lg w-full overflow-hidden shadow-2xl border border-gray-200">
                        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                            <div className="flex items-center gap-2">
                                <Snowflake className="w-5 h-5 text-sky-500" />
                                <h3 className="font-bold text-gray-900 text-lg">Winter Camp Registration</h3>
                            </div>
                            <button onClick={() => setSelectedReg(null)} className="p-1.5 text-gray-400 hover:text-gray-700 rounded-lg">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="p-6 space-y-4 text-sm text-gray-700 max-h-[75vh] overflow-y-auto">
                            <div>
                                <span className="text-xs uppercase font-bold text-gray-400">Student Name</span>
                                <p className="font-semibold text-gray-900 text-base">{selectedReg.studentName}</p>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <span className="text-xs uppercase font-bold text-gray-400">Student Email</span>
                                    <p className="font-medium text-gray-800 break-all">{selectedReg.studentEmail}</p>
                                </div>
                                <div>
                                    <span className="text-xs uppercase font-bold text-gray-400">Parent Email</span>
                                    <p className="font-medium text-gray-800 break-all">{selectedReg.parentEmail}</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <span className="text-xs uppercase font-bold text-gray-400">Parent Phone</span>
                                    <p className="font-medium text-gray-800">{selectedReg.parentPhone || 'N/A'}</p>
                                </div>
                                <div>
                                    <span className="text-xs uppercase font-bold text-gray-400">Grade</span>
                                    <p className="font-medium text-gray-800">{selectedReg.grade}</p>
                                </div>
                            </div>

                            {selectedReg.selectedPrograms && selectedReg.selectedPrograms.length > 0 && (
                                <div>
                                    <span className="text-xs uppercase font-bold text-gray-400 block mb-1">Selected Workshops</span>
                                    <div className="flex flex-wrap gap-1.5">
                                        {selectedReg.selectedPrograms.map((p, i) => (
                                            <span key={i} className="px-2.5 py-1 rounded bg-sky-50 text-sky-800 text-xs font-semibold border border-sky-100">
                                                {p}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {selectedReg.interests && selectedReg.interests.length > 0 && (
                                <div>
                                    <span className="text-xs uppercase font-bold text-gray-400 block mb-1">Focus Areas</span>
                                    <div className="flex flex-wrap gap-1">
                                        {selectedReg.interests.map((it, i) => (
                                            <span key={i} className="px-2 py-0.5 rounded bg-gray-100 text-gray-700 text-xs">
                                                {it}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {selectedReg.message && (
                                <div>
                                    <span className="text-xs uppercase font-bold text-gray-400 block mb-1">Goals / Message</span>
                                    <div className="p-3 bg-gray-50 rounded-xl border border-gray-100 text-gray-800 text-xs leading-relaxed whitespace-pre-wrap">
                                        {selectedReg.message}
                                    </div>
                                </div>
                            )}

                            <div>
                                <span className="text-xs uppercase font-bold text-gray-400 block mb-1">Registration Status</span>
                                <div className="flex gap-2">
                                    {(['pending', 'contacted', 'enrolled', 'cancelled'] as const).map(st => (
                                        <button
                                            key={st}
                                            onClick={() => handleUpdateStatus(selectedReg._id, st)}
                                            className={`px-3 py-1.5 text-xs font-bold rounded-lg border capitalize transition-all ${
                                                selectedReg.status === st
                                                    ? 'bg-slate-900 text-white border-slate-900'
                                                    : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
                                            }`}
                                        >
                                            {st}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div className="p-4 bg-gray-50 border-t border-gray-100 flex justify-end">
                            <button
                                onClick={() => setSelectedReg(null)}
                                className="px-5 py-2 text-sm font-semibold rounded-lg bg-white border border-gray-300 text-gray-700 hover:bg-gray-100"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default WinterCampTab;

