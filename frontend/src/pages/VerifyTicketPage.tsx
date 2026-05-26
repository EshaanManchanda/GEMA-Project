import React from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { ArrowLeft, QrCode, ShieldCheck, Ticket as TicketIcon } from 'lucide-react';
import PrivatePageSEO from '@/components/common/PrivatePageSEO';

const VerifyTicketPage: React.FC = () => {
  const { ticketNumber } = useParams<{ ticketNumber: string }>();
  const navigate = useNavigate();

  return (
    <>
      <PrivatePageSEO title="Verify Ticket | Kidrove" description="Ticket verification landing page" />
      <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-amber-50 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-2xl overflow-hidden rounded-2xl border border-orange-100 bg-white shadow-xl">
          <div className="bg-gradient-to-r from-primary to-orange-500 px-6 py-8 text-white">
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-white/20 p-3">
                <QrCode className="h-7 w-7" />
              </div>
              <div>
                <h1 className="text-2xl font-bold">Ticket QR Code</h1>
                <p className="text-white/90">This QR code is meant to be verified at the venue.</p>
              </div>
            </div>
          </div>

          <div className="space-y-6 p-6">
            <div className="flex items-start gap-4 rounded-xl border border-emerald-100 bg-emerald-50 p-4">
              <ShieldCheck className="mt-0.5 h-6 w-6 text-emerald-600" />
              <div>
                <h2 className="font-semibold text-emerald-900">QR scan received</h2>
                <p className="mt-1 text-sm text-emerald-800">
                  The code is valid as a ticket reference. Venue staff should verify it using the check-in scanner.
                </p>
              </div>
            </div>

            <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
              <div className="flex items-center gap-3 text-gray-700">
                <TicketIcon className="h-5 w-5 text-primary" />
                <span className="font-medium">Ticket Number</span>
              </div>
              <p className="mt-2 break-all font-mono text-sm text-gray-900">
                {ticketNumber || 'Unknown'}
              </p>
            </div>

            <p className="text-sm text-gray-600">
              If you are the attendee, keep this page open or go back to your bookings to view the full ticket.
            </p>

            <div className="flex flex-col gap-3 sm:flex-row">
              <button
                onClick={() => navigate('/bookings')}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 font-medium text-white transition-colors hover:bg-primary-dark"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to Bookings
              </button>
              <Link
                to="/tickets"
                className="inline-flex items-center justify-center gap-2 rounded-lg border border-gray-300 px-4 py-2.5 font-medium text-gray-700 transition-colors hover:bg-gray-50"
              >
                View My Tickets
              </Link>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default VerifyTicketPage;