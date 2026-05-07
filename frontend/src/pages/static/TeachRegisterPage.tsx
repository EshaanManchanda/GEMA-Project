import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import SEO from '@/components/common/SEO';
import useAuth from '@/hooks/useAuth';
import teacherApplicationAPI from '@/services/api/teacherApplicationAPI';

type Option = { label: string; value: string };

const topicOptions: Option[] = [
  { label: 'Math', value: 'math' },
  { label: 'Science', value: 'science' },
  { label: 'English & Writing', value: 'english-writing' },
  { label: 'Coding & Technology', value: 'coding-technology' },
  { label: 'Art & Creativity', value: 'art-creativity' },
  { label: 'Music', value: 'music' },
  { label: 'Language Learning', value: 'language-learning' },
  { label: 'Life Skills', value: 'life-skills' },
];

const ageRangeOptions: Option[] = [
  { label: 'Ages 3-5', value: '3-5' },
  { label: 'Ages 6-8', value: '6-8' },
  { label: 'Ages 9-12', value: '9-12' },
  { label: 'Ages 13-15', value: '13-15' },
  { label: 'Ages 16-18', value: '16-18' },
];

const experienceTypeOptions: Option[] = [
  { label: 'Classroom Teaching', value: 'classroom-teaching' },
  { label: 'Private Tutoring', value: 'private-tutoring' },
  { label: 'Curriculum Design', value: 'curriculum-design' },
  { label: 'Youth Mentoring', value: 'youth-mentoring' },
  { label: 'Online Teaching', value: 'online-teaching' },
  { label: 'Professional Industry Experience', value: 'industry-experience' },
];

const yearsOptions = [
  '0-1 years',
  '2-3 years',
  '4-5 years',
  '6-10 years',
  '11+ years',
];

const toggleSelection = (current: string[], value: string) =>
  current.includes(value) ? current.filter((x) => x !== value) : [...current, value];

const TeachRegisterPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated, refreshUserData } = useAuth();

  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showApplicationSection, setShowApplicationSection] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [applicationStatus, setApplicationStatus] = useState<string | null>(null);
  const [applicationSubmitted, setApplicationSubmitted] = useState(false);

  const [profile, setProfile] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
  });

  const [form, setForm] = useState({
    topics: [] as string[],
    ageRanges: [] as string[],
    experienceTypes: [] as string[],
    yearsOfExperience: 0,
    qualifications: '',
    profileVideoUrl: '',
  });

  const yearsOfExperienceLabel = useMemo(() => {
    const idx = Math.max(0, Math.min(yearsOptions.length - 1, form.yearsOfExperience));
    return yearsOptions[idx];
  }, [form.yearsOfExperience]);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/register');
      return;
    }

    if (user?.role === 'vendor') {
      navigate('/register');
      return;
    }

    if (user?.role === 'teacher') {
      navigate('/teacher');
      return;
    }

    const loadApplication = async () => {
      setLoading(true);
      try {
        const data = await teacherApplicationAPI.getMyApplication();

        setProfile({
          firstName: data?.user?.firstName || user?.firstName || '',
          lastName: data?.user?.lastName || user?.lastName || '',
          email: data?.user?.email || user?.email || '',
          phone: data?.user?.phone || user?.phone || '',
        });

        if (data?.application) {
          setForm((prev) => ({
            ...prev,
            topics: data.application.subjects || [],
            ageRanges: data.application.learnerAgeRanges || [],
            experienceTypes: data.application.experienceTypes || [],
            yearsOfExperience: Number(data.application.yearsOfExperience || 0),
            qualifications: data.application.bio || '',
            profileVideoUrl: data.application.profileVideoUrl || '',
          }));
          setTermsAccepted(Boolean(data.application.termsAcceptedAt));
          setApplicationStatus(data.application.verificationStatus || 'PENDING');
          setApplicationSubmitted(true);
        }
      } catch {
        setProfile({
          firstName: user?.firstName || '',
          lastName: user?.lastName || '',
          email: user?.email || '',
          phone: user?.phone || '',
        });
      } finally {
        setLoading(false);
      }
    };

    loadApplication();
  }, [isAuthenticated, navigate, user]);

  const submitApplication = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!termsAccepted) {
      toast.error('Please accept service conditions before submitting');
      return;
    }

    if (
      form.topics.length === 0 ||
      form.ageRanges.length === 0 ||
      form.experienceTypes.length === 0 ||
      !form.qualifications.trim()
    ) {
      toast.error('Please complete all required fields');
      return;
    }

    setSubmitting(true);
    try {
      let profileVideoUrl = form.profileVideoUrl;

      if (videoFile) {
        if (videoFile.size > 1024 * 1024 * 1024) {
          toast.error('Video must be 1GB or less');
          setSubmitting(false);
          return;
        }

        const uploaded = await teacherApplicationAPI.uploadProfileVideo(videoFile);
        profileVideoUrl = uploaded?.url || uploaded?.path || '';
      }

      await teacherApplicationAPI.submitApplication({
        profile,
        topics: form.topics,
        ageRanges: form.ageRanges,
        experienceTypes: form.experienceTypes,
        yearsOfExperience: form.yearsOfExperience,
        qualifications: form.qualifications,
        profileVideoUrl,
        acceptedTerms: true,
      });

      setApplicationStatus('PENDING');
      setApplicationSubmitted(true);
      await refreshUserData();
      toast.success('Application submitted successfully!');
    } catch (error: any) {
      toast.error(error?.response?.data?.message || 'Failed to submit application');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <SEO
        title="Teacher Application | KidRove"
        description="Apply as an individual educator on KidRove."
        breadcrumbs={[
          { name: 'Home', url: '/' },
          { name: 'Teach Register', url: '/teach/register' },
        ]}
      />

      <div className="bg-sky-50 py-12 min-h-screen">
        <div className="mx-auto w-full max-w-6xl px-4">
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
            <div className="lg:col-span-2">
              <h1 className="text-[40px] font-extrabold text-gray-900">Welcome to KidRove!</h1>
              <p className="mt-4 text-lg text-gray-700">
                Complete your educator account setup. Follow our step-by-step guide and submit your
                application for review.
              </p>

              {applicationSubmitted ? (
                <div className="mt-10 space-y-6 border-t border-gray-200 pt-8">
                  <div className="rounded-lg border-2 border-green-200 bg-green-50 p-6">
                    <h2 className="text-2xl font-bold text-green-900">Application Submitted ✓</h2>
                    <p className="mt-2 text-green-800">
                      Thank you for your application! Your submission has been received and is currently pending admin verification.
                    </p>
                  </div>

                  <div className="rounded-lg bg-white p-6 border border-gray-200 shadow-sm">
                    <h3 className="text-xl font-semibold text-gray-900 mb-4">Application Status</h3>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-600">Current Status</p>
                        <p className="text-2xl font-bold text-blue-600 capitalize mt-1">
                          {applicationStatus === 'VERIFIED' ? 'Approved' : applicationStatus || 'Pending'}
                        </p>
                      </div>
                      <div className={`px-4 py-2 rounded-full text-sm font-semibold ${
                        applicationStatus === 'VERIFIED' 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {applicationStatus === 'VERIFIED' ? '✓ Approved' : '⏳ Pending Review'}
                      </div>
                    </div>
                  </div>

                  {applicationStatus === 'VERIFIED' && (
                    <div className="rounded-lg border-2 border-green-300 bg-green-50 p-6">
                      <h3 className="text-xl font-semibold text-green-900 mb-3">Great News!</h3>
                      <p className="text-green-800 mb-4">
                        Your application has been approved. You can now access your teacher dashboard and start creating classes.
                      </p>
                      <button
                        onClick={() => navigate('/teacher')}
                        className="rounded-full bg-green-600 px-8 py-3 text-base font-semibold text-white hover:bg-green-700 transition"
                      >
                        Go to Dashboard
                      </button>
                    </div>
                  )}

                  <button
                    onClick={() => setShowApplicationSection(true)}
                    className="mt-6 rounded-full bg-primary-700 px-8 py-3 text-base font-semibold text-white hover:bg-primary-800 transition"
                  >
                    Edit Application
                  </button>
                </div>
              ) : null}

              {!applicationSubmitted && (
                <section className="mt-10 border-t border-gray-200 pt-8">
                  <h2 className="text-[32px] font-semibold text-gray-900">Apply to KidRove</h2>
                  <p className="mt-3 max-w-4xl text-lg leading-relaxed text-gray-700">
                    Fill out your application to teach with us. Educators must be at least 18 years old and
                    provide accurate experience details.
                  </p>
                  <button
                    type="button"
                    onClick={() => setShowApplicationSection(true)}
                    className="mt-6 rounded-full bg-primary-700 px-8 py-3 text-base font-semibold text-white hover:bg-primary-800"
                  >
                    Apply Now
                  </button>
                </section>
              )}

              {showApplicationSection && (
                <form className="mt-10 space-y-7 border-t border-gray-200 pt-8" onSubmit={submitApplication}>
                  <h3 className="text-2xl font-bold text-gray-900">Step 2: Tell us about yourself</h3>

                  {loading && <p className="text-sm text-gray-500">Loading saved details...</p>}

                  <div className="grid gap-4 md:grid-cols-2">
                    <label className="space-y-2">
                      <span className="text-sm font-semibold text-gray-800">First name</span>
                      <input
                        className="w-full rounded-lg border border-gray-300 px-4 py-3"
                        value={profile.firstName}
                        onChange={(e) => setProfile((p) => ({ ...p, firstName: e.target.value }))}
                        required
                      />
                    </label>
                    <label className="space-y-2">
                      <span className="text-sm font-semibold text-gray-800">Last name</span>
                      <input
                        className="w-full rounded-lg border border-gray-300 px-4 py-3"
                        value={profile.lastName}
                        onChange={(e) => setProfile((p) => ({ ...p, lastName: e.target.value }))}
                        required
                      />
                    </label>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <label className="space-y-2">
                      <span className="text-sm font-semibold text-gray-800">Email</span>
                      <input className="w-full rounded-lg border border-gray-300 px-4 py-3 bg-gray-100" value={profile.email} disabled />
                    </label>
                    <label className="space-y-2">
                      <span className="text-sm font-semibold text-gray-800">Phone</span>
                      <input
                        className="w-full rounded-lg border border-gray-300 px-4 py-3"
                        value={profile.phone}
                        onChange={(e) => setProfile((p) => ({ ...p, phone: e.target.value }))}
                        required
                      />
                    </label>
                  </div>

                  <div>
                    <p className="text-base font-semibold text-gray-900">
                      What topics are you passionate about teaching? (required)
                    </p>
                    <p className="mb-3 text-sm text-gray-500">Select topics</p>
                    <div className="grid gap-2 sm:grid-cols-2">
                      {topicOptions.map((option) => (
                        <label key={option.value} className="flex items-center gap-2 rounded border border-gray-200 p-2">
                          <input
                            type="checkbox"
                            checked={form.topics.includes(option.value)}
                            onChange={() =>
                              setForm((f) => ({ ...f, topics: toggleSelection(f.topics, option.value) }))
                            }
                          />
                          <span>{option.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div>
                    <p className="text-base font-semibold text-gray-900">
                      Which ages of learners do you want to work with? (required)
                    </p>
                    <p className="mb-3 text-sm text-gray-500">Select age ranges</p>
                    <div className="grid gap-2 sm:grid-cols-2">
                      {ageRangeOptions.map((option) => (
                        <label key={option.value} className="flex items-center gap-2 rounded border border-gray-200 p-2">
                          <input
                            type="checkbox"
                            checked={form.ageRanges.includes(option.value)}
                            onChange={() =>
                              setForm((f) => ({ ...f, ageRanges: toggleSelection(f.ageRanges, option.value) }))
                            }
                          />
                          <span>{option.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div>
                    <p className="text-base font-semibold text-gray-900">
                      What experience or expertise do you have in these subject areas? (required)
                    </p>
                    <p className="mb-3 text-sm text-gray-500">Select experience types</p>
                    <div className="grid gap-2 sm:grid-cols-2">
                      {experienceTypeOptions.map((option) => (
                        <label key={option.value} className="flex items-center gap-2 rounded border border-gray-200 p-2">
                          <input
                            type="checkbox"
                            checked={form.experienceTypes.includes(option.value)}
                            onChange={() =>
                              setForm((f) => ({
                                ...f,
                                experienceTypes: toggleSelection(f.experienceTypes, option.value),
                              }))
                            }
                          />
                          <span>{option.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <label className="space-y-2">
                    <span className="text-base font-semibold text-gray-900">
                      How many years of experience do you have teaching or working with youth? (required)
                    </span>
                    <select
                      className="w-full rounded-lg border border-gray-300 px-4 py-3"
                      value={String(form.yearsOfExperience)}
                      onChange={(e) => setForm((f) => ({ ...f, yearsOfExperience: Number(e.target.value) }))}
                    >
                      {yearsOptions.map((option, index) => (
                        <option key={option} value={index}>
                          {option}
                        </option>
                      ))}
                    </select>
                    <p className="text-xs text-gray-500">Selected: {yearsOfExperienceLabel}</p>
                  </label>

                  <label className="space-y-2">
                    <span className="text-base font-semibold text-gray-900">
                      Please describe any relevant professional experience, academic credentials,
                      certifications, or personal experiences that demonstrate your qualifications.
                      (Responses should be 4-5 sentences) (required)
                    </span>
                    <a href="#" className="text-sm font-medium text-primary-700 hover:underline">
                      See sample responses to this question.
                    </a>
                    <textarea
                      rows={6}
                      className="w-full rounded-lg border border-gray-300 px-4 py-3"
                      value={form.qualifications}
                      onChange={(e) => setForm((f) => ({ ...f, qualifications: e.target.value }))}
                      required
                    />
                  </label>

                  <div className="space-y-2 rounded-lg border border-gray-200 bg-gray-50 p-4">
                    <h4 className="text-lg font-semibold text-gray-900">Step 3: Create Your Educator Profile Video</h4>
                    <p className="text-sm text-gray-700">
                      Showcase your expertise, educational background, and teaching style with a 60-90 second
                      video introducing yourself and the topics you plan to teach.
                    </p>
                    <p className="text-sm text-gray-700">
                      If uploading your video, check to make sure it is 1gb or less.
                    </p>
                    <p className="text-sm text-gray-700">
                      Watch your video to make sure the recording worked. It may take a few minutes to show up.
                    </p>
                    <input
                      type="file"
                      accept="video/*"
                      className="block w-full text-sm"
                      onChange={(e) => setVideoFile(e.target.files?.[0] || null)}
                    />
                    <label className="space-y-2 block">
                      <span className="text-sm font-medium text-gray-700">Or paste uploaded video URL</span>
                      <input
                        className="w-full rounded-lg border border-gray-300 px-4 py-3"
                        value={form.profileVideoUrl}
                        onChange={(e) => setForm((f) => ({ ...f, profileVideoUrl: e.target.value }))}
                        placeholder="https://..."
                      />
                    </label>
                  </div>

                  <label className="flex items-start gap-3 border-t border-gray-200 pt-4">
                    <input
                      type="checkbox"
                      className="mt-1 h-5 w-5"
                      checked={termsAccepted}
                      onChange={(e) => setTermsAccepted(e.target.checked)}
                    />
                    <span className="text-base text-gray-900">
                      I agree to the Terms of Service, Class Content Policy, and Community Standards
                    </span>
                  </label>

                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full bg-gray-200 py-4 text-xl font-semibold text-gray-700 transition hover:bg-gray-300 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {submitting ? 'Submitting...' : 'Submit application'}
                  </button>
                </form>
              )}
            </div>

            <aside className="space-y-5">
              <div className="rounded-2xl bg-gradient-to-br from-sky-100 to-blue-100 p-8 shadow-md border border-sky-200 text-center">
                <div className="mb-4 flex justify-center">
                  {user?.avatar ? (
                    <img
                      src={user.avatar}
                      alt={`${profile.firstName} ${profile.lastName}`}
                      className="h-24 w-24 rounded-full border-4 border-white shadow-lg object-cover"
                    />
                  ) : (
                    <div className="h-24 w-24 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center border-4 border-white shadow-lg">
                      <span className="text-3xl font-bold text-white">
                        {profile.firstName?.charAt(0)?.toUpperCase() || 'K'}
                      </span>
                    </div>
                  )}
                </div>
                <p className="text-xl font-bold text-gray-900">
                  {profile.firstName} {profile.lastName}
                </p>
                <p className="mt-1 text-sm text-gray-600">member role: {user?.role || 'customer'}</p>
                <p className="mt-2 text-xs text-gray-500">joined April 2026</p>
                
                <div className="mt-6 flex gap-2">
                  <button
                    onClick={() => navigate('/edit-profile')}
                    className="flex-1 rounded-full border-2 border-gray-400 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition"
                  >
                    Edit Profile
                  </button>
                  <button
                    onClick={() => toast.success('Profile link copied!')}
                    className="flex-1 rounded-full bg-gradient-to-r from-blue-600 to-purple-600 px-4 py-2 text-sm font-semibold text-white hover:shadow-lg transition"
                  >
                    Share Profile
                  </button>
                </div>
              </div>
            </aside>
          </div>
        </div>
      </div>
    </>
  );
};

export default TeachRegisterPage;
