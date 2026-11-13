import { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import {
  FiCheck,
  FiSearch
} from 'react-icons/fi';
import toast from 'react-hot-toast';
import SEO from '@/components/common/SEO';
import reelCompetitionAPI from '@/services/api/reelCompetitionAPI';

export default function GCCReelSubmitPage() {
  const [searchParams] = useSearchParams();
  const initialRef = (searchParams.get('ref') || '').trim();

  // Search state
  const [refInput, setRefInput] = useState(initialRef);
  const [parentEmailInput, setParentEmailInput] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [registration, setRegistration] = useState<any>(null);

  // Form state
  const [reelTitle, setReelTitle] = useState('');
  const [reelDescription, setReelDescription] = useState('');
  const [momentTheme, setMomentTheme] = useState('');
  const [videoDriveLink, setVideoDriveLink] = useState('');

  // Submission state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmittedSuccess, setIsSubmittedSuccess] = useState(false);

  const fetchRegistration = async (refToUse: string, emailToUse?: string) => {
    if (!refToUse) {
      toast.error('Please enter your Reference Number (e.g. REEL2027-XXXXXXXX)');
      return;
    }
    setIsSearching(true);
    try {
      const res = await reelCompetitionAPI.lookupByRef(refToUse, emailToUse);
      if (res.success && res.data) {
        setRegistration(res.data);
        if (res.data.reel?.title) setReelTitle(res.data.reel.title);
        if (res.data.reel?.description) setReelDescription(res.data.reel.description);
        if (res.data.reel?.momentTheme) setMomentTheme(res.data.reel.momentTheme);
        if (res.data.reel?.videoDriveLink) setVideoDriveLink(res.data.reel.videoDriveLink);

        const alreadySubmitted = Boolean(
          res.data.hasReel ||
          res.data.reel?.videoUrl ||
          ['under_review', 'approved', 'winner'].includes(res.data.status)
        );

        if (alreadySubmitted) {
          toast.success(`Registration verified! Video reel has already been submitted for ${res.data.participant.studentFullName}.`, {
            icon: '✅',
          });
        } else {
          toast.success(`Registration verified for ${res.data.participant.studentFullName}!`);
        }
      }
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'Could not find registration. Check reference number.';
      toast.error(msg);
      setRegistration(null);
    } finally {
      setIsSearching(false);
    }
  };

  useEffect(() => {
    if (initialRef) {
      fetchRegistration(initialRef);
    }
  }, [initialRef]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!registration) {
      toast.error('Please look up your registration first with your Reference Number.');
      return;
    }

    if (!reelTitle.trim()) {
      toast.error('Please enter a title for your mobile reel.');
      return;
    }

    if (!videoDriveLink.trim()) {
      toast.error('Please provide a Google Drive or cloud link to your video reel.');
      return;
    }

    setIsSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('refNo', registration.submissionRef);
      formData.append('submissionId', registration.submissionId);
      formData.append('reelTitle', reelTitle.trim());
      formData.append('reelDescription', reelDescription.trim());
      formData.append('momentTheme', momentTheme.trim());
      formData.append('videoDriveLink', videoDriveLink.trim());

      const res = await reelCompetitionAPI.submitReel(formData);
      if (res.success && res.data) {
        setIsSubmittedSuccess(true);
        toast.success('Mobile reel link submitted successfully!');
      } else {
        toast.error(res.message || 'Video reel submission failed. Please try again.');
      }
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'Failed to submit reel. Please try again.';
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const isAlreadySubmitted = Boolean(
    registration?.hasReel ||
    registration?.reel?.videoUrl ||
    ['under_review', 'approved', 'winner'].includes(registration?.status)
  );

  return (
    <div className="min-h-screen bg-[#faf7fd] text-slate-800 font-sans">
      <SEO
        title="Submit Video Reel | GCC Through My Lens 2027"
        description="Phase 2 Submission Portal: Upload your vertical mobile video reel for Ramadan & Eid Through My Mobile Camera."
      />

      {/* Hero Banner with Violet Blend */}
      <section className="bg-gradient-to-r from-[#4c1d95] via-[#6d28d9] to-[#7c3aed] text-white py-14 px-4 sm:px-6 lg:px-8 border-b border-purple-300/20">
        <div className="max-w-4xl mx-auto text-center">
          <span className="inline-block px-3.5 py-1.5 rounded-full bg-white/15 border border-white/25 text-[11px] font-black uppercase tracking-wider text-purple-200 mb-4">
            Phase 2: Video Reel Submission Portal
          </span>
          <h1 className="text-3xl sm:text-5xl font-black tracking-tight">
            Submit Your Mobile Video Reel
          </h1>
          <p className="mt-3 text-sm sm:text-base text-purple-100 max-w-xl mx-auto">
            Ramadan &amp; Eid Through My Mobile Camera · Theme: “The Moments That Make Eid Special”. Enter your reference code to submit your vertical reel.
          </p>
        </div>
      </section>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Step 1: Look up Reference Number */}
        <div className="bg-white rounded-3xl border border-violet-200 p-6 sm:p-8 shadow-sm mb-8">
          <h2 className="text-lg font-black text-slate-900 mb-1 flex items-center gap-2">
            <FiSearch className="text-violet-700" />
            <span>Look Up Your Reel Registration</span>
          </h2>
          <p className="text-xs text-slate-600 mb-5">
            Enter the Reference Number (`REEL2027-XXXXXXXX`) sent to your email upon registration.
          </p>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              fetchRegistration(refInput, parentEmailInput);
            }}
            className="grid sm:grid-cols-12 gap-3"
          >
            <div className="sm:col-span-6">
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Official Reference Number *
              </label>
              <input
                type="text"
                value={refInput}
                onChange={(e) => setRefInput(e.target.value.toUpperCase())}
                placeholder="e.g. REEL2027-A8B9C0D1"
                className="w-full bg-[#FAF8FE] border border-slate-300 rounded-xl px-4 py-3 text-sm font-mono uppercase focus:border-violet-700 outline-none"
                required
              />
            </div>
            <div className="sm:col-span-4">
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Parent Email (Optional)
              </label>
              <input
                type="email"
                value={parentEmailInput}
                onChange={(e) => setParentEmailInput(e.target.value)}
                placeholder="parent@example.com"
                className="w-full bg-[#FAF8FE] border border-slate-300 rounded-xl px-4 py-3 text-sm focus:border-violet-700 outline-none"
              />
            </div>
            <div className="sm:col-span-2 flex items-end">
              <button
                type="submit"
                disabled={isSearching}
                className="w-full py-3 px-4 rounded-xl bg-violet-700 hover:bg-violet-800 text-white font-bold text-sm transition-all flex items-center justify-center gap-1.5 shadow-sm"
              >
                {isSearching ? 'Finding...' : 'Verify'}
              </button>
            </div>
          </form>
        </div>

        {/* Step 2: Participant Verified Summary Card */}
        {registration && (
          <div className="bg-gradient-to-br from-violet-50 via-white to-purple-50/50 border-2 border-violet-300 rounded-3xl p-6 sm:p-8 shadow-sm mb-8">
            <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-violet-200">
              <div>
                <span className="text-[10px] font-black uppercase text-violet-800 tracking-wider">
                  Verified Registration
                </span>
                <h3 className="text-xl font-black text-slate-900 mt-0.5">
                  {registration.participant?.studentFullName}
                </h3>
                <p className="text-xs text-slate-600">
                  {registration.participant?.grade} · {registration.participant?.category} · {registration.participant?.country}
                </p>
              </div>
              <div className="text-right">
                <span className="text-[10px] uppercase font-bold text-slate-500 block">Reference No.</span>
                <span className="text-lg font-black font-mono text-violet-900">
                  {registration.submissionRef}
                </span>
              </div>
            </div>

            {isAlreadySubmitted && !isSubmittedSuccess && (
              <div className="mt-4 p-4 rounded-2xl bg-violet-100/70 border border-violet-300 text-violet-950 text-xs sm:text-sm flex items-center gap-3">
                <span className="text-2xl">✅</span>
                <div>
                  <strong>Video Reel Already Received &amp; Under Review!</strong>
                  <p className="text-xs text-violet-900 mt-0.5">
                    Your video reel for this entry has already been uploaded and registered. No further action is required.
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Step 3: Video Reel Submission Form */}
        {registration && !isAlreadySubmitted && !isSubmittedSuccess && (
          <form onSubmit={handleSubmit} className="bg-white rounded-3xl border border-violet-200 p-6 sm:p-10 shadow-sm space-y-6">
            <div>
              <span className="text-violet-700 text-[10px] font-extrabold uppercase tracking-widest block mb-1">
                Reel Upload
              </span>
              <h3 className="text-2xl font-black text-slate-900">
                Your Video Reel Submission
              </h3>
              <p className="text-xs text-slate-600 mt-1">
                Make sure your video is vertical (9:16), student-captured, and follows your category duration limit.
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Reel Title <span className="text-violet-600">*</span>
              </label>
              <input
                type="text"
                value={reelTitle}
                onChange={(e) => setReelTitle(e.target.value)}
                placeholder="e.g. Lighting Up Our Eid, Making Maamoul with Grandma"
                className="w-full bg-[#FAF8FE] border border-slate-300 rounded-xl px-4 py-3 text-sm text-slate-900 focus:border-violet-700 outline-none"
                required
              />
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Moment Theme
                </label>
                <select
                  value={momentTheme}
                  onChange={(e) => setMomentTheme(e.target.value)}
                  className="w-full bg-[#FAF8FE] border border-slate-300 rounded-xl px-4 py-3 text-sm text-slate-900 focus:border-violet-700 outline-none"
                >
                  <option value="">Select a moment...</option>
                  <option value="Ramadan Lantern & Glow">Ramadan Lantern & Glow</option>
                  <option value="Decorating Home for Eid">Decorating Home for Eid</option>
                  <option value="Preparing an Eid Gift">Preparing an Eid Gift</option>
                  <option value="Shopping for Eid with Family">Shopping for Eid with Family</option>
                  <option value="Eid Outfit Preparation">Eid Outfit Preparation</option>
                  <option value="Family Sweets & Cooking">Family Sweets & Cooking</option>
                  <option value="Excitement of Eid Morning">Excitement of Eid Morning</option>
                  <option value="Other Joyful Moment">Other Joyful Moment</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Brief Description (Optional)
                </label>
                <input
                  type="text"
                  value={reelDescription}
                  onChange={(e) => setReelDescription(e.target.value)}
                  placeholder="What makes this moment special to you?"
                  className="w-full bg-[#FAF8FE] border border-slate-300 rounded-xl px-4 py-3 text-sm text-slate-900 focus:border-violet-700 outline-none"
                />
              </div>
            </div>

            {/* Video Link */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Google Drive / Cloud Video Link <span className="text-violet-600">*</span>
              </label>
              <input
                type="url"
                required
                value={videoDriveLink}
                onChange={(e) => setVideoDriveLink(e.target.value)}
                placeholder="https://drive.google.com/file/d/.../view?usp=sharing"
                className="w-full bg-[#FAF8FE] border border-slate-300 rounded-xl px-4 py-3 text-sm text-slate-900 focus:border-violet-700 outline-none"
              />
              <p className="text-[11px] text-slate-500 mt-1">
                Please make sure the link access is set to <strong>“Anyone with the link can view”</strong> so judges can review your reel.
              </p>
            </div>

            <div className="pt-4 border-t border-violet-100 flex justify-end">
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-9 py-4 rounded-full bg-violet-700 hover:bg-violet-800 text-white font-bold text-sm shadow-md transition-all flex items-center gap-2"
              >
                {isSubmitting ? (
                  <span>Submitting Video Reel...</span>
                ) : (
                  <>
                    <span>Submit Video Reel Link</span>
                    <FiCheck size={18} />
                  </>
                )}
              </button>
            </div>
          </form>
        )}

        {/* Step 4: Submission Success Receipt */}
        {isSubmittedSuccess && (
          <div className="bg-white rounded-3xl border-2 border-violet-400 p-8 sm:p-12 text-center shadow-lg">
            <div className="w-20 h-20 rounded-full bg-violet-100 text-violet-800 flex items-center justify-center mx-auto text-4xl mb-4">
              ✓
            </div>
            <span className="text-[11px] font-black uppercase tracking-wider text-violet-900 bg-violet-50 px-3.5 py-1.5 rounded-full border border-violet-200">
              Submission Received
            </span>
            <h2 className="text-3xl font-black text-slate-900 mt-3 mb-2">
              Video Reel Submitted Successfully!
            </h2>
            <p className="text-slate-600 text-sm max-w-md mx-auto mb-6">
              Thank you! The mobile reel for <strong>{registration?.participant?.studentFullName}</strong> has been received and is now under review. An official submission receipt has been emailed to <strong>{registration?.participant?.parentEmail}</strong>.
            </p>

            <div className="inline-block bg-[#FAF8FE] border border-violet-300 rounded-2xl px-6 py-4 mb-8">
              <span className="text-xs uppercase font-bold text-slate-500 block">Reference Number</span>
              <span className="text-2xl font-black font-mono text-violet-900">
                {registration?.submissionRef}
              </span>
            </div>

            <div>
              <Link
                to="/competitions/gcc-reel-challenge"
                className="px-8 py-3.5 rounded-full bg-violet-700 hover:bg-violet-800 text-white font-bold text-sm shadow-md transition-all inline-block"
              >
                Return to Challenge Hub
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

