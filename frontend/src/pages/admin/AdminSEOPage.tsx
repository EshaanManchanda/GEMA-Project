import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Save, Plus, Trash2, Globe, FileText } from 'lucide-react';
import toast from 'react-hot-toast';
import seoContentAPI from '@/services/api/seoContentAPI';
import { SEOContent } from '@/services/api/seoContentAPI';
import Button from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import Input from '@/components/ui/Input';
import PrivatePageSEO from '@/components/common/PrivatePageSEO';

type PageType = 'homepage' | 'about' | 'contact';

const AdminSEOPage: React.FC = () => {
  const [selectedPage, setSelectedPage] = useState<PageType>('homepage');
  const queryClient = useQueryClient();

  // Fetch SEO content for selected page
  const { data: seoContent, isLoading } = useQuery({
    queryKey: ['seo-content', selectedPage],
    queryFn: () => seoContentAPI.getPublicSEOContent(selectedPage),
    staleTime: 2 * 60 * 1000
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: (data: Partial<SEOContent>) => {
      if (seoContent?._id) {
        return seoContentAPI.admin.updateSEOContent(seoContent._id, data);
      } else {
        return seoContentAPI.admin.createSEOContent({ ...data, page: selectedPage } as any);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['seo-content'] });
      toast.success('SEO content updated successfully');
    },
    onError: (error: any) => {
      toast.error(error.message || 'Failed to update SEO content');
    }
  });

  const [formData, setFormData] = useState<Partial<SEOContent>>({
    metaTitle: '',
    metaDescription: '',
    keywords: [],
    faqItems: [],
    features: [],
    trustSignals: {
      yearsInBusiness: 0,
      certifications: [],
      awards: []
    }
  });

  React.useEffect(() => {
    if (seoContent) {
      setFormData({
        metaTitle: seoContent.metaTitle || '',
        metaDescription: seoContent.metaDescription || '',
        keywords: seoContent.keywords || [],
        faqItems: seoContent.faqItems || [],
        features: seoContent.features || [],
        trustSignals: seoContent.trustSignals || {
          yearsInBusiness: 0,
          certifications: [],
          awards: []
        }
      });
    }
  }, [seoContent]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateMutation.mutate({
      ...formData,
      isActive: true
    });
  };

  const addFAQItem = () => {
    setFormData({
      ...formData,
      faqItems: [
        ...(formData.faqItems || []),
        { question: '', answer: '', category: 'General' }
      ]
    });
  };

  const removeFAQItem = (index: number) => {
    setFormData({
      ...formData,
      faqItems: formData.faqItems?.filter((_, i) => i !== index)
    });
  };

  const updateFAQItem = (index: number, field: string, value: string) => {
    const updated = [...(formData.faqItems || [])];
    updated[index] = { ...updated[index], [field]: value };
    setFormData({ ...formData, faqItems: updated });
  };

  const addFeature = () => {
    setFormData({
      ...formData,
      features: [
        ...(formData.features || []),
        { title: '', description: '', icon: '' }
      ]
    });
  };

  const removeFeature = (index: number) => {
    setFormData({
      ...formData,
      features: formData.features?.filter((_, i) => i !== index)
    });
  };

  const updateFeature = (index: number, field: string, value: string) => {
    const updated = [...(formData.features || [])];
    updated[index] = { ...updated[index], [field]: value };
    setFormData({ ...formData, features: updated });
  };

  if (isLoading) {
    return (
      <>
        <PrivatePageSEO title="Admin - SEO Management | Kidrove" description="Manage SEO content" />
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
      </>
    );
  }

  return (
    <>
      <PrivatePageSEO title="Admin - SEO Management | Kidrove" description="Manage SEO content" />
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">SEO Content Management</h1>
        <p className="text-gray-600 mt-1">Manage meta tags, FAQs, and structured data for better search visibility</p>
      </div>

      {/* Page Selector */}
      <div className="mb-6 flex gap-2">
        {(['homepage', 'about', 'contact'] as PageType[]).map((page) => (
          <button
            key={page}
            onClick={() => setSelectedPage(page)}
            className={`px-4 py-2 rounded-lg font-medium capitalize transition-colors ${
              selectedPage === page
                ? 'bg-blue-600 text-white'
                : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
            }`}
          >
            {page}
          </button>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Meta Tags */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="w-5 h-5" />
              Meta Tags
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Meta Title (30-60 characters)
              </label>
              <Input
                value={formData.metaTitle}
                onChange={(e) => setFormData({ ...formData, metaTitle: e.target.value })}
                placeholder="Best Kids Activities in Dubai | Gema"
                maxLength={60}
              />
              <p className="text-xs text-gray-500 mt-1">{formData.metaTitle?.length || 0}/60 characters</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Meta Description (120-160 characters)
              </label>
              <textarea
                value={formData.metaDescription}
                onChange={(e) => setFormData({ ...formData, metaDescription: e.target.value })}
                placeholder="Discover and book amazing kids activities, events, and classes in Dubai. Trusted by thousands of parents."
                rows={3}
                maxLength={160}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-xs text-gray-500 mt-1">{formData.metaDescription?.length || 0}/160 characters</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Keywords (comma-separated)
              </label>
              <Input
                value={formData.keywords?.join(', ')}
                onChange={(e) => setFormData({
                  ...formData,
                  keywords: e.target.value.split(',').map(k => k.trim()).filter(k => k.length > 0)
                })}
                placeholder="kids activities, dubai events, children classes"
              />
            </div>
          </CardContent>
        </Card>

        {/* FAQ Items */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                FAQ Items
              </CardTitle>
              <Button type="button" variant="outline" size="sm" onClick={addFAQItem}>
                <Plus className="w-4 h-4 mr-2" />
                Add FAQ
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {formData.faqItems?.map((faq, index) => (
              <div key={index} className="p-4 border border-gray-200 rounded-lg space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium text-gray-900">FAQ #{index + 1}</h4>
                  <button
                    type="button"
                    onClick={() => removeFAQItem(index)}
                    className="text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Question</label>
                  <Input
                    value={faq.question}
                    onChange={(e) => updateFAQItem(index, 'question', e.target.value)}
                    placeholder="What types of activities do you offer?"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Answer</label>
                  <textarea
                    value={faq.answer}
                    onChange={(e) => updateFAQItem(index, 'answer', e.target.value)}
                    rows={3}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="We offer a wide range of activities including..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                  <select
                    value={faq.category}
                    onChange={(e) => updateFAQItem(index, 'category', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="General">General</option>
                    <option value="Booking">Booking</option>
                    <option value="Payment">Payment</option>
                    <option value="Cancellation">Cancellation</option>
                    <option value="Support">Support</option>
                  </select>
                </div>
              </div>
            ))}

            {(!formData.faqItems || formData.faqItems.length === 0) && (
              <div className="text-center py-8 text-gray-500">
                No FAQ items added yet. Click "Add FAQ" to get started.
              </div>
            )}
          </CardContent>
        </Card>

        {/* Features */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Platform Features</CardTitle>
              <Button type="button" variant="outline" size="sm" onClick={addFeature}>
                <Plus className="w-4 h-4 mr-2" />
                Add Feature
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {formData.features?.map((feature, index) => (
              <div key={index} className="p-4 border border-gray-200 rounded-lg space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium text-gray-900">Feature #{index + 1}</h4>
                  <button
                    type="button"
                    onClick={() => removeFeature(index)}
                    className="text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                    <Input
                      value={feature.title}
                      onChange={(e) => updateFeature(index, 'title', e.target.value)}
                      placeholder="Curated Activities"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Icon</label>
                    <Input
                      value={feature.icon}
                      onChange={(e) => updateFeature(index, 'icon', e.target.value)}
                      placeholder="search (lucide icon name)"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  <textarea
                    value={feature.description}
                    onChange={(e) => updateFeature(index, 'description', e.target.value)}
                    rows={2}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="Handpicked activities vetted by our team"
                  />
                </div>
              </div>
            ))}

            {(!formData.features || formData.features.length === 0) && (
              <div className="text-center py-8 text-gray-500">
                No features added yet. Click "Add Feature" to get started.
              </div>
            )}
          </CardContent>
        </Card>

        {/* Trust Signals */}
        <Card>
          <CardHeader>
            <CardTitle>Trust Signals</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Years in Business</label>
              <Input
                type="number"
                value={formData.trustSignals?.yearsInBusiness || 0}
                onChange={(e) => setFormData({
                  ...formData,
                  trustSignals: {
                    ...formData.trustSignals!,
                    yearsInBusiness: parseInt(e.target.value)
                  }
                })}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Certifications (comma-separated)
              </label>
              <Input
                value={formData.trustSignals?.certifications?.join(', ') || ''}
                onChange={(e) => setFormData({
                  ...formData,
                  trustSignals: {
                    ...formData.trustSignals!,
                    certifications: e.target.value.split(',').map(c => c.trim()).filter(c => c.length > 0)
                  }
                })}
                placeholder="ISO 9001, SafeGuard Certified"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Awards (comma-separated)
              </label>
              <Input
                value={formData.trustSignals?.awards?.join(', ') || ''}
                onChange={(e) => setFormData({
                  ...formData,
                  trustSignals: {
                    ...formData.trustSignals!,
                    awards: e.target.value.split(',').map(a => a.trim()).filter(a => a.length > 0)
                  }
                })}
                placeholder="Best Kids Platform 2024, Parent's Choice Award"
              />
            </div>
          </CardContent>
        </Card>

        {/* Submit */}
        <div className="flex justify-end gap-3">
          <Button
            type="submit"
            variant="primary"
            disabled={updateMutation.isPending}
          >
            <Save className="w-4 h-4 mr-2" />
            {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </form>
    </div>
    </>
  );
};

export default AdminSEOPage;
