import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import {
  MessageCircle,
  Send,
  Reply,
  ThumbsUp,
  ThumbsDown,
  Edit,
  Trash2,
  Flag,
  User,
  Calendar,
  MoreVertical
} from 'lucide-react';
import Button from '../ui/Button';
import { Card, CardContent } from '../ui/Card';
import Modal from '../ui/Modal';
import toast from 'react-hot-toast';
import { RootState } from '../../store';

interface Comment {
  _id: string;
  content: string;
  author: {
    _id: string;
    name: string;
    avatar?: string;
    email: string;
  };
  blogPost: string;
  parentComment?: string;
  replies?: Comment[];
  likes: string[];
  dislikes: string[];
  isEdited: boolean;
  isReported: boolean;
  createdAt: string;
  updatedAt: string;
}

interface CommentSectionProps {
  blogPostId: string;
  commentsCount?: number;
  onCommentsCountChange?: (count: number) => void;
}

const CommentSection: React.FC<CommentSectionProps> = ({
  blogPostId,
  commentsCount = 0,
  onCommentsCountChange
}) => {
  const { user, isAuthenticated } = useSelector((state: RootState) => state.auth);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [replyTo, setReplyTo] = useState<string>('');
  const [replyContent, setReplyContent] = useState('');
  const [editingComment, setEditingComment] = useState<string>('');
  const [editContent, setEditContent] = useState('');
  const [showLoginModal, setShowLoginModal] = useState(false);

  useEffect(() => {
    fetchComments();
  }, [blogPostId]);

  const fetchComments = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/blog/posts/${blogPostId}/comments`);
      const data = await response.json();

      if (data.success) {
        setComments(data.data.comments || []);
        onCommentsCountChange?.(data.data.comments?.length || 0);
      }
    } catch (error) {
      console.error('Error fetching comments:', error);
      toast.error('Failed to load comments');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitComment = async () => {
    if (!isAuthenticated) {
      setShowLoginModal(true);
      return;
    }

    if (!newComment.trim()) {
      toast.error('Please write a comment');
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch(`/api/blog/posts/${blogPostId}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          content: newComment.trim()
        })
      });

      const data = await response.json();

      if (data.success) {
        setNewComment('');
        await fetchComments();
        toast.success('Comment posted successfully!');
      } else {
        toast.error(data.message || 'Failed to post comment');
      }
    } catch (error) {
      console.error('Error posting comment:', error);
      toast.error('Failed to post comment');
    } finally {
      setSubmitting(false);
    }
  };

  const handleReply = async (parentCommentId: string) => {
    if (!isAuthenticated) {
      setShowLoginModal(true);
      return;
    }

    if (!replyContent.trim()) {
      toast.error('Please write a reply');
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch(`/api/blog/posts/${blogPostId}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          content: replyContent.trim(),
          parentComment: parentCommentId
        })
      });

      const data = await response.json();

      if (data.success) {
        setReplyTo('');
        setReplyContent('');
        await fetchComments();
        toast.success('Reply posted successfully!');
      } else {
        toast.error(data.message || 'Failed to post reply');
      }
    } catch (error) {
      console.error('Error posting reply:', error);
      toast.error('Failed to post reply');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEditComment = async (commentId: string) => {
    if (!editContent.trim()) {
      toast.error('Comment cannot be empty');
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch(`/api/blog/comments/${commentId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          content: editContent.trim()
        })
      });

      const data = await response.json();

      if (data.success) {
        setEditingComment('');
        setEditContent('');
        await fetchComments();
        toast.success('Comment updated successfully!');
      } else {
        toast.error(data.message || 'Failed to update comment');
      }
    } catch (error) {
      console.error('Error updating comment:', error);
      toast.error('Failed to update comment');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!confirm('Are you sure you want to delete this comment?')) {
      return;
    }

    try {
      const response = await fetch(`/api/blog/comments/${commentId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      const data = await response.json();

      if (data.success) {
        await fetchComments();
        toast.success('Comment deleted successfully!');
      } else {
        toast.error(data.message || 'Failed to delete comment');
      }
    } catch (error) {
      console.error('Error deleting comment:', error);
      toast.error('Failed to delete comment');
    }
  };

  const handleLikeComment = async (commentId: string) => {
    if (!isAuthenticated) {
      setShowLoginModal(true);
      return;
    }

    try {
      const response = await fetch(`/api/blog/comments/${commentId}/like`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      const data = await response.json();

      if (data.success) {
        await fetchComments();
      } else {
        toast.error(data.message || 'Failed to like comment');
      }
    } catch (error) {
      console.error('Error liking comment:', error);
      toast.error('Failed to like comment');
    }
  };

  const handleReportComment = async (commentId: string) => {
    if (!isAuthenticated) {
      setShowLoginModal(true);
      return;
    }

    try {
      const response = await fetch(`/api/blog/comments/${commentId}/report`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      const data = await response.json();

      if (data.success) {
        toast.success('Comment reported successfully');
      } else {
        toast.error(data.message || 'Failed to report comment');
      }
    } catch (error) {
      console.error('Error reporting comment:', error);
      toast.error('Failed to report comment');
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const canEditComment = (comment: Comment) => {
    return isAuthenticated && user?._id === comment.author._id;
  };

  const renderComment = (comment: Comment, isReply = false) => (
    <div key={comment._id} className={`${isReply ? 'ml-12' : ''} mb-4`}>
      <Card>
        <CardContent className="p-4">
          <div className="flex justify-between items-start mb-3">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
                {comment.author.avatar ? (
                  <img
                    src={comment.author.avatar}
                    alt={comment.author.name}
                    className="w-8 h-8 rounded-full object-cover"
                  />
                ) : (
                  <User className="w-4 h-4 text-gray-600" />
                )}
              </div>
              <div>
                <h4 className="font-medium text-sm text-gray-900">
                  {comment.author.name}
                </h4>
                <div className="flex items-center text-xs text-gray-500">
                  <Calendar className="w-3 h-3 mr-1" />
                  {formatDate(comment.createdAt)}
                  {comment.isEdited && <span className="ml-2">(edited)</span>}
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              {canEditComment(comment) && (
                <>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setEditingComment(comment._id);
                      setEditContent(comment.content);
                    }}
                  >
                    <Edit className="w-3 h-3" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeleteComment(comment._id)}
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </>
              )}
              {isAuthenticated && user?._id !== comment.author._id && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleReportComment(comment._id)}
                >
                  <Flag className="w-3 h-3" />
                </Button>
              )}
            </div>
          </div>

          {editingComment === comment._id ? (
            <div className="space-y-3">
              <textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={3}
                placeholder="Edit your comment..."
              />
              <div className="flex space-x-2">
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => handleEditComment(comment._id)}
                  loading={submitting}
                >
                  Save
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    setEditingComment('');
                    setEditContent('');
                  }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <>
              <p className="text-gray-800 mb-3">{comment.content}</p>

              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <button
                    onClick={() => handleLikeComment(comment._id)}
                    className={`flex items-center space-x-1 text-sm ${
                      comment.likes.includes(user?._id || '')
                        ? 'text-blue-600'
                        : 'text-gray-500 hover:text-blue-600'
                    }`}
                  >
                    <ThumbsUp className="w-4 h-4" />
                    <span>{comment.likes.length}</span>
                  </button>

                  {!isReply && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setReplyTo(comment._id)}
                    >
                      <Reply className="w-4 h-4 mr-1" />
                      Reply
                    </Button>
                  )}
                </div>
              </div>

              {replyTo === comment._id && (
                <div className="mt-4 p-3 bg-gray-50 rounded-md">
                  <textarea
                    value={replyContent}
                    onChange={(e) => setReplyContent(e.target.value)}
                    className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    rows={2}
                    placeholder="Write a reply..."
                  />
                  <div className="flex space-x-2 mt-2">
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => handleReply(comment._id)}
                      loading={submitting}
                    >
                      Reply
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => {
                        setReplyTo('');
                        setReplyContent('');
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Render replies */}
      {comment.replies && comment.replies.length > 0 && (
        <div className="mt-4">
          {comment.replies.map(reply => renderComment(reply, true))}
        </div>
      )}
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Comments Header */}
      <div className="flex items-center space-x-2">
        <MessageCircle className="w-5 h-5 text-gray-600" />
        <h3 className="text-lg font-semibold text-gray-900">
          Comments ({comments.length})
        </h3>
      </div>

      {/* Add Comment Form */}
      <Card>
        <CardContent className="p-4">
          {isAuthenticated ? (
            <div className="space-y-4">
              <div className="flex items-start space-x-3">
                <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
                  {user?.avatar ? (
                    <img
                      src={user.avatar}
                      alt={user.name}
                      className="w-8 h-8 rounded-full object-cover"
                    />
                  ) : (
                    <User className="w-4 h-4 text-gray-600" />
                  )}
                </div>
                <div className="flex-1">
                  <textarea
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    rows={3}
                    placeholder="Share your thoughts..."
                  />
                </div>
              </div>

              <div className="flex justify-end">
                <Button
                  variant="primary"
                  onClick={handleSubmitComment}
                  loading={submitting}
                  disabled={!newComment.trim()}
                >
                  <Send className="w-4 h-4 mr-2" />
                  Post Comment
                </Button>
              </div>
            </div>
          ) : (
            <div className="text-center py-6">
              <p className="text-gray-600 mb-4">
                Please sign in to leave a comment
              </p>
              <Button
                variant="primary"
                onClick={() => setShowLoginModal(true)}
              >
                Sign In
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Comments List */}
      {loading ? (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading comments...</p>
        </div>
      ) : comments.length > 0 ? (
        <div className="space-y-4">
          {comments.filter(comment => !comment.parentComment).map(comment => renderComment(comment))}
        </div>
      ) : (
        <div className="text-center py-8">
          <MessageCircle className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No comments yet</h3>
          <p className="text-gray-500">Be the first to share your thoughts!</p>
        </div>
      )}

      {/* Login Modal */}
      <Modal
        isOpen={showLoginModal}
        onClose={() => setShowLoginModal(false)}
        title="Sign In Required"
      >
        <div className="text-center py-6">
          <p className="text-gray-600 mb-4">
            You need to be signed in to interact with comments.
          </p>
          <div className="space-x-3">
            <Button
              variant="primary"
              onClick={() => {
                setShowLoginModal(false);
                // Navigate to login page
                window.location.href = '/login';
              }}
            >
              Sign In
            </Button>
            <Button
              variant="secondary"
              onClick={() => setShowLoginModal(false)}
            >
              Cancel
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default CommentSection;