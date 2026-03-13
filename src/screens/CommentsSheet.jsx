import { useState, useEffect, useRef } from 'react'
import { X, Send, Trash2 } from 'lucide-react'
import Avatar from '../components/Avatar'
import { getComments, addComment, deleteComment } from '../lib/api'

function timeAgo(dateStr) {
  const diff = Math.floor((Date.now() - new Date(dateStr)) / 1000)
  if (diff < 60) return 'just now'
  if (diff < 3600) return `${Math.floor(diff / 60)}m`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`
  return `${Math.floor(diff / 86400)}d`
}

export default function CommentsSheet({ post, myId, onClose, onCountChange }) {
  const [comments, setComments] = useState([])
  const [loading, setLoading] = useState(true)
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const bottomRef = useRef(null)
  const inputRef = useRef(null)

  useEffect(() => {
    getComments(post.id)
      .then(setComments)
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [post.id])

  // Scroll to bottom when comments load or new one is added
  useEffect(() => {
    if (!loading) bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [comments.length, loading])

  async function handleSend() {
    const trimmed = text.trim()
    if (!trimmed || sending) return
    setSending(true)
    try {
      const newComment = await addComment(post.id, trimmed)
      setComments(prev => [...prev, newComment])
      onCountChange?.(comments.length + 1)
      setText('')
      inputRef.current?.focus()
    } catch (e) {
      console.error(e)
    } finally {
      setSending(false)
    }
  }

  async function handleDelete(commentId) {
    try {
      await deleteComment(commentId)
      const updated = comments.filter(c => c.id !== commentId)
      setComments(updated)
      onCountChange?.(updated.length)
    } catch (e) {
      console.error(e)
    }
  }

  function handleKey(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-40 animate-fade-in" onClick={onClose} />

      <div className="fixed inset-x-0 bottom-0 top-20 max-w-[430px] mx-auto bg-stone-50 z-50 rounded-t-3xl flex flex-col shadow-2xl overflow-hidden animate-slide-up">

        {/* Header */}
        <div className="flex items-center gap-3 px-5 pt-5 pb-3 bg-white border-b border-gray-100 flex-shrink-0">
          <button onClick={onClose} className="text-gray-400 p-1 -ml-1">
            <X size={20} />
          </button>
          <h2 className="text-base font-bold text-gray-900 flex-1">
            Comments
          </h2>
          <span className="text-xs text-gray-400">{comments.length}</span>
        </div>

        {/* Post preview */}
        <div className="px-4 py-3 bg-white border-b border-gray-100 flex-shrink-0 flex items-center gap-3">
          <Avatar profile={post.profile} size={36} />
          <div className="flex-1 min-w-0">
            <span className="text-sm font-semibold text-gray-800">{post.profile?.name} </span>
            <span className="text-sm text-gray-600">{post.caption}</span>
          </div>
        </div>

        {/* Comments list */}
        <div className="flex-1 overflow-y-auto px-4 py-4">
          {loading ? (
            <div className="flex justify-center py-10">
              <div className="w-5 h-5 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : comments.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <p className="text-2xl mb-2">💬</p>
              <p className="text-sm font-medium">No comments yet</p>
              <p className="text-xs mt-1">Be the first to comment!</p>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {comments.map(comment => (
                <div key={comment.id} className="flex items-start gap-3">
                  <Avatar profile={comment.profile} size={32} />
                  <div className="flex-1 min-w-0">
                    <div className="bg-white rounded-2xl rounded-tl-sm px-3.5 py-2.5 shadow-sm border border-gray-50">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-xs font-semibold text-gray-900">
                          {comment.profile?.name}
                        </span>
                        <span className="text-[11px] text-gray-400">
                          {timeAgo(comment.created_at)}
                        </span>
                        {comment.user_id === myId && (
                          <button
                            onClick={() => handleDelete(comment.id)}
                            className="ml-auto text-gray-300 hover:text-rose-400 transition-colors"
                          >
                            <Trash2 size={12} />
                          </button>
                        )}
                      </div>
                      <p className="text-sm text-gray-700 leading-relaxed break-words">
                        {comment.content}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
              <div ref={bottomRef} />
            </div>
          )}
        </div>

        {/* Input bar */}
        <div className="flex-shrink-0 bg-white border-t border-gray-100 px-4 py-3 flex items-center gap-3">
          <input
            ref={inputRef}
            value={text}
            onChange={e => setText(e.target.value)}
            onKeyDown={handleKey}
            placeholder="Add a comment…"
            maxLength={500}
            className="flex-1 bg-gray-100 rounded-2xl px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-400"
          />
          <button
            onClick={handleSend}
            disabled={!text.trim() || sending}
            className="w-9 h-9 rounded-full bg-amber-500 flex items-center justify-center disabled:opacity-40 active:scale-95 transition-transform flex-shrink-0"
          >
            <Send size={15} className="text-white translate-x-0.5" />
          </button>
        </div>
      </div>
    </>
  )
}
