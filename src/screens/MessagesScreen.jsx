import { useState, useEffect } from 'react'
import { Trash2, X, Check } from 'lucide-react'
import Avatar from '../components/Avatar'
import { getConversations, deleteConversation } from '../lib/api'
import ChatSheet from './ChatSheet'
import { usePullToRefresh, PullIndicator } from '../hooks/usePullToRefresh.jsx'

function timeAgo(ts) {
  if (!ts) return ''
  const secs = Math.floor((Date.now() - new Date(ts)) / 1000)
  if (secs < 60) return 'now'
  if (secs < 3600) return `${Math.floor(secs / 60)}m`
  if (secs < 86400) return `${Math.floor(secs / 3600)}h`
  return `${Math.floor(secs / 86400)}d`
}

export default function MessagesScreen({ user, initialConversation }) {
  const [conversations, setConversations] = useState([])
  const [myId, setMyId] = useState(null)
  const [loading, setLoading] = useState(true)
  const [activeChat, setActiveChat] = useState(initialConversation ?? null)
  const [confirmDeleteId, setConfirmDeleteId] = useState(null)
  const [deleting, setDeleting] = useState(false)
  // { conversationId, otherUser }

  async function load() {
    try {
      const { conversations: data, myId: id } = await getConversations()
      setConversations(data)
      setMyId(id)
    } catch (e) { console.error(e) }
    finally { setLoading(false) }
  }

  useEffect(() => {
    load()
  }, [])

  // Also open initial conversation if passed in
  useEffect(() => {
    if (initialConversation) setActiveChat(initialConversation)
  }, [initialConversation])

  function openChat(convo) {
    const otherId = convo.user1?.id === myId ? convo.user2 : convo.user1
    setActiveChat({ conversationId: convo.id, otherUser: otherId })
  }

  function closeChat() {
    setActiveChat(null)
    load() // refresh to update last message / unread
  }

  const { pullProgress, refreshing } = usePullToRefresh(load)

  async function handleDelete(conversationId) {
    setDeleting(true)
    try {
      await deleteConversation(conversationId)
      setConversations(prev => prev.filter(c => c.id !== conversationId))
      setConfirmDeleteId(null)
    } catch (e) {
      console.error(e)
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="px-4 pt-4 pb-4">

      <PullIndicator pullProgress={pullProgress} refreshing={refreshing} />

      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-2xl font-bold text-gray-900">Messages</h1>
      </div>

      {loading ? (
        <div className="flex flex-col gap-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="flex items-center gap-3 bg-white rounded-2xl p-4 animate-pulse">
              <div className="w-12 h-12 rounded-full bg-gray-200 flex-shrink-0" />
              <div className="flex-1">
                <div className="h-3.5 bg-gray-200 rounded w-28 mb-2" />
                <div className="h-3 bg-gray-100 rounded w-40" />
              </div>
            </div>
          ))}
        </div>
      ) : conversations.length === 0 ? (
        <div className="text-center py-24 text-gray-400">
          <div className="text-5xl mb-4">💬</div>
          <p className="text-sm font-medium">No messages yet</p>
          <p className="text-xs mt-1">Tap a friend's profile in the Posts feed to start a chat!</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {conversations.map(convo => {
            const other = convo.user1?.id === myId ? convo.user2 : convo.user1
            const isConfirming = confirmDeleteId === convo.id

            if (isConfirming) {
              return (
                <div key={convo.id} className="flex items-center gap-3 bg-rose-50 border border-rose-100 rounded-2xl px-4 py-3 shadow-sm">
                  <p className="flex-1 text-sm font-semibold text-rose-600">Delete chat with {other?.name?.split(' ')[0]}?</p>
                  <button
                    onClick={() => setConfirmDeleteId(null)}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-gray-100 text-gray-600 text-xs font-semibold active:scale-95 transition-transform"
                  >
                    <X size={13} /> Cancel
                  </button>
                  <button
                    onClick={() => handleDelete(convo.id)}
                    disabled={deleting}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-rose-500 text-white text-xs font-semibold disabled:opacity-50 active:scale-95 transition-transform"
                  >
                    <Check size={13} /> Delete
                  </button>
                </div>
              )
            }

            return (
              <div key={convo.id} className="flex items-center gap-2">
                <button
                  onClick={() => openChat(convo)}
                  className="flex-1 flex items-center gap-3 bg-white rounded-2xl p-4 shadow-sm border border-gray-50 text-left active:scale-[0.98] transition-transform min-w-0"
                >
                  <Avatar profile={other} size={48} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-0.5">
                      <p className="text-sm font-bold text-gray-900 truncate">{other?.name ?? 'User'}</p>
                      {convo.last_message_at && (
                        <span className="text-xs text-gray-400 flex-shrink-0 ml-2">
                          {timeAgo(convo.last_message_at)}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-400 truncate">
                      {convo.last_message ?? 'No messages yet'}
                    </p>
                  </div>
                </button>

                {/* Trash button */}
                <button
                  onClick={() => setConfirmDeleteId(convo.id)}
                  className="w-9 h-9 flex items-center justify-center rounded-full text-gray-300 hover:text-rose-400 hover:bg-rose-50 active:scale-95 transition-all flex-shrink-0"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            )
          })}
        </div>
      )}

      {/* Chat */}
      {activeChat && (
        <ChatSheet
          conversationId={activeChat.conversationId}
          otherUser={activeChat.otherUser}
          myId={myId ?? user?.id}
          onClose={closeChat}
        />
      )}
    </div>
  )
}
