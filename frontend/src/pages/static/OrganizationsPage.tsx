import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiBookOpen, FiCheckCircle, FiCircle, FiStar, FiTarget } from 'react-icons/fi';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import SEO from '@/components/common/SEO';
import useAuth from '@/hooks/useAuth';
import organizationAPI, {
  OrganizationAgreementPayload,
  OrganizationApplicationPayload,
} from '@/services/api/organizationAPI';

type TabKey = 'dashboard' | 'apply' | 'agreement';
type ReviewStatus = 'pending' | 'approved' | 'rejected';

const EMPTY_APPLICATION: OrganizationApplicationPayload = {
  organizationName: '',
  anticipatedTeachersNextMonth: 1,
  countryOfOperation: '',
  organizationWebsite: '',
  primaryContactName: '',
  primaryContactTitle: '',
  organizationPhone: '',
  foundedYear: '',
  teacherBackground: '',
  learnerAudience: '',
  classTypes: '',
  firstClassDescription: '',
  referralSource: '',
  publicReviewsLinks: '',
  additionalNotes: '',
};

const EMPTY_AGREEMENT: OrganizationAgreementPayload = {
  legalName: '',
  legalEntityType: '',
  incorporationLocation: '',
  principalBusinessAddress: '',
  backgroundChecksRequired: true,
  authorizedSignerName: '',
  authorizedSignerTitle: '',
  acceptedTerms: false,
};

const tabButtonClass = (active: boolean) =>
  `rounded-full px-5 py-2.5 text-sm font-semibold transition-colors ${
    active
      ? 'bg-primary-600 text-white shadow-sm'
      : 'border border-primary-200 bg-white text-primary-700 hover:bg-primary-50'
  }`;

const inputClass =
  'w-full rounded-lg border border-gray-300 px-4 py-3 text-base outline-none transition focus:border-primary-500 focus:ring-2 focus:ring-primary-200';

const normalizeWebsite = (value: string): string => {
  const trimmed = value.trim();
  if (!trimmed) {
    return '';
  }

  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
};

const OrganizationsPage: React.FC = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  const [activeTab, setActiveTab] = useState<TabKey>('dashboard');
  const [application, setApplication] = useState<OrganizationApplicationPayload>(
    EMPTY_APPLICATION,
  );
  const [anticipatedTeachersInput, setAnticipatedTeachersInput] = useState(
    String(EMPTY_APPLICATION.anticipatedTeachersNextMonth),
  );
  const [agreement, setAgreement] = useState<OrganizationAgreementPayload>(
    EMPTY_AGREEMENT,
  );
  const [applyTermsAccepted, setApplyTermsAccepted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSavingApplication, setIsSavingApplication] = useState(false);
  const [isSigningAgreement, setIsSigningAgreement] = useState(false);
  const [applicationCompletedAt, setApplicationCompletedAt] = useState<string | null>(null);
  const [agreementSignedAt, setAgreementSignedAt] = useState<string | null>(null);
  const [reviewStatus, setReviewStatus] = useState<ReviewStatus | null>(null);
  const [reviewNotes, setReviewNotes] = useState<string | null>(null);

  useEffect(() => {
    const loadOnboarding = async () => {
      if (!isAuthenticated) {
        navigate('/login?redirect=/organizations');
        return;
      }

      setIsLoading(true);
      try {
        const response = await organizationAPI.getOnboarding();
        const onboarding = response.onboarding;

        if (onboarding?.application) {
          setApplication((prev) => ({ ...prev, ...onboarding.application }));
          setAnticipatedTeachersInput(
            String(onboarding.application.anticipatedTeachersNextMonth ?? 1),
          );
          setApplyTermsAccepted(true);
        }

        if (onboarding?.agreement) {
          setAgreement((prev) => ({
            ...prev,
            ...onboarding.agreement,
            acceptedTerms: Boolean(onboarding.agreement?.acceptedTerms),
          }));
        }

        setApplicationCompletedAt(onboarding?.applicationCompletedAt || null);
        setAgreementSignedAt(onboarding?.agreementSignedAt || null);
        setReviewStatus((onboarding?.reviewStatus as ReviewStatus) || null);
        setReviewNotes(onboarding?.reviewNotes || null);
      } catch {
        // Keep page usable even if onboarding fetch fails.
      } finally {
        setIsLoading(false);
      }
    };

    loadOnboarding();
  }, [isAuthenticated, navigate]);

  const accountCreated = isAuthenticated;
  const applicationDone = Boolean(applicationCompletedAt);
  const agreementDone = Boolean(agreementSignedAt);

  const agreementSummary = useMemo(
    () => ({
      legalName: agreement.legalName || application.organizationName || '',
      legalEntityType: agreement.legalEntityType,
      incorporationLocation: agreement.incorporationLocation,
    }),
    [agreement, application.organizationName],
  );

  const handleCreateAccount = () => {
    navigate('/register?role=vendor&redirect=/organizations');
  };

  const handleApplicationChange = (
    field: keyof OrganizationApplicationPayload,
    value: string | number,
  ) => {
    setApplication((prev) => ({ ...prev, [field]: value }));
  };

  const handleAgreementChange = (
    field: keyof OrganizationAgreementPayload,
    value: string | boolean,
  ) => {
    setAgreement((prev) => ({ ...prev, [field]: value }));
  };

  const submitApplication = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!applyTermsAccepted) {
      toast.error('Please accept the terms before submitting your application');
      return;
    }

    setIsSavingApplication(true);
    try {
      const applicationPayload: OrganizationApplicationPayload = {
        ...application,
        organizationWebsite: normalizeWebsite(application.organizationWebsite),
      };

      await organizationAPI.saveApplication(applicationPayload);
      setApplication(applicationPayload);
      setAnticipatedTeachersInput(String(applicationPayload.anticipatedTeachersNextMonth));
      setApplicationCompletedAt(new Date().toISOString());
      setReviewStatus('pending');
      setReviewNotes(null);
      toast.success('Application submitted');
      setActiveTab('dashboard');
    } catch (error: any) {
      const message =
        error?.response?.data?.message ||
        Object.values(error?.response?.data?.errors || {}).join(', ') ||
        'Failed to submit application';
      toast.error(message);
    } finally {
      setIsSavingApplication(false);
    }
  };

  const submitAgreement = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!applicationDone) {
      toast.error('Complete the application before signing the agreement');
      setActiveTab('apply');
      return;
    }

    setIsSigningAgreement(true);
    try {
      await organizationAPI.signAgreement(agreement);
      setAgreementSignedAt(new Date().toISOString());
      setReviewStatus('pending');
      toast.success('Agreement signed');
      setActiveTab('dashboard');
    } catch (error: any) {
      const message =
        error?.response?.data?.message ||
        Object.values(error?.response?.data?.errors || {}).join(', ') ||
        'Failed to sign agreement';
      toast.error(message);
    } finally {
      setIsSigningAgreement(false);
    }
  };

  return (
    <>
      <SEO
        title="Bring Your Organization to KidRove | Teach Online"
        description="Apply your organization to teach online on KidRove and complete onboarding."
        breadcrumbs={[
          { name: 'Home', url: '/' },
          { name: 'Organization', url: '/organizations' },
        ]}
      />

      <div className="min-h-screen bg-gray-50">
        <section className="relative overflow-hidden border-b border-primary-100 bg-gradient-to-br from-primary-100 via-sky-100 to-sky-50">
          <div className="pointer-events-none absolute inset-0 opacity-20">
            <FiBookOpen className="absolute left-8 top-16 h-16 w-16 text-primary-900" />
            <FiStar className="absolute right-20 top-12 h-12 w-12 text-primary-900" />
            <FiTarget className="absolute bottom-16 left-1/4 h-14 w-14 text-primary-900" />
            <FiBookOpen className="absolute bottom-10 right-1/3 h-12 w-12 text-primary-900" />
          </div>

          <div className="container mx-auto px-4 py-16 sm:py-20 lg:py-24">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45 }}
              className="mx-auto max-w-4xl text-center"
            >
              <p className="mb-4 text-base font-semibold uppercase tracking-wide text-primary-700 sm:text-lg">
                KidRove For Organizations
              </p>
              <h1 className="text-4xl font-extrabold leading-tight text-gray-900 sm:text-5xl lg:text-6xl">
                Launch Your Organization's Learning Hub
              </h1>
              <p className="mx-auto mt-6 max-w-3xl text-lg text-gray-600 sm:text-xl">
                Complete your onboarding, submit your application, and sign your agreement to launch on
                KidRove.
              </p>
            </motion.div>
          </div>
        </section>

        <section className="bg-white py-10 sm:py-14">
          <div className="container mx-auto px-4">
            <div className="mx-auto max-w-5xl">
              <div className="mb-8 flex flex-wrap gap-3">
                <button
                  type="button"
                  className={tabButtonClass(activeTab === 'dashboard')}
                  onClick={() => setActiveTab('dashboard')}
                >
                  Dashboard
                </button>
                <button
                  type="button"
                  className={tabButtonClass(activeTab === 'apply')}
                  onClick={() => setActiveTab('apply')}
                >
                  Apply
                </button>
                <button
                  type="button"
                  className={tabButtonClass(activeTab === 'agreement')}
                  onClick={() => setActiveTab('agreement')}
                >
                  Agreement
                </button>
              </div>

              {activeTab === 'dashboard' && (
                <div className="space-y-5">
                  <h2 className="text-3xl font-bold text-gray-900 sm:text-4xl">Your Onboarding Checklist</h2>

                  <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
                    <div className="flex items-start gap-4">
                      {accountCreated ? (
                        <FiCheckCircle className="mt-1 h-6 w-6 text-green-500" />
                      ) : (
                        <FiCircle className="mt-1 h-6 w-6 text-gray-300" />
                      )}
                      <div>
                        <p className={`text-lg font-semibold ${accountCreated ? 'text-green-700' : 'text-gray-900'}`}>
                          Create Account
                        </p>
                        {!accountCreated && (
                          <button
                            type="button"
                            className="mt-2 text-sm font-semibold text-primary-700 hover:underline"
                            onClick={handleCreateAccount}
                          >
                            Create now
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
                    <div className="flex items-start gap-4">
                      {applicationDone ? (
                        <FiCheckCircle className="mt-1 h-6 w-6 text-green-500" />
                      ) : (
                        <FiCircle className="mt-1 h-6 w-6 text-gray-300" />
                      )}
                      <div>
                        <p className={`text-lg font-semibold ${applicationDone ? 'text-green-700' : 'text-gray-900'}`}>
                          Fill Application
                        </p>
                        {applicationDone && reviewStatus === 'pending' && (
                          <p className="mt-1 text-sm font-medium text-amber-700">
                            Applied successfully. Waiting for admin approval.
                          </p>
                        )}
                        {applicationDone && reviewStatus === 'approved' && (
                          <p className="mt-1 text-sm font-medium text-green-700">
                            Application approved.
                          </p>
                        )}
                        {applicationDone && reviewStatus === 'rejected' && (
                          <p className="mt-1 text-sm font-medium text-red-700">
                            Application needs updates before approval.
                          </p>
                        )}
                        <button
                          type="button"
                          className="mt-2 text-sm font-semibold text-primary-700 hover:underline"
                          onClick={() => setActiveTab('apply')}
                        >
                          {applicationDone ? 'Review application' : 'Continue'}
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
                    <div className="flex items-start gap-4">
                      {agreementDone ? (
                        <FiCheckCircle className="mt-1 h-6 w-6 text-green-500" />
                      ) : (
                        <FiCircle className="mt-1 h-6 w-6 text-gray-300" />
                      )}
                      <div>
                        <p className={`text-lg font-semibold ${agreementDone ? 'text-green-700' : 'text-gray-900'}`}>
                          Sign Agreement
                        </p>
                        <button
                          type="button"
                          className="mt-2 text-sm font-semibold text-primary-700 hover:underline"
                          onClick={() => {
                            if (!applicationDone) {
                              toast.error('Complete application first');
                              setActiveTab('apply');
                              return;
                            }
                            setActiveTab('agreement');
                          }}
                        >
                          {agreementDone ? 'Review agreement' : 'Continue'}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'apply' && (
                <form className="space-y-6" onSubmit={submitApplication}>
                  <h2 className="text-3xl font-bold text-gray-900 sm:text-4xl">Organization Application</h2>

                  {applicationDone && reviewStatus === 'pending' && (
                    <div className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-amber-800">
                      Applied successfully. Waiting for admin approval.
                    </div>
                  )}
                  {applicationDone && reviewStatus === 'approved' && (
                    <div className="rounded-lg border border-green-300 bg-green-50 p-4 text-green-800">
                      Application approved by admin.
                    </div>
                  )}
                  {applicationDone && reviewStatus === 'rejected' && (
                    <div className="rounded-lg border border-red-300 bg-red-50 p-4 text-red-800">
                      Application was rejected. Please review and resubmit.
                      {reviewNotes && <p className="mt-2">Reason: {reviewNotes}</p>}
                    </div>
                  )}

                  <label className="block space-y-2">
                    <span className="text-base font-semibold text-gray-900">
                      What is your organization's name?
                    </span>
                    <p className="text-sm font-medium text-primary-700">Required</p>
                    <input
                      className={inputClass}
                      value={application.organizationName}
                      onChange={(e) => handleApplicationChange('organizationName', e.target.value)}
                      required
                    />
                  </label>

                  <label className="block space-y-2">
                    <span className="text-base font-semibold text-gray-900">
                      How many teachers from your organization do you anticipate will begin teaching on
                      KidRove within the next month?
                    </span>
                    <p className="text-sm text-gray-600">
                      If you are the only teacher in your organization, please apply as an
                      independent teacher instead.
                    </p>
                    <p className="text-sm font-medium text-primary-700">Required</p>
                    <input
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      className={inputClass}
                      value={anticipatedTeachersInput}
                      onChange={(e) => {
                        const nextValue = e.target.value.replace(/\D/g, '');
                        setAnticipatedTeachersInput(nextValue);
                        handleApplicationChange(
                          'anticipatedTeachersNextMonth',
                          nextValue === '' ? 0 : Number(nextValue),
                        );
                      }}
                      required
                    />
                  </label>

                  <div className="grid gap-6 md:grid-cols-2">
                    <label className="block space-y-2">
                      <span className="text-base font-semibold text-gray-900">
                        Which of the following countries are you and your teachers located in?
                      </span>
                      <p className="text-sm text-gray-600">
                        At this time, you must be in one of the following countries to teach on
                        KidRove: 50 United States, Mexico, Canada, Australia, New Zealand,
                        South Korea, Spain, or the United Kingdom.
                      </p>
                      <input
                        className={inputClass}
                        value={application.countryOfOperation}
                        onChange={(e) => handleApplicationChange('countryOfOperation', e.target.value)}
                      />
                    </label>
                    <label className="block space-y-2">
                      <span className="text-base font-semibold text-gray-900">
                        What is your organization's website? (Please provide a link.)
                      </span>
                      <input
                        type="url"
                        className={inputClass}
                        placeholder="https://www.example.com"
                        value={application.organizationWebsite}
                        onChange={(e) => handleApplicationChange('organizationWebsite', e.target.value)}
                        onBlur={(e) =>
                          handleApplicationChange('organizationWebsite', normalizeWebsite(e.target.value))
                        }
                      />
                    </label>
                  </div>

                  <div className="grid gap-6 md:grid-cols-2">
                    <label className="block space-y-2">
                      <span className="text-base font-semibold text-gray-900">
                        Who is the primary contact for your organization?
                      </span>
                      <input
                        className={inputClass}
                        value={application.primaryContactName}
                        onChange={(e) => handleApplicationChange('primaryContactName', e.target.value)}
                      />
                    </label>
                    <label className="block space-y-2">
                      <span className="text-base font-semibold text-gray-900">
                        What is the primary contact's title?
                      </span>
                      <input
                        className={inputClass}
                        value={application.primaryContactTitle}
                        onChange={(e) => handleApplicationChange('primaryContactTitle', e.target.value)}
                      />
                    </label>
                  </div>

               

                  <div className="grid gap-6 md:grid-cols-2">
                    <label className="block space-y-2">
                      <span className="text-base font-semibold text-gray-900">
                        What's your organization's phone number?
                      </span>
                      <input
                        className={inputClass}
                        value={application.organizationPhone}
                        onChange={(e) => handleApplicationChange('organizationPhone', e.target.value)}
                      />
                    </label>
                    <label className="block space-y-2">
                      <span className="text-base font-semibold text-gray-900">
                        When was your organization founded?
                      </span>
                      <input
                        className={inputClass}
                        value={application.foundedYear}
                        onChange={(e) => handleApplicationChange('foundedYear', e.target.value)}
                      />
                    </label>
                  </div>

                  <label className="block space-y-2">
                    <span className="text-base font-semibold text-gray-900">
                      Tell us a little bit more about the teachers leading your classes.
                    </span>
                    <p className="text-sm text-gray-600">
                      Please include any information around requirements for your teachers and any
                      training you do, as well as how long your educators have been working with
                      children.
                    </p>
                    <textarea
                      rows={4}
                      className={inputClass}
                      value={application.teacherBackground}
                      onChange={(e) => handleApplicationChange('teacherBackground', e.target.value)}
                    />
                  </label>

                  <label className="block space-y-2">
                    <span className="text-base font-semibold text-gray-900">
                      Tell us about the learners you serve.
                    </span>
                    <p className="text-sm text-gray-600">
                      What ages do you work with? Are you targeting special interest groups? What
                      is the group size for most of your classes?
                    </p>
                    <textarea
                      rows={4}
                      className={inputClass}
                      value={application.learnerAudience}
                      onChange={(e) => handleApplicationChange('learnerAudience', e.target.value)}
                    />
                  </label>

                  <label className="block space-y-2">
                    <span className="text-base font-semibold text-gray-900">
                      Tell us about the types of classes you offer.
                    </span>
                    <p className="text-sm text-gray-600">
                      Please be specific regarding the topics you cover, the length of programming,
                      and where/how you offer classes.
                    </p>
                    <textarea
                      rows={4}
                      className={inputClass}
                      value={application.classTypes}
                      onChange={(e) => handleApplicationChange('classTypes', e.target.value)}
                    />
                  </label>

                  <label className="block space-y-2">
                    <span className="text-base font-semibold text-gray-900">
                      Describe the first class you want to post on KidRove.
                    </span>
                    <p className="text-sm text-gray-600">
                      You should write this description as though it is for prospective families.
                      Include information about what you will teach, how you will teach it, and
                      what learners should expect from class time. This field is only for our team
                      and will not be published on the site (if you'd like to access it later, save
                      a copy now or reach out to contact@kidrove.com).
                    </p>
                    <textarea
                      rows={5}
                      className={inputClass}
                      value={application.firstClassDescription}
                      onChange={(e) => handleApplicationChange('firstClassDescription', e.target.value)}
                    />
                  </label>

                  <label className="block space-y-2">
                    <span className="text-base font-semibold text-gray-900">
                      How did you hear about KidRove?
                    </span>
                    <input
                      className={inputClass}
                      value={application.referralSource}
                      onChange={(e) => handleApplicationChange('referralSource', e.target.value)}
                    />
                  </label>

                  <label className="block space-y-2">
                    <span className="text-base font-semibold text-gray-900">
                      Can you point us to any public reviews or testimonials about your programs?
                      (Please provide links.)
                    </span>
                    <textarea
                      rows={3}
                      className={inputClass}
                      value={application.publicReviewsLinks || ''}
                      onChange={(e) => handleApplicationChange('publicReviewsLinks', e.target.value)}
                    />
                  </label>

                  <label className="block space-y-2">
                    <span className="text-base font-semibold text-gray-900">
                      Is there anything else you would like to share with us?
                    </span>
                    <textarea
                      rows={3}
                      className={inputClass}
                      value={application.additionalNotes || ''}
                      onChange={(e) => handleApplicationChange('additionalNotes', e.target.value)}
                    />
                  </label>

                  <label className="flex items-start gap-3 border-t border-gray-200 pt-5">
                    <input
                      type="checkbox"
                      className="mt-1 h-5 w-5"
                      checked={applyTermsAccepted}
                      onChange={(e) => setApplyTermsAccepted(e.target.checked)}
                    />
                    <span className="text-[10px] text-base text-gray-900">
                      I agree to the Terms of Service, Class Content Policy, and Community Standards
                    </span>
                  </label>

                  <button
                    type="submit"
                    disabled={isSavingApplication || isLoading}
                    className="w-full bg-gray-200 py-4 text-[20px] text-xl font-semibold text-gray-700 transition hover:bg-gray-300 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isSavingApplication ? 'Submitting...' : 'Submit application'}
                  </button>
                </form>
              )}

              {activeTab === 'agreement' && (
                <form className="space-y-6" onSubmit={submitAgreement}>
                  <h2 className="text-3xl font-bold text-gray-900 sm:text-4xl">Organization Agreement</h2>
                  <p className="max-w-4xl text-lg leading-relaxed text-gray-800">
                    The agreement below outlines the terms of your relationship with KidRove. If
                    you have any questions, we're here to help! Shoot us an email at{' '}
                    <a
                      href="mailto:contact@kidrove.com"
                      className="text-primary-700 underline underline-offset-2"
                    >
                      contact@kidrove.com
                    </a>
                    .
                  </p>

                  <div className="grid gap-6 md:grid-cols-2">
                    <label className="block space-y-2">
                      <span className="text-base font-semibold text-gray-900">Organization Legal Name</span>
                      <input
                        className={inputClass}
                        value={agreement.legalName}
                        onChange={(e) => handleAgreementChange('legalName', e.target.value)}
                        required
                      />
                    </label>
                    <label className="block space-y-2">
                      <span className="text-base font-semibold text-gray-900">Legal Entity Type</span>
                      <input
                        className={inputClass}
                        value={agreement.legalEntityType}
                        onChange={(e) => handleAgreementChange('legalEntityType', e.target.value)}
                        required
                      />
                      <p className="text-sm italic text-gray-700">
                        If your organization does not yet have a legal entity, please apply as an
                        independent teacher instead.
                      </p>
                    </label>
                  </div>

                  <div className="grid gap-6 md:grid-cols-2">
                    <label className="block space-y-2">
                      <span className="text-base font-semibold text-gray-900">
                        State or Location of Incorporation
                      </span>
                      <input
                        className={inputClass}
                        value={agreement.incorporationLocation}
                        onChange={(e) => handleAgreementChange('incorporationLocation', e.target.value)}
                        required
                      />
                    </label>
                  </div>

                  <label className="block space-y-2 rounded-lg border border-gray-200 bg-white p-4">
                    <span className="text-base font-semibold text-gray-900">Background Checks</span>
                    <div className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        className="mt-1 h-5 w-5"
                        checked={agreement.backgroundChecksRequired}
                        onChange={(e) =>
                          handleAgreementChange('backgroundChecksRequired', e.target.checked)
                        }
                        required
                      />
                      <span className="text-xl text-gray-900">
                        We understand that KidRove will complete background checks on our teachers
                      </span>
                    </div>
                    <p className="text-sm font-semibold text-red-500">Required</p>
                  </label>

                  <div className="rounded-xl border border-gray-200 bg-gray-50 p-6 text-sm leading-7 text-gray-700">
                    THIS ORGANIZATION AGREEMENT is entered into by and between KidRove and{' '}
                    {agreementSummary.legalName || '[ORGANIZATION LEGAL NAME]'}, a{' '}
                    {agreementSummary.incorporationLocation || '[STATE]'}{' '}
                    {agreementSummary.legalEntityType || '[LEGAL ENTITY TYPE]'}. By signing below, you
                    agree to the platform terms and organization policies.
                  </div>

                  <div className="grid gap-6 md:grid-cols-2">
                    <label className="block space-y-2">
                      <span className="text-base font-semibold text-gray-900">Authorized Signature</span>
                      <input
                        className={inputClass}
                        value={agreement.authorizedSignerName}
                        onChange={(e) => handleAgreementChange('authorizedSignerName', e.target.value)}
                        required
                      />
                    </label>
                    <label className="block space-y-2">
                      <span className="text-base font-semibold text-gray-900">
                        Authorized Signer Title
                      </span>
                      <input
                        className={inputClass}
                        value={agreement.authorizedSignerTitle}
                        onChange={(e) => handleAgreementChange('authorizedSignerTitle', e.target.value)}
                        required
                      />
                    </label>
                  </div>

                  <label className="flex items-start gap-3 border-t border-gray-200 pt-5">
                    <input
                      type="checkbox"
                      className="mt-1 h-5 w-5"
                      checked={agreement.acceptedTerms}
                      onChange={(e) => handleAgreementChange('acceptedTerms', e.target.checked)}
                      required
                    />
                    <span className="text-base text-gray-900">
                      I have authority to bind this organization and accept this agreement.
                    </span>
                  </label>

                  <button
                    type="submit"
                    disabled={isSigningAgreement || !applicationDone}
                    className="w-full bg-gray-200 py-4 text-xl font-semibold text-gray-700 transition hover:bg-gray-300 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isSigningAgreement ? 'Submitting...' : 'Submit agreement'}
                  </button>

                  {!applicationDone && (
                    <p className="text-sm font-medium text-amber-700">
                      Complete application first, then sign agreement.
                    </p>
                  )}
                </form>
              )}
            </div>
          </div>
        </section>
      </div>
    </>
  );
};

export default OrganizationsPage;
