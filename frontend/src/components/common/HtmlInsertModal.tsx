import React, { useState } from 'react';
import { Code2 } from 'lucide-react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import toast from 'react-hot-toast';

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
      console.error('Failed to insert HTML:', error);
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

<!-- Example grid layout -->
<div class="blog-grid-2">
  <div class="blog-card">
    <h3>Card 1</h3>
    <ul>
      <li>Item 1</li>
      <li>Item 2</li>
    </ul>
  </div>
  <div class="blog-card">
    <h3>Card 2</h3>
    <p>Content here</p>
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
