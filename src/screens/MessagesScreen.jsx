import { useState, useEffect } from 'react'
import Avatar from '../components/Avatar'
import { getConversations } from '../lib/api'
import ChatSheet from './ChatSheet'

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

  return (
    <div className="px-4 pt-4 pb-4">

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
            return (
              <button
                key={convo.id}
                onClick={() => openChat(convo)}
                className="w-full flex items-center gap-3 bg-white rounded-2xl p-4 shadow-sm border border-gray-50 text-left active:scale-[0.98] transition-transform"
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
