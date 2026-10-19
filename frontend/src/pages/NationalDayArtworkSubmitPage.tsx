import { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  FiUpload,
  FiCheck,
  FiSearch,
  FiTrash2,
  FiCalendar,
  FiInfo
} from 'react-icons/fi';
import toast from 'react-hot-toast';
import SEO from '@/components/common/SEO';
import nationalDayAPI from '@/services/api/nationalDayAPI';

export default function NationalDayArtworkSubmitPage() {
  const [searchParams] = useSearchParams();
  const initialRef = (searchParams.get('ref') || '').trim();

  // Search state
  const [refInput, setRefInput] = useState(initialRef);
  const [parentEmailInput, setParentEmailInput] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [registration, setRegistration] = useState<any>(null);

  // Form state
  const [artworkTitle, setArtworkTitle] = useState('');
  const [artworkDescription, setArtworkDescription] = useState('');
  const [medium, setMedium] = useState('Pencil Drawing / Sketching');
  const [themePillar, setThemePillar] = useState('Heritage & Traditions');
  const [artworkFile, setArtworkFile] = useState<File | null>(null);
  const [artworkPreview, setArtworkPreview] = useState('');

  // Submission state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmittedSuccess, setIsSubmittedSuccess] = useState(false);
  const [submissionReceipt, setSubmissionReceipt] = useState<any>(null);

  const fetchRegistration = async (refToUse: string, emailToUse?: string) => {
    if (!refToUse) {
      toast.error('Please enter your Reference Number (e.g. UAE2026-XXXXXXXX)');
      return;
    }
    setIsSearching(true);
    try {
      const res = await nationalDayAPI.lookupByRef(refToUse, emailToUse);
      if (res.success && res.data) {
        setRegistration(res.data);
        if (res.data.artwork?.title) {
          setArtworkTitle(res.data.artwork.title);
        }
        if (res.data.artwork?.description) {
          setArtworkDescription(res.data.artwork.description);
        }
        if (res.data.artwork?.medium) {
          setMedium(res.data.artwork.medium);
        }
        if (res.data.artwork?.themePillar) {
          setThemePillar(res.data.artwork.themePillar);
        }
        toast.success(`Registration loaded for ${res.data.participant.studentFullName}!`);
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
      setArtworkFile(null);
      setArtworkPreview('');
      return;
    }

    const allowedMimes = ['image/jpeg', 'image/png', 'image/jpg', 'image/webp', 'application/pdf'];
    if (!allowedMimes.includes(file.type) && !file.name.toLowerCase().endsWith('.pdf')) {
      toast.error('Please upload a JPG, PNG, WEBP, or PDF file.');
      return;
    }

    const MAX_SIZE = 1 * 1024 * 1024; // 1 MB
    if (file.size > MAX_SIZE) {
      toast.error('File exceeds 1 MB limit. Please compress or resize your image to under 1 MB.');
      return;
    }

    setArtworkFile(file);
    if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
      setArtworkPreview('PDF_DOCUMENT');
    } else {
      const reader = new FileReader();
      reader.onload = () => setArtworkPreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!registration) {
      toast.error('Please look up your registration first with your Reference Number.');
      return;
    }

    if (!artworkTitle.trim()) {
      toast.error('Please enter an artwork title.');
      return;
    }

    if (!artworkFile) {
      toast.error('Please choose and upload your artwork file (under 1 MB).');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        refNo: registration.submissionRef,
        submissionId: registration.submissionId,
        artworkTitle: artworkTitle.trim(),
        artworkDescription: artworkDescription.trim(),
        medium,
        themePillar,
        artwork: artworkFile,
      };

      const res = await nationalDayAPI.submitArtwork(payload);
      if (res.success && res.data) {
        setSubmissionReceipt(res.data);
        setIsSubmittedSuccess(true);
        toast.success('Artwork submitted successfully!');
      } else {
        toast.error(res.message || 'Artwork upload failed. Please try again.');
      }
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'Failed to upload artwork. Please try again.';
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const isLittleArtist =
    registration?.participant?.category === 'Little Artists' ||
    ['Kindergarten', 'Grade 1', 'Grade 2'].includes(registration?.participant?.grade);

  return (
    <div className="min-h-screen bg-[#FDFBF7] text-slate-800 font-sans selection:bg-emerald-500 selection:text-white py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      <SEO
        title="Submit Artwork — Eid Al Etihad Children's Art Competition 2026"
        description="Upload your colored template or original traditional artwork for the Eid Al Etihad Children's Art Competition 2026 before December 15."
      />

      {/* UAE Ambient Background Glow */}
      <div className="absolute top-10 left-1/2 -translate-x-1/2 w-[700px] h-[400px] bg-gradient-to-r from-emerald-100/40 via-amber-100/30 to-rose-100/20 blur-[120px] pointer-events-none rounded-full" />

      <div className="max-w-3xl mx-auto relative z-10">
        {/* Navigation Breadcrumb */}
        <div className="mb-6 flex items-center justify-between text-xs font-semibold text-slate-500">
          <Link
            to="/national-day-art-competition"
            className="hover:text-amber-800 flex items-center gap-1.5 transition-colors"
          >
            ← Back to Competition Home
          </Link>
          <span className="bg-amber-100/80 text-amber-900 px-3 py-1 rounded-full border border-amber-200">
            Phase 2: Artwork Upload
          </span>
        </div>

        {/* Header */}
        <div className="text-center mb-10">
          <span className="inline-block text-[11px] font-black uppercase tracking-widest text-emerald-800 bg-emerald-50 border border-emerald-200 px-3.5 py-1.5 rounded-full mb-3">
            Eid Al Etihad Children's Art Competition 2026
          </span>
          <h1 className="text-3xl sm:text-5xl font-black text-slate-900 tracking-tight">
            Submit Your Artwork
          </h1>
          <p className="text-slate-600 text-xs sm:text-sm mt-2 max-w-lg mx-auto leading-relaxed">
            Upload your completed physical artwork or colored template using the Reference Number generated during registration.
          </p>
          <div className="inline-flex items-center gap-2 mt-3 px-3.5 py-1 rounded-full bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold">
            <FiCalendar /> Final Deadline: 15 December 2026
          </div>
        </div>

        {/* Success View */}
        {isSubmittedSuccess && submissionReceipt ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white border-2 border-emerald-200 rounded-3xl p-8 sm:p-12 text-center shadow-xl mb-12"
          >
            <div className="w-20 h-20 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center mx-auto mb-6">
              <FiCheck size={40} className="stroke-[3]" />
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 mb-2">
              Submission Receipt Received!
            </h2>
            <p className="text-slate-600 text-sm mb-6 max-w-md mx-auto">
              Your artwork for <strong className="text-slate-900">{submissionReceipt.studentName}</strong> has been successfully received and placed under judging review.
            </p>

            <div className="bg-[#FAF8F5] border border-slate-200 rounded-2xl p-6 text-left max-w-md mx-auto mb-6 space-y-3 text-xs sm:text-sm">
              <div className="flex justify-between border-b pb-2">
                <span className="text-slate-500">Ref No:</span>
                <span className="font-mono font-bold text-amber-800">{submissionReceipt.submissionRef}</span>
              </div>
              <div className="flex justify-between border-b pb-2">
                <span className="text-slate-500">Artwork Title:</span>
                <span className="font-bold text-slate-900">{submissionReceipt.artworkTitle}</span>
              </div>
              <div className="flex justify-between border-b pb-2">
                <span className="text-slate-500">Status:</span>
                <span className="font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                  Under Review
                </span>
              </div>
              <div className="flex justify-between pt-1">
                <span className="text-slate-500">Results Announcement:</span>
                <span className="font-bold text-slate-900">30 December 2026</span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 justify-center max-w-md mx-auto">
              <Link
                to="/national-day-art-competition"
                className="flex-1 py-3 px-6 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs sm:text-sm transition-all"
              >
                Return to Competition Home
              </Link>
            </div>
          </motion.div>
        ) : (
          <div className="space-y-8">
            {/* Step 1 Card: Reference Number Verification */}
            <div className="bg-white border border-slate-200/90 rounded-3xl p-6 sm:p-8 shadow-xs">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-9 h-9 rounded-full bg-amber-100 text-amber-800 font-black text-sm flex items-center justify-center">
                  1
                </div>
                <div>
                  <h2 className="text-lg font-black text-slate-900">
                    Find Your Registration Record
                  </h2>
                  <p className="text-xs text-slate-500">
                    Enter your Reference Number received after paying the AED 50 registration fee.
                  </p>
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Reference Number <span className="text-amber-600">*</span>
                  </label>
                  <input
                    type="text"
                    value={refInput}
                    onChange={(e) => setRefInput(e.target.value)}
                    placeholder="e.g. UAE2026-6712ABCD"
                    className="w-full bg-[#FAF8F5] border border-slate-300 rounded-xl px-4 py-3 text-sm font-mono uppercase font-bold text-slate-900 focus:bg-white focus:border-amber-500 outline-none transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Parent Email <span className="text-slate-400 font-normal">(optional verification)</span>
                  </label>
                  <input
                    type="email"
                    value={parentEmailInput}
                    onChange={(e) => setParentEmailInput(e.target.value)}
                    placeholder="parent@example.com"
                    className="w-full bg-[#FAF8F5] border border-slate-300 rounded-xl px-4 py-3 text-sm text-slate-900 focus:bg-white focus:border-amber-500 outline-none transition-all"
                  />
                </div>
              </div>

              <div className="mt-4 flex items-center justify-between flex-wrap gap-3">
                <p className="text-[11px] text-slate-500">
                  Don't have a Reference Number yet?{' '}
                  <Link to="/national-day-art-competition#register" className="text-amber-700 font-bold hover:underline">
                    Register and pay entry fee first →
                  </Link>
                </p>
                <button
                  type="button"
                  onClick={() => fetchRegistration(refInput, parentEmailInput)}
                  disabled={isSearching || !refInput.trim()}
                  className="px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs sm:text-sm flex items-center gap-2 transition-all disabled:opacity-50"
                >
                  {isSearching ? <span className="animate-spin">🌀</span> : <FiSearch />}
                  <span>{registration ? 'Refresh Details' : 'Verify Reference'}</span>
                </button>
              </div>

              {/* Verified Registration Banner */}
              {registration && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-6 p-4 rounded-2xl bg-emerald-50 border border-emerald-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-emerald-200 text-emerald-800 flex items-center justify-center text-lg shrink-0">
                      👤
                    </div>
                    <div>
                      <p className="font-extrabold text-emerald-950 text-sm">
                        {registration.participant.studentFullName} ({registration.participant.grade})
                      </p>
                      <p className="text-emerald-800">
                        {registration.participant.category} · {registration.participant.schoolName} ({registration.participant.schoolEmirate})
                      </p>
                    </div>
                  </div>
                  <div className="bg-white/80 border border-emerald-300 px-3 py-1.5 rounded-xl font-mono text-emerald-900 font-black text-xs shrink-0">
                    ✓ Verified & Paid
                  </div>
                </motion.div>
              )}
            </div>

            {/* Template Download Prompt for KG to Grade 2 */}
            {registration && isLittleArtist && (
              <div className="bg-amber-50/80 border border-amber-200 rounded-3xl p-6 text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <h4 className="font-black text-amber-950 text-sm mb-1 flex items-center gap-2">
                    <span>📥</span> Need the Coloring Template?
                  </h4>
                  <p className="text-amber-900 leading-relaxed max-w-lg">
                    Kindergarten to Grade 2 students can print the ready-made template, color it with offline traditional tools, and upload a photo below.
                  </p>
                </div>
                <a
                  href="/assets/eid-al-etihad-colouring-template.pdf"
                  download="eid-al-etihad-colouring-template.pdf"
                  className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-black shrink-0 transition-all shadow-xs"
                >
                  Download Template PDF
                </a>
              </div>
            )}

            {/* Step 2 Form: Upload Artwork */}
            {registration && (
              <form onSubmit={handleSubmit} className="bg-white border border-slate-200/90 rounded-3xl p-6 sm:p-8 shadow-xs space-y-6">
                <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
                  <div className="w-9 h-9 rounded-full bg-amber-100 text-amber-800 font-black text-sm flex items-center justify-center">
                    2
                  </div>
                  <div>
                    <h2 className="text-lg font-black text-slate-900">
                      Artwork Details & Upload
                    </h2>
                    <p className="text-xs text-slate-500">
                      Upload your high-resolution artwork photo or scan. Must be strictly under 1 MB.
                    </p>
                  </div>
                </div>

                {/* Form Fields */}
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      Artwork Title <span className="text-amber-600">*</span>
                    </label>
                    <input
                      type="text"
                      value={artworkTitle}
                      onChange={(e) => setArtworkTitle(e.target.value)}
                      placeholder={isLittleArtist ? 'e.g. My UAE Colors' : 'e.g. Pride of the Falcon'}
                      className="w-full bg-[#FAF8F5] border border-slate-300 rounded-xl px-4 py-3 text-sm text-slate-900 focus:bg-white focus:border-amber-500 outline-none"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      Medium Used <span className="text-amber-600">*</span>
                    </label>
                    <select
                      value={medium}
                      onChange={(e) => setMedium(e.target.value)}
                      className="w-full bg-[#FAF8F5] border border-slate-300 rounded-xl px-4 py-3 text-sm text-slate-900 focus:bg-white focus:border-amber-500 outline-none"
                    >
                      <option value="Pencil Drawing / Sketching">Pencil Drawing / Sketching</option>
                      <option value="Crayons / Oil Pastels">Crayons / Oil Pastels</option>
                      <option value="Watercolours">Watercolours</option>
                      <option value="Acrylics">Acrylics</option>
                      <option value="Mixed Traditional Media">Mixed Traditional Media</option>
                      <option value="Other Traditional Medium">Other Traditional Medium</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Theme Pillar <span className="text-amber-600">*</span>
                  </label>
                  <select
                    value={themePillar}
                    onChange={(e) => setThemePillar(e.target.value)}
                    className="w-full bg-[#FAF8F5] border border-slate-300 rounded-xl px-4 py-3 text-sm text-slate-900 focus:bg-white focus:border-amber-500 outline-none"
                  >
                    <option value="Heritage & Traditions">Heritage & Traditions (Falconry, Dhows, Forts, Dates)</option>
                    <option value="The UAE Today">The UAE Today (Modern Skyline, Innovation, Culture)</option>
                    <option value="Unity & National Pride">Unity & National Pride (The 7 Emirates, The Flag)</option>
                    <option value="The UAE of Tomorrow">The UAE of Tomorrow (Sustainability, Space Exploration)</option>
                  </select>
                </div>

                <div>
                  <div className="flex justify-between items-center mb-1.5">
                    <label className="block text-xs font-bold text-slate-700">
                      Artwork Story / Description <span className="text-slate-400 font-normal">(optional)</span>
                    </label>
                    <span className="text-[11px] text-slate-400">Max 100 words</span>
                  </div>
                  <textarea
                    rows={3}
                    value={artworkDescription}
                    onChange={(e) => setArtworkDescription(e.target.value)}
                    placeholder="Briefly describe what inspired the student's artwork..."
                    className="w-full bg-[#FAF8F5] border border-slate-300 rounded-xl p-3.5 text-sm text-slate-900 focus:bg-white focus:border-amber-500 outline-none resize-none"
                  />
                </div>

                {/* Upload Area */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-2">
                    Upload Physical Artwork Photo or PDF <span className="text-amber-600">* (Max 1 MB)</span>
                  </label>
                  <div className="border-2 border-dashed border-slate-300 hover:border-amber-500 rounded-3xl p-6 sm:p-10 text-center bg-[#FAF8F5] transition-all">
                    {artworkFile ? (
                      <div className="space-y-4">
                        <div className="relative max-w-xs mx-auto rounded-xl overflow-hidden border border-slate-300 shadow-md bg-white p-2">
                          {artworkPreview === 'PDF_DOCUMENT' ? (
                            <div className="py-6 px-4 flex flex-col items-center justify-center">
                              <div className="w-14 h-14 bg-red-100 text-red-600 font-black rounded-xl flex items-center justify-center text-xl mb-2">
                                PDF
                              </div>
                              <p className="text-xs font-bold text-slate-800 break-all">{artworkFile.name}</p>
                            </div>
                          ) : (
                            <img
                              src={artworkPreview}
                              alt="Artwork preview"
                              className="w-full h-auto object-cover max-h-60 rounded-lg"
                            />
                          )}
                          <button
                            type="button"
                            onClick={() => handleFileChange(null)}
                            className="absolute top-3 right-3 p-2 bg-rose-600 hover:bg-rose-700 text-white rounded-full shadow-md"
                            title="Remove file"
                          >
                            <FiTrash2 size={14} />
                          </button>
                        </div>
                        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold">
                          <FiCheck />
                          <span>{artworkFile.name} ({(artworkFile.size / 1024).toFixed(1)} KB)</span>
                        </div>
                      </div>
                    ) : (
                      <div>
                        <div className="w-14 h-14 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center mx-auto mb-3 text-2xl">
                          <FiUpload />
                        </div>
                        <h4 className="text-slate-900 font-black text-base mb-1">
                          Click to Browse or Drag File Here
                        </h4>
                        <p className="text-xs text-slate-500 mb-4 max-w-sm mx-auto">
                          Accepts JPG, PNG, WEBP, or PDF. File must be strictly under 1 MB.
                        </p>
                        <label className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-amber-500 hover:bg-amber-600 text-white font-black text-xs cursor-pointer shadow-xs transition-transform hover:scale-105 active:scale-95">
                          <span>Select Artwork</span>
                          <input
                            type="file"
                            accept="image/jpeg,image/png,image/jpg,image/webp,application/pdf"
                            className="hidden"
                            onChange={(e) => handleFileChange(e.target.files?.[0] || null)}
                          />
                        </label>
                      </div>
                    )}
                  </div>
                </div>

                {/* Important reminder box */}
                <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-950 text-xs flex items-start gap-2.5">
                  <FiInfo className="text-amber-700 shrink-0 text-base mt-0.5" />
                  <span>
                    <strong>Photo Quality Tip:</strong> Lay the artwork flat under good lighting with no shadow cast over the paper. Ensure the entire drawing is visible and clear for the evaluation panel.
                  </span>
                </div>

                {/* Submit button */}
                <button
                  type="submit"
                  disabled={isSubmitting || !artworkFile}
                  className="w-full py-4 rounded-full bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white font-black text-sm sm:text-base shadow-xl shadow-emerald-600/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50 hover:scale-[1.01]"
                >
                  {isSubmitting ? (
                    <span className="flex items-center gap-2">
                      <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Uploading artwork & generating receipt…
                    </span>
                  ) : (
                    'Complete Artwork Submission & Receive Receipt'
                  )}
                </button>
              </form>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
