import React, { useState } from 'react';
import { useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { FaDownload, FaTrash } from 'react-icons/fa';
import { authAPI } from '@/services/api/authAPI';
import { clearAuthOnFailure } from '@/store/slices/authSlice';
import type { AppDispatch } from '@/store';

/** "Your data": download a copy, or delete the account (privacy-law requests). */
const AccountDataSection: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const [exporting, setExporting] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [secret, setSecret] = useState('');
  const [deleting, setDeleting] = useState(false);

  const download = async () => {
    setExporting(true);
    try {
      const data = await authAPI.exportData();
      const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
      const a = Object.assign(document.createElement('a'), { href: url, download: 'kidrove-my-data.json' });
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error("Couldn't prepare your data. Please try again.");
    } finally {
      setExporting(false);
    }
  };

  const remove = async (e: React.FormEvent) => {
    e.preventDefault();
    setDeleting(true);
    try {
      await authAPI.deleteAccount(secret);
      await dispatch(clearAuthOnFailure());
      toast.success('Your account has been deleted.');
      navigate('/');
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Couldn't delete your account.");
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-4">
      <h4 className="font-medium text-gray-900">Your data</h4>
      <div className="flex items-center justify-between gap-4 p-4 bg-gray-50 rounded-xl">
        <div>
          <p className="font-medium">Download my data</p>
          <p className="text-sm text-gray-600">Your profile, orders, tickets and reviews as a JSON file.</p>
        </div>
        <button
          type="button"
          onClick={download}
          disabled={exporting}
          className="shrink-0 inline-flex items-center gap-2 bg-gray-800 text-white px-4 py-2 rounded-lg hover:bg-gray-900 disabled:opacity-60"
        >
          <FaDownload aria-hidden="true" /> {exporting ? 'Preparing…' : 'Download'}
        </button>
      </div>

      <div className="p-4 rounded-xl border border-red-200 bg-red-50 space-y-3">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="font-medium text-red-800">Delete my account</p>
            <p className="text-sm text-red-700">
              Removes your name, email, phone and addresses and signs you out everywhere. Past orders are kept for our records without your details.
            </p>
          </div>
          {!confirming && (
            <button
              type="button"
              onClick={() => setConfirming(true)}
              className="shrink-0 inline-flex items-center gap-2 bg-red-700 text-white px-4 py-2 rounded-lg hover:bg-red-800"
            >
              <FaTrash aria-hidden="true" /> Delete
            </button>
          )}
        </div>
        {confirming && (
          <form onSubmit={remove} className="flex flex-col sm:flex-row sm:items-end gap-3">
            <div className="flex-1">
              <label htmlFor="delete-account-secret" className="block text-sm font-medium text-red-800">
                Your password (signed in with Google? type DELETE)
              </label>
              <input
                id="delete-account-secret"
                type="password"
                autoComplete="current-password"
                required
                value={secret}
                onChange={(e) => setSecret(e.target.value)}
                className="mt-1 w-full rounded-lg border border-red-300 px-3 py-2"
              />
            </div>
            <div className="flex gap-2">
              <button type="button" onClick={() => { setConfirming(false); setSecret(''); }} className="px-4 py-2 rounded-lg border border-gray-300 bg-white">
                Cancel
              </button>
              <button type="submit" disabled={deleting} className="px-4 py-2 rounded-lg bg-red-700 text-white hover:bg-red-800 disabled:opacity-60">
                {deleting ? 'Deleting…' : 'Delete my account'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default AccountDataSection;
