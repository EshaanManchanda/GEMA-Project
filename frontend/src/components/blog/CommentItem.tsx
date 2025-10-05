import React, { useState } from 'react';
import { FaThumbsUp, FaThumbsDown, FaReply, FaEdit, FaTrash, FaFlag, FaChevronDown, FaChevronUp } from 'react-icons/fa';
import { BlogComment } from '../../types/blog';
import CommentForm from './CommentForm';
import { formatDistanceToNow } from 'date-fns';

interface CommentItemProps {
  comment: BlogComment;
  currentUserId?: string;
  onReply: (commentId: string, content: string) => Promise<void>;
  onEdit: (commentId: string, content: string) => Promise<void>;
  onDelete: (commentId: string) => Promise<void>;
  onLike: (commentId: string) => Promise<void>;
  onDislike: (commentId: string) => Promise<void>;
  onReport: (commentId: string) => Promise<void>;
  onLoadReplies?: (commentId: string) => Promise<void>;
  depth?: number;
}

const CommentItem: React.FC<CommentItemProps> = ({
  comment,
  currentUserId,
  onReply,
  onEdit,
  onDelete,
  onLike,
  onDislike,
  onReport,
  onLoadReplies,
  depth = 0
}) => {
  const [showReplyForm, setShowReplyForm] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [showReplies, setShowReplies] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const isOwn = currentUserId && comment.author._id === currentUserId;
  const isDeleted = comment.status === 'deleted';
  const maxDepth = 3; // Maximum nesting level for replies

  const handleReplySubmit = async (content: string) => {
    setActionLoading('reply');
    try {
      await onReply(comment._id, content);
      setShowReplyForm(false);
    } finally {
      setActionLoading(null);
    }
  };

  const handleEditSubmit = async (content: string) => {
    setActionLoading('edit');
    try {
      await onEdit(comment._id, content);
      setIsEditing(false);
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this comment?')) {
      return;
    }

    setActionLoading('delete');
    try {
      await onDelete(comment._id);
    } finally {
      setActionLoading(null);
    }
  };

  const handleLike = async () => {
    setActionLoading('like');
    try {
      await onLike(comment._id);
    } finally {
      setActionLoading(null);
    }
  };

  const handleDislike = async () => {
    setActionLoading('dislike');
    try {
      await onDislike(comment._id);
    } finally {
      setActionLoading(null);
    }
  };

  const handleReport = async () => {
    const reason = window.prompt('Please provide a reason for reporting this comment (optional):');
    if (reason === null) return; // User cancelled

    setActionLoading('report');
    try {
      await onReport(comment._id);
      alert('Comment reported successfully. Our team will review it shortly.');
    } finally {
      setActionLoading(null);
    }
  };

  const toggleReplies = () => {
    if (!showReplies && comment.replies && comment.replies.length === 0 && onLoadReplies) {
      onLoadReplies(comment._id);
    }
    setShowReplies(!showReplies);
  };

  const formatTimeAgo = (dateString: string): string => {
    try {
      return formatDistanceToNow(new Date(dateString), { addSuffix: true });
    } catch {
      return 'recently';
    }
  };

  return (
    <div className={`${depth > 0 ? 'ml-6 sm:ml-10' : ''} mb-4`}>
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        {/* Comment Header */}
        <div className="flex items-start gap-3 mb-3">
          {comment.author.avatar ? (
            <img
              src={comment.author.avatar}
              alt={comment.author.name}
              className="w-10 h-10 rounded-full object-cover flex-shrink-0"
            />
          ) : (
            <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center flex-shrink-0">
              <span className="text-sm font-bold text-primary-600">
                {comment.author.name.charAt(0).toUpperCase()}
              </span>
            </div>
          )}

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-gray-900">{comment.author.name}</span>
              <span className="text-xs text-gray-500">•</span>
              <span className="text-xs text-gray-500">{formatTimeAgo(comment.createdAt)}</span>
              {comment.isEdited && (
                <>
                  <span className="text-xs text-gray-500">•</span>
                  <span className="text-xs text-gray-500 italic">edited</span>
                </>
              )}
              {comment.status === 'flagged' && (
                <span className="text-xs px-2 py-0.5 bg-yellow-100 text-yellow-800 rounded-full">
                  Flagged
                </span>
              )}
            </div>

            {/* Comment Content */}
            {isEditing ? (
              <div className="mt-3">
                <CommentForm
                  onSubmit={handleEditSubmit}
                  onCancel={() => setIsEditing(false)}
                  placeholder="Edit your comment..."
                  submitText="Save Changes"
                  initialValue={comment.content}
                  isEdit
                />
              </div>
            ) : (
              <p className="mt-2 text-gray-700 whitespace-pre-wrap break-words">
                {isDeleted ? <em className="text-gray-400">{comment.content}</em> : comment.content}
              </p>
            )}
          </div>
        </div>

        {/* Comment Actions */}
        {!isDeleted && !isEditing && (
          <div className="flex items-center gap-4 flex-wrap mt-3 pt-3 border-t border-gray-100">
            {/* Like Button */}
            <button
              onClick={handleLike}
              disabled={actionLoading === 'like'}
              className={`flex items-center gap-1.5 text-sm transition-colors ${
                actionLoading === 'like'
                  ? 'text-gray-400 cursor-not-allowed'
                  : 'text-gray-600 hover:text-primary-600'
              }`}
            >
              <FaThumbsUp size={14} />
              <span>{comment.likeCount}</span>
            </button>

            {/* Dislike Button */}
            <button
              onClick={handleDislike}
              disabled={actionLoading === 'dislike'}
              className={`flex items-center gap-1.5 text-sm transition-colors ${
                actionLoading === 'dislike'
                  ? 'text-gray-400 cursor-not-allowed'
                  : 'text-gray-600 hover:text-red-600'
              }`}
            >
              <FaThumbsDown size={14} />
              <span>{comment.dislikeCount}</span>
            </button>

            {/* Reply Button */}
            {depth < maxDepth && currentUserId && (
              <button
                onClick={() => setShowReplyForm(!showReplyForm)}
                className="flex items-center gap-1.5 text-sm text-gray-600 hover:text-primary-600 transition-colors"
              >
                <FaReply size={14} />
                <span>Reply</span>
              </button>
            )}

            {/* Edit Button (own comments only) */}
            {isOwn && (
              <button
                onClick={() => setIsEditing(true)}
                disabled={actionLoading === 'edit'}
                className="flex items-center gap-1.5 text-sm text-gray-600 hover:text-primary-600 transition-colors"
              >
                <FaEdit size={14} />
                <span>Edit</span>
              </button>
            )}

            {/* Delete Button (own comments only) */}
            {isOwn && (
              <button
                onClick={handleDelete}
                disabled={actionLoading === 'delete'}
                className="flex items-center gap-1.5 text-sm text-gray-600 hover:text-red-600 transition-colors"
              >
                <FaTrash size={14} />
                <span>Delete</span>
              </button>
            )}

            {/* Report Button (not own comments) */}
            {!isOwn && currentUserId && (
              <button
                onClick={handleReport}
                disabled={actionLoading === 'report' || comment.isReported}
                className={`flex items-center gap-1.5 text-sm transition-colors ${
                  comment.isReported
                    ? 'text-gray-400 cursor-not-allowed'
                    : 'text-gray-600 hover:text-yellow-600'
                }`}
              >
                <FaFlag size={14} />
                <span>{comment.isReported ? 'Reported' : 'Report'}</span>
              </button>
            )}

            {/* Replies Toggle */}
            {comment.replyCount > 0 && (
              <button
                onClick={toggleReplies}
                className="flex items-center gap-1.5 text-sm text-primary-600 hover:text-primary-700 transition-colors ml-auto"
              >
                {showReplies ? <FaChevronUp size={12} /> : <FaChevronDown size={12} />}
                <span>
                  {showReplies ? 'Hide' : 'Show'} {comment.replyCount} {comment.replyCount === 1 ? 'reply' : 'replies'}
                </span>
              </button>
            )}
          </div>
        )}

        {/* Reply Form */}
        {showReplyForm && currentUserId && !isDeleted && (
          <div className="mt-4 pt-4 border-t border-gray-100">
            <CommentForm
              onSubmit={handleReplySubmit}
              onCancel={() => setShowReplyForm(false)}
              placeholder="Write a reply..."
              submitText="Post Reply"
              isReply
            />
          </div>
        )}
      </div>

      {/* Nested Replies */}
      {showReplies && comment.replies && comment.replies.length > 0 && (
        <div className="mt-4">
          {comment.replies.map((reply) => (
            <CommentItem
              key={reply._id}
              comment={reply}
              currentUserId={currentUserId}
              onReply={onReply}
              onEdit={onEdit}
              onDelete={onDelete}
              onLike={onLike}
              onDislike={onDislike}
              onReport={onReport}
              onLoadReplies={onLoadReplies}
              depth={depth + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default CommentItem;
