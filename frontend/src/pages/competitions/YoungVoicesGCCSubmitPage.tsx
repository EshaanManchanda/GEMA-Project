import { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import {
  FiUpload,
  FiCheck,
  FiSearch
} from 'react-icons/fi';
import toast from 'react-hot-toast';
import SEO from '@/components/common/SEO';
import gccCompetitionAPI from '@/services/api/gccCompetitionAPI';

export default function YoungVoicesGCCSubmitPage() {
  const [searchParams] = useSearchParams();
  const initialRef = (searchParams.get('ref') || '').trim();

  // Search state
  const [refInput, setRefInput] = useState(initialRef);
  const [parentEmailInput, setParentEmailInput] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [registration, setRegistration] = useState<any>(null);

  // Form state
  const [storyTitle, setStoryTitle] = useState('');
  const [storyDescription, setStoryDescription] = useState('');
  const [storyContent, setStoryContent] = useState('');
  const [themePillar] = useState('Our Heritage, Our Story');
  const [storyFile, setStoryFile] = useState<File | null>(null);

  // Submission state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmittedSuccess, setIsSubmittedSuccess] = useState(false);

  const fetchRegistration = async (refToUse: string, emailToUse?: string) => {
    if (!refToUse) {
      toast.error('Please enter your Reference Number (e.g. GCC2027-XXXXXXXX)');
      return;
    }
    setIsSearching(true);
    try {
      const res = await gccCompetitionAPI.lookupByRef(refToUse, emailToUse);
      if (res.success && res.data) {
        setRegistration(res.data);
        if (res.data.story?.title) setStoryTitle(res.data.story.title);
        if (res.data.story?.description) setStoryDescription(res.data.story.description);
        if (res.data.story?.storyContent) setStoryContent(res.data.story.storyContent);

        const alreadySubmitted = Boolean(
          res.data.hasStory ||
          res.data.storyUpload?.storyUrl ||
          ['under_review', 'approved', 'winner'].includes(res.data.status)
        );

        if (alreadySubmitted) {
          toast.success(`Registration verified! Story manuscript has already been submitted for ${res.data.participant.studentFullName}.`, {
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

  const handleFileChange = (file: File | null) => {
    if (!file) {
      setStoryFile(null);
      return;
    }

    const MAX_SIZE = 5 * 1024 * 1024; // 5 MB
    if (file.size > MAX_SIZE) {
      toast.error('File exceeds 5 MB limit. Please upload a smaller document.');
      return;
    }

    setStoryFile(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!registration) {
      toast.error('Please look up your registration first with your Reference Number.');
      return;
    }

    if (!storyTitle.trim()) {
      toast.error('Please enter your story title.');
      return;
    }

    if (!storyContent.trim() && !storyFile) {
      toast.error('Please paste your short story text or upload a story manuscript file (PDF/Word).');
      return;
    }

    setIsSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('refNo', registration.submissionRef);
      formData.append('submissionId', registration.submissionId);
      formData.append('storyTitle', storyTitle.trim());
      formData.append('storyDescription', storyDescription.trim());
      formData.append('storyContent', storyContent.trim());
      formData.append('themePillar', themePillar.trim());
      if (storyContent.trim()) {
        const words = storyContent.trim().split(/\s+/).filter(Boolean).length;
        formData.append('wordCount', String(words));
      }
      if (storyFile) {
        formData.append('storyFile', storyFile);
      }

      const res = await gccCompetitionAPI.submitStory(formData);
      if (res.success && res.data) {
        setIsSubmittedSuccess(true);
        toast.success('Story manuscript submitted successfully!');
      } else {
        toast.error(res.message || 'Story upload failed. Please try again.');
      }
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'Failed to submit story. Please try again.';
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const isAlreadySubmitted = Boolean(
    registration?.hasStory ||
    registration?.storyUpload?.storyUrl ||
    ['under_review', 'approved', 'winner'].includes(registration?.status)
  );

  return (
    <div className="min-h-screen bg-[#FAFDFD] text-slate-800 font-sans">
      <SEO
        title="Submit Short Story Manuscript | Young Voices of the GCC 2027"
        description="Phase 2 Submission Portal: Upload your original short story manuscript using your official GCC Reference Number."
      />

      {/* Hero Banner */}
      <section className="bg-gradient-to-r from-teal-900 via-teal-800 to-cyan-900 text-white py-14 px-4 sm:px-6 lg:px-8 border-b border-teal-500/20">
        <div className="max-w-4xl mx-auto text-center">
          <span className="inline-block px-3.5 py-1.5 rounded-full bg-teal-500/20 border border-teal-400/40 text-[11px] font-black uppercase tracking-wider text-teal-200 mb-4">
            Phase 2: Story Manuscript Portal
          </span>
          <h1 className="text-3xl sm:text-5xl font-black tracking-tight">
            Submit Your Story Manuscript
          </h1>
          <p className="mt-3 text-sm sm:text-base text-teal-100 max-w-xl mx-auto">
            Young Voices of the GCC · Theme: “Our Heritage, Our Story”. Enter your reference number to upload your story document or paste your manuscript.
          </p>
        </div>
      </section>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Step 1: Look up Reference Number */}
        <div className="bg-white rounded-3xl border border-teal-200 p-6 sm:p-8 shadow-sm mb-8">
          <h2 className="text-lg font-black text-slate-900 mb-1 flex items-center gap-2">
            <FiSearch className="text-teal-600" />
            <span>Look Up Your Registration</span>
          </h2>
          <p className="text-xs text-slate-600 mb-5">
            Enter the Reference Number (`GCC2027-XXXXXXXX`) sent to your email upon registration.
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
                placeholder="e.g. GCC2027-B3C2A109"
                className="w-full bg-[#FAFDFD] border border-slate-300 rounded-xl px-4 py-3 text-sm font-mono uppercase focus:border-teal-600 outline-none"
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
                className="w-full bg-[#FAFDFD] border border-slate-300 rounded-xl px-4 py-3 text-sm focus:border-teal-600 outline-none"
              />
            </div>
            <div className="sm:col-span-2 flex items-end">
              <button
                type="submit"
                disabled={isSearching}
                className="w-full py-3 px-4 rounded-xl bg-teal-700 hover:bg-teal-800 text-white font-bold text-sm transition-all flex items-center justify-center gap-1.5 shadow-sm"
              >
                {isSearching ? 'Finding...' : 'Verify'}
              </button>
            </div>
          </form>
        </div>

        {/* Step 2: Participant Verified Summary Card */}
        {registration && (
          <div className="bg-gradient-to-br from-teal-50 via-white to-cyan-50/50 border-2 border-teal-300 rounded-3xl p-6 sm:p-8 shadow-sm mb-8">
            <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-teal-200">
              <div>
                <span className="text-[10px] font-black uppercase text-teal-800 tracking-wider">
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
                <span className="text-lg font-black font-mono text-teal-800">
                  {registration.submissionRef}
                </span>
              </div>
            </div>

            {isAlreadySubmitted && !isSubmittedSuccess && (
              <div className="mt-4 p-4 rounded-2xl bg-teal-100/70 border border-teal-300 text-teal-950 text-xs sm:text-sm flex items-center gap-3">
                <span className="text-2xl">✅</span>
                <div>
                  <strong>Story Already Received & Under Review!</strong>
                  <p className="text-xs text-teal-900 mt-0.5">
                    Your story manuscript for this registration has already been uploaded and received. No further action is required.
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Step 3: Story Manuscript Submission Form */}
        {registration && !isAlreadySubmitted && !isSubmittedSuccess && (
          <form onSubmit={handleSubmit} className="bg-white rounded-3xl border border-teal-200 p-6 sm:p-10 shadow-sm space-y-6">
            <div>
              <span className="text-teal-700 text-[10px] font-extrabold uppercase tracking-widest block mb-1">
                Manuscript Upload
              </span>
              <h3 className="text-2xl font-black text-slate-900">
                Your Story Details
              </h3>
              <p className="text-xs text-slate-600 mt-1">
                Provide your story title and paste your story content below, or upload a document file (PDF or Word, max 5 MB).
              </p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Story Title <span className="text-teal-600">*</span>
              </label>
              <input
                type="text"
                value={storyTitle}
                onChange={(e) => setStoryTitle(e.target.value)}
                placeholder="e.g. The Sands of Time, The Falcon's Journey"
                className="w-full bg-[#FAFDFD] border border-slate-300 rounded-xl px-4 py-3 text-sm text-slate-900 focus:border-teal-600 outline-none"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Story Manuscript Text (Paste here)
              </label>
              <textarea
                rows={8}
                value={storyContent}
                onChange={(e) => setStoryContent(e.target.value)}
                placeholder="Write or paste your short story here..."
                className="w-full bg-[#FAFDFD] border border-slate-300 rounded-xl p-4 text-sm text-slate-900 focus:border-teal-600 outline-none font-serif leading-relaxed"
              />
              <div className="flex justify-between text-[11px] text-slate-500 mt-1">
                <span>Target: Young Authors (200–400w) · Creative Voices (400–700w) · Emerging Writers (700–1000w)</span>
                <span className="font-bold text-teal-800">
                  {storyContent.trim() ? `${storyContent.trim().split(/\s+/).filter(Boolean).length} words` : '0 words'}
                </span>
              </div>
            </div>

            {/* Document Upload */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Or Upload Story Document File (Optional if pasted above - PDF/DOC/DOCX, &lt;5 MB)
              </label>
              <div className="border-2 border-dashed border-teal-200 hover:border-teal-400 rounded-2xl p-6 text-center bg-[#FAFDFD] transition-colors">
                <input
                  type="file"
                  id="storyFileInput"
                  accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                  onChange={(e) => handleFileChange(e.target.files?.[0] || null)}
                  className="hidden"
                />
                <label htmlFor="storyFileInput" className="cursor-pointer block">
                  <FiUpload className="mx-auto text-3xl text-teal-600 mb-2" />
                  <span className="text-xs font-bold text-teal-800 block">
                    {storyFile ? storyFile.name : 'Click to select PDF or Word document'}
                  </span>
                  <span className="text-[11px] text-slate-500 mt-0.5 block">
                    {storyFile ? `${(storyFile.size / 1024).toFixed(1)} KB` : 'PDF, DOC, DOCX up to 5 MB'}
                  </span>
                </label>
              </div>
            </div>

            <div className="pt-4 border-t border-teal-100 flex justify-end">
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-9 py-4 rounded-full bg-teal-700 hover:bg-teal-800 text-white font-bold text-sm shadow-md transition-all flex items-center gap-2"
              >
                {isSubmitting ? (
                  <span>Uploading Manuscript...</span>
                ) : (
                  <>
                    <span>Submit Story</span>
                    <FiCheck size={18} />
                  </>
                )}
              </button>
            </div>
          </form>
        )}

        {/* Step 4: Submission Success Receipt */}
        {isSubmittedSuccess && (
          <div className="bg-white rounded-3xl border-2 border-teal-400 p-8 sm:p-12 text-center shadow-lg">
            <div className="w-20 h-20 rounded-full bg-teal-100 text-teal-700 flex items-center justify-center mx-auto text-4xl mb-4">
              ✓
            </div>
            <span className="text-[11px] font-black uppercase tracking-wider text-teal-800 bg-teal-50 px-3.5 py-1.5 rounded-full border border-teal-200">
              Submission Received
            </span>
            <h2 className="text-3xl font-black text-slate-900 mt-3 mb-2">
              Story Submitted Successfully!
            </h2>
            <p className="text-slate-600 text-sm max-w-md mx-auto mb-6">
              Thank you! The story manuscript for <strong>{registration?.participant?.studentFullName}</strong> has been received and is now under review. An official submission receipt has been emailed to <strong>{registration?.participant?.parentEmail}</strong>.
            </p>

            <div className="inline-block bg-[#FAFDFD] border border-teal-300 rounded-2xl px-6 py-4 mb-8">
              <span className="text-xs uppercase font-bold text-slate-500 block">Reference Number</span>
              <span className="text-2xl font-black font-mono text-teal-800">
                {registration?.submissionRef}
              </span>
            </div>

            <div>
              <Link
                to="/competitions/young-voices-of-the-gcc"
                className="px-8 py-3.5 rounded-full bg-teal-700 hover:bg-teal-800 text-white font-bold text-sm shadow-md transition-all inline-block"
              >
                Return to Competition Hub
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

