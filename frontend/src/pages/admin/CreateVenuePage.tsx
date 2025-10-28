import React from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { ArrowLeft } from 'lucide-react';
import VenueForm from '../../components/admin/VenueForm';
import adminAPI from '../../services/api/adminAPI';

const CreateVenuePage: React.FC = () => {
  const navigate = useNavigate();

  const handleSubmit = async (venueData: any) => {
    try {
      const response = await adminAPI.createVenue(venueData);

      if (response.success) {
        toast.success('Venue created successfully!');
        navigate('/admin/venues');
      } else {
        throw new Error(response.message || 'Failed to create venue');
      }
    } catch (error: any) {
      console.error('Error creating venue:', error);
      toast.error(error.response?.data?.message || error.message || 'Failed to create venue');
      throw error; // Re-throw to let the form handle it
    }
  };

  const handleCancel = () => {
    navigate('/admin/venues');
  };

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-6">
        <button
          onClick={() => navigate('/admin/venues')}
          className="flex items-center text-gray-600 hover:text-gray-900 mb-4 transition-colors"
        >
          <ArrowLeft className="w-5 h-5 mr-2" />
          Back to Venues
        </button>
        <h1 className="text-3xl font-bold text-gray-900">Create New Venue</h1>
        <p className="mt-2 text-sm text-gray-600">
          Add a new venue to the platform. All required fields are marked with an asterisk (*).
        </p>
      </div>

      {/* Form */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <VenueForm
          onSubmit={handleSubmit}
          onCancel={handleCancel}
        />
      </div>
    </div>
  );
};

export default CreateVenuePage;
