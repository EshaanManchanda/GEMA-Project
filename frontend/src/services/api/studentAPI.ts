import api from '../api';

export interface Student {
  _id: string;
  parentUserId: string | { _id: string; firstName: string; lastName: string; email: string };
  email: string;
  firstName: string;
  lastName: string;
  dateOfBirth?: string;
  gender?: 'male' | 'female' | 'other';
  schoolId?: string;
  grade?: string;
  rollNumber?: string;
  phone?: string;
  address?: { line1?: string; city?: string; state?: string; country?: string; zip?: string };
  guardianRelation?: 'father' | 'mother' | 'guardian' | 'other';
  emergencyContact?: { name: string; phone: string; relation?: string };
  medicalNotes?: string;
  avatar?: string;
  status: 'active' | 'inactive';
  createdAt: string;
}

export interface CreateStudentPayload {
  firstName: string;
  lastName: string;
  email: string;
  parentEmail?: string;
  parentUserId?: string;
  dateOfBirth?: string;
  gender?: 'male' | 'female' | 'other';
  grade?: string;
  rollNumber?: string;
  phone?: string;
  guardianRelation?: 'father' | 'mother' | 'guardian' | 'other';
}

export interface UpdateStudentPayload {
  firstName?: string;
  lastName?: string;
  email?: string;
  dateOfBirth?: string;
  gender?: 'male' | 'female' | 'other';
  schoolId?: string;
  grade?: string;
  rollNumber?: string;
  phone?: string;
  address?: { line1?: string; city?: string; state?: string; country?: string; zip?: string };
  guardianRelation?: 'father' | 'mother' | 'guardian' | 'other';
  emergencyContact?: { name: string; phone: string; relation?: string };
  medicalNotes?: string;
  avatar?: string;
  status?: 'active' | 'inactive';
}

interface ListStudentsParams {
  parentUserId?: string;
  email?: string;
  schoolId?: string;
  status?: 'active' | 'inactive';
  page?: number;
  limit?: number;
}

interface PaginatedStudents {
  students: Student[];
  pagination: { currentPage: number; totalPages: number; total: number };
}

export interface BulkImportResult {
  created: number;
  skipped: number;
  newAccounts: number;
  errors: string[];
}

export const studentAPI = {
  bulkImport: (file: File) => {
    const form = new FormData();
    form.append('csv', file);
    return api.post<{ success: boolean; data: BulkImportResult }>('/students/bulk-import', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  list: (params?: ListStudentsParams) =>
    api.get<{ success: boolean; data: PaginatedStudents }>('/students', { params }),

  getByParentEmail: (email: string) =>
    api.get<{ success: boolean; data: { students: Student[] } }>(`/students/by-email/${encodeURIComponent(email)}`),

  getMyChildren: () =>
    api.get<{ success: boolean; data: { students: Student[] } }>('/students/me/children'),

  get: (id: string) =>
    api.get<{ success: boolean; data: { student: Student } }>(`/students/${id}`),

  create: (payload: CreateStudentPayload) =>
    api.post<{ success: boolean; data: { student: Student } }>('/students', payload),

  update: (id: string, payload: UpdateStudentPayload) =>
    api.put<{ success: boolean; data: { student: Student } }>(`/students/${id}`, payload),

  delete: (id: string) =>
    api.delete<{ success: boolean; data: { student: Student } }>(`/students/${id}`),
};
