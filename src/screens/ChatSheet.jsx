import { useState, useEffect, useRef } from 'react'
import { ArrowLeft, Send } from 'lucide-react'
import Avatar from '../components/Avatar'
import { supabase } from '../lib/supabase'
import { getMessages, sendMessage, markMessagesRead } from '../lib/api'

function timeLabel(ts) {
  const d = new Date(ts)
  const now = new Date()
  const diff = (now - d) / 1000
  if (diff < 86400) return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' })
}

export default function ChatSheet({ conversationId, otherUser, myId, onClose }) {
  const [messages, setMessages] = useState([])
  const [loading, setLoading] = useState(true)
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const bottomRef = useRef(null)
  const inputRef = useRef(null)

  // Load messages + mark read
  useEffect(() => {
    getMessages(conversationId)
      .then(data => {
        setMessages(data)
        setLoading(false)
        markMessagesRead(conversationId).catch(() => {})
      })
      .catch(console.error)
  }, [conversationId])

  // Scroll to bottom when messages load or change
  useEffect(() => {
    if (!loading) bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages.length, loading])

  // Real-time subscription
  useEffect(() => {
    const channel = supabase
      .channel(`chat:${conversationId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `conversation_id=eq.${conversationId}`,
      }, payload => {
        const newMsg = payload.new
        setMessages(prev => {
          if (prev.some(m => m.id === newMsg.id)) return prev
          return [...prev, newMsg]
        })
        if (newMsg.sender_id !== myId) {
          markMessagesRead(conversationId).catch(() => {})
        }
      })
      .subscribe()
    return () => supabase.removeChannel(channel)
  }, [conversationId, myId])

  async function handleSend() {
    const trimmed = text.trim()
    if (!trimmed || sending) return
    setSending(true)
    setText('')
    try {
      const msg = await sendMessage(conversationId, trimmed)
      setMessages(prev => prev.some(m => m.id === msg.id) ? prev : [...prev, msg])
    } catch (e) {
      console.error(e)
      setText(trimmed)
    } finally {
      setSending(false)
      inputRef.current?.focus()
    }
  }

  function handleKey(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="fixed inset-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] bg-stone-50 z-50 flex flex-col">

      {/* Header */}
      <div className="flex items-center gap-3 px-4 pt-12 pb-4 bg-white border-b border-gray-100 flex-shrink-0 shadow-sm">
        <button onClick={onClose} className="p-1 text-gray-500 active:scale-95 transition-transform">
          <ArrowLeft size={22} />
        </button>
        <Avatar profile={otherUser} size={36} />
        <div className="flex-1 min-w-0">
          <p className="font-bold text-gray-900 text-sm leading-tight truncate">{otherUser?.name ?? 'User'}</p>
          {otherUser?.username && (
            <p className="text-xs text-gray-400">@{otherUser.username}</p>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-2">
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-5 h-5 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center flex-1 text-gray-400 py-16">
            <div className="text-4xl mb-3">👋</div>
            <p className="text-sm font-medium">Say hello to {otherUser?.name?.split(' ')[0]}!</p>
          </div>
        ) : (
          <>
            {messages.map((msg, i) => {
              const isMe = msg.sender_id === myId
              const prevMsg = messages[i - 1]
              const showTime = !prevMsg || (new Date(msg.created_at) - new Date(prevMsg.created_at)) > 5 * 60 * 1000
              return (
                <div key={msg.id}>
                  {showTime && (
                    <p className="text-center text-[11px] text-gray-400 my-2">{timeLabel(msg.created_at)}</p>
                  )}
                  <div className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[75%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
                      isMe
                        ? 'bg-amber-500 text-white rounded-br-sm'
                        : 'bg-white text-gray-900 shadow-sm border border-gray-100 rounded-bl-sm'
                    }`}>
                      {msg.content}
                    </div>
                  </div>
                </div>
              )
            })}
            <div ref={bottomRef} />
          </>
        )}
      </div>

      {/* Input bar */}
      <div className="flex-shrink-0 bg-white border-t border-gray-100 px-4 py-3 pb-8 flex items-center gap-3">
        <input
          ref={inputRef}
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={handleKey}
          placeholder={`Message ${otherUser?.name?.split(' ')[0] ?? ''}…`}
          maxLength={1000}
          className="flex-1 bg-gray-100 rounded-2xl px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-400"
        />
        <button
          onClick={handleSend}
          disabled={!text.trim() || sending}
          className="w-10 h-10 rounded-full bg-amber-500 flex items-center justify-center disabled:opacity-40 active:scale-95 transition-transform flex-shrink-0 shadow-md"
        >
          <Send size={16} className="text-white translate-x-0.5" />
        </button>
      </div>
    </div>
  )
}
