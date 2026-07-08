import React, { useState, useEffect } from 'react';
import { X, Save, Plus, Trash2 } from 'lucide-react';
import Button from '../ui/Button';
import Checkbox from '../ui/Checkbox';
import Input from '../ui/Input';
import Select from '../ui/Select';
import Textarea from '../ui/Textarea';
import partnershipAPI from '../../services/api/partnershipAPI';
import toast from 'react-hot-toast';

interface Partnership {
  _id: string;
  name: string;
  email: string;
  phone?: string;
  organization?: string;
  partnershipType: string;
  campaignType: string;
  selectedPackage?: string;
  campDetails?: string;
  ageGroups?: string[];
  emirate?: string;
  numberOfKids?: string;
  website?: string;
  message: string;
  agreeToTerms: boolean;
  status: string;
  paymentStatus?: 'pending' | 'paid' | 'failed';
  notes?: string;
  plans?: string;
  contents?: string;
  socialMedia?: {
    facebook?: string;
    instagram?: string;
    twitter?: string;
    linkedin?: string;
    youtube?: string;
  };
  videoAttachments?: Array<{
    originalName?: string;
    filename?: string;
    url: string;
    size?: number;
    mimetype?: string;
    provider?: string;
    publicId?: string;
    cloudinaryUrl?: string;
    uploadedAt?: string;
  }>;
  images?: Array<{
    url: string;
    caption?: string;
  }>;
  documentAttachments?: Array<{
    url: string;
    title?: string;
  }>;
  createdAt: string;
  updatedAt: string;
}

interface Props {
  partnership: Partnership | null;
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void; // callback to refresh list
}

const EditPartnershipModal: React.FC<Props> = ({ partnership, isOpen, onClose, onSaved }) => {
  const [form, setForm] = useState<Partial<Partnership>>({});

  useEffect(() => {
    if (partnership) {
      setForm({ ...partnership });
    }
  }, [partnership]);

  if (!isOpen || !partnership) return null;

  const handleChange = (field: keyof Partnership, value: any) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const handleSocialChange = (platform: keyof NonNullable<Partnership['socialMedia']>, value: string) => {
    setForm(prev => ({
      ...prev,
      socialMedia: { ...(prev.socialMedia || {}), [platform]: value },
    }));
  };

  const handleAddVideo = () => {
    setForm(prev => ({
      ...prev,
      videoAttachments: [...(prev.videoAttachments || []), { url: '' }],
    }));
  };

  const handleVideoUrlChange = (index: number, url: string) => {
    const newVideos = [...(form.videoAttachments || [])];
    newVideos[index] = { ...newVideos[index], url };
    setForm(prev => ({ ...prev, videoAttachments: newVideos }));
  };

  const handleRemoveVideo = (index: number) => {
    const newVideos = [...(form.videoAttachments || [])];
    newVideos.splice(index, 1);
    setForm(prev => ({ ...prev, videoAttachments: newVideos }));
  };

  const handleAddImage = () => {
    setForm(prev => ({
      ...prev,
      images: [...(prev.images || []), { url: '' }],
    }));
  };

  const handleImageUrlChange = (index: number, url: string) => {
    const newImages = [...(form.images || [])];
    newImages[index] = { ...newImages[index], url };
    setForm(prev => ({ ...prev, images: newImages }));
  };

  const handleRemoveImage = (index: number) => {
    const newImages = [...(form.images || [])];
    newImages.splice(index, 1);
    setForm(prev => ({ ...prev, images: newImages }));
  };

  const handleAddDocument = () => {
    setForm(prev => ({
      ...prev,
      documentAttachments: [...(prev.documentAttachments || []), { url: '', title: '' }],
    }));
  };

  const handleDocumentChange = (index: number, field: 'url' | 'title', value: string) => {
    const newDocs = [...(form.documentAttachments || [])];
    newDocs[index] = { ...newDocs[index], [field]: value };
    setForm(prev => ({ ...prev, documentAttachments: newDocs }));
  };

  const handleRemoveDocument = (index: number) => {
    const newDocs = [...(form.documentAttachments || [])];
    newDocs.splice(index, 1);
    setForm(prev => ({ ...prev, documentAttachments: newDocs }));
  };

  const handleSubmit = async () => {
    try {
      const updates = { ...form };
      await partnershipAPI.update(partnership._id, updates);
      toast.success('Partnership updated successfully');
      onSaved();
      onClose();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to update partnership');
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center p-4 border-b">
          <h2 className="text-xl font-semibold">Edit Partnership</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-4 space-y-4">
          <Input label="Name" value={form.name || ''} onChange={e => handleChange('name', e.target.value)} />
          <Input label="Email" type="email" value={form.email || ''} onChange={e => handleChange('email', e.target.value)} />
          <Input label="Phone" value={form.phone || ''} onChange={e => handleChange('phone', e.target.value)} />
          <Input label="Organization" value={form.organization || ''} onChange={e => handleChange('organization', e.target.value)} />
          <Select
            label="Partnership Type"
            options={[{ value: 'vendor', label: 'Vendor' }, { value: 'influencer', label: 'Influencer' }, { value: 'school', label: 'School' }, { value: 'affiliate', label: 'Affiliate' }, { value: 'summer_camp', label: 'Summer Camp' }, { value: 'play_zone', label: 'Play Zone' }, { value: 'workshop', label: 'Workshop' }, { value: 'activity_centre', label: 'Activity Centre' }, { value: 'other', label: 'Other' }]}
            value={form.partnershipType || ''}
            onChange={e => handleChange('partnershipType', e.target.value)}
          />
          <Select
            label="Campaign Type"
            options={[{ value: 'general', label: 'General' }, { value: 'summer_2026', label: 'Summer 2026' }]}
            value={form.campaignType || ''}
            onChange={e => handleChange('campaignType', e.target.value)}
          />
          <Textarea label="Plans" value={form.plans || ''} onChange={e => handleChange('plans', e.target.value)} />
          <Textarea label="Contents" value={form.contents || ''} onChange={e => handleChange('contents', e.target.value)} />
          <h3 className="text-lg font-medium mt-4">Social Media</h3>
          <Input label="Facebook" value={form.socialMedia?.facebook || ''} onChange={e => handleSocialChange('facebook', e.target.value)} />
          <Input label="Instagram" value={form.socialMedia?.instagram || ''} onChange={e => handleSocialChange('instagram', e.target.value)} />
          <Input label="Twitter" value={form.socialMedia?.twitter || ''} onChange={e => handleSocialChange('twitter', e.target.value)} />
          <Input label="LinkedIn" value={form.socialMedia?.linkedin || ''} onChange={e => handleSocialChange('linkedin', e.target.value)} />
          <Input label="YouTube" value={form.socialMedia?.youtube || ''} onChange={e => handleSocialChange('youtube', e.target.value)} />
          <h3 className="text-lg font-medium mt-4">Video Attachments</h3>
          {(form.videoAttachments || []).map((vid, idx) => (
            <div key={idx} className="flex items-center space-x-2 mb-2">
              <Input
                placeholder="Video URL"
                value={vid.url}
                onChange={e => handleVideoUrlChange(idx, e.target.value)}
              />
              <Button variant="ghost" size="sm" onClick={() => handleRemoveVideo(idx)}>
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          ))}
          <Button variant="outline" size="sm" onClick={handleAddVideo} className="flex items-center">
            <Plus className="mr-1 w-4 h-4" /> Add Video/Reel
          </Button>

          <h3 className="text-lg font-medium mt-4">Images</h3>
          {(form.images || []).map((img, idx) => (
            <div key={idx} className="flex items-center space-x-2 mb-2">
              <Input
                placeholder="Image URL"
                value={img.url}
                onChange={e => handleImageUrlChange(idx, e.target.value)}
              />
              <Button variant="ghost" size="sm" onClick={() => handleRemoveImage(idx)}>
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          ))}
          <Button variant="outline" size="sm" onClick={handleAddImage} className="flex items-center">
            <Plus className="mr-1 w-4 h-4" /> Add Image
          </Button>

          <h3 className="text-lg font-medium mt-4">Documents (PDFs)</h3>
          {(form.documentAttachments || []).map((doc, idx) => (
            <div key={idx} className="flex flex-col space-y-2 mb-4 p-3 border rounded-md">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Document {idx + 1}</span>
                <Button variant="ghost" size="sm" onClick={() => handleRemoveDocument(idx)}>
                  <Trash2 className="w-4 h-4 text-red-500" />
                </Button>
              </div>
              <Input
                placeholder="Document Title (e.g., Summer Brochure)"
                value={doc.title || ''}
                onChange={e => handleDocumentChange(idx, 'title', e.target.value)}
              />
              <Input
                placeholder="Document URL (PDF link)"
                value={doc.url || ''}
                onChange={e => handleDocumentChange(idx, 'url', e.target.value)}
              />
            </div>
          ))}
          <Button variant="outline" size="sm" onClick={handleAddDocument} className="flex items-center">
            <Plus className="mr-1 w-4 h-4" /> Add Document
          </Button>

{/* Packages Section */}
<div className="mt-6">
  <h3 className="text-lg font-medium mb-2">Package</h3>
  <Select
    label="Package"
    options={[
      { value: 'basic', label: 'Basic' },
      { value: 'starter', label: 'Starter' },
      { value: 'growth', label: 'Growth' },
      { value: 'premium', label: 'Premium' },
      { value: 'category_sponsor', label: 'Category Sponsor' },
    ]}
    value={form.selectedPackage || ''}
    onChange={e => handleChange('selectedPackage', e.target.value)}
  />
  <div className="mt-2 flex items-center">
    <Checkbox
      label="Payment Done"
      checked={form.paymentStatus === 'paid'}
      onChange={e => handleChange('paymentStatus', e.target.checked ? 'paid' : 'pending')}
    />
  </div>
</div>


        </div>
        <div className="flex justify-end p-4 border-t">
          <Button onClick={handleSubmit} variant="primary" className="mr-2">
            <Save className="mr-1 w-4 h-4" /> Save
          </Button>
          <Button onClick={onClose} variant="ghost">Cancel</Button>
        </div>
      </div>
    </div>
  );
};

export default EditPartnershipModal;
