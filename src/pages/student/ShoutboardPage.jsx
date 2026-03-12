import { useState, useEffect, useRef } from 'react';
import api from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';
import {
  Megaphone, Send, Heart, MessageCircle, Trash2, ChevronDown, ChevronUp,
  CornerDownRight, MoreHorizontal, Hash
} from 'lucide-react';

const AVATAR_COLORS = [
  'bg-violet-500', 'bg-sky-500', 'bg-emerald-500', 'bg-amber-500',
  'bg-rose-500', 'bg-indigo-500', 'bg-teal-500', 'bg-orange-500',
];

const TAG_OPTIONS = ['General', 'Career Advice', 'Interview Tips', 'Tech Talk', 'Job Hunt', 'Vent', 'Wins'];

const getAvatarColor = (name) => {
  if (!name) return AVATAR_COLORS[0];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
};

const timeAgo = (dateStr) => {
  const diff = (Date.now() - new Date(dateStr).getTime()) / 1000;
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return new Date(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
};

const Avatar = ({ user, size = 'md' }) => {
  const sizeClasses = size === 'sm' ? 'w-8 h-8 text-xs' : 'w-10 h-10 text-sm';
  if (user?.avatarUrl) {
    return <img src={user.avatarUrl} alt="" className={`${sizeClasses} rounded-full object-cover`} referrerPolicy="no-referrer" />;
  }
  const initial = user?.fullName?.charAt(0)?.toUpperCase() || '?';
  return (
    <div className={`${sizeClasses} rounded-full ${getAvatarColor(user?.fullName)} text-white flex items-center justify-center font-bold shrink-0`}>
      {initial}
    </div>
  );
};

// ─── Comment Component (recursive for replies) ─────────────────────
const Comment = ({ comment, postId, currentUserId, onDelete, onReplyAdded, depth = 0 }) => {
  const [showReplyInput, setShowReplyInput] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [sending, setSending] = useState(false);
  const [showReplies, setShowReplies] = useState(depth < 1);

  const handleReply = async () => {
    if (!replyText.trim()) return;
    setSending(true);
    try {
      const { data } = await api.post(`/shoutboard/${postId}/comments`, {
        content: replyText,
        parentId: comment.id,
      });
      onReplyAdded(data, comment.id);
      setReplyText('');
      setShowReplyInput(false);
    } catch {
      toast.error('Failed to reply');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className={`${depth > 0 ? 'ml-8 border-l-2 border-gray-100 pl-4' : ''}`}>
      <div className="flex gap-2.5 py-2.5 group">
        <Avatar user={comment.user} size="sm" />
        <div className="flex-1 min-w-0">
          <div className="bg-gray-50 rounded-xl px-3.5 py-2.5">
            <div className="flex items-center gap-2 mb-0.5">
              <span className="text-[13px] font-semibold text-gray-900">{comment.user?.fullName}</span>
              <span className="text-[11px] text-gray-400">{timeAgo(comment.createdAt)}</span>
            </div>
            <p className="text-[13px] text-gray-700 leading-relaxed whitespace-pre-wrap break-words">{comment.content}</p>
          </div>
          <div className="flex items-center gap-3 mt-1 ml-1">
            {depth < 2 && (
              <button onClick={() => setShowReplyInput(!showReplyInput)} className="text-[11px] text-gray-400 hover:text-gray-600 font-medium">
                Reply
              </button>
            )}
            {comment.userId === currentUserId && (
              <button onClick={() => onDelete(comment.id)} className="text-[11px] text-gray-400 hover:text-red-500 font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                Delete
              </button>
            )}
          </div>

          {showReplyInput && (
            <div className="flex items-center gap-2 mt-2 ml-1">
              <input
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                placeholder="Write a reply..."
                className="flex-1 text-[13px] bg-gray-50 border border-gray-200 rounded-full px-3.5 py-2 focus:outline-none focus:border-violet-300 focus:ring-1 focus:ring-violet-200"
                onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleReply()}
              />
              <button
                onClick={handleReply}
                disabled={sending || !replyText.trim()}
                className="p-2 rounded-full bg-violet-500 hover:bg-violet-600 text-white disabled:opacity-40 transition-colors"
              >
                <Send size={13} />
              </button>
            </div>
          )}

          {/* Nested replies */}
          {comment.replies && comment.replies.length > 0 && (
            <>
              {!showReplies && (
                <button onClick={() => setShowReplies(true)} className="flex items-center gap-1 mt-1.5 ml-1 text-[11px] text-violet-500 hover:text-violet-700 font-medium">
                  <CornerDownRight size={12} />
                  {comment.replies.length} {comment.replies.length === 1 ? 'reply' : 'replies'}
                </button>
              )}
              {showReplies && comment.replies.map((reply) => (
                <Comment
                  key={reply.id}
                  comment={reply}
                  postId={postId}
                  currentUserId={currentUserId}
                  onDelete={onDelete}
                  onReplyAdded={onReplyAdded}
                  depth={depth + 1}
                />
              ))}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

// ─── Post Card ──────────────────────────────────────────────────────
const PostCard = ({ post, currentUserId, onDelete, onUpdate }) => {
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState([]);
  const [loadingComments, setLoadingComments] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [sending, setSending] = useState(false);
  const [liking, setLiking] = useState(false);
  const [showMenu, setShowMenu] = useState(false);

  const fetchComments = async () => {
    setLoadingComments(true);
    try {
      const { data } = await api.get(`/shoutboard/${post.id}/comments`);
      setComments(data);
    } catch {
      toast.error('Failed to load comments');
    } finally {
      setLoadingComments(false);
    }
  };

  const handleToggleComments = () => {
    if (!showComments) fetchComments();
    setShowComments(!showComments);
  };

  const handleLike = async () => {
    if (liking) return;
    setLiking(true);
    try {
      const { data } = await api.post(`/shoutboard/${post.id}/like`);
      onUpdate({ ...post, isLiked: data.liked, likesCount: data.likesCount });
    } catch {
      toast.error('Failed to like');
    } finally {
      setLiking(false);
    }
  };

  const handleComment = async () => {
    if (!commentText.trim()) return;
    setSending(true);
    try {
      const { data } = await api.post(`/shoutboard/${post.id}/comments`, { content: commentText });
      setComments((prev) => [data, ...prev]);
      setCommentText('');
      onUpdate({ ...post, commentsCount: post.commentsCount + 1 });
    } catch {
      toast.error('Failed to comment');
    } finally {
      setSending(false);
    }
  };

  const handleDeleteComment = async (commentId) => {
    try {
      await api.delete(`/shoutboard/${post.id}/comments/${commentId}`);
      setComments((prev) => prev.filter((c) => c.id !== commentId));
      onUpdate({ ...post, commentsCount: Math.max(0, post.commentsCount - 1) });
      toast.success('Comment deleted');
    } catch {
      toast.error('Failed to delete comment');
    }
  };

  const handleReplyAdded = (reply, parentId) => {
    setComments((prev) =>
      prev.map((c) =>
        c.id === parentId ? { ...c, replies: [...(c.replies || []), reply] } : c
      )
    );
    onUpdate({ ...post, commentsCount: post.commentsCount + 1 });
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
      {/* Post Header */}
      <div className="px-5 pt-5 pb-3">
        <div className="flex items-start gap-3">
          <Avatar user={post.user} />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-[14px] font-bold text-gray-900">{post.user?.fullName}</span>
              {post.tag && (
                <span className="text-[10px] font-semibold bg-violet-50 text-violet-600 px-2 py-0.5 rounded-full">
                  {post.tag}
                </span>
              )}
            </div>
            <div className="flex items-center gap-1.5 mt-0.5">
              {post.user?.jobRole && (
                <span className="text-[11px] text-gray-400">{post.user.jobRole}</span>
              )}
              {post.user?.jobRole && <span className="text-gray-300 text-[11px]">·</span>}
              <span className="text-[11px] text-gray-400">{timeAgo(post.createdAt)}</span>
            </div>
          </div>
          {post.user?.id === currentUserId && (
            <div className="relative">
              <button onClick={() => setShowMenu(!showMenu)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors">
                <MoreHorizontal size={16} />
              </button>
              {showMenu && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)} />
                  <div className="absolute right-0 mt-1 w-36 bg-white rounded-xl shadow-lg border border-gray-100 z-20 overflow-hidden">
                    <button
                      onClick={() => { onDelete(post.id); setShowMenu(false); }}
                      className="w-full flex items-center gap-2 px-3.5 py-2.5 text-[13px] text-red-600 hover:bg-red-50 transition-colors"
                    >
                      <Trash2 size={14} />
                      Delete Post
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {/* Content */}
        <p className="mt-3 text-[14px] text-gray-800 leading-relaxed whitespace-pre-wrap break-words">
          {post.content}
        </p>
      </div>

      {/* Stats Bar */}
      {(post.likesCount > 0 || post.commentsCount > 0) && (
        <div className="px-5 py-2 flex items-center justify-between text-[12px] text-gray-400 border-t border-gray-50">
          <span>{post.likesCount > 0 ? `${post.likesCount} ${post.likesCount === 1 ? 'like' : 'likes'}` : ''}</span>
          <span>{post.commentsCount > 0 ? `${post.commentsCount} ${post.commentsCount === 1 ? 'comment' : 'comments'}` : ''}</span>
        </div>
      )}

      {/* Action Buttons */}
      <div className="px-5 py-2.5 flex items-center gap-1 border-t border-gray-100">
        <button
          onClick={handleLike}
          className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-[13px] font-medium transition-colors ${
            post.isLiked ? 'text-red-500 bg-red-50 hover:bg-red-100' : 'text-gray-500 hover:bg-gray-50'
          }`}
        >
          <Heart size={16} fill={post.isLiked ? 'currentColor' : 'none'} />
          Like
        </button>
        <button
          onClick={handleToggleComments}
          className="flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-[13px] font-medium text-gray-500 hover:bg-gray-50 transition-colors"
        >
          <MessageCircle size={16} />
          Comment
        </button>
      </div>

      {/* Comments Section */}
      {showComments && (
        <div className="px-5 pb-4 border-t border-gray-100">
          {/* Comment Input */}
          <div className="flex items-center gap-2.5 pt-3 pb-2">
            <Avatar user={{ fullName: 'You' }} size="sm" />
            <div className="flex-1 flex items-center gap-2">
              <input
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder="Write a comment..."
                className="flex-1 text-[13px] bg-gray-50 border border-gray-200 rounded-full px-4 py-2.5 focus:outline-none focus:border-violet-300 focus:ring-1 focus:ring-violet-200"
                onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleComment()}
              />
              <button
                onClick={handleComment}
                disabled={sending || !commentText.trim()}
                className="p-2.5 rounded-full bg-violet-500 hover:bg-violet-600 text-white disabled:opacity-40 transition-colors"
              >
                <Send size={14} />
              </button>
            </div>
          </div>

          {/* Comments List */}
          {loadingComments ? (
            <div className="text-center py-4 text-[13px] text-gray-400">Loading comments...</div>
          ) : comments.length === 0 ? (
            <div className="text-center py-4 text-[13px] text-gray-400">No comments yet. Be the first!</div>
          ) : (
            <div className="mt-1">
              {comments.map((c) => (
                <Comment
                  key={c.id}
                  comment={c}
                  postId={post.id}
                  currentUserId={currentUserId}
                  onDelete={handleDeleteComment}
                  onReplyAdded={handleReplyAdded}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// ─── Main Shoutboard Page ───────────────────────────────────────────
const ShoutboardPage = () => {
  const { user } = useAuth();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newPost, setNewPost] = useState('');
  const [selectedTag, setSelectedTag] = useState('');
  const [posting, setPosting] = useState(false);
  const [filterTag, setFilterTag] = useState('');
  const textareaRef = useRef(null);

  useEffect(() => { fetchPosts(); }, []);

  const fetchPosts = async () => {
    try {
      const { data } = await api.get('/shoutboard');
      setPosts(data);
    } catch {
      toast.error('Failed to load posts');
    } finally {
      setLoading(false);
    }
  };

  const handlePost = async () => {
    if (!newPost.trim()) return;
    setPosting(true);
    try {
      const { data } = await api.post('/shoutboard', { content: newPost, tag: selectedTag || null });
      setPosts((prev) => [data, ...prev]);
      setNewPost('');
      setSelectedTag('');
      toast.success('Posted!');
    } catch {
      toast.error('Failed to post');
    } finally {
      setPosting(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      await api.delete(`/shoutboard/${id}`);
      setPosts((prev) => prev.filter((p) => p.id !== id));
      toast.success('Post deleted');
    } catch {
      toast.error('Failed to delete');
    }
  };

  const handleUpdate = (updated) => {
    setPosts((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
  };

  const filteredPosts = filterTag
    ? posts.filter((p) => p.tag === filterTag)
    : posts;

  const autoResize = (e) => {
    e.target.style.height = 'auto';
    e.target.style.height = e.target.scrollHeight + 'px';
  };

  return (
    <div className="max-w-2xl mx-auto">
      {/* Page Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 bg-violet-100 rounded-xl flex items-center justify-center">
          <Megaphone size={20} className="text-violet-600" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-gray-900">Shoutboard</h1>
          <p className="text-[13px] text-gray-400">Share thoughts, ideas, career wins & discussions</p>
        </div>
      </div>

      {/* Compose Box */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 mb-5">
        <div className="flex gap-3">
          <Avatar user={user} />
          <div className="flex-1">
            <textarea
              ref={textareaRef}
              value={newPost}
              onChange={(e) => { setNewPost(e.target.value); autoResize(e); }}
              placeholder="What's on your mind? Share your thoughts, wins, questions..."
              className="w-full text-[14px] text-gray-800 placeholder-gray-400 bg-transparent border-none outline-none resize-none min-h-[60px] leading-relaxed"
              rows={2}
            />

            <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
              {/* Tags */}
              <div className="flex items-center gap-1.5 flex-wrap">
                <Hash size={14} className="text-gray-400" />
                {TAG_OPTIONS.map((tag) => (
                  <button
                    key={tag}
                    onClick={() => setSelectedTag(selectedTag === tag ? '' : tag)}
                    className={`px-2.5 py-1 rounded-full text-[11px] font-medium transition-colors ${
                      selectedTag === tag
                        ? 'bg-violet-100 text-violet-700 ring-1 ring-violet-200'
                        : 'bg-gray-50 text-gray-500 hover:bg-gray-100'
                    }`}
                  >
                    {tag}
                  </button>
                ))}
              </div>

              <button
                onClick={handlePost}
                disabled={posting || !newPost.trim()}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-700 hover:bg-slate-800 text-white text-[13px] font-semibold disabled:opacity-40 transition-colors shrink-0 ml-3"
              >
                <Send size={13} />
                Post
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Filter Tags */}
      <div className="flex items-center gap-2 mb-5 flex-wrap">
        <button
          onClick={() => setFilterTag('')}
          className={`px-3 py-1.5 rounded-full text-[12px] font-medium transition-colors ${
            !filterTag ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
          }`}
        >
          All
        </button>
        {TAG_OPTIONS.map((tag) => (
          <button
            key={tag}
            onClick={() => setFilterTag(filterTag === tag ? '' : tag)}
            className={`px-3 py-1.5 rounded-full text-[12px] font-medium transition-colors ${
              filterTag === tag ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
            }`}
          >
            {tag}
          </button>
        ))}
      </div>

      {/* Posts Feed */}
      {loading ? (
        <div className="text-center py-16">
          <div className="w-8 h-8 border-2 border-violet-200 border-t-violet-500 rounded-full animate-spin mx-auto" />
          <p className="text-[13px] text-gray-400 mt-3">Loading posts...</p>
        </div>
      ) : filteredPosts.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-2xl border border-gray-100">
          <Megaphone size={40} className="text-gray-200 mx-auto mb-3" />
          <p className="text-[15px] font-semibold text-gray-500">No posts yet</p>
          <p className="text-[13px] text-gray-400 mt-1">Be the first to share something!</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredPosts.map((post) => (
            <PostCard
              key={post.id}
              post={post}
              currentUserId={user?.id}
              onDelete={handleDelete}
              onUpdate={handleUpdate}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default ShoutboardPage;
