import React, { useState } from 'react';
import { FaPlus, FaTrash, FaImage, FaUser, FaQuoteLeft } from 'react-icons/fa';
import MediaPickerModal from '../admin/media/MediaPickerModal';
import { MediaAsset } from '@/store/slices/mediaSlice';
import { PastEventMemory } from '@/types/event';

interface PastEventMemoriesEditorProps {
  memories: PastEventMemory[];
  onChange: (memories: PastEventMemory[]) => void;
}

const PastEventMemoriesEditor: React.FC<PastEventMemoriesEditorProps> = ({ memories, onChange }) => {
  const [isMediaPickerOpen, setIsMediaPickerOpen] = useState(false);
  const [activeMemoryIndex, setActiveMemoryIndex] = useState<number | null>(null);

  const addMemory = () => {
    onChange([...memories, { image: '', caption: '', participantName: '' }]);
  };

  const removeMemory = (index: number) => {
    const newMemories = [...memories];
    newMemories.splice(index, 1);
    onChange(newMemories);
  };

  const updateMemory = (index: number, field: keyof PastEventMemory, value: string) => {
    const newMemories = [...memories];
    newMemories[index] = { ...newMemories[index], [field]: value };
    onChange(newMemories);
  };

  const handleMediaSelect = (assets: MediaAsset[]) => {
    if (assets.length > 0 && activeMemoryIndex !== null) {
      updateMemory(activeMemoryIndex, 'image', assets[0].url);
    }
    setIsMediaPickerOpen(false);
    setActiveMemoryIndex(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Past Event Memories</h3>
          <p className="text-sm text-gray-500">Add pictures and testimonials from participants of previous events.</p>
        </div>
        <button
          type="button"
          onClick={addMemory}
          className="flex items-center gap-2 px-4 py-2 bg-primary-50 text-primary-600 rounded-lg hover:bg-primary-100 transition-colors font-medium text-sm"
        >
          <FaPlus /> Add Memory
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {memories.map((memory, index) => (
          <div key={index} className="relative bg-white border border-gray-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow">
            <button
              type="button"
              onClick={() => removeMemory(index)}
              className="absolute -top-2 -right-2 w-8 h-8 bg-red-50 text-red-500 rounded-full flex items-center justify-center hover:bg-red-100 transition-colors shadow-sm z-10"
            >
              <FaTrash size={12} />
            </button>

            <div className="flex flex-col gap-4">
              {/* Image Selection */}
              <div
                onClick={() => {
                  setActiveMemoryIndex(index);
                  setIsMediaPickerOpen(true);
                }}
                className="relative aspect-video bg-gray-50 rounded-xl border-2 border-dashed border-gray-200 flex flex-col items-center justify-center cursor-pointer hover:bg-gray-100 transition-all overflow-hidden group"
              >
                {memory.image ? (
                  <>
                    <img src={memory.image} alt="Memory" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <span className="text-white text-sm font-medium flex items-center gap-2">
                        <FaImage /> Change Image
                      </span>
                    </div>
                  </>
                ) : (
                  <>
                    <FaImage className="text-gray-400 text-3xl mb-2" />
                    <span className="text-gray-500 text-xs text-center px-4">Click to select image from media library</span>
                  </>
                )}
              </div>

              {/* Participant Name */}
              <div className="relative">
                <div className="absolute top-3.5 left-3 text-gray-400">
                  <FaUser size={14} />
                </div>
                <input
                  type="text"
                  value={memory.participantName || ''}
                  onChange={(e) => updateMemory(index, 'participantName', e.target.value)}
                  placeholder="Participant Name (optional)"
                  className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>

              {/* Caption/Testimonial */}
              <div className="relative">
                <div className="absolute top-3.5 left-3 text-gray-400">
                  <FaQuoteLeft size={14} />
                </div>
                <textarea
                  value={memory.caption || ''}
                  onChange={(e) => updateMemory(index, 'caption', e.target.value)}
                  placeholder="Short testimonial or caption..."
                  rows={3}
                  className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
                />
              </div>
            </div>
          </div>
        ))}

        {memories.length === 0 && (
          <div className="md:col-span-2 py-12 border-2 border-dashed border-gray-200 rounded-2xl flex flex-col items-center justify-center text-gray-400">
            <FaImage size={40} className="mb-4 opacity-20" />
            <p className="text-sm">No memories added yet. Share some past event highlights!</p>
          </div>
        )}
      </div>

      {isMediaPickerOpen && (
        <MediaPickerModal
          isOpen={isMediaPickerOpen}
          onClose={() => {
            setIsMediaPickerOpen(false);
            setActiveMemoryIndex(null);
          }}
          onSelect={handleMediaSelect}
          multiple={false}
        />
      )}
    </div>
  );
};

export default PastEventMemoriesEditor;
