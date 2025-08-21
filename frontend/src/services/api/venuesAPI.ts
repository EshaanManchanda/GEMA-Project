import { ApiService } from '../api';

const venuesAPI = {
  getAllVenues: async () => {
    try {
      const response = await ApiService.get('/venues');
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  createVenue: async (venueData: {
    name: string;
    description: string;
    address: {
      street: string;
      city: string;
      state: string;
      country: string;
      zipCode: string;
    };
    coordinates: {
      lat: number;
      lng: number;
    };
    capacity: number;
    venueType: string;
    facilities: string[];
    baseRentalPrice: number;
    currency: string;
  }) => {
    try {
      const response = await ApiService.post('/venues', venueData);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  getVenueById: async (id: string) => {
    try {
      const response = await ApiService.get(`/venues/${id}`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  updateVenue: async (id: string, venueData: any) => {
    try {
      const response = await ApiService.put(`/venues/${id}`, venueData);
      return response.data;
    } catch (error) {
      throw error;
    }
  },

  deleteVenue: async (id: string) => {
    try {
      const response = await ApiService.delete(`/venues/${id}`);
      return response.data;
    } catch (error) {
      throw error;
    }
  },
};

export default venuesAPI;