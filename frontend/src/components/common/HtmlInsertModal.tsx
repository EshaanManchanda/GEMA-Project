import React, { useState } from 'react';
import { Code2 } from 'lucide-react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import toast from 'react-hot-toast';
import { logger } from '../../utils/logger';

interface HtmlInsertModalProps {
  isOpen: boolean;
  onClose: () => void;
  onInsert: (html: string) => void;
}

const HtmlInsertModal: React.FC<HtmlInsertModalProps> = ({ isOpen, onClose, onInsert }) => {
  const [htmlContent, setHtmlContent] = useState('');

  const handleInsert = () => {
    if (!htmlContent.trim()) {
      toast.error('Please enter some HTML content');
      return;
    }

    try {
      onInsert(htmlContent);
      setHtmlContent('');
      onClose();
      toast.success('HTML inserted successfully');
    } catch (error) {
      logger.error('Failed to insert HTML:', error);
      toast.error('Failed to insert HTML. Please check the format.');
    }
  };

  const handleClose = () => {
    setHtmlContent('');
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Insert HTML Content" size="lg">
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            HTML Content
          </label>
          <p className="text-xs text-gray-500 mb-2">
            Insert custom HTML with your own classes or use built-in utility classes like <code className="bg-gray-100 px-1 rounded">.blog-grid-2</code>, <code className="bg-gray-100 px-1 rounded">.blog-callout-info</code>, etc.
          </p>
          <textarea
            value={htmlContent}
            onChange={(e) => setHtmlContent(e.target.value)}
            className="w-full min-h-[400px] p-4 font-mono text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y text-gray-900"
            placeholder='<!-- Example with custom class -->
              <div class="my-custom-box">
                <h2>Your Heading</h2>
                <p>Your paragraph with <strong>bold text</strong>.</p>
              </div>

              <!-- Example with built-in utility class -->
              <div class="blog-callout-info">
                <p>This is an info callout box</p>
              </div>

              <!-- 3-Column Grid with Cards -->
              <div class="blog-grid-3">
                <div class="blog-card">
                  <h3>1] The Dubai Mall - KidZania</h3>
                  <p><strong>Address:</strong> The Dubai Mall, Downtown Dubai</p>
                  <p><strong>Ages:</strong> 2-16</p>
                  <p><strong>Cost:</strong> AED 95 – 130 (School group rates)</p>
                  <hr>
                  <p><strong>Events:</strong> 40+ real-world role-play activities (Firefighter, Pilot, Doctor, Chef).</p>
                  <a href="#" class="blog-button-outline">View Details</a>
                </div>

                <div class="blog-card">
                  <h3>2] Dubai Aquarium & Underwater Zoo</h3>
                  <p><strong>Address:</strong> The Dubai Mall, Downtown Dubai</p>
                  <p><strong>Ages:</strong> 3-18</p>
                  <p><strong>Cost:</strong> AED 60 – 100 (Education rates)</p>
                  <hr>
                  <p><strong>Events:</strong> Ocean School Program, 48m shark tunnel walk, Glass Bottom Boat tours, and Penguin Cove.</p>
                  <a href="#" class="blog-button-outline">View Details</a>
                </div>

                <div class="blog-card">
                  <h3>3] Leo&Loona - Dubai Festival City</h3>
                  <p><strong>Address:</strong> Dubai Festival City Mall, 2nd Floor</p>
                  <p><strong>Ages:</strong> 2-12</p>
                  <p><strong>Cost:</strong> AED 80 – 150 per child</p>
                  <hr>
                  <p><strong>Events:</strong> Large indoor soft play area, trampolines, slides, and creative masterclasses (slime making, cooking).</p>
                  <a href="#" class="blog-button-outline">View Details</a>
                </div>
              </div>'
          />
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 space-y-2">
          <p className="text-xs text-blue-800">
            <strong>💡 Custom Classes:</strong> Define styles in the "Custom CSS" field, then reference them here with <code className="bg-blue-100 px-1 rounded">class="your-class"</code>.
          </p>
          <p className="text-xs text-blue-800">
            <strong>🎨 Built-in Classes:</strong> <code className="bg-blue-100 px-1 rounded">.blog-grid-2</code>, <code className="bg-blue-100 px-1 rounded">.blog-grid-3</code>, <code className="bg-blue-100 px-1 rounded">.blog-callout-info</code>, <code className="bg-blue-100 px-1 rounded">.blog-card</code>, and 40+ more utility classes available.
          </p>
          <p className="text-xs text-blue-700">
            <strong>🔒 Security:</strong> Scripts and dangerous content automatically removed.
          </p>
        </div>

        <div className="flex justify-end space-x-3 pt-2">
          <Button variant="secondary" onClick={handleClose} type="button">
            Cancel
          </Button>
          <Button variant="primary" onClick={handleInsert} type="button">
            <Code2 className="w-4 h-4 mr-2" />
            Insert HTML
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default HtmlInsertModal;
