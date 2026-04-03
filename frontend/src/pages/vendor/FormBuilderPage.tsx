import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import FormBuilder from '@/components/registration/FormBuilder';
import PrivatePageSEO from '@/components/common/PrivatePageSEO';

const FormBuilderPage: React.FC = () => {
  const { eventId } = useParams<{ eventId: string }>();
  const navigate = useNavigate();

  if (!eventId) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <p className="text-red-600">Event ID is required</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <PrivatePageSEO title="Vendor - Form Builder | Kidrove" description="Build registration form" />
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <button
            onClick={() => navigate(`/vendor/events/${eventId}/registrations`)}
            className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-800 mb-6 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to registrations
          </button>
          <FormBuilder
            eventId={eventId}
            onSaveSuccess={() => {
              // Saving keeps you on the page; use the back button to leave
            }}
          />
        </div>
      </div>
    </>
  );
};

export default FormBuilderPage;
