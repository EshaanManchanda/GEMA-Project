import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft, Pencil, Trash2, RefreshCw, AlertCircle, User as UserIcon,
  Phone, MapPin, Shield, HeartPulse, GraduationCap,
  Clock, BadgeCheck,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { studentAPI, type Student } from '../../services/api/studentAPI';
import PrivatePageSEO from '@/components/common/PrivatePageSEO';

const formatDate = (date?: string) => {
  if (!date) return '—';
  return new Date(date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
};

const formatDateTime = (date?: string) => {
  if (!date) return '—';
  return new Date(date).toLocaleString('en-US', {
    year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
  });
};

const Section: React.FC<{ icon: React.ReactNode; title: string; children: React.ReactNode }> = ({ icon, title, children }) => (
  <div className="bg-white rounded-xl shadow-sm border border-gray-200">
    <div className="flex items-center gap-2 px-5 py-3.5 border-b border-gray-100">
      {icon}
      <h2 className="font-semibold text-gray-900 text-sm">{title}</h2>
    </div>
    <div className="p-5">{children}</div>
  </div>
);

const Field: React.FC<{ label: string; value?: React.ReactNode }> = ({ label, value }) => (
  <div>
    <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-0.5">{label}</p>
    <p className="text-sm text-gray-800">{value || '—'}</p>
  </div>
);

const AdminStudentDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [student, setStudent] = useState<Student | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchStudent = async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const res = await studentAPI.get(id);
      setStudent(res.data?.data?.student || null);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to load student');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchStudent(); }, [id]);

  const handleDeactivate = async () => {
    if (!student || !confirm(`Deactivate ${student.firstName} ${student.lastName}?`)) return;
    setDeleting(true);
    try {
      await studentAPI.delete(student._id);
      toast.success('Student deactivated');
      fetchStudent();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to deactivate');
    } finally {
      setDeleting(false);
    }
  };

  const getParentName = (s: Student) =>
    typeof s.parentUserId === 'object' && s.parentUserId ? `${s.parentUserId.firstName} ${s.parentUserId.lastName}` : '—';
  const getParentEmail = (s: Student) =>
    typeof s.parentUserId === 'object' && s.parentUserId ? s.parentUserId.email : '';
  const getParentId = (s: Student) =>
    typeof s.parentUserId === 'object' && s.parentUserId ? s.parentUserId._id : s.parentUserId;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600" />
      </div>
    );
  }

  if (error || !student) {
    return (
      <div className="max-w-4xl mx-auto py-12 text-center">
        <AlertCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Student Not Found</h2>
        <p className="text-gray-500 mb-6">{error || 'This student does not exist or could not be loaded.'}</p>
        <Link to="/admin/students" className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to Students
        </Link>
      </div>
    );
  }

  return (
    <>
      <PrivatePageSEO title={`${student.firstName} ${student.lastName} | Student | Admin`} description="Student details" />
      <div className="max-w-5xl mx-auto space-y-6 p-6">

        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-4">
            <Link to="/admin/students" className="p-2 rounded-lg hover:bg-gray-100 transition-colors text-gray-600">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{student.firstName} {student.lastName}</h1>
              <p className="text-sm text-gray-500 mt-0.5">{student.email}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium border ${
              student.status === 'active' ? 'bg-green-100 text-green-800 border-green-200' : 'bg-gray-100 text-gray-600 border-gray-200'
            }`}>
              <BadgeCheck className="w-4 h-4" />
              {student.status.charAt(0).toUpperCase() + student.status.slice(1)}
            </span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3 flex-wrap">
          <button
            onClick={() => navigate(`/admin/students/${student._id}/edit`)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium"
          >
            <Pencil className="w-4 h-4" /> Edit Student
          </button>
          <button
            onClick={handleDeactivate}
            disabled={deleting || student.status === 'inactive'}
            className="inline-flex items-center gap-2 px-4 py-2 border border-red-300 text-red-600 rounded-lg hover:bg-red-50 transition-colors font-medium disabled:opacity-40"
          >
            {deleting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />} Deactivate
          </button>
          <button
            onClick={fetchStudent}
            className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
          >
            <RefreshCw className="w-4 h-4" /> Refresh
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          <Section icon={<UserIcon className="w-4 h-4 text-indigo-600" />} title="Personal Information">
            <div className="grid grid-cols-2 gap-4">
              <Field label="First Name" value={student.firstName} />
              <Field label="Last Name" value={student.lastName} />
              <Field label="Email" value={student.email} />
              <Field label="Phone" value={student.phone} />
              <Field label="Date of Birth" value={formatDate(student.dateOfBirth)} />
              <Field label="Gender" value={student.gender ? student.gender.charAt(0).toUpperCase() + student.gender.slice(1) : undefined} />
            </div>
          </Section>

          <Section icon={<GraduationCap className="w-4 h-4 text-indigo-600" />} title="Academic Info">
            <div className="grid grid-cols-2 gap-4">
              <Field label="Grade" value={student.grade} />
              <Field label="Roll Number" value={student.rollNumber} />
              <Field label="School" value={student.schoolId} />
            </div>
          </Section>

          <Section icon={<Shield className="w-4 h-4 text-indigo-600" />} title="Parent / Guardian">
            <div className="grid grid-cols-2 gap-4">
              <Field label="Parent Name" value={getParentName(student)} />
              <Field label="Parent Email" value={getParentEmail(student)} />
              <Field label="Parent User ID" value={<span className="font-mono text-xs">{getParentId(student)}</span>} />
              <Field label="Guardian Relation" value={student.guardianRelation ? student.guardianRelation.charAt(0).toUpperCase() + student.guardianRelation.slice(1) : undefined} />
            </div>
          </Section>

          <Section icon={<MapPin className="w-4 h-4 text-indigo-600" />} title="Address">
            <div className="grid grid-cols-2 gap-4">
              <Field label="Street" value={student.address?.line1} />
              <Field label="City" value={student.address?.city} />
              <Field label="State" value={student.address?.state} />
              <Field label="Country" value={student.address?.country} />
              <Field label="Zip" value={student.address?.zip} />
            </div>
          </Section>

          <Section icon={<Phone className="w-4 h-4 text-indigo-600" />} title="Emergency Contact">
            <div className="grid grid-cols-2 gap-4">
              <Field label="Name" value={student.emergencyContact?.name} />
              <Field label="Phone" value={student.emergencyContact?.phone} />
              <Field label="Relation" value={student.emergencyContact?.relation} />
            </div>
          </Section>

          <Section icon={<HeartPulse className="w-4 h-4 text-indigo-600" />} title="Medical Notes">
            <p className="text-sm text-gray-700 whitespace-pre-wrap">{student.medicalNotes || 'No medical notes recorded.'}</p>
          </Section>

          <Section icon={<Clock className="w-4 h-4 text-indigo-600" />} title="Record Meta">
            <div className="grid grid-cols-2 gap-4">
              <Field label="Student ID" value={<span className="font-mono text-xs">{student._id}</span>} />
              <Field label="Created" value={formatDateTime(student.createdAt)} />
            </div>
          </Section>

        </div>
      </div>
    </>
  );
};

export default AdminStudentDetailPage;
