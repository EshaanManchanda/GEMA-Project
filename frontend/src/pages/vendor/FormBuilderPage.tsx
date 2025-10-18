import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import FormBuilder from '@/components/registration/FormBuilder';

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
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <FormBuilder
          eventId={eventId}
          onSaveSuccess={() => {
            navigate(`/vendor/events/${eventId}/registrations`);
          }}
        />
      </div>
    </div>
  );
};

export default FormBuilderPage;
