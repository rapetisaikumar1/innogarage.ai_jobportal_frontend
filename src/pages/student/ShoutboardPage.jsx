import { useState, useEffect, useRef } from 'react';
import api from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';
import {
  Megaphone, Send, Heart, MessageCircle, Trash2, ChevronDown, ChevronUp,
  CornerDownRight, MoreHorizontal, Hash, MessageSquareText, Lightbulb, Briefcase,
  Code2, Search, Flame, Trophy, ThumbsUp, MessageSquare, ArrowBigUp
} from 'lucide-react';

const AVATAR_COLORS = [
  'bg-violet-500', 'bg-sky-500', 'bg-emerald-500', 'bg-amber-500',
  'bg-rose-500', 'bg-indigo-500', 'bg-teal-500', 'bg-orange-500',
];

const TAG_OPTIONS = ['General', 'Career Advice', 'Interview Tips', 'Tech Talk', 'Job Hunt', 'Vent', 'Wins'];

const TAG_CONFIG = {
  'General': { icon: MessageSquareText, color: 'text-slate-600', bg: 'bg-slate-100', border: 'border-slate-200', accent: '#64748b' },
  'Career Advice': { icon: Lightbulb, color: 'text-amber-700', bg: 'bg-amber-50', border: 'border-amber-200', accent: '#d97706' },
  'Interview Tips': { icon: Megaphone, color: 'text-blue-700', bg: 'bg-blue-50', border: 'border-blue-200', accent: '#2563eb' },
  'Tech Talk': { icon: Code2, color: 'text-violet-700', bg: 'bg-violet-50', border: 'border-violet-200', accent: '#7c3aed' },
  'Job Hunt': { icon: Briefcase, color: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-200', accent: '#059669' },
  'Vent': { icon: Flame, color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-200', accent: '#dc2626' },
  'Wins': { icon: Trophy, color: 'text-orange-700', bg: 'bg-orange-50', border: 'border-orange-200', accent: '#ea580c' },
};

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
  const sizeClasses = size === 'sm' ? 'w-7 h-7 text-[10px]' : size === 'lg' ? 'w-10 h-10 text-sm' : 'w-9 h-9 text-xs';
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
    <div className={`${depth > 0 ? 'ml-5 border-l-2 border-gray-100 pl-3' : ''}`}>
      <div className="py-2 group">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-[12px] font-semibold text-gray-800">{comment.user?.fullName}</span>
            <span className="text-[10px] text-gray-400">{timeAgo(comment.createdAt)}</span>
            {comment.userId === currentUserId && (
              <button onClick={() => onDelete(comment.id)} className="text-[10px] text-gray-300 hover:text-red-500 font-medium opacity-0 group-hover:opacity-100 transition-opacity ml-auto">
                Delete
              </button>
            )}
          </div>
          <p className="text-[12px] text-gray-600 leading-relaxed whitespace-pre-wrap break-words">{comment.content}</p>
          <div className="flex items-center gap-3 mt-1">
            {depth < 2 && (
              <button onClick={() => setShowReplyInput(!showReplyInput)} className="text-[11px] text-gray-400 hover:text-blue-500 font-medium">
                Reply
              </button>
            )}
          </div>

          {showReplyInput && (
            <div className="flex items-center gap-2 mt-2 ml-1">
              <input
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                placeholder="Write a reply..."
                className="flex-1 text-[12px] bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:border-gray-300 focus:ring-1 focus:ring-gray-200"
                onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleReply()}
              />
              <button
                onClick={handleReply}
                disabled={sending || !replyText.trim()}
                className="p-2 rounded-lg bg-gray-900 hover:bg-gray-800 text-white disabled:opacity-40 transition-colors"
              >
                <Send size={12} />
              </button>
            </div>
          )}

          {/* Nested replies */}
          {comment.replies && comment.replies.length > 0 && (
            <>
              {!showReplies && (
                <button onClick={() => setShowReplies(true)} className="flex items-center gap-1 mt-1.5 ml-1 text-[11px] text-blue-500 hover:text-blue-700 font-medium">
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

  const tagCfg = TAG_CONFIG[post.tag] || TAG_CONFIG['General'];

  return (
    <div className="bg-white rounded-lg border border-gray-200/80 hover:border-gray-300 transition-all duration-200 overflow-hidden">
      {/* Post Header */}
      <div className="px-4 pt-3.5 pb-0">
        <div className="flex items-center justify-between mb-1.5">
          <div className="flex items-center gap-1.5 text-[12px] min-w-0">
            <span className="font-semibold text-gray-800">{post.user?.fullName}</span>
            {post.user?.jobRole && (
              <>
                <span className="text-gray-300">·</span>
                <span className="text-gray-400 truncate">{post.user.jobRole}</span>
              </>
            )}
            <span className="text-gray-300">·</span>
            <span className="text-gray-400 shrink-0">{timeAgo(post.createdAt)}</span>
          </div>
          <div className="flex items-center gap-1.5 shrink-0 ml-3">
            {post.tag && (() => {
              const TagIcon = tagCfg.icon;
              return (
                <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded border ${tagCfg.bg} ${tagCfg.color} ${tagCfg.border}`}>
                  <TagIcon size={10} />
                  {post.tag}
                </span>
              );
            })()}
            {post.user?.id === currentUserId && (
              <div className="relative">
                <button onClick={() => setShowMenu(!showMenu)} className="p-1 rounded hover:bg-gray-100 text-gray-300 hover:text-gray-500 transition-colors">
                  <MoreHorizontal size={14} />
                </button>
                {showMenu && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)} />
                    <div className="absolute right-0 mt-1 w-32 bg-white rounded-lg shadow-lg border border-gray-200 z-20 py-1">
                      <button
                        onClick={() => { onDelete(post.id); setShowMenu(false); }}
                        className="w-full flex items-center gap-2 px-3 py-1.5 text-[11px] text-red-600 hover:bg-red-50 transition-colors"
                      >
                        <Trash2 size={11} />
                        Delete
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Content */}
        <p className="text-[13px] text-gray-700 leading-[1.7] whitespace-pre-wrap break-words pb-3">
          {post.content}
        </p>
      </div>

      {/* Action Bar */}
      <div className="px-4 py-2 flex items-center gap-4 border-t border-gray-100 bg-gray-50/40">
        <button
          onClick={handleLike}
          className={`flex items-center gap-1.5 text-[11px] font-medium transition-colors ${
            post.isLiked
              ? 'text-rose-500'
              : 'text-gray-400 hover:text-rose-500'
          }`}
        >
          <Heart size={13} fill={post.isLiked ? 'currentColor' : 'none'} />
          <span>{post.likesCount > 0 ? post.likesCount : 'Like'}</span>
        </button>
        <button
          onClick={handleToggleComments}
          className={`flex items-center gap-1.5 text-[11px] font-medium transition-colors ${
            showComments
              ? 'text-blue-500'
              : 'text-gray-400 hover:text-blue-500'
          }`}
        >
          <MessageCircle size={13} />
          <span>{post.commentsCount > 0 ? `${post.commentsCount} Comments` : 'Comment'}</span>
        </button>
      </div>

      {/* Comments Section */}
      {showComments && (
        <div className="px-4 pb-3 border-t border-gray-100">
          <div className="flex items-center gap-2 pt-3 pb-2">
            <input
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              placeholder="Add a comment..."
              className="flex-1 text-[12px] bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:border-blue-300 focus:ring-1 focus:ring-blue-100 focus:bg-white transition-all"
              onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleComment()}
            />
            <button
              onClick={handleComment}
              disabled={sending || !commentText.trim()}
              className="px-3 py-2 rounded-lg bg-blue-500 hover:bg-blue-600 text-white text-[11px] font-semibold disabled:opacity-30 transition-colors"
            >
              Reply
            </button>
          </div>

          {loadingComments ? (
            <div className="flex items-center justify-center gap-2 py-4">
              <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
              <span className="text-[11px] text-gray-400">Loading...</span>
            </div>
          ) : comments.length === 0 ? (
            <div className="text-center py-3 text-[11px] text-gray-400">No comments yet</div>
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
const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest First' },
  { value: 'oldest', label: 'Oldest First' },
  { value: 'most_liked', label: 'Most Liked' },
  { value: 'most_commented', label: 'Most Discussed' },
];

const SIDEBAR_FILTERS = [
  { key: 'all', label: 'All Posts', color: 'text-blue-600' },
  { key: 'my_posts', label: 'Your Posts', color: 'text-emerald-600' },
  { key: 'liked', label: 'Posts You Liked', color: 'text-rose-500' },
  { key: 'with_comments', label: 'With Comments', color: 'text-violet-600' },
  { key: 'no_comments', label: 'Unanswered', color: 'text-amber-600' },
];

const ShoutboardPage = () => {
  const { user } = useAuth();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newPost, setNewPost] = useState('');
  const [selectedTag, setSelectedTag] = useState('');
  const [posting, setPosting] = useState(false);
  const [filterTag, setFilterTag] = useState('');
  const [sortBy, setSortBy] = useState('newest');
  const [sidebarFilter, setSidebarFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
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

  const filteredPosts = (() => {
    let result = [...posts];

    // Sidebar filter
    if (sidebarFilter === 'my_posts') result = result.filter((p) => p.user?.id === user?.id);
    else if (sidebarFilter === 'liked') result = result.filter((p) => p.isLiked);
    else if (sidebarFilter === 'with_comments') result = result.filter((p) => p.commentsCount > 0);
    else if (sidebarFilter === 'no_comments') result = result.filter((p) => p.commentsCount === 0);

    // Tag filter
    if (filterTag) result = result.filter((p) => p.tag === filterTag);

    // Search
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      result = result.filter((p) =>
        p.content?.toLowerCase().includes(q) ||
        p.user?.fullName?.toLowerCase().includes(q) ||
        p.tag?.toLowerCase().includes(q)
      );
    }

    // Sort
    if (sortBy === 'newest') result.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    else if (sortBy === 'oldest') result.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
    else if (sortBy === 'most_liked') result.sort((a, b) => (b.likesCount || 0) - (a.likesCount || 0));
    else if (sortBy === 'most_commented') result.sort((a, b) => (b.commentsCount || 0) - (a.commentsCount || 0));

    return result;
  })();

  const autoResize = (e) => {
    e.target.style.height = 'auto';
    e.target.style.height = e.target.scrollHeight + 'px';
  };

  return (
    <div className="flex gap-5 items-start">
      {/* ─── Left Column: Main Content ─── */}
      <div className="flex-1 min-w-0">
        {/* Page Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
              <MessageSquare size={16} className="text-blue-600" />
            </div>
            <div>
              <h1 className="text-[16px] font-bold text-gray-900">Discussion Forum</h1>
              <p className="text-[11px] text-gray-400">Share thoughts, tips & celebrate wins</p>
            </div>
          </div>
          <span className="text-[11px] text-gray-400 bg-gray-50 px-2.5 py-1 rounded-md">{filteredPosts.length} {filteredPosts.length === 1 ? 'post' : 'posts'}</span>
        </div>

        {/* Search Bar */}
        <div className="relative mb-4">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search discussions by content, author, or topic..."
            className="w-full pl-9 pr-3 py-2.5 text-[12px] bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-300 focus:border-blue-300 placeholder-gray-400 text-gray-700 transition-all"
          />
        </div>

        {/* Compose Box */}
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden mb-4">
          <div className="p-4 pb-3">
            <textarea
              ref={textareaRef}
              value={newPost}
              onChange={(e) => { setNewPost(e.target.value); autoResize(e); }}
              placeholder="Start a discussion... Share interview tips, career wins, or ask questions"
              className="w-full text-[13px] text-gray-800 placeholder-gray-400 bg-transparent border-none outline-none resize-none min-h-[48px] leading-relaxed"
              rows={2}
            />
          </div>
          <div className="px-4 py-2 bg-gray-50/80 border-t border-gray-100 flex items-center justify-between">
            <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
              {TAG_OPTIONS.map((tag) => {
                const cfg = TAG_CONFIG[tag] || TAG_CONFIG['General'];
                const TagIcon = cfg.icon;
                const isSelected = selectedTag === tag;
                return (
                  <button
                    key={tag}
                    onClick={() => setSelectedTag(isSelected ? '' : tag)}
                    className={`inline-flex items-center gap-1 px-2 py-1 rounded text-[10px] font-medium whitespace-nowrap transition-all border ${
                      isSelected
                        ? `${cfg.bg} ${cfg.color} ${cfg.border}`
                        : 'border-transparent text-gray-400 hover:text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    <TagIcon size={10} />
                    {tag}
                  </button>
                );
              })}
            </div>
            <button
              onClick={handlePost}
              disabled={posting || !newPost.trim()}
              className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-semibold disabled:opacity-30 transition-colors shrink-0 ml-3"
            >
              <Send size={11} />
              Post
            </button>
          </div>
        </div>

        {/* Posts Feed */}
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filteredPosts.length === 0 ? (
          <div className="text-center py-14 bg-white rounded-lg border border-gray-200">
            <div className="w-10 h-10 rounded-lg bg-gray-50 flex items-center justify-center mx-auto mb-3">
              <MessageSquare size={18} className="text-gray-300" />
            </div>
            <p className="text-[13px] font-semibold text-gray-600">
              {filterTag ? `No ${filterTag} discussions yet` : searchQuery ? 'No matching discussions' : 'No discussions yet'}
            </p>
            <p className="text-[11px] text-gray-400 mt-1">
              {searchQuery ? 'Try a different search term' : 'Start a conversation above to get things going!'}
            </p>
          </div>
        ) : (
          <div className="space-y-2.5">
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

      {/* ─── Right Sidebar ─── */}
      <div className="w-[220px] shrink-0 sticky top-4 space-y-4">
        {/* Sort By */}
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="px-3.5 py-2.5 border-b border-gray-100">
            <p className="text-[12px] font-bold text-gray-700">Sort By</p>
          </div>
          <div className="p-3">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="w-full text-[11px] text-gray-700 bg-white border border-gray-200 rounded-lg px-2.5 py-2 focus:outline-none focus:ring-1 focus:ring-blue-300 focus:border-blue-300 cursor-pointer"
            >
              {SORT_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Filter Links */}
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="px-3.5 py-2.5 border-b border-gray-100">
            <p className="text-[12px] font-bold text-gray-700">Filter</p>
          </div>
          <div className="py-1">
            {SIDEBAR_FILTERS.map((f) => (
              <button
                key={f.key}
                onClick={() => setSidebarFilter(f.key)}
                className={`w-full text-left px-3.5 py-2 text-[11px] font-medium transition-colors ${
                  sidebarFilter === f.key
                    ? `${f.color} bg-gray-50 font-semibold`
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50/60'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Filter by Topics */}
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="px-3.5 py-2.5 border-b border-gray-100">
            <p className="text-[12px] font-bold text-gray-700">Filter by topics</p>
          </div>
          <div className="p-3">
            <select
              value={filterTag}
              onChange={(e) => setFilterTag(e.target.value)}
              className="w-full text-[11px] text-gray-700 bg-white border border-gray-200 rounded-lg px-2.5 py-2 focus:outline-none focus:ring-1 focus:ring-blue-300 focus:border-blue-300 cursor-pointer"
            >
              <option value="">All Topics</option>
              {TAG_OPTIONS.map((tag) => (
                <option key={tag} value={tag}>{tag}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Active Filters Summary */}
        {(filterTag || sidebarFilter !== 'all' || searchQuery) && (
          <button
            onClick={() => { setFilterTag(''); setSidebarFilter('all'); setSearchQuery(''); setSortBy('newest'); }}
            className="w-full text-[11px] text-gray-400 hover:text-red-500 font-medium py-2 transition-colors text-center"
          >
            Reset all filters
          </button>
        )}
      </div>
    </div>
  );
};

export default ShoutboardPage;
