import React, { useState, useRef, useCallback } from 'react';
import { X, Plus, Trash2, Move, Image as ImageIcon } from 'lucide-react';
import MediaPickerModal from './media/MediaPickerModal';
import api from '../../services/api';
import toast from 'react-hot-toast';

// ─── Types ────────────────────────────────────────────────────────────────────

interface TemplateField {
  id: string;
  key: string;
  label: string;
  x: number;
  y: number;
  width?: number;
  fontSize?: number;
  fontWeight?: 'normal' | 'bold';
  color?: string;
  fontFamily?: string;
  textAlign?: 'left' | 'center' | 'right';
  type?: 'text' | 'qr' | 'image';
}

interface Props {
  onClose: () => void;
  onSaved: () => void;
}

// ─── Predefined field palette ─────────────────────────────────────────────────

const PALETTE: { key: string; label: string; type: 'text' | 'qr' }[] = [
  { key: 'recipientName', label: 'Recipient Name', type: 'text' },
  { key: 'studentName', label: 'Student Name', type: 'text' },
  { key: 'schoolName', label: 'School Name', type: 'text' },
  { key: 'serialNumber', label: 'Serial Number', type: 'text' },
  { key: 'issuedDate', label: 'Issued Date', type: 'text' },
  { key: 'eventTitle', label: 'Event Title', type: 'text' },
  { key: 'qrCode', label: 'QR Code', type: 'qr' },
];

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

// ─── Component ────────────────────────────────────────────────────────────────

const VisualTemplateBuilder: React.FC<Props> = ({ onClose, onSaved }) => {
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');
  const [bgUrl, setBgUrl] = useState('');
  const [canvasW, setCanvasW] = useState(1240);
  const [canvasH, setCanvasH] = useState(877);
  const [fields, setFields] = useState<TemplateField[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [showMediaPicker, setShowMediaPicker] = useState(false);
  const [saving, setSaving] = useState(false);
  const [customLabel, setCustomLabel] = useState('');
  const [customKey, setCustomKey] = useState('');

  const canvasRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ id: string; startX: number; startY: number; fieldX: number; fieldY: number } | null>(null);

  // ─── Background image picker ────────────────────────────────────────────────

  const handleImageSelect = useCallback((assets: any[]) => {
    if (!assets[0]) return;
    const url = assets[0].url;
    setBgUrl(url);
    setShowMediaPicker(false);

    const img = new Image();
    img.onload = () => {
      setCanvasW(img.naturalWidth || 1240);
      setCanvasH(img.naturalHeight || 877);
    };
    img.src = url;
  }, []);

  // ─── Add field from palette ─────────────────────────────────────────────────

  const addField = useCallback((key: string, label: string, type: 'text' | 'qr' = 'text') => {
    const id = uid();
    setFields(prev => [
      ...prev,
      { id, key, label, x: 45, y: 45, fontSize: 24, color: '#000000', type, fontWeight: 'normal', textAlign: 'center' },
    ]);
    setSelected(id);
  }, []);

  const addCustomField = () => {
    if (!customLabel.trim()) return;
    const k = customKey.trim() || customLabel.trim().toLowerCase().replace(/\s+/g, '_');
    addField(k, customLabel.trim(), 'text');
    setCustomLabel('');
    setCustomKey('');
  };

  // ─── Drag handlers ──────────────────────────────────────────────────────────

  const onMouseDownField = useCallback((e: React.MouseEvent, id: string, fieldX: number, fieldY: number) => {
    e.preventDefault();
    e.stopPropagation();
    setSelected(id);
    dragRef.current = { id, startX: e.clientX, startY: e.clientY, fieldX, fieldY };
  }, []);

  const onMouseMove = useCallback((e: React.MouseEvent) => {
    if (!dragRef.current || !canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const dx = ((e.clientX - dragRef.current.startX) / rect.width) * 100;
    const dy = ((e.clientY - dragRef.current.startY) / rect.height) * 100;
    const newX = Math.min(100, Math.max(0, dragRef.current.fieldX + dx));
    const newY = Math.min(100, Math.max(0, dragRef.current.fieldY + dy));

    setFields(prev =>
      prev.map(f => f.id === dragRef.current!.id ? { ...f, x: newX, y: newY } : f),
    );
  }, []);

  const onMouseUp = useCallback(() => {
    dragRef.current = null;
  }, []);

  // ─── Inspector ──────────────────────────────────────────────────────────────

  const updateField = (id: string, patch: Partial<TemplateField>) => {
    setFields(prev => prev.map(f => f.id === id ? { ...f, ...patch } : f));
  };

  const deleteField = (id: string) => {
    setFields(prev => prev.filter(f => f.id !== id));
    if (selected === id) setSelected(null);
  };

  const selectedField = fields.find(f => f.id === selected);

  // ─── Save ───────────────────────────────────────────────────────────────────

  const handleSave = async () => {
    if (!name.trim() || !slug.trim()) { toast.error('Name and slug are required'); return; }
    if (!bgUrl) { toast.error('Please pick a background image'); return; }
    if (fields.length === 0) { toast.error('Add at least one field to the canvas'); return; }

    setSaving(true);
    try {
      const payload = {
        name: name.trim(),
        slug: slug.trim(),
        description: description.trim() || undefined,
        mode: 'visual',
        backgroundImageUrl: bgUrl,
        canvasWidth: canvasW,
        canvasHeight: canvasH,
        fields: fields.map(({ id: _id, ...f }) => f),
      };
      await api.post('/certificates/templates', payload);
      toast.success('Visual template created');
      onSaved();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to save template');
    } finally {
      setSaving(false);
    }
  };

  // ─── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-7xl max-h-[95vh] flex flex-col overflow-hidden shadow-2xl">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 shrink-0">
          <div className="flex items-center gap-3">
            <ImageIcon className="w-5 h-5 text-indigo-600" />
            <h2 className="text-lg font-semibold text-gray-900">Visual Template Builder</h2>
          </div>
          <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-700 rounded-lg hover:bg-gray-100">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex flex-1 overflow-hidden">

          {/* Left panel — meta + palette */}
          <div className="w-64 shrink-0 border-r border-gray-200 overflow-y-auto flex flex-col gap-4 p-4">

            {/* Meta */}
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Template Name *</label>
                <input
                  value={name}
                  onChange={e => { setName(e.target.value); if (!slug) setSlug(e.target.value.toLowerCase().replace(/\s+/g, '-')); }}
                  className="w-full text-sm px-2.5 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  placeholder="Participation Certificate"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Slug *</label>
                <input
                  value={slug}
                  onChange={e => setSlug(e.target.value)}
                  className="w-full text-xs font-mono px-2.5 py-1.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  placeholder="participation-cert"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Description</label>
                <input
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  className="w-full text-sm px-2.5 py-1.5 border border-gray-300 rounded-lg"
                  placeholder="Optional description"
                />
              </div>
            </div>

            {/* Background image */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1.5">Background Image *</label>
              <button
                type="button"
                onClick={() => setShowMediaPicker(true)}
                className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs border-2 border-dashed border-gray-300 rounded-lg text-gray-500 hover:border-indigo-400 hover:text-indigo-600 transition-colors"
              >
                <ImageIcon className="w-4 h-4" />
                {bgUrl ? 'Change Image' : 'Pick from Media Library'}
              </button>
              {bgUrl && (
                <img src={bgUrl} alt="bg preview" className="mt-2 w-full rounded-lg border border-gray-200 object-cover h-24" />
              )}
            </div>

            {/* Field palette */}
            <div>
              <p className="text-xs font-medium text-gray-700 mb-2">Add Field</p>
              <div className="space-y-1">
                {PALETTE.map(p => (
                  <button
                    key={p.key}
                    type="button"
                    onClick={() => addField(p.key, p.label, p.type)}
                    disabled={!!fields.find(f => f.key === p.key)}
                    className="w-full text-left px-3 py-1.5 text-xs rounded-lg border border-gray-200 hover:bg-indigo-50 hover:border-indigo-300 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-between"
                  >
                    <span>{p.label}</span>
                    {p.type === 'qr' && <span className="text-indigo-500 font-medium">QR</span>}
                  </button>
                ))}
              </div>

              {/* Custom field */}
              <div className="mt-3 space-y-1.5">
                <p className="text-xs text-gray-500">Custom field:</p>
                <input
                  value={customLabel}
                  onChange={e => setCustomLabel(e.target.value)}
                  placeholder="Label (e.g. Rank)"
                  className="w-full text-xs px-2.5 py-1.5 border border-gray-300 rounded-lg"
                />
                <input
                  value={customKey}
                  onChange={e => setCustomKey(e.target.value)}
                  placeholder="Key (e.g. rank) — optional"
                  className="w-full text-xs font-mono px-2.5 py-1.5 border border-gray-300 rounded-lg"
                />
                <button
                  type="button"
                  onClick={addCustomField}
                  disabled={!customLabel.trim()}
                  className="w-full flex items-center justify-center gap-1 px-3 py-1.5 text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg disabled:opacity-40"
                >
                  <Plus className="w-3 h-3" /> Add Custom
                </button>
              </div>
            </div>

            {/* Fields list */}
            {fields.length > 0 && (
              <div>
                <p className="text-xs font-medium text-gray-700 mb-2">Canvas Fields ({fields.length})</p>
                <div className="space-y-1">
                  {fields.map(f => (
                    <div
                      key={f.id}
                      onClick={() => setSelected(f.id)}
                      className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg border cursor-pointer text-xs ${selected === f.id ? 'border-indigo-400 bg-indigo-50' : 'border-gray-200 hover:bg-gray-50'}`}
                    >
                      <span className="truncate">{f.label}</span>
                      <button
                        type="button"
                        onClick={e => { e.stopPropagation(); deleteField(f.id); }}
                        className="ml-1 text-red-400 hover:text-red-600 shrink-0"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Canvas area */}
          <div className="flex-1 overflow-auto bg-gray-100 flex items-center justify-center p-6">
            {!bgUrl ? (
              <div className="text-center text-gray-400">
                <ImageIcon className="w-16 h-16 mx-auto mb-3 opacity-30" />
                <p className="text-sm">Pick a background image to start</p>
              </div>
            ) : (
              <div
                ref={canvasRef}
                className="relative select-none shadow-xl"
                style={{
                  width: '100%',
                  maxWidth: `${canvasW}px`,
                  aspectRatio: `${canvasW} / ${canvasH}`,
                  cursor: dragRef.current ? 'grabbing' : 'default',
                }}
                onMouseMove={onMouseMove}
                onMouseUp={onMouseUp}
                onMouseLeave={onMouseUp}
              >
                <img
                  src={bgUrl}
                  alt="certificate background"
                  className="w-full h-full object-cover pointer-events-none"
                  draggable={false}
                />
                {fields.map(f => (
                  <div
                    key={f.id}
                    style={{
                      position: 'absolute',
                      left: `${f.x}%`,
                      top: `${f.y}%`,
                      transform: 'translate(-50%, -50%)',
                      cursor: 'grab',
                      userSelect: 'none',
                      zIndex: selected === f.id ? 10 : 5,
                    }}
                    onMouseDown={e => onMouseDownField(e, f.id, f.x, f.y)}
                    onClick={() => setSelected(f.id)}
                  >
                    {f.type === 'qr' ? (
                      <div
                        style={{
                          width: `${f.width || 80}px`,
                          height: `${f.width || 80}px`,
                          border: selected === f.id ? '2px dashed #6366f1' : '2px dashed #9ca3af',
                          borderRadius: '4px',
                          background: 'rgba(255,255,255,0.5)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '10px',
                          color: '#6b7280',
                        }}
                      >
                        QR
                      </div>
                    ) : (
                      <div
                        style={{
                          fontSize: `${f.fontSize || 24}px`,
                          fontWeight: f.fontWeight || 'normal',
                          color: f.color || '#000',
                          fontFamily: f.fontFamily || 'inherit',
                          textAlign: f.textAlign || 'center',
                          whiteSpace: 'nowrap',
                          outline: selected === f.id ? '2px dashed #6366f1' : '2px dashed transparent',
                          outlineOffset: '4px',
                          padding: '2px',
                          cursor: 'grab',
                        }}
                      >
                        {f.label}
                      </div>
                    )}
                    {selected === f.id && (
                      <div className="absolute -top-5 left-1/2 -translate-x-1/2">
                        <Move className="w-3 h-3 text-indigo-500" />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Right panel — inspector */}
          <div className="w-56 shrink-0 border-l border-gray-200 overflow-y-auto p-4">
            {selectedField ? (
              <div className="space-y-3">
                <p className="text-xs font-semibold text-gray-700 uppercase tracking-wide">Inspector</p>
                <p className="text-xs text-gray-500 font-mono">{selectedField.key}</p>

                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Label</label>
                  <input
                    value={selectedField.label}
                    onChange={e => updateField(selectedField.id, { label: e.target.value })}
                    className="w-full text-xs px-2.5 py-1.5 border border-gray-300 rounded-lg"
                  />
                </div>

                {selectedField.type !== 'qr' && (
                  <>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Font Size (px)</label>
                      <input
                        type="number"
                        value={selectedField.fontSize || 24}
                        min={8}
                        max={120}
                        onChange={e => updateField(selectedField.id, { fontSize: parseInt(e.target.value) || 24 })}
                        className="w-full text-xs px-2.5 py-1.5 border border-gray-300 rounded-lg"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Color</label>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={selectedField.color || '#000000'}
                          onChange={e => updateField(selectedField.id, { color: e.target.value })}
                          className="w-8 h-8 p-0.5 border border-gray-300 rounded cursor-pointer"
                        />
                        <input
                          type="text"
                          value={selectedField.color || '#000000'}
                          onChange={e => updateField(selectedField.id, { color: e.target.value })}
                          className="flex-1 text-xs font-mono px-2 py-1.5 border border-gray-300 rounded-lg"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Weight</label>
                      <select
                        value={selectedField.fontWeight || 'normal'}
                        onChange={e => updateField(selectedField.id, { fontWeight: e.target.value as any })}
                        className="w-full text-xs px-2.5 py-1.5 border border-gray-300 rounded-lg"
                      >
                        <option value="normal">Normal</option>
                        <option value="bold">Bold</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Align</label>
                      <select
                        value={selectedField.textAlign || 'center'}
                        onChange={e => updateField(selectedField.id, { textAlign: e.target.value as any })}
                        className="w-full text-xs px-2.5 py-1.5 border border-gray-300 rounded-lg"
                      >
                        <option value="left">Left</option>
                        <option value="center">Center</option>
                        <option value="right">Right</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Font Family</label>
                      <select
                        value={selectedField.fontFamily || ''}
                        onChange={e => updateField(selectedField.id, { fontFamily: e.target.value })}
                        className="w-full text-xs px-2.5 py-1.5 border border-gray-300 rounded-lg"
                      >
                        <option value="">Default</option>
                        <option value="serif">Serif</option>
                        <option value="sans-serif">Sans-serif</option>
                        <option value="monospace">Monospace</option>
                        <option value="Georgia, serif">Georgia</option>
                        <option value="'Times New Roman', serif">Times New Roman</option>
                        <option value="Arial, sans-serif">Arial</option>
                      </select>
                    </div>
                  </>
                )}

                {selectedField.type === 'qr' && (
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">QR Size (px)</label>
                    <input
                      type="number"
                      value={selectedField.width || 80}
                      min={40}
                      max={300}
                      onChange={e => updateField(selectedField.id, { width: parseInt(e.target.value) || 80 })}
                      className="w-full text-xs px-2.5 py-1.5 border border-gray-300 rounded-lg"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Position</label>
                  <div className="grid grid-cols-2 gap-1">
                    <div>
                      <p className="text-xs text-gray-400 mb-0.5">X (%)</p>
                      <input
                        type="number"
                        value={Math.round(selectedField.x)}
                        min={0}
                        max={100}
                        onChange={e => updateField(selectedField.id, { x: parseFloat(e.target.value) || 0 })}
                        className="w-full text-xs px-2 py-1.5 border border-gray-300 rounded-lg"
                      />
                    </div>
                    <div>
                      <p className="text-xs text-gray-400 mb-0.5">Y (%)</p>
                      <input
                        type="number"
                        value={Math.round(selectedField.y)}
                        min={0}
                        max={100}
                        onChange={e => updateField(selectedField.id, { y: parseFloat(e.target.value) || 0 })}
                        className="w-full text-xs px-2 py-1.5 border border-gray-300 rounded-lg"
                      />
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => deleteField(selectedField.id)}
                  className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs text-red-600 border border-red-300 rounded-lg hover:bg-red-50"
                >
                  <Trash2 className="w-3 h-3" /> Remove Field
                </button>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-40 text-center text-gray-400">
                <Move className="w-6 h-6 mb-2 opacity-40" />
                <p className="text-xs">Click a field on the canvas to inspect</p>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between shrink-0 bg-gray-50">
          <p className="text-xs text-gray-400">Drag fields on the canvas to position them. Use inspector (right panel) to adjust style.</p>
          <div className="flex gap-2">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-white">
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving || !name || !slug || !bgUrl || fields.length === 0}
              className="px-5 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
            >
              {saving ? 'Saving…' : 'Save Template'}
            </button>
          </div>
        </div>
      </div>

      {showMediaPicker && (
        <MediaPickerModal
          isOpen={showMediaPicker}
          onClose={() => setShowMediaPicker(false)}
          onSelect={handleImageSelect}
          category="document"
          multiple={false}
        />
      )}
    </div>
  );
};

export default VisualTemplateBuilder;
