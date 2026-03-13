import { useState, useEffect, useRef } from 'react'
import { Heart, MessageCircle, Plus, X, Send, Users, Trash2, ImagePlus, Share2 } from 'lucide-react'
import Avatar from '../components/Avatar'
import {
  getPosts, getFriendsPosts, createPost, uploadPostMedia,
  getMyLikes, toggleLike, deletePost,
  getStampCards, getMyFriendships,
} from '../lib/api'
import CommentsSheet from './CommentsSheet'
import FriendsSheet from './FriendsSheet'
import UserProfileSheet from './UserProfileSheet'
import { usePullToRefresh, PullIndicator } from '../hooks/usePullToRefresh.jsx'
import { haptic } from '../utils/haptic'

const EMOJIS = ['☕', '🧋', '🍵', '🥐', '🍰', '🏆', '✨', '🌟', '💛', '🫶']

function timeAgo(ts) {
  const secs = Math.floor((Date.now() - new Date(ts)) / 1000)
  if (secs < 60) return 'just now'
  if (secs < 3600) return `${Math.floor(secs / 60)}m ago`
  if (secs < 86400) return `${Math.floor(secs / 3600)}h ago`
  return `${Math.floor(secs / 86400)}d ago`
}

async function sharePost(post) {
  const text = post.caption
    ? `"${post.caption}" — ${post.profile?.name} on Beened ☕`
    : `${post.profile?.name} is on Beened ☕`
  try {
    if (navigator.share) {
      await navigator.share({ title: 'Beened', text, url: window.location.href })
    } else {
      await navigator.clipboard.writeText(text)
    }
  } catch {}
}

// ── Compose sheet ──────────────────────────────────────────────
function ComposeSheet({ userId, onClose, onPosted }) {
  const [caption, setCaption] = useState('')
  const [emoji, setEmoji] = useState('☕')
  const [cards, setCards] = useState([])
  const [selectedCard, setSelectedCard] = useState(null)
  const [posting, setPosting] = useState(false)
  const [error, setError] = useState(null)
  const [mediaFile, setMediaFile] = useState(null)
  const [mediaPreview, setMediaPreview] = useState(null)
  const [mediaType, setMediaType] = useState(null)
  const textRef = useRef(null)
  const fileRef = useRef(null)

  useEffect(() => {
    textRef.current?.focus()
    if (userId) getStampCards(userId).then(setCards).catch(() => {})
  }, [userId])

  useEffect(() => () => { if (mediaPreview) URL.revokeObjectURL(mediaPreview) }, [])

  function handleFileSelect(e) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 50 * 1024 * 1024) { setError('File too large (max 50 MB)'); return }
    const type = file.type.startsWith('video/') ? 'video' : 'image'
    if (mediaPreview) URL.revokeObjectURL(mediaPreview)
    setMediaFile(file)
    setMediaType(type)
    setMediaPreview(URL.createObjectURL(file))
    setError(null)
    e.target.value = ''
  }

  function clearMedia() {
    if (mediaPreview) URL.revokeObjectURL(mediaPreview)
    setMediaFile(null)
    setMediaPreview(null)
    setMediaType(null)
  }

  async function handlePost() {
    if (!caption.trim() && !mediaFile) return
    setPosting(true)
    setError(null)
    try {
      let mediaUrl = null
      if (mediaFile) mediaUrl = await uploadPostMedia(mediaFile)
      const card = selectedCard
      await createPost({
        cafeId: card?.cafe_id ?? null,
        caption: caption.trim(),
        emoji,
        stampLabel: card
          ? card.stamps >= card.cafe.stamp_target ? 'Reward earned! 🏆' : `${card.stamps}/${card.cafe.stamp_target} stamps`
          : null,
        isReward: card ? card.stamps >= card.cafe.stamp_target : false,
        mediaUrl,
        mediaType,
      })
      haptic(15)
      onPosted()
      onClose()
    } catch (err) {
      setError(err.message)
      setPosting(false)
    }
  }

  const canPost = (caption.trim().length > 0 || !!mediaFile) && !posting

  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-40 animate-fade-in" onClick={onClose} />
      <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] bg-white rounded-t-3xl z-50 shadow-2xl pb-10 max-h-[90vh] flex flex-col animate-slide-up">
        <div className="flex justify-center pt-3 pb-1 flex-shrink-0">
          <div className="w-10 h-1 bg-gray-200 rounded-full" />
        </div>
        <div className="px-5 pt-2 pb-4 overflow-y-auto flex-1">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-bold text-gray-900">Share a moment</h2>
            <button onClick={onClose} className="text-gray-400 p-1"><X size={20} /></button>
          </div>

          {/* Emoji picker */}
          <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
            {EMOJIS.map(e => (
              <button key={e} onClick={() => setEmoji(e)}
                className={`flex-shrink-0 w-10 h-10 rounded-xl text-xl flex items-center justify-center transition-all ${
                  emoji === e ? 'bg-amber-100 ring-2 ring-amber-400 scale-110' : 'bg-gray-100'
                }`}>{e}</button>
            ))}
          </div>

          {/* Media picker / preview */}
          {mediaPreview ? (
            <div className="relative mb-4 rounded-2xl overflow-hidden bg-black">
              {mediaType === 'video' ? (
                <video src={mediaPreview} controls playsInline className="w-full max-h-56 object-contain" />
              ) : (
                <img src={mediaPreview} alt="Preview" className="w-full max-h-56 object-cover" />
              )}
              <button onClick={clearMedia}
                className="absolute top-2 right-2 w-7 h-7 bg-black/60 rounded-full flex items-center justify-center">
                <X size={14} className="text-white" />
              </button>
              <div className="absolute bottom-2 left-2 bg-black/50 rounded-full px-2.5 py-1">
                <span className="text-white text-[11px] font-medium">
                  {mediaType === 'video' ? '🎥 Video' : '📷 Photo'}
                </span>
              </div>
            </div>
          ) : (
            <button onClick={() => fileRef.current?.click()}
              className="mb-4 w-full h-24 border-2 border-dashed border-gray-200 rounded-2xl flex flex-col items-center justify-center gap-2 text-gray-400 active:bg-gray-50 transition-colors">
              <ImagePlus size={22} />
              <span className="text-xs font-medium">Add photo or video</span>
            </button>
          )}
          <input ref={fileRef} type="file" accept="image/*,video/*" className="hidden" onChange={handleFileSelect} />

          {/* Cafe tag */}
          {cards.length > 0 && (
            <div className="mb-4">
              <p className="text-xs text-gray-500 font-medium mb-2">Tag a cafe (optional)</p>
              <div className="flex gap-2 overflow-x-auto pb-1">
                <button onClick={() => setSelectedCard(null)}
                  className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                    !selectedCard ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-500 border-gray-200'
                  }`}>None</button>
                {cards.map(card => (
                  <button key={card.id} onClick={() => setSelectedCard(card)}
                    className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                      selectedCard?.id === card.id ? 'text-white border-transparent' : 'bg-white text-gray-600 border-gray-200'
                    }`}
                    style={selectedCard?.id === card.id ? { backgroundColor: card.cafe.color } : {}}
                  >{card.cafe.logo_letter} {card.cafe.name}</button>
                ))}
              </div>
              {selectedCard && (
                <p className="text-xs text-amber-600 font-medium mt-1.5">
                  {selectedCard.stamps >= selectedCard.cafe.stamp_target
                    ? '🏆 Reward earned!' : `${selectedCard.stamps}/${selectedCard.cafe.stamp_target} stamps`}
                </p>
              )}
            </div>
          )}

          {/* Caption */}
          <textarea ref={textRef} value={caption} onChange={e => setCaption(e.target.value)}
            placeholder="What's brewing? ☕" maxLength={280} rows={3}
            className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-400 resize-none"
          />
          <div className="flex items-center justify-between mt-1">
            <span className="text-xs text-gray-400">{caption.length}/280</span>
            {error && <p className="text-xs text-red-500 text-right flex-1 ml-4">{error}</p>}
          </div>

          <button onClick={handlePost} disabled={!canPost}
            className="w-full mt-4 bg-amber-500 disabled:opacity-50 text-white font-bold py-3.5 rounded-xl flex items-center justify-center gap-2">
            {posting ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                {mediaFile ? 'Uploading…' : 'Posting…'}
              </>
            ) : (
              <><Send size={16} /> Post</>
            )}
          </button>
        </div>
      </div>
    </>
  )
}

// ── Main Posts screen ──────────────────────────────────────────
export default function PostsScreen({ user }) {
  const [feed, setFeed] = useState('everyone') // 'everyone' | 'friends'
  const [posts, setPosts] = useState([])
  const [liked, setLiked] = useState({})
  const [loading, setLoading] = useState(true)
  const [commentsPost, setCommentsPost] = useState(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState(null)
  const [composing, setComposing] = useState(false)
  const [showFriends, setShowFriends] = useState(false)
  const [pendingCount, setPendingCount] = useState(0)
  const [viewingProfile, setViewingProfile] = useState(null)
  const [likedAnim, setLikedAnim] = useState({})
  const [copiedId, setCopiedId] = useState(null) // shows "Copied!" toast

  const userId = user?.id
  const feedRef = useRef(feed)
  feedRef.current = feed

  async function load(activeFeed) {
    setLoading(true)
    try {
      const af = activeFeed ?? feedRef.current
      const data = af === 'friends' ? await getFriendsPosts() : await getPosts()
      setPosts(data)
      if (data.length) {
        const myLikes = await getMyLikes(data.map(p => p.id))
        const map = {}
        myLikes.forEach(id => { map[id] = true })
        setLiked(map)
      }
    } catch (err) { console.error(err) }
    finally { setLoading(false) }
  }

  function switchFeed(newFeed) {
    setFeed(newFeed)
    setPosts([])
    load(newFeed)
  }

  useEffect(() => {
    load('everyone')
    getMyFriendships()
      .then(({ friendships, myId }) => {
        setPendingCount(friendships.filter(f => f.status === 'pending' && f.addressee_id === myId).length)
      })
      .catch(() => {})
  }, [])

  const { pullProgress, refreshing } = usePullToRefresh(() => load())

  async function handleLike(postId) {
    const isLiked = !!liked[postId]
    setLiked(prev => ({ ...prev, [postId]: !isLiked }))
    setPosts(prev => prev.map(p => p.id === postId ? { ...p, likes_count: p.likes_count + (isLiked ? -1 : 1) } : p))
    if (!isLiked) {
      haptic(10)
      setLikedAnim(prev => ({ ...prev, [postId]: true }))
      setTimeout(() => setLikedAnim(prev => ({ ...prev, [postId]: false })), 400)
    }
    try { await toggleLike(postId, isLiked) }
    catch {
      setLiked(prev => ({ ...prev, [postId]: isLiked }))
      setPosts(prev => prev.map(p => p.id === postId ? { ...p, likes_count: p.likes_count + (isLiked ? 1 : -1) } : p))
    }
  }

  async function handleDeletePost(postId) {
    try {
      await deletePost(postId)
      setPosts(prev => prev.filter(p => p.id !== postId))
    } catch (e) { console.error(e) }
    finally { setConfirmDeleteId(null) }
  }

  async function handleShare(post) {
    const text = post.caption
      ? `"${post.caption}" — ${post.profile?.name} on Beened ☕`
      : `${post.profile?.name} is on Beened ☕`
    try {
      if (navigator.share) {
        await navigator.share({ title: 'Beened', text, url: window.location.href })
      } else {
        await navigator.clipboard.writeText(text)
        setCopiedId(post.id)
        setTimeout(() => setCopiedId(null), 2000)
      }
    } catch {}
  }

  return (
    <div className="px-4 pt-4 pb-4">

      <PullIndicator pullProgress={pullProgress} refreshing={refreshing} />

      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-2xl font-bold text-gray-900">Posts</h1>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowFriends(true)}
            className="relative w-9 h-9 rounded-full bg-white border border-gray-200 flex items-center justify-center shadow-sm active:scale-95 transition-transform"
          >
            <Users size={17} className="text-gray-600" />
            {pendingCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-rose-500 rounded-full flex items-center justify-center text-white text-[9px] font-bold">
                {pendingCount > 9 ? '9+' : pendingCount}
              </span>
            )}
          </button>
          <button
            onClick={() => setComposing(true)}
            className="w-9 h-9 rounded-full bg-amber-500 flex items-center justify-center shadow-md active:scale-95 transition-transform"
          >
            <Plus size={20} className="text-white" />
          </button>
        </div>
      </div>

      {/* Feed tabs */}
      <div className="flex bg-gray-100 rounded-2xl p-1 mb-5">
        {[
          { id: 'everyone', label: '🌍 Everyone' },
          { id: 'friends',  label: '👥 Friends'  },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => switchFeed(tab.id)}
            className={`flex-1 py-2 rounded-xl text-sm font-semibold transition-all ${
              feed === tab.id
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-400'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Feed */}
      {loading ? (
        <div className="flex flex-col gap-4">
          {[1, 2].map(i => (
            <div key={i} className="bg-white rounded-2xl p-4 animate-pulse border border-gray-50">
              <div className="flex gap-3 mb-3">
                <div className="w-9 h-9 rounded-full bg-gray-200" />
                <div className="flex-1">
                  <div className="h-3.5 bg-gray-200 rounded w-32 mb-1.5" />
                  <div className="h-3 bg-gray-100 rounded w-20" />
                </div>
              </div>
              <div className="h-48 bg-gray-100 rounded-xl mb-3" />
              <div className="h-3 bg-gray-100 rounded w-3/4" />
            </div>
          ))}
        </div>
      ) : posts.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <div className="text-5xl mb-4">{feed === 'friends' ? '👥' : '☕'}</div>
          {feed === 'friends' ? (
            <>
              <p className="text-sm font-medium">No friends posts yet</p>
              <p className="text-xs mt-1 mb-6">Add friends to see their posts here!</p>
              <button
                onClick={() => setShowFriends(true)}
                className="bg-amber-500 text-white text-sm font-bold px-6 py-3 rounded-2xl"
              >
                Find Friends
              </button>
            </>
          ) : (
            <>
              <p className="text-sm font-medium">No posts yet</p>
              <p className="text-xs mt-1 mb-6">Be the first to share a moment!</p>
              <button
                onClick={() => setComposing(true)}
                className="bg-amber-500 text-white text-sm font-bold px-6 py-3 rounded-2xl"
              >
                Share a moment
              </button>
            </>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-4">

          {/* Compose CTA */}
          <button onClick={() => setComposing(true)}
            className="w-full flex items-center gap-3 bg-white border border-gray-100 rounded-2xl px-4 py-3.5 shadow-sm text-left">
            <Avatar profile={user} size={36} />
            <span className="text-sm text-gray-400 flex-1">Share a coffee moment…</span>
            <div className="w-8 h-8 rounded-full bg-amber-500 flex items-center justify-center flex-shrink-0">
              <Plus size={16} className="text-white" />
            </div>
          </button>

          {posts.map((post, idx) => {
            const isOwn = post.user_id === userId
            const isConfirming = confirmDeleteId === post.id
            return (
              <div key={post.id}
                className="bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-50 animate-fade-in-up"
                style={{ animationDelay: `${idx * 60}ms` }}>

                {/* Post header */}
                <div className="flex items-center justify-between px-3.5 pt-3.5 pb-2.5">
                  <button
                    className="flex items-center gap-2.5 text-left active:opacity-70 transition-opacity"
                    onClick={() => post.user_id !== userId && setViewingProfile(post.user_id)}
                  >
                    <Avatar profile={post.profile} size={36} />
                    <div>
                      <p className="text-sm font-semibold text-gray-900 leading-tight">{post.profile?.name ?? 'Someone'}</p>
                      <p className="text-xs text-gray-400">{post.cafe?.name ?? 'a cafe'} · {timeAgo(post.created_at)}</p>
                    </div>
                  </button>
                  <div className="flex items-center gap-2 ml-2 flex-shrink-0">
                    {post.stamp_label && (
                      <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                        post.is_reward ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                      }`}>{post.stamp_label}</span>
                    )}
                    {isOwn && (
                      <button
                        onClick={() => setConfirmDeleteId(isConfirming ? null : post.id)}
                        className="text-gray-300 hover:text-rose-400 transition-colors p-1"
                      >
                        <Trash2 size={15} />
                      </button>
                    )}
                  </div>
                </div>

                {/* Delete confirmation */}
                {isConfirming && (
                  <div className="mx-3.5 mb-2 bg-rose-50 border border-rose-100 rounded-xl px-3.5 py-2.5 flex items-center justify-between">
                    <p className="text-xs font-medium text-rose-700">Delete this post?</p>
                    <div className="flex gap-2">
                      <button onClick={() => setConfirmDeleteId(null)}
                        className="text-xs text-gray-400 font-semibold px-3 py-1 rounded-full border border-gray-200">
                        Cancel
                      </button>
                      <button onClick={() => handleDeletePost(post.id)}
                        className="text-xs text-white font-bold px-3 py-1 rounded-full bg-rose-500">
                        Delete
                      </button>
                    </div>
                  </div>
                )}

                {/* Media or emoji */}
                {post.media_url ? (
                  post.media_type === 'video' ? (
                    <video src={post.media_url} controls playsInline
                      className="w-full max-h-72 object-contain bg-black" />
                  ) : (
                    <img src={post.media_url} alt="" className="w-full max-h-72 object-cover" />
                  )
                ) : (
                  <div className="w-full h-48 flex items-center justify-center"
                    style={{ background: post.cafe?.color
                      ? `linear-gradient(135deg, ${post.cafe.color}44 0%, ${post.cafe.color}11 100%)`
                      : 'linear-gradient(135deg, #FEF3C755 0%, #FEF3C722 100%)' }}>
                    <div className="w-24 h-24 rounded-full flex items-center justify-center text-5xl shadow-lg"
                      style={{ backgroundColor: post.cafe?.color ?? '#F59E0B' }}>{post.emoji}</div>
                  </div>
                )}

                {/* Caption + actions */}
                <div className="px-3.5 py-3">
                  {post.caption && (
                    <p className="text-sm text-gray-800 mb-2.5 leading-relaxed">{post.caption}</p>
                  )}
                  <div className="flex items-center gap-4">
                    <button onClick={() => handleLike(post.id)} className="flex items-center gap-1.5">
                      <Heart size={20}
                        className={`transition-colors ${liked[post.id] ? 'fill-rose-500 text-rose-500' : 'text-gray-300'} ${likedAnim[post.id] ? 'animate-heart-pop' : ''}`}
                      />
                      <span className={`text-sm font-medium ${liked[post.id] ? 'text-rose-500' : 'text-gray-400'}`}>
                        {post.likes_count}
                      </span>
                    </button>
                    <button onClick={() => setCommentsPost(post)} className="flex items-center gap-1.5">
                      <MessageCircle size={20} className="text-gray-300" />
                      <span className="text-sm font-medium text-gray-400">{post.comments_count ?? 0}</span>
                    </button>
                    {/* Share button */}
                    <button
                      onClick={() => handleShare(post)}
                      className="flex items-center gap-1.5 ml-auto"
                    >
                      {copiedId === post.id ? (
                        <span className="text-xs text-emerald-500 font-semibold">Copied!</span>
                      ) : (
                        <Share2 size={18} className="text-gray-300" />
                      )}
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Sheets */}
      {composing && (
        <ComposeSheet userId={userId} onClose={() => setComposing(false)} onPosted={() => load()} />
      )}
      {commentsPost && (
        <CommentsSheet
          post={commentsPost}
          myId={userId}
          onClose={() => setCommentsPost(null)}
          onCountChange={count =>
            setPosts(prev => prev.map(p => p.id === commentsPost.id ? { ...p, comments_count: count } : p))
          }
        />
      )}
      {showFriends && (
        <FriendsSheet onClose={() => setShowFriends(false)} onPendingChange={setPendingCount} />
      )}
      {viewingProfile && (
        <UserProfileSheet
          userId={viewingProfile}
          myId={userId}
          onClose={() => setViewingProfile(null)}
        />
      )}
    </div>
  )
}
