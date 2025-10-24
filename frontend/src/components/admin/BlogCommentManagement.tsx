import React, { useState, useEffect } from 'react';
import Modal from '../../components/ui/Modal';
import Button from '../../components/ui/Button';
import { MessageSquare, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import blogAPI from '../../services/api/blogAPI';
import { Card, CardContent } from '../ui/Card';
import Badge from '../ui/Badge';

interface Comment {
  _id: string;
  author: {
    _id: string;
    name: string;
    avatar?: string;
  };
  content: string;
  sanitizedContent: string;
  status: 'pending' | 'active' | 'flagged' | 'deleted';
  createdAt: string;
  replies: Comment[];
}

interface BlogCommentManagementProps {
  blogId: string;
  isOpen: boolean;
  onClose: () => void;
}

const BlogCommentManagement: React.FC<BlogCommentManagementProps> = ({ blogId, isOpen, onClose }) => {
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [approvingCommentId, setApprovingCommentId] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && blogId) {
      fetchComments();
    }
  }, [isOpen, blogId]);

  const fetchComments = async () => {
    setLoading(true);
    try {
      // Use admin endpoint which returns comments with all statuses
      const response = await blogAPI.admin.getCommentsForBlog(blogId, {
        page: 1,
        limit: 100, // Backend max limit is 100 for admin
        sort: 'newest',
        statuses: 'pending,active,flagged' // Request all non-deleted comments for moderation
      });
      console.log('Fetched comments:', response);

      // Response structure: { data: { comments: [], stats: {}, pagination: {} } }
      setComments(response?.comments || []);
    } catch (error) {
      toast.error('Failed to fetch comments.');
      console.error('Error fetching comments:', error);
      setComments([]);
    } finally {
      setLoading(false);
    }
  };

  const handleApproveComment = async (commentId: string) => {
    setApprovingCommentId(commentId);
    try {
      await blogAPI.admin.approveComment(commentId);
      toast.success('Comment approved successfully!');
      fetchComments(); // Refresh comments
    } catch (error) {
      toast.error('Failed to approve comment.');
      console.error('Error approving comment:', error);
    } finally {
      setApprovingCommentId(null);
    }
  };

  const renderComment = (comment: Comment) => (
    <Card key={comment._id} className="mb-4">
      <CardContent className="p-4">
        <div className="flex items-start space-x-3">
          <img
            src={comment.author?.avatar || '/assets/images/placeholder-avatar.png'}
            alt={comment.author?.name || 'Unknown User'}
            className="w-8 h-8 rounded-full object-cover"
          />
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-gray-800">{comment.author?.name || 'Unknown User'}</span>
              <Badge variant={comment.status === 'pending' ? 'warning' : 'success'}>
                {comment.status}
              </Badge>
            </div>
            <p className="text-sm text-gray-600 mt-1" dangerouslySetInnerHTML={{ __html: comment.sanitizedContent }}></p>
            <div className="flex items-center space-x-2 mt-2">
              <span className="text-xs text-gray-500">{new Date(comment.createdAt).toLocaleString()}</span>
              {comment.status === 'pending' && (
                <Button
                  variant="success"
                  size="sm"
                  onClick={() => handleApproveComment(comment._id)}
                  loading={approvingCommentId === comment._id}
                  disabled={approvingCommentId !== null && approvingCommentId !== comment._id}
                >
                  {approvingCommentId === comment._id ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle className="mr-2 h-4 w-4" />}
                  Approve
                </Button>
              )}
              {/* Add other actions like delete, flag, etc. here */}
            </div>
          </div>
        </div>
        {comment.replies && comment.replies.length > 0 && (
          <div className="ml-12 mt-4 border-l pl-4">
            {comment.replies.map(renderComment)}
          </div>
        )}
      </CardContent>
    </Card>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Manage Blog Comments"
      description="Review and approve pending comments for this blog post."
      size="lg"
    >
      <div className="py-4 max-h-[70vh] overflow-y-auto">
        {loading ? (
          <div className="text-center text-gray-500">Loading comments...</div>
        ) : comments.length === 0 ? (
          <div className="text-center text-gray-500">No pending comments found for this blog.</div>
        ) : (
          comments.map(renderComment)
        )}
      </div>
      <div className="flex justify-end">
        <Button variant="outline" onClick={onClose}>Close</Button>
      </div>
    </Modal>
  );
};

export default BlogCommentManagement;