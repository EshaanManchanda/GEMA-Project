import React, { useState, useEffect } from 'react';
import { FaComments, FaSpinner, FaSignInAlt, FaSort } from 'react-icons/fa';
import { Link } from 'react-router-dom';
import blogAPI from '../../services/api/blogAPI';
import { BlogComment, CommentStats } from '../../types/blog';
import CommentForm from './CommentForm';
import CommentItem from './CommentItem';

interface CommentSectionProps {
  blogPostId: string;
  currentUserId?: string;
  isAuthenticated: boolean;
}

type SortOption = 'newest' | 'oldest' | 'likes';

const CommentSection: React.FC<CommentSectionProps> = ({
  blogPostId,
  currentUserId,
  isAuthenticated
}) => {
  const [comments, setComments] = useState<BlogComment[]>([]);
  const [stats, setStats] = useState<CommentStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<SortOption>('newest');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);

  // Fetch comments
  const fetchComments = async (resetPagination = false) => {
    try {
      setLoading(true);
      setError(null);

      const currentPage = resetPagination ? 1 : page;
      const response = await blogAPI.comments.getComments(blogPostId, {
        page: currentPage,
        limit: 10,
        sort: sortBy
      });

      if (response.success) {
        setComments(response.comments || []);
        setStats(response.stats || null);
        setHasMore(response.pagination.page < Math.ceil(response.pagination.total / 10));
        if (resetPagination) setPage(1);
      }
    } catch (err: any) {
      setError(err.response?.message || 'Failed to load comments');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchComments(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [blogPostId, sortBy]);

  // Create new comment
  const handleCreateComment = async (content: string) => {
    try {
      await blogAPI.comments.createComment(blogPostId, content);
      // Refresh comments after creating
      await fetchComments(true);
    } catch (err: any) {
      throw err;
    }
  };

  // Reply to comment
  const handleReply = async (parentCommentId: string, content: string) => {
    try {
      await blogAPI.comments.createComment(blogPostId, content, parentCommentId);
      // Refresh comments after reply
      await fetchComments(true);
    } catch (err: any) {
      throw err;
    }
  };

  // Edit comment
  const handleEdit = async (commentId: string, content: string) => {
    try {
      await blogAPI.comments.updateComment(commentId, content);
      // Refresh comments after edit
      await fetchComments();
    } catch (err: any) {
      throw err;
    }
  };

  // Delete comment
  const handleDelete = async (commentId: string) => {
    try {
      await blogAPI.comments.deleteComment(commentId);
      // Refresh comments after delete
      await fetchComments(true);
    } catch (err: any) {
      alert(err.response?.message || 'Failed to delete comment');
    }
  };

  // Like comment
  const handleLike = async (commentId: string) => {
    try {
      await blogAPI.comments.likeComment(commentId);
      // Refresh comments to update like counts
      await fetchComments();
    } catch (err: any) {
      // Silently handle like errors
    }
  };

  // Dislike comment
  const handleDislike = async (commentId: string) => {
    try {
      await blogAPI.comments.dislikeComment(commentId);
      // Refresh comments to update dislike counts
      await fetchComments();
    } catch (err: any) {
      // Silently handle dislike errors
    }
  };

  // Report comment
  const handleReport = async (commentId: string) => {
    try {
      await blogAPI.comments.reportComment(commentId);
      // Refresh comments to update report status
      await fetchComments();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to report comment');
    }
  };

  // Load more comments
  const handleLoadMore = () => {
    setPage(page + 1);
    fetchComments();
  };

  return (
    <section className="mt-12 mb-12">
      {/* Section Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <FaComments className="text-2xl text-primary-600" style={{ color: 'var(--primary-color)' }} />
          <h2 className="text-2xl font-bold text-gray-900">
            Comments {stats && `(${stats.totalComments})`}
          </h2>
        </div>

        {/* Sort Dropdown */}
        {comments.length > 0 && (
          <div className="flex items-center gap-2">
            <FaSort className="text-gray-400" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
              className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
              <option value="likes">Most Liked</option>
            </select>
          </div>
        )}
      </div>

      {/* Comment Form or Login Prompt */}
      <div className="mb-8">
        {isAuthenticated ? (
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="text-lg font-semibold mb-3 text-gray-900">Leave a Comment</h3>
            <CommentForm
              onSubmit={handleCreateComment}
              placeholder="Share your thoughts..."
              submitText="Post Comment"
            />
          </div>
        ) : (
          <div className="bg-gray-50 border-2 border-dashed border-gray-300 p-8 rounded-lg text-center">
            <FaSignInAlt className="mx-auto text-4xl text-gray-400 mb-3" />
            <h3 className="text-lg font-semibold mb-2 text-gray-900">Sign in to Comment</h3>
            <p className="text-gray-600 mb-4">
              You need to be logged in to leave a comment
            </p>
            <Link
              to="/login"
              className="inline-block px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
              style={{ backgroundColor: 'var(--primary-color)' }}
            >
              Sign In
            </Link>
          </div>
        )}
      </div>

      {/* Comments List */}
      {loading && comments.length === 0 ? (
        <div className="flex items-center justify-center py-12">
          <FaSpinner className="animate-spin text-3xl text-primary-600" />
          <span className="ml-3 text-gray-600">Loading comments...</span>
        </div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <p className="text-red-600 font-medium mb-2">Failed to Load Comments</p>
          <p className="text-red-500 text-sm mb-4">{error}</p>
          <button
            onClick={() => fetchComments(true)}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            Try Again
          </button>
        </div>
      ) : comments.length === 0 ? (
        <div className="bg-gray-50 rounded-lg p-12 text-center">
          <FaComments className="mx-auto text-5xl text-gray-300 mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 mb-2">No Comments Yet</h3>
          <p className="text-gray-600">
            Be the first to share your thoughts!
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {comments.map((comment) => (
            <CommentItem
              key={comment._id}
              comment={comment}
              currentUserId={currentUserId}
              onReply={handleReply}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onLike={handleLike}
              onDislike={handleDislike}
              onReport={handleReport}
            />
          ))}

          {/* Load More Button */}
          {hasMore && (
            <div className="text-center pt-4">
              <button
                onClick={handleLoadMore}
                disabled={loading}
                className="px-6 py-2 border-2 border-primary-600 text-primary-600 rounded-lg hover:bg-primary-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ borderColor: 'var(--primary-color)', color: 'var(--primary-color)' }}
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <FaSpinner className="animate-spin" />
                    Loading...
                  </span>
                ) : (
                  'Load More Comments'
                )}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Comment Stats */}
      {stats && stats.totalComments > 0 && (
        <div className="mt-8 p-4 bg-gray-50 rounded-lg">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div>
              <p className="text-2xl font-bold text-primary-600" style={{ color: 'var(--primary-color)' }}>
                {stats.totalComments}
              </p>
              <p className="text-sm text-gray-600">Total Comments</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-primary-600" style={{ color: 'var(--primary-color)' }}>
                {stats.topLevelComments}
              </p>
              <p className="text-sm text-gray-600">Top Level</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-primary-600" style={{ color: 'var(--primary-color)' }}>
                {stats.totalReplies}
              </p>
              <p className="text-sm text-gray-600">Replies</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-primary-600" style={{ color: 'var(--primary-color)' }}>
                {stats.totalLikes}
              </p>
              <p className="text-sm text-gray-600">Total Likes</p>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};

export default CommentSection;
