import api from '../api';

export interface UploadResponse {
  success: boolean;
  message: string;
  data: {
    originalName: string;
    filename: string;
    url: string;
    size: number;
    mimetype: string;
    uploadedAt: string;
    provider?: 'local' | 'cloudinary';
    publicId?: string;
    cloudinaryUrl?: string;
    variations?: { [key: string]: string };
  };
}

export interface BatchUploadResponse {
  success: boolean;
  message: string;
  data: {
    files: UploadResponse['data'][];
    provider: 'local' | 'cloudinary';
  };
}

export interface ProviderInfoResponse {
  success: boolean;
  message: string;
  data: {
    provider: 'local' | 'cloudinary';
    maxFileSize: number;
    allowedFileTypes: string[];
    cloudinaryEnabled: boolean;
  };
}

export interface ImageVariationsResponse {
  success: boolean;
  message: string;
  data: {
    variations: { [key: string]: string };
  };
}

export interface FileInfoResponse {
  success: boolean;
  message: string;
  data: {
    publicId?: string;
    format?: string;
    width?: number;
    height?: number;
    bytes?: number;
    url: string;
    createdAt: string;
    provider: 'local' | 'cloudinary';
    variations?: { [key: string]: string };
  };
}

export interface FileListResponse {
  success: boolean;
  message: string;
  data: {
    files: Array<{
      filename: string;
      size: number;
      created: string;
      modified: string;
      extension: string;
      url: string;
    }>;
    pagination: {
      page: number;
      limit: number;
      total: number;
      pages: number;
    };
  };
}

export class UploadAPI {
  /**
   * Upload a single file
   */
  static async uploadSingle(file: File, category?: string): Promise<UploadResponse> {
    const formData = new FormData();
    formData.append('file', file);
    if (category) {
      formData.append('category', category);
    }

    const response = await api.post('/uploads/single', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    return response.data;
  }

  /**
   * Upload multiple files
   */
  static async uploadMultiple(files: File[], category?: string): Promise<BatchUploadResponse> {
    const formData = new FormData();
    files.forEach(file => {
      formData.append('files', file);
    });
    if (category) {
      formData.append('category', category);
    }

    const response = await api.post('/uploads/multiple', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    return response.data;
  }

  /**
   * Upload event images
   */
  static async uploadEventImages(
    images?: File[],
    banner?: File,
    thumbnail?: File
  ): Promise<BatchUploadResponse> {
    const formData = new FormData();
    
    if (images) {
      images.forEach(image => {
        formData.append('images', image);
      });
    }
    
    if (banner) {
      formData.append('banner', banner);
    }
    
    if (thumbnail) {
      formData.append('thumbnail', thumbnail);
    }

    const response = await api.post('/uploads/event-images', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    return response.data;
  }

  /**
   * Upload venue images
   */
  static async uploadVenueImages(
    images?: File[],
    floorPlan?: File,
    thumbnail?: File
  ): Promise<BatchUploadResponse> {
    const formData = new FormData();
    
    if (images) {
      images.forEach(image => {
        formData.append('images', image);
      });
    }
    
    if (floorPlan) {
      formData.append('floorPlan', floorPlan);
    }
    
    if (thumbnail) {
      formData.append('thumbnail', thumbnail);
    }

    const response = await api.post('/uploads/venue-images', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    return response.data;
  }

  /**
   * Upload user avatar
   */
  static async uploadAvatar(file: File): Promise<UploadResponse> {
    const formData = new FormData();
    formData.append('avatar', file);

    const response = await api.post('/uploads/avatar', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    return response.data;
  }

  /**
   * Upload document
   */
  static async uploadDocument(file: File): Promise<UploadResponse> {
    const formData = new FormData();
    formData.append('document', file);

    const response = await api.post('/uploads/document', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    return response.data;
  }

  /**
   * Batch upload files
   */
  static async batchUpload(files: File[], category?: string): Promise<BatchUploadResponse> {
    const formData = new FormData();
    files.forEach(file => {
      formData.append('files', file);
    });
    if (category) {
      formData.append('category', category);
    }

    const response = await api.post('/uploads/batch', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    return response.data;
  }

  /**
   * Get upload provider information
   */
  static async getProviderInfo(): Promise<ProviderInfoResponse> {
    const response = await api.get('/uploads/provider');
    return response.data;
  }

  /**
   * Get image variations (Cloudinary only)
   */
  static async getImageVariations(publicId: string): Promise<ImageVariationsResponse> {
    const response = await api.get(`/uploads/variations/${encodeURIComponent(publicId)}`);
    return response.data;
  }

  /**
   * Get image transformations (Cloudinary only)
   */
  static async getImageTransformation(
    publicId: string,
    transformation?: object
  ): Promise<{
    success: boolean;
    message: string;
    data: {
      originalUrl: string;
      transformedUrl: string;
    };
  }> {
    const params = transformation ? { transformation: JSON.stringify(transformation) } : {};
    const response = await api.get(`/uploads/transform/${encodeURIComponent(publicId)}`, { params });
    return response.data;
  }

  /**
   * Get enhanced file information
   */
  static async getFileInfo(identifier: string): Promise<FileInfoResponse> {
    const response = await api.get(`/uploads/enhanced-info/${encodeURIComponent(identifier)}`);
    return response.data;
  }

  /**
   * Delete file
   */
  static async deleteFile(identifier: string): Promise<{ success: boolean; message: string }> {
    const response = await api.delete(`/uploads/enhanced/${encodeURIComponent(identifier)}`);
    return response.data;
  }

  /**
   * Get file list by category
   */
  static async getFileList(
    category: string,
    page: number = 1,
    limit: number = 20
  ): Promise<FileListResponse> {
    const response = await api.get(`/uploads/list/${category}`, {
      params: { page, limit }
    });
    return response.data;
  }

  /**
   * Get file info (legacy endpoint)
   */
  static async getFileInfoLegacy(
    filename: string,
    category: string = 'misc'
  ): Promise<{
    success: boolean;
    message: string;
    data: {
      filename: string;
      path: string;
      size: number;
      created: string;
      modified: string;
      extension: string;
      category: string;
    };
  }> {
    const response = await api.get(`/uploads/info/${filename}`, {
      params: { category }
    });
    return response.data;
  }

  /**
   * Delete file (legacy endpoint)
   */
  static async deleteFileLegacy(
    filename: string,
    category: string = 'misc'
  ): Promise<{ success: boolean; message: string }> {
    const response = await api.delete(`/uploads/file/${filename}`, {
      params: { category }
    });
    return response.data;
  }
}

// Helper functions for file validation
export const validateFileType = (file: File, allowedTypes: string[]): boolean => {
  return allowedTypes.includes(file.type);
};

export const validateFileSize = (file: File, maxSize: number): boolean => {
  return file.size <= maxSize;
};

export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

export const getFileExtension = (filename: string): string => {
  return filename.slice((filename.lastIndexOf('.') - 1 >>> 0) + 2);
};

export const isImageFile = (file: File): boolean => {
  return file.type.startsWith('image/');
};

export const isVideoFile = (file: File): boolean => {
  return file.type.startsWith('video/');
};

export const isDocumentFile = (file: File): boolean => {
  const documentTypes = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain'
  ];
  return documentTypes.includes(file.type);
};

export default UploadAPI;