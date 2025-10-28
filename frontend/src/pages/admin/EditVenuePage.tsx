import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { ArrowLeft } from 'lucide-react';
import VenueForm from '../../components/admin/VenueForm';
import adminAPI from '../../services/api/adminAPI';

const EditVenuePage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [venue, setVenue] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (id) {
      fetchVenue();
    }
  }, [id]);

  const fetchVenue = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await adminAPI.getVenueById(id!);

      if (response.success) {
        setVenue(response.data.venue);
      } else {
        throw new Error(response.message || 'Failed to fetch venue');
      }
    } catch (error: any) {
      console.error('Error fetching venue:', error);
      const errorMessage = error.response?.data?.message || error.message || 'Failed to load venue';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (venueData: any) => {
    try {
      const response = await adminAPI.updateVenue(id!, venueData);

      if (response.success) {
        toast.success('Venue updated successfully!');
        navigate('/admin/venues');
      } else {
        throw new Error(response.message || 'Failed to update venue');
      }
    } catch (error: any) {
      console.error('Error updating venue:', error);
      toast.error(error.response?.data?.message || error.message || 'Failed to update venue');
      throw error; // Re-throw to let the form handle it
    }
  };

  const handleCancel = () => {
    navigate('/admin/venues');
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  if (error || !venue) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <p className="text-red-800 mb-4">{error || 'Venue not found'}</p>
          <button
            onClick={() => navigate('/admin/venues')}
            className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Venues
          </button>
        </div>
      </div>
    );
  }

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
        <h1 className="text-3xl font-bold text-gray-900">Edit Venue</h1>
        <p className="mt-2 text-sm text-gray-600">
          Update venue information. All required fields are marked with an asterisk (*).
        </p>
      </div>

      {/* Form */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <VenueForm
          venue={venue}
          onSubmit={handleSubmit}
          onCancel={handleCancel}
        />
      </div>
    </div>
  );
};

export default EditVenuePage;
