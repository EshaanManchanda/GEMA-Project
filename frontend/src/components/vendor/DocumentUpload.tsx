import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FaFileUpload,
  FaCheckCircle,
  FaClock,
  FaTimesCircle,
  FaSpinner,
  FaTrash,
  FaEye,
  FaFilePdf,
  FaFileImage,
  FaFile,
} from 'react-icons/fa';
import { toast } from 'react-hot-toast';

type DocumentType = 'businessLicense' | 'taxCertificate' | 'identityDocument';
type DocumentStatus = 'pending' | 'verified' | 'rejected' | 'not_uploaded';

interface Document {
  type: DocumentType;
  url?: string;
  status: DocumentStatus;
  rejectionReason?: string;
  uploadedAt?: string;
}

interface DocumentUploadProps {
  documents: Document[];
  onUpload: (type: DocumentType, file: File) => Promise<void>;
  onDelete: (type: DocumentType) => Promise<void>;
  isLoading?: boolean;
}

const documentConfig: Record<DocumentType, { label: string; description: string; accept: string }> = {
  businessLicense: {
    label: 'Business License',
    description: 'Valid business registration or trade license document',
    accept: 'image/*,.pdf',
  },
  taxCertificate: {
    label: 'Tax Certificate',
    description: 'Tax registration certificate or VAT certificate',
    accept: 'image/*,.pdf',
  },
  identityDocument: {
    label: 'Identity Document',
    description: 'Government-issued ID (passport, driver\'s license, etc.)',
    accept: 'image/*,.pdf',
  },
};

const DocumentUpload: React.FC<DocumentUploadProps> = ({
  documents,
  onUpload,
  onDelete,
  isLoading = false,
}) => {
  const [uploadingType, setUploadingType] = useState<DocumentType | null>(null);
  const [deletingType, setDeletingType] = useState<DocumentType | null>(null);
  const fileInputRefs = {
    businessLicense: useRef<HTMLInputElement>(null),
    taxCertificate: useRef<HTMLInputElement>(null),
    identityDocument: useRef<HTMLInputElement>(null),
  };

  const getDocument = (type: DocumentType): Document => {
    return documents.find(doc => doc.type === type) || { type, status: 'not_uploaded' };
  };

  const getStatusBadge = (status: DocumentStatus) => {
    switch (status) {
      case 'verified':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
            <FaCheckCircle className="mr-1" />
            Verified
          </span>
        );
      case 'pending':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
            <FaClock className="mr-1" />
            Pending Review
          </span>
        );
      case 'rejected':
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
            <FaTimesCircle className="mr-1" />
            Rejected
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
            Not Uploaded
          </span>
        );
    }
  };

  const getFileIcon = (url?: string) => {
    if (!url) return <FaFile className="text-gray-400" />;

    const extension = url.split('.').pop()?.toLowerCase();
    if (extension === 'pdf') return <FaFilePdf className="text-red-500" />;
    if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(extension || '')) {
      return <FaFileImage className="text-blue-500" />;
    }
    return <FaFile className="text-gray-400" />;
  };

  const handleFileSelect = async (type: DocumentType, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast.error('File size must be less than 10MB');
      return;
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'application/pdf'];
    if (!allowedTypes.includes(file.type)) {
      toast.error('Only images and PDF files are allowed');
      return;
    }

    setUploadingType(type);
    try {
      await onUpload(type, file);
      toast.success(`${documentConfig[type].label} uploaded successfully`);
      // Clear the input
      if (fileInputRefs[type].current) {
        fileInputRefs[type].current.value = '';
      }
    } catch (error: any) {
      console.error(`Error uploading ${type}:`, error);
      toast.error(error.response?.data?.message || `Failed to upload ${documentConfig[type].label}`);
    } finally {
      setUploadingType(null);
    }
  };

  const handleDelete = async (type: DocumentType) => {
    if (!window.confirm(`Are you sure you want to delete your ${documentConfig[type].label}?`)) {
      return;
    }

    setDeletingType(type);
    try {
      await onDelete(type);
      toast.success(`${documentConfig[type].label} deleted successfully`);
    } catch (error: any) {
      console.error(`Error deleting ${type}:`, error);
      toast.error(`Failed to delete ${documentConfig[type].label}`);
    } finally {
      setDeletingType(null);
    }
  };

  const handleView = (url: string) => {
    window.open(url, '_blank');
  };

  const renderDocumentCard = (type: DocumentType) => {
    const config = documentConfig[type];
    const document = getDocument(type);
    const isUploading = uploadingType === type;
    const isDeleting = deletingType === type;

    return (
      <motion.div
        key={type}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-xl border-2 border-gray-200 p-6 hover:border-blue-300 transition-colors"
      >
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <h4 className="text-lg font-semibold text-gray-900 mb-1">{config.label}</h4>
            <p className="text-sm text-gray-600">{config.description}</p>
          </div>
          {getStatusBadge(document.status)}
        </div>

        {/* Document Info */}
        {document.url && document.status !== 'not_uploaded' && (
          <div className="bg-gray-50 rounded-lg p-4 mb-4">
            <div className="flex items-center gap-3">
              <div className="text-2xl">{getFileIcon(document.url)}</div>
              <div className="flex-1">
                <div className="text-sm font-medium text-gray-900">
                  {document.url.split('/').pop()?.substring(0, 30)}...
                </div>
                {document.uploadedAt && (
                  <div className="text-xs text-gray-500 mt-1">
                    Uploaded {new Date(document.uploadedAt).toLocaleDateString()}
                  </div>
                )}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => handleView(document.url!)}
                  className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                  title="View document"
                >
                  <FaEye />
                </button>
                <button
                  onClick={() => handleDelete(type)}
                  disabled={isDeleting || isLoading}
                  className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                  title="Delete document"
                >
                  {isDeleting ? <FaSpinner className="animate-spin" /> : <FaTrash />}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Rejection Reason */}
        {document.status === 'rejected' && document.rejectionReason && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
            <div className="flex items-start gap-2">
              <FaTimesCircle className="text-red-600 mt-0.5" />
              <div className="flex-1">
                <div className="text-sm font-medium text-red-900 mb-1">Rejection Reason:</div>
                <div className="text-sm text-red-700">{document.rejectionReason}</div>
              </div>
            </div>
          </div>
        )}

        {/* Upload Button */}
        <div>
          <input
            ref={fileInputRefs[type]}
            type="file"
            accept={config.accept}
            onChange={(e) => handleFileSelect(type, e)}
            className="hidden"
            disabled={isUploading || isLoading}
          />
          <button
            onClick={() => fileInputRefs[type].current?.click()}
            disabled={isUploading || isLoading}
            className={`w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-medium transition-colors ${
              document.status === 'not_uploaded'
                ? 'bg-blue-600 text-white hover:bg-blue-700'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            {isUploading ? (
              <>
                <FaSpinner className="animate-spin" />
                Uploading...
              </>
            ) : (
              <>
                <FaFileUpload />
                {document.status === 'not_uploaded' ? 'Upload Document' : 'Replace Document'}
              </>
            )}
          </button>
          <p className="text-xs text-gray-500 mt-2 text-center">
            Accepted: Images or PDF (max 10MB)
          </p>
        </div>
      </motion.div>
    );
  };

  // Calculate overall verification status
  const allDocuments = [
    getDocument('businessLicense'),
    getDocument('taxCertificate'),
    getDocument('identityDocument'),
  ];
  const allVerified = allDocuments.every(doc => doc.status === 'verified');
  const anyPending = allDocuments.some(doc => doc.status === 'pending');
  const anyRejected = allDocuments.some(doc => doc.status === 'rejected');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Verification Documents</h3>
        <p className="text-sm text-gray-600">
          Upload the required documents to verify your business. All documents will be reviewed by our team.
        </p>
      </div>

      {/* Overall Status */}
      {allVerified && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-6 border-2 border-green-200"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center">
              <FaCheckCircle className="text-white text-xl" />
            </div>
            <div className="flex-1">
              <h4 className="font-semibold text-green-900 mb-1">All Documents Verified!</h4>
              <p className="text-sm text-green-700">
                Your business has been successfully verified. You can now access all platform features.
              </p>
            </div>
          </div>
        </motion.div>
      )}

      {anyPending && !allVerified && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-yellow-50 rounded-xl p-4 border border-yellow-200"
        >
          <div className="flex items-center gap-3">
            <FaClock className="text-yellow-600" />
            <p className="text-sm text-yellow-800">
              Your documents are being reviewed. This typically takes 1-2 business days.
            </p>
          </div>
        </motion.div>
      )}

      {anyRejected && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-red-50 rounded-xl p-4 border border-red-200"
        >
          <div className="flex items-center gap-3">
            <FaTimesCircle className="text-red-600" />
            <p className="text-sm text-red-800">
              Some documents were rejected. Please review the reasons and upload new documents.
            </p>
          </div>
        </motion.div>
      )}

      {/* Document Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {renderDocumentCard('businessLicense')}
        {renderDocumentCard('taxCertificate')}
        {renderDocumentCard('identityDocument')}
      </div>

      {/* Help Text */}
      <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
        <h5 className="font-medium text-blue-900 mb-2">Document Requirements</h5>
        <ul className="text-sm text-blue-700 space-y-1 list-disc list-inside">
          <li>Documents must be clear and legible</li>
          <li>All text and details must be visible</li>
          <li>Documents must be current and valid</li>
          <li>Personal information must match your account details</li>
        </ul>
      </div>
    </div>
  );
};

export default DocumentUpload;
