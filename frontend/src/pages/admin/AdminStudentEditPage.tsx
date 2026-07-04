import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Save, AlertCircle, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';
import { studentAPI, type Student, type UpdateStudentPayload } from '../../services/api/studentAPI';
import PrivatePageSEO from '@/components/common/PrivatePageSEO';

type FormState = {
  firstName: string;
  lastName: string;
  email: string;
  dateOfBirth: string;
  gender: '' | 'male' | 'female' | 'other';
  schoolId: string;
  grade: string;
  rollNumber: string;
  phone: string;
  guardianRelation: '' | 'father' | 'mother' | 'guardian' | 'other';
  status: 'active' | 'inactive';
  addressLine1: string;
  addressCity: string;
  addressState: string;
  addressCountry: string;
  addressZip: string;
  emergencyName: string;
  emergencyPhone: string;
  emergencyRelation: string;
  medicalNotes: string;
};

const emptyForm: FormState = {
  firstName: '', lastName: '', email: '', dateOfBirth: '', gender: '', schoolId: '',
  grade: '', rollNumber: '', phone: '', guardianRelation: '', status: 'active',
  addressLine1: '', addressCity: '', addressState: '', addressCountry: '', addressZip: '',
  emergencyName: '', emergencyPhone: '', emergencyRelation: '', medicalNotes: '',
};

const toFormState = (s: Student): FormState => ({
  firstName: s.firstName || '',
  lastName: s.lastName || '',
  email: s.email || '',
  dateOfBirth: s.dateOfBirth ? s.dateOfBirth.slice(0, 10) : '',
  gender: s.gender || '',
  schoolId: s.schoolId || '',
  grade: s.grade || '',
  rollNumber: s.rollNumber || '',
  phone: s.phone || '',
  guardianRelation: s.guardianRelation || '',
  status: s.status,
  addressLine1: s.address?.line1 || '',
  addressCity: s.address?.city || '',
  addressState: s.address?.state || '',
  addressCountry: s.address?.country || '',
  addressZip: s.address?.zip || '',
  emergencyName: s.emergencyContact?.name || '',
  emergencyPhone: s.emergencyContact?.phone || '',
  emergencyRelation: s.emergencyContact?.relation || '',
  medicalNotes: s.medicalNotes || '',
});

const inputClass = 'w-full text-sm px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none';
const labelClass = 'block text-sm font-medium text-gray-700 mb-1';

const AdminStudentEditPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [form, setForm] = useState<FormState>(emptyForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [formError, setFormError] = useState('');

  useEffect(() => {
    if (!id) return;
    (async () => {
      setLoading(true);
      setLoadError(null);
      try {
        const res = await studentAPI.get(id);
        const student = res.data?.data?.student;
        if (!student) throw new Error('Student not found');
        setForm(toFormState(student));
      } catch (err: any) {
        setLoadError(err?.response?.data?.message || 'Failed to load student');
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm(prev => ({ ...prev, [key]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) return;
    if (!form.firstName || !form.lastName || !form.email) {
      setFormError('First name, last name and email are required.');
      return;
    }
    setFormError('');
    setSaving(true);
    try {
      const hasAddress = form.addressLine1 || form.addressCity || form.addressState || form.addressCountry || form.addressZip;
      const hasEmergency = form.emergencyName || form.emergencyPhone || form.emergencyRelation;

      const payload: UpdateStudentPayload = {
        firstName: form.firstName,
        lastName: form.lastName,
        email: form.email,
        phone: form.phone || undefined,
        dateOfBirth: form.dateOfBirth || undefined,
        gender: form.gender || undefined,
        schoolId: form.schoolId || undefined,
        grade: form.grade || undefined,
        rollNumber: form.rollNumber || undefined,
        guardianRelation: form.guardianRelation || undefined,
        status: form.status,
        medicalNotes: form.medicalNotes || undefined,
        ...(hasAddress ? {
          address: {
            line1: form.addressLine1 || undefined,
            city: form.addressCity || undefined,
            state: form.addressState || undefined,
            country: form.addressCountry || undefined,
            zip: form.addressZip || undefined,
          },
        } : {}),
        ...(hasEmergency ? {
          emergencyContact: {
            name: form.emergencyName,
            phone: form.emergencyPhone,
            relation: form.emergencyRelation || undefined,
          },
        } : {}),
      };

      await studentAPI.update(id, payload);
      toast.success('Student updated');
      navigate(`/admin/students/${id}`);
    } catch (err: any) {
      setFormError(err?.response?.data?.message || 'Failed to save student');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600" />
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="max-w-4xl mx-auto py-12 text-center">
        <AlertCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Student Not Found</h2>
        <p className="text-gray-500 mb-6">{loadError}</p>
        <Link to="/admin/students" className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to Students
        </Link>
      </div>
    );
  }

  return (
    <>
      <PrivatePageSEO title={`Edit ${form.firstName} ${form.lastName} | Admin`} description="Edit student" />
      <div className="max-w-4xl mx-auto space-y-6 p-6">

        <div className="flex items-center gap-4">
          <Link to={`/admin/students/${id}`} className="p-2 rounded-lg hover:bg-gray-100 transition-colors text-gray-600">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Edit Student</h1>
            <p className="text-sm text-gray-500 mt-0.5">{form.firstName} {form.lastName}</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 space-y-4">
            <h2 className="font-semibold text-gray-900 text-sm">Personal Information</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>First Name *</label>
                <input className={inputClass} value={form.firstName} onChange={e => set('firstName', e.target.value)} required />
              </div>
              <div>
                <label className={labelClass}>Last Name *</label>
                <input className={inputClass} value={form.lastName} onChange={e => set('lastName', e.target.value)} required />
              </div>
              <div>
                <label className={labelClass}>Email *</label>
                <input type="email" className={inputClass} value={form.email} onChange={e => set('email', e.target.value)} required />
              </div>
              <div>
                <label className={labelClass}>Phone</label>
                <input type="tel" className={inputClass} value={form.phone} onChange={e => set('phone', e.target.value)} />
              </div>
              <div>
                <label className={labelClass}>Date of Birth</label>
                <input type="date" className={inputClass} value={form.dateOfBirth} onChange={e => set('dateOfBirth', e.target.value)} />
              </div>
              <div>
                <label className={labelClass}>Gender</label>
                <select className={inputClass} value={form.gender} onChange={e => set('gender', e.target.value as FormState['gender'])}>
                  <option value="">— Select —</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                </select>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 space-y-4">
            <h2 className="font-semibold text-gray-900 text-sm">Academic Info</h2>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className={labelClass}>Grade</label>
                <input className={inputClass} value={form.grade} onChange={e => set('grade', e.target.value)} placeholder="e.g. Grade 5" />
              </div>
              <div>
                <label className={labelClass}>Roll Number</label>
                <input className={inputClass} value={form.rollNumber} onChange={e => set('rollNumber', e.target.value)} />
              </div>
              <div>
                <label className={labelClass}>School</label>
                <input className={inputClass} value={form.schoolId} onChange={e => set('schoolId', e.target.value)} placeholder="School name" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 space-y-4">
            <h2 className="font-semibold text-gray-900 text-sm">Guardian</h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Guardian Relation</label>
                <select className={inputClass} value={form.guardianRelation} onChange={e => set('guardianRelation', e.target.value as FormState['guardianRelation'])}>
                  <option value="">— Select —</option>
                  <option value="father">Father</option>
                  <option value="mother">Mother</option>
                  <option value="guardian">Guardian</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div>
                <label className={labelClass}>Status</label>
                <select className={inputClass} value={form.status} onChange={e => set('status', e.target.value as FormState['status'])}>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 space-y-4">
            <h2 className="font-semibold text-gray-900 text-sm">Address</h2>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className={labelClass}>Street</label>
                <input className={inputClass} value={form.addressLine1} onChange={e => set('addressLine1', e.target.value)} />
              </div>
              <div>
                <label className={labelClass}>City</label>
                <input className={inputClass} value={form.addressCity} onChange={e => set('addressCity', e.target.value)} />
              </div>
              <div>
                <label className={labelClass}>State</label>
                <input className={inputClass} value={form.addressState} onChange={e => set('addressState', e.target.value)} />
              </div>
              <div>
                <label className={labelClass}>Country</label>
                <input className={inputClass} value={form.addressCountry} onChange={e => set('addressCountry', e.target.value)} />
              </div>
              <div>
                <label className={labelClass}>Zip</label>
                <input className={inputClass} value={form.addressZip} onChange={e => set('addressZip', e.target.value)} />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 space-y-4">
            <h2 className="font-semibold text-gray-900 text-sm">Emergency Contact</h2>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className={labelClass}>Name</label>
                <input className={inputClass} value={form.emergencyName} onChange={e => set('emergencyName', e.target.value)} />
              </div>
              <div>
                <label className={labelClass}>Phone</label>
                <input className={inputClass} value={form.emergencyPhone} onChange={e => set('emergencyPhone', e.target.value)} />
              </div>
              <div>
                <label className={labelClass}>Relation</label>
                <input className={inputClass} value={form.emergencyRelation} onChange={e => set('emergencyRelation', e.target.value)} />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 space-y-4">
            <h2 className="font-semibold text-gray-900 text-sm">Medical Notes</h2>
            <textarea
              className={`${inputClass} min-h-[100px]`}
              value={form.medicalNotes}
              onChange={e => set('medicalNotes', e.target.value)}
              placeholder="Allergies, conditions, or other notes…"
            />
          </div>

          {formError && (
            <div className="flex items-start gap-2 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{formError}</span>
            </div>
          )}

          <div className="flex gap-3">
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50"
            >
              {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {saving ? 'Saving…' : 'Save Changes'}
            </button>
            <Link to={`/admin/students/${id}`} className="px-5 py-2.5 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50">
              Cancel
            </Link>
          </div>
        </form>
      </div>
    </>
  );
};

export default AdminStudentEditPage;
