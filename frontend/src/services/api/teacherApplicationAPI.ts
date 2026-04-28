import api from '../api';

export interface TeacherApplicationPayload {
  profile: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
  };
  topics: string[];
  ageRanges: string[];
  experienceTypes: string[];
  yearsOfExperience: number;
  qualifications: string;
  profileVideoUrl: string;
  acceptedTerms: boolean;
}

const teacherApplicationAPI = {
  getMyApplication: async () => {
    const response = await api.get('/teachers/application');
    return response.data?.data;
  },

  submitApplication: async (payload: TeacherApplicationPayload) => {
    const response = await api.put('/teachers/application', payload);
    return response.data?.data;
  },

  uploadProfileVideo: async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);

    const response = await api.post('/uploads/blog-content-media', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    return response.data?.data;
  },
};

export default teacherApplicationAPI;
