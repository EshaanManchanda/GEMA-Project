import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, Search, Plus, Pencil, Eye, Trash2, RefreshCw, X, ChevronDown, ChevronRight, Upload, CheckCircle, AlertCircle } from 'lucide-react';
import { studentAPI, type Student, type CreateStudentPayload, type BulkImportResult } from '../../services/api/studentAPI';
import toast from 'react-hot-toast';

// ─── Student Form Modal ───────────────────────────────────────────────────────

interface FormModalProps {
  initial?: Student;
  onClose: () => void;
  onSaved: () => void;
}

const StudentFormModal: React.FC<FormModalProps> = ({ initial, onClose, onSaved }) => {
  const [firstName, setFirstName] = useState(initial?.firstName || '');
  const [lastName, setLastName] = useState(initial?.lastName || '');
  const [email, setEmail] = useState(initial?.email || '');
  const [parentEmail, setParentEmail] = useState('');
  const [grade, setGrade] = useState(initial?.grade || '');
  const [rollNumber, setRollNumber] = useState(initial?.rollNumber || '');
  const [phone, setPhone] = useState(initial?.phone || '');
  const [gender, setGender] = useState<'male' | 'female' | 'other' | ''>(initial?.gender || '');
  const [dob, setDob] = useState(initial?.dateOfBirth ? initial.dateOfBirth.slice(0, 10) : '');
  const [guardianRelation, setGuardianRelation] = useState<string>(initial?.guardianRelation || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstName || !lastName || !email) { setError('First name, last name and email are required.'); return; }
    if (!initial && !parentEmail) { setError('Parent email is required when creating a student.'); return; }
    setSaving(true);
    setError('');
    try {
      const payload: CreateStudentPayload = {
        firstName, lastName, email,
        ...(parentEmail ? { parentEmail } : {}),
        ...(grade ? { grade } : {}),
        ...(rollNumber ? { rollNumber } : {}),
        ...(phone ? { phone } : {}),
        ...(gender ? { gender } : {}),
        ...(dob ? { dateOfBirth: dob } : {}),
        ...(guardianRelation ? { guardianRelation: guardianRelation as any } : {}),
      };
      if (initial) {
        await studentAPI.update(initial._id, payload);
        toast.success('Student updated');
      } else {
        await studentAPI.create(payload);
        toast.success('Student created');
      }
      onSaved();
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to save student');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="font-semibold text-gray-900">{initial ? 'Edit Student' : 'Add Student'}</h2>
          <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-700 rounded-lg hover:bg-gray-100"><X className="w-4 h-4" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">First Name *</label>
              <input value={firstName} onChange={e => setFirstName(e.target.value)} className="w-full text-sm px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Last Name *</label>
              <input value={lastName} onChange={e => setLastName(e.target.value)} className="w-full text-sm px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500" required />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Student Email *</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} className="w-full text-sm px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500" required />
          </div>

          {!initial && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Parent Email * <span className="text-gray-400 font-normal">(must be an existing user)</span></label>
              <input type="email" value={parentEmail} onChange={e => setParentEmail(e.target.value)} className="w-full text-sm px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500" placeholder="parent@example.com" />
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Grade</label>
              <input value={grade} onChange={e => setGrade(e.target.value)} className="w-full text-sm px-3 py-2 border border-gray-300 rounded-lg" placeholder="e.g. Grade 5" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Roll Number</label>
              <input value={rollNumber} onChange={e => setRollNumber(e.target.value)} className="w-full text-sm px-3 py-2 border border-gray-300 rounded-lg" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
              <input type="tel" value={phone} onChange={e => setPhone(e.target.value)} className="w-full text-sm px-3 py-2 border border-gray-300 rounded-lg" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date of Birth</label>
              <input type="date" value={dob} onChange={e => setDob(e.target.value)} className="w-full text-sm px-3 py-2 border border-gray-300 rounded-lg" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Gender</label>
              <select value={gender} onChange={e => setGender(e.target.value as any)} className="w-full text-sm px-3 py-2 border border-gray-300 rounded-lg">
                <option value="">— Select —</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Guardian Relation</label>
              <select value={guardianRelation} onChange={e => setGuardianRelation(e.target.value)} className="w-full text-sm px-3 py-2 border border-gray-300 rounded-lg">
                <option value="">— Select —</option>
                <option value="father">Father</option>
                <option value="mother">Mother</option>
                <option value="guardian">Guardian</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex gap-3 pt-2">
            <button type="submit" disabled={saving} className="px-5 py-2 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700 disabled:opacity-50">
              {saving ? 'Saving…' : initial ? 'Update Student' : 'Add Student'}
            </button>
            <button type="button" onClick={onClose} className="px-5 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50">Cancel</button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ─── Bulk Import Modal ────────────────────────────────────────────────────────

const BulkImportStudentsModal: React.FC<{ onClose: () => void; onDone: () => void }> = ({ onClose, onDone }) => {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<BulkImportResult | null>(null);
  const [error, setError] = useState('');

  const handleImport = async () => {
    if (!file) return;
    setLoading(true);
    setError('');
    try {
      const res = await studentAPI.bulkImport(file);
      setResult(res.data?.data);
      if (res.data?.data?.created > 0) toast.success(`${res.data.data.created} student(s) imported`);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Import failed. Check file format and try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <Upload className="w-5 h-5 text-indigo-600" />
            <h2 className="font-semibold text-gray-900">Bulk Import Students</h2>
          </div>
          <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-700 rounded-lg hover:bg-gray-100"><X className="w-4 h-4" /></button>
        </div>
        <div className="p-6 space-y-4">
          <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-3 text-xs text-indigo-800 space-y-1">
            <p className="font-semibold">Required CSV columns:</p>
            <code className="block bg-white rounded px-2 py-1 text-indigo-700">student_name, email, school_name, issue_date, certificate_type</code>
            <p className="text-indigo-600">All other columns (grade, city, country, team_name…) are stored as extra data.</p>
            <p className="text-indigo-600">New parent accounts are auto-created per unique email and credentials are emailed.</p>
          </div>

          {!result && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">CSV File</label>
              <div className="border-2 border-dashed border-gray-300 rounded-xl p-6 text-center hover:border-indigo-400 transition-colors">
                <input
                  type="file"
                  accept=".csv,text/csv"
                  onChange={e => setFile(e.target.files?.[0] || null)}
                  className="hidden"
                  id="student-csv-upload"
                />
                <label htmlFor="student-csv-upload" className="cursor-pointer">
                  <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                  {file ? (
                    <p className="text-sm font-medium text-indigo-600">{file.name}</p>
                  ) : (
                    <p className="text-sm text-gray-500">Click to select a CSV file</p>
                  )}
                </label>
              </div>
            </div>
          )}

          {error && (
            <div className="flex items-start gap-2 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {result && (
            <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 space-y-3">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <span className="font-semibold text-gray-800 text-sm">Import Complete</span>
              </div>
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                  <p className="text-2xl font-bold text-green-700">{result.created}</p>
                  <p className="text-xs text-green-600 font-medium">Students Created</p>
                </div>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <p className="text-2xl font-bold text-blue-700">{result.newAccounts}</p>
                  <p className="text-xs text-blue-600 font-medium">New Accounts</p>
                </div>
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                  <p className="text-2xl font-bold text-yellow-700">{result.skipped}</p>
                  <p className="text-xs text-yellow-600 font-medium">Skipped</p>
                </div>
              </div>
              {result.errors.length > 0 && (
                <div className="mt-2">
                  <p className="text-xs font-semibold text-red-700 mb-1">{result.errors.length} error(s):</p>
                  <div className="max-h-28 overflow-y-auto text-xs text-red-600 space-y-0.5">
                    {result.errors.map((e, i) => <p key={i}>{e}</p>)}
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="flex gap-3 pt-1">
            {!result ? (
              <>
                <button
                  onClick={handleImport}
                  disabled={!file || loading}
                  className="flex items-center gap-2 px-5 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50"
                >
                  {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                  {loading ? 'Importing…' : 'Import Students'}
                </button>
                <button onClick={onClose} className="px-5 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50">Cancel</button>
              </>
            ) : (
              <button onClick={() => { onDone(); onClose(); }} className="px-5 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700">
                Done
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── Page ─────────────────────────────────────────────────────────────────────

const AdminStudentsPage: React.FC = () => {
  const navigate = useNavigate();
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [showModal, setShowModal] = useState(false);
  const [showBulkImport, setShowBulkImport] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [parentSearch, setParentSearch] = useState('');
  const [parentStudents, setParentStudents] = useState<Student[] | null>(null);
  const [parentSearching, setParentSearching] = useState(false);

  const LIMIT = 20;

  const fetchStudents = useCallback(async () => {
    setLoading(true);
    try {
      const params: any = { page, limit: LIMIT };
      if (search) params.email = search;
      const res = await studentAPI.list(params);
      const data = res.data?.data;
      setStudents(data?.students || []);
      setTotalPages(data?.pagination?.totalPages || 1);
      setTotal(data?.pagination?.total || 0);
    } catch {
      toast.error('Failed to load students');
    } finally {
      setLoading(false);
    }
  }, [page, search]);

  useEffect(() => { fetchStudents(); }, [fetchStudents]);

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Deactivate student ${name}?`)) return;
    setDeleting(id);
    try {
      await studentAPI.delete(id);
      toast.success('Student deactivated');
      fetchStudents();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to deactivate');
    } finally {
      setDeleting(null);
    }
  };

  const handleParentSearch = async () => {
    if (!parentSearch.trim()) return;
    setParentSearching(true);
    try {
      const res = await studentAPI.getByParentEmail(parentSearch.trim());
      setParentStudents(res.data?.data?.students || []);
    } catch {
      toast.error('Failed to search by parent email');
    } finally {
      setParentSearching(false);
    }
  };

  const getParentName = (s: Student) => {
    if (typeof s.parentUserId === 'object' && s.parentUserId !== null) {
      return `${s.parentUserId.firstName} ${s.parentUserId.lastName}`;
    }
    return '—';
  };

  const getParentEmail = (s: Student) => {
    if (typeof s.parentUserId === 'object' && s.parentUserId !== null) {
      return s.parentUserId.email;
    }
    return '';
  };

  return (
    <div className="p-6">
      <div className="flex items-center gap-3 mb-6">
        <Users className="text-indigo-600 w-7 h-7" />
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Students</h1>
          <p className="text-sm text-gray-500">Manage student profiles linked to parent accounts</p>
        </div>
      </div>

      {/* Toolbar */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 mb-4 flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="text"
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
            placeholder="Filter by student email…"
            className="w-full pl-9 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        <button onClick={fetchStudents} className="flex items-center gap-1 px-3 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50">
          <RefreshCw className="w-3.5 h-3.5" />
        </button>
        <button onClick={() => setShowBulkImport(true)} className="flex items-center gap-1.5 px-4 py-2 text-sm bg-emerald-600 text-white rounded-lg hover:bg-emerald-700">
          <Upload className="w-4 h-4" /> Bulk Import
        </button>
        <button onClick={() => setShowModal(true)} className="flex items-center gap-1.5 px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">
          <Plus className="w-4 h-4" /> Add Student
        </button>
      </div>

      {/* Parent lookup */}
      <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4 mb-4 flex flex-wrap gap-2 items-center">
        <p className="text-sm font-medium text-indigo-800 mr-1">Find children by parent email:</p>
        <input
          type="email"
          value={parentSearch}
          onChange={e => setParentSearch(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleParentSearch()}
          placeholder="parent@example.com"
          className="text-sm px-3 py-1.5 border border-indigo-300 rounded-lg focus:ring-2 focus:ring-indigo-400 bg-white min-w-[220px]"
        />
        <button onClick={handleParentSearch} disabled={parentSearching || !parentSearch.trim()} className="px-4 py-1.5 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50">
          {parentSearching ? 'Searching…' : 'Search'}
        </button>
        {parentStudents !== null && (
          <button onClick={() => { setParentStudents(null); setParentSearch(''); }} className="px-3 py-1.5 text-sm text-indigo-600 border border-indigo-300 rounded-lg hover:bg-indigo-100">
            Clear
          </button>
        )}
        {parentStudents !== null && (
          <span className="text-sm text-indigo-700">{parentStudents.length} student(s) found</span>
        )}
      </div>

      {/* Results */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="py-12 text-center text-gray-400">Loading…</div>
        ) : (parentStudents !== null ? parentStudents : students).length === 0 ? (
          <div className="py-12 text-center text-gray-400">
            <Users className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <p>No students found</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-gray-600 w-8"></th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Student</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Parent</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Grade</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Roll #</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Status</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {(parentStudents !== null ? parentStudents : students).map(s => (
                <React.Fragment key={s._id}>
                  <tr className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <button
                        onClick={() => setExpanded(v => v === s._id ? null : s._id)}
                        className="text-gray-400 hover:text-gray-700"
                      >
                        {expanded === s._id ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <button onClick={() => navigate(`/admin/students/${s._id}`)} className="text-left hover:underline">
                        <p className="font-medium text-gray-900">{s.firstName} {s.lastName}</p>
                        <p className="text-xs text-gray-400">{s.email}</p>
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-gray-700">{getParentName(s)}</p>
                      <p className="text-xs text-gray-400">{getParentEmail(s)}</p>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{s.grade || '—'}</td>
                    <td className="px-4 py-3 text-gray-600 font-mono text-xs">{s.rollNumber || '—'}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 text-xs rounded-full font-medium ${s.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                        {s.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => navigate(`/admin/students/${s._id}`)}
                          className="p-1.5 text-gray-500 hover:bg-gray-100 rounded"
                          title="View"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => navigate(`/admin/students/${s._id}/edit`)}
                          className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded"
                          title="Edit"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(s._id, `${s.firstName} ${s.lastName}`)}
                          disabled={deleting === s._id || s.status === 'inactive'}
                          className="p-1.5 text-red-500 hover:bg-red-50 rounded disabled:opacity-40"
                          title="Deactivate"
                        >
                          {deleting === s._id ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                        </button>
                      </div>
                    </td>
                  </tr>
                  {expanded === s._id && (
                    <tr className="bg-gray-50">
                      <td colSpan={7} className="px-8 py-3">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs text-gray-600">
                          {s.dateOfBirth && <div><span className="font-medium">DOB:</span> {new Date(s.dateOfBirth).toLocaleDateString()}</div>}
                          {s.gender && <div><span className="font-medium">Gender:</span> {s.gender}</div>}
                          {s.phone && <div><span className="font-medium">Phone:</span> {s.phone}</div>}
                          {s.guardianRelation && <div><span className="font-medium">Guardian:</span> {s.guardianRelation}</div>}
                          {s.emergencyContact?.name && <div><span className="font-medium">Emergency:</span> {s.emergencyContact.name} ({s.emergencyContact.phone})</div>}
                          {s.medicalNotes && <div className="col-span-2"><span className="font-medium">Medical:</span> {s.medicalNotes}</div>}
                          {s.address?.city && <div><span className="font-medium">City:</span> {s.address.city}</div>}
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        )}
        {totalPages > 1 && !parentStudents && (
          <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-between">
            <button disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg disabled:opacity-40 hover:bg-gray-50">Previous</button>
            <span className="text-sm text-gray-500">Page {page} of {totalPages} ({total} total)</span>
            <button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)} className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg disabled:opacity-40 hover:bg-gray-50">Next</button>
          </div>
        )}
      </div>

      {showModal && (
        <StudentFormModal
          onClose={() => setShowModal(false)}
          onSaved={() => { setShowModal(false); fetchStudents(); }}
        />
      )}

      {showBulkImport && (
        <BulkImportStudentsModal
          onClose={() => setShowBulkImport(false)}
          onDone={fetchStudents}
        />
      )}
    </div>
  );
};

export default AdminStudentsPage;
