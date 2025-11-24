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
            Paste your HTML code below. The editor will parse and render it as formatted content.
          </p>
          <textarea
            value={htmlContent}
            onChange={(e) => setHtmlContent(e.target.value)}
            className="w-full min-h-[400px] p-4 font-mono text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y text-gray-900"
            placeholder="<h1>Your heading here</h1>
<p>Your paragraph with <strong>bold text</strong>.</p>
<ul>
  <li>List item 1</li>
  <li>List item 2</li>
</ul>"
          />
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <p className="text-xs text-blue-800">
            <strong>Tip:</strong> You can paste complete HTML snippets including headings, paragraphs, lists, bold text, links, and more.
            Dangerous content like scripts will be automatically removed for security.
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
