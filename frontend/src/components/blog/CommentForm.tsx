import React, { useState } from 'react';
import { FaPaperPlane, FaTimes } from 'react-icons/fa';

interface CommentFormProps {
  onSubmit: (content: string) => Promise<void>;
  onCancel?: () => void;
  placeholder?: string;
  submitText?: string;
  initialValue?: string;
  isReply?: boolean;
  isEdit?: boolean;
}

const CommentForm: React.FC<CommentFormProps> = ({
  onSubmit,
  onCancel,
  placeholder = 'Write your comment...',
  submitText = 'Post Comment',
  initialValue = '',
  isReply = false,
  isEdit = false
}) => {
  const [content, setContent] = useState(initialValue);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const maxLength = 1000;
  const remainingChars = maxLength - content.length;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!content.trim()) {
      setError('Comment cannot be empty');
      return;
    }

    if (content.length > maxLength) {
      setError(`Comment cannot exceed ${maxLength} characters`);
      return;
    }

    setError(null);
    setIsSubmitting(true);

    try {
      await onSubmit(content.trim());
      setContent('');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to post comment');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    setContent(initialValue);
    setError(null);
    if (onCancel) {
      onCancel();
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="relative">
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder={placeholder}
          rows={isReply ? 3 : 4}
          maxLength={maxLength}
          className={`w-full px-4 py-3 border rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-primary-500 transition-colors ${
            error ? 'border-red-500' : 'border-gray-300'
          }`}
          disabled={isSubmitting}
        />
        <div className="absolute bottom-2 right-2 text-xs text-gray-400">
          {remainingChars} characters remaining
        </div>
      </div>

      {error && (
        <p className="text-sm text-red-600">{error}</p>
      )}

      <div className="flex items-center gap-2">
        <button
          type="submit"
          disabled={isSubmitting || !content.trim()}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-white font-medium transition-colors ${
            isSubmitting || !content.trim()
              ? 'bg-gray-400 cursor-not-allowed'
              : 'bg-primary-600 hover:bg-primary-700'
          }`}
          style={!isSubmitting && content.trim() ? { backgroundColor: 'var(--primary-color)' } : {}}
        >
          {isSubmitting ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              <span>Posting...</span>
            </>
          ) : (
            <>
              <FaPaperPlane size={14} />
              <span>{submitText}</span>
            </>
          )}
        </button>

        {onCancel && (
          <button
            type="button"
            onClick={handleCancel}
            disabled={isSubmitting}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-gray-600 font-medium border border-gray-300 hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <FaTimes size={14} />
            <span>Cancel</span>
          </button>
        )}
      </div>

      {isReply && (
        <p className="text-xs text-gray-500">
          Press Enter to submit, or Shift+Enter for a new line
        </p>
      )}
    </form>
  );
};

export default CommentForm;
