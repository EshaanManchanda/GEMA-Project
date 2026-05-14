import React, { useState, useEffect, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Award, Plus, Trash2, Check, ChevronDown, Loader2, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import adminAPI from '@/services/api/adminAPI';

// ─── Types ────────────────────────────────────────────────────────────────────

interface CertTemplate {
  _id: string;
  name: string;
  slug: string;
  mode: 'html' | 'visual';
  backgroundImageUrl?: string;
}

interface CertificateType {
  name: string;
  slug: string;
  templateId?: string;
  isDefault: boolean;
  description?: string;
  criteria?: string;
  sortOrder?: number;
  // local-only flag for new unsaved entries
  _isNew?: boolean;
  _dirty?: boolean;
}

interface CertificateTypesTabProps {
  eventId: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function slugify(str: string): string {
  return str
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-');
}

// ─── Sub-components ───────────────────────────────────────────────────────────

interface TemplateSelectProps {
  value: string;
  templates: CertTemplate[];
  onChange: (id: string) => void;
  disabled?: boolean;
}

const TemplateSelect: React.FC<TemplateSelectProps> = ({ value, templates, onChange, disabled }) => {
  const [open, setOpen] = useState(false);
  const selected = templates.find(t => t._id === value);

  return (
    <div className="relative">
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between gap-2 px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm hover:border-blue-400 transition disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <span className={selected ? 'text-gray-900' : 'text-gray-400'}>
          {selected ? selected.name : 'No template assigned'}
        </span>
        <ChevronDown className="w-4 h-4 text-gray-400 shrink-0" />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute z-20 top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-56 overflow-y-auto">
            <button
              type="button"
              onClick={() => { onChange(''); setOpen(false); }}
              className="w-full px-3 py-2 text-left text-sm text-gray-500 hover:bg-gray-50 border-b border-gray-100"
            >
              No template
            </button>
            {templates.map(t => (
              <button
                key={t._id}
                type="button"
                onClick={() => { onChange(t._id); setOpen(false); }}
                className={`w-full px-3 py-2 text-left text-sm hover:bg-blue-50 flex items-center gap-2 ${t._id === value ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-700'}`}
              >
                <span className="flex-1 truncate">{t.name}</span>
                <span className="text-xs text-gray-400 shrink-0">{t.mode}</span>
                {t._id === value && <Check className="w-4 h-4 text-blue-600 shrink-0" />}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

interface DeleteConfirmProps {
  name: string;
  onConfirm: () => void;
  onCancel: () => void;
  loading: boolean;
}

const DeleteConfirm: React.FC<DeleteConfirmProps> = ({ name, onConfirm, onCancel, loading }) => (
  <div className="absolute inset-0 bg-white/95 backdrop-blur-sm rounded-xl flex flex-col items-center justify-center gap-3 z-10 p-4">
    <AlertCircle className="w-8 h-8 text-red-500" />
    <p className="text-sm font-medium text-gray-900 text-center">
      Delete "<span className="text-red-600">{name}</span>"?
    </p>
    <p className="text-xs text-gray-500 text-center">This removes the certificate type from the event.</p>
    <div className="flex gap-2">
      <button
        type="button"
        onClick={onCancel}
        className="px-4 py-1.5 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 transition"
      >
        Cancel
      </button>
      <button
        type="button"
        onClick={onConfirm}
        disabled={loading}
        className="px-4 py-1.5 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 transition flex items-center gap-1"
      >
        {loading && <Loader2 className="w-3 h-3 animate-spin" />}
        Delete
      </button>
    </div>
  </div>
);

// ─── Main Component ───────────────────────────────────────────────────────────

const CertificateTypesTab: React.FC<CertificateTypesTabProps> = ({ eventId }) => {
  const queryClient = useQueryClient();

  const [types, setTypes] = useState<CertificateType[]>([]);
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);
  const [deletingSlug, setDeletingSlug] = useState<string | null>(null);
  const [savingSlug, setSavingSlug] = useState<string | null>(null);

  // ─── Queries ────────────────────────────────────────────────────────────

  const { data: templates = [], isLoading: loadingTemplates } = useQuery<CertTemplate[]>({
    queryKey: ['cert-templates'],
    queryFn: () => adminAPI.getCertTemplates(),
    staleTime: 5 * 60 * 1000,
  });

  const { data: serverTypes, isLoading: loadingTypes } = useQuery<CertificateType[]>({
    queryKey: ['event-cert-types', eventId],
    queryFn: () => adminAPI.getEventCertTypes(eventId),
    enabled: !!eventId,
  });

  useEffect(() => {
    if (serverTypes) {
      setTypes(serverTypes.map(t => ({ ...t, _isNew: false, _dirty: false })));
    }
  }, [serverTypes]);

  // ─── Mutations ───────────────────────────────────────────────────────────

  const invalidate = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['event-cert-types', eventId] });
  }, [queryClient, eventId]);

  // ─── Local state handlers ────────────────────────────────────────────────

  const addType = () => {
    const newType: CertificateType = {
      name: '',
      slug: `type-${Date.now()}`,
      templateId: '',
      isDefault: types.length === 0,
      description: '',
      criteria: '',
      sortOrder: types.length,
      _isNew: true,
      _dirty: true,
    };
    setTypes(prev => [...prev, newType]);
  };

  const updateField = (slug: string, field: keyof CertificateType, value: string | boolean) => {
    setTypes(prev =>
      prev.map(t => {
        if (t.slug !== slug) return t;
        const updated = { ...t, [field]: value, _dirty: true };
        // Auto-slugify when name changes for new entries
        if (field === 'name' && t._isNew) {
          updated.slug = slugify(value as string) || `type-${Date.now()}`;
        }
        // Unset default on others when setting new default
        if (field === 'isDefault' && value === true) {
          return updated;
        }
        return updated;
      }).map(t => {
        // Only one default allowed
        if (field === 'isDefault' && value === true && t.slug !== slug) {
          return { ...t, isDefault: false };
        }
        return t;
      }),
    );
  };

  // ─── Save (add or update) ─────────────────────────────────────────────────

  const saveType = async (type: CertificateType) => {
    if (!type.name.trim()) {
      toast.error('Certificate type name is required');
      return;
    }
    setSavingSlug(type.slug);
    try {
      const payload = {
        name: type.name.trim(),
        slug: type.slug,
        templateId: type.templateId || undefined,
        isDefault: type.isDefault,
        description: type.description || '',
        criteria: type.criteria || '',
        sortOrder: type.sortOrder ?? 0,
      };

      if (type._isNew) {
        await adminAPI.addEventCertType(eventId, payload);
      } else {
        await adminAPI.updateEventCertType(eventId, type.slug, payload);
      }

      toast.success(`"${type.name}" saved`);
      invalidate();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Save failed');
    } finally {
      setSavingSlug(null);
    }
  };

  // ─── Delete ───────────────────────────────────────────────────────────────

  const confirmDelete = async (slug: string) => {
    const type = types.find(t => t.slug === slug);
    if (!type) return;

    if (type._isNew) {
      setTypes(prev => prev.filter(t => t.slug !== slug));
      setPendingDelete(null);
      return;
    }

    setDeletingSlug(slug);
    try {
      await adminAPI.deleteEventCertType(eventId, slug);
      toast.success('Certificate type removed');
      setTypes(prev => prev.filter(t => t.slug !== slug));
      invalidate();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Delete failed');
    } finally {
      setDeletingSlug(null);
      setPendingDelete(null);
    }
  };

  // ─── Render ───────────────────────────────────────────────────────────────

  const isLoading = loadingTemplates || loadingTypes;

  return (
    <div className="space-y-6">
      {/* Header card */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
              <Award className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Certificate Templates</h2>
              <p className="text-sm text-gray-500">
                Define which certificate types students can earn for this event.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={addType}
            className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white text-sm font-medium rounded-lg hover:bg-purple-700 transition"
          >
            <Plus className="w-4 h-4" />
            Add Type
          </button>
        </div>

        {templates.length === 0 && !loadingTemplates && (
          <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <p className="text-sm text-amber-700">
              No certificate templates exist yet.{' '}
              <a href="/admin/certificates" className="underline font-medium">
                Create one in the Certificates section
              </a>{' '}
              first.
            </p>
          </div>
        )}
      </div>

      {/* Loading state */}
      {isLoading && (
        <div className="flex items-center justify-center py-16 bg-white rounded-xl shadow-sm border border-gray-100">
          <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
        </div>
      )}

      {/* Empty state */}
      {!isLoading && types.length === 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-dashed border-gray-200 p-12 text-center">
          <Award className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">No certificate types defined</p>
          <p className="text-sm text-gray-400 mt-1 mb-4">
            Add at least one type so students can earn certificates for this event.
          </p>
          <button
            type="button"
            onClick={addType}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-purple-600 text-white text-sm font-medium rounded-lg hover:bg-purple-700 transition"
          >
            <Plus className="w-4 h-4" />
            Add Certificate Type
          </button>
        </div>
      )}

      {/* Type cards */}
      {!isLoading && types.length > 0 && (
        <div className="space-y-4">
          {types.map((type) => (
            <div
              key={type.slug}
              className="relative bg-white rounded-xl shadow-sm border border-gray-100 p-5 hover:border-purple-200 transition"
            >
              {/* Delete confirm overlay */}
              {pendingDelete === type.slug && (
                <DeleteConfirm
                  name={type.name}
                  onConfirm={() => confirmDelete(type.slug)}
                  onCancel={() => setPendingDelete(null)}
                  loading={deletingSlug === type.slug}
                />
              )}

              {/* Card header */}
              <div className="flex items-center gap-3 mb-4">
                {type.isDefault && (
                  <span className="inline-flex items-center gap-1 text-xs font-medium text-purple-700 bg-purple-100 px-2 py-0.5 rounded-full">
                    <Check className="w-3 h-3" /> Default
                  </span>
                )}
                {type._isNew && (
                  <span className="text-xs font-medium text-amber-600 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                    Unsaved
                  </span>
                )}
                {type._dirty && !type._isNew && (
                  <span className="text-xs font-medium text-blue-600 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-full">
                    Modified
                  </span>
                )}
              </div>

              {/* Form fields */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                {/* Name */}
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={type.name}
                    placeholder="e.g. Participation, Winner, Gold Medal"
                    onChange={e => updateField(type.slug, 'name', e.target.value)}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-purple-400 focus:bg-white transition"
                  />
                </div>

                {/* Slug (read-only after first save) */}
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Slug</label>
                  <input
                    type="text"
                    value={type.slug}
                    readOnly={!type._isNew}
                    onChange={e => type._isNew && updateField(type.slug, 'slug', slugify(e.target.value))}
                    className="w-full px-3 py-2 bg-gray-100 border border-gray-200 rounded-lg text-sm text-gray-500 font-mono focus:outline-none"
                    placeholder="auto-generated"
                  />
                </div>

                {/* Template dropdown */}
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Certificate Template
                  </label>
                  <TemplateSelect
                    value={type.templateId ?? ''}
                    templates={templates}
                    onChange={id => updateField(type.slug, 'templateId', id)}
                    disabled={loadingTemplates}
                  />
                </div>

                {/* Default toggle */}
                <div className="flex items-end">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <div
                      role="checkbox"
                      aria-checked={type.isDefault}
                      onClick={() => updateField(type.slug, 'isDefault', !type.isDefault)}
                      className={`w-10 h-5 rounded-full transition-colors relative cursor-pointer ${
                        type.isDefault ? 'bg-purple-600' : 'bg-gray-200'
                      }`}
                    >
                      <span
                        className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-transform ${
                          type.isDefault ? 'translate-x-5' : 'translate-x-0'
                        }`}
                      />
                    </div>
                    <span className="text-sm text-gray-700">Set as default</span>
                  </label>
                </div>

                {/* Description */}
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Description <span className="text-gray-400">(optional)</span>
                  </label>
                  <input
                    type="text"
                    value={type.description ?? ''}
                    placeholder="Brief description of this certificate type"
                    onChange={e => updateField(type.slug, 'description', e.target.value)}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-purple-400 focus:bg-white transition"
                  />
                </div>

                {/* Criteria */}
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Criteria <span className="text-gray-400">(optional)</span>
                  </label>
                  <input
                    type="text"
                    value={type.criteria ?? ''}
                    placeholder="e.g. Rank 1–3, Complete the event"
                    onChange={e => updateField(type.slug, 'criteria', e.target.value)}
                    className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-purple-400 focus:bg-white transition"
                  />
                </div>
              </div>

              {/* Template preview strip */}
              {type.templateId && (() => {
                const tpl = templates.find(t => t._id === type.templateId);
                return tpl?.backgroundImageUrl ? (
                  <div className="mb-4 flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-100">
                    <img
                      src={tpl.backgroundImageUrl}
                      alt={tpl.name}
                      className="w-16 h-10 object-cover rounded border border-gray-200"
                    />
                    <div>
                      <p className="text-xs font-medium text-gray-700">{tpl.name}</p>
                      <p className="text-xs text-gray-400">{tpl.mode} template</p>
                    </div>
                  </div>
                ) : null;
              })()}

              {/* Actions */}
              <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setPendingDelete(type.slug)}
                  className="flex items-center gap-1.5 text-sm text-red-500 hover:text-red-700 transition"
                >
                  <Trash2 className="w-4 h-4" />
                  Remove
                </button>

                <button
                  type="button"
                  onClick={() => saveType(type)}
                  disabled={savingSlug === type.slug || !type._dirty}
                  className="flex items-center gap-2 px-4 py-1.5 bg-purple-600 text-white text-sm font-medium rounded-lg hover:bg-purple-700 disabled:opacity-40 disabled:cursor-not-allowed transition"
                >
                  {savingSlug === type.slug ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Check className="w-3.5 h-3.5" />
                  )}
                  {savingSlug === type.slug ? 'Saving…' : 'Save'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default CertificateTypesTab;
