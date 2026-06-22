import React from 'react';
import { PastEventMemory } from '@/types/event';
import { Plus, Trash2 } from 'lucide-react';

interface PastEventMemoriesEditorProps {
  memories: PastEventMemory[];
  onChange: (memories: PastEventMemory[]) => void;
}

const PastEventMemoriesEditor: React.FC<PastEventMemoriesEditorProps> = ({ memories, onChange }) => {
  const add = () => onChange([...memories, { image: '', caption: '', participantName: '' }]);

  const update = (index: number, field: keyof PastEventMemory, value: string) => {
    const updated = memories.map((m, i) => i === index ? { ...m, [field]: value } : m);
    onChange(updated);
  };

  const remove = (index: number) => onChange(memories.filter((_, i) => i !== index));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-gray-700">Past Event Memories</h4>
        <button type="button" onClick={add} className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700">
          <Plus className="w-4 h-4" /> Add Memory
        </button>
      </div>

      {memories.length === 0 && (
        <p className="text-sm text-gray-400 italic">No memories added yet. Click "Add Memory" to add photos from past events.</p>
      )}

      {memories.map((memory, index) => (
        <div key={index} className="border border-gray-200 rounded-xl p-4 space-y-3 bg-gray-50">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-gray-500">Memory #{index + 1}</span>
            <button type="button" onClick={() => remove(index)} className="text-red-400 hover:text-red-600">
              <Trash2 className="w-4 h-4" />
            </button>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Image URL *</label>
            <input
              type="text"
              value={memory.image}
              onChange={e => update(index, 'image', e.target.value)}
              placeholder="https://..."
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Caption</label>
              <input
                type="text"
                value={memory.caption || ''}
                onChange={e => update(index, 'caption', e.target.value)}
                placeholder="Event highlight..."
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Participant Name</label>
              <input
                type="text"
                value={memory.participantName || ''}
                onChange={e => update(index, 'participantName', e.target.value)}
                placeholder="Attendee name..."
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {memory.image && (
            <img src={memory.image} alt={memory.caption || 'Memory'} className="w-full h-32 object-cover rounded-lg" onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
          )}
        </div>
      ))}
    </div>
  );
};

export default PastEventMemoriesEditor;
