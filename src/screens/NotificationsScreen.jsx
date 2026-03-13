import { useState, useEffect } from 'react'
import { X, Heart, MessageCircle, UserPlus, UserCheck, Bell } from 'lucide-react'
import Avatar from '../components/Avatar'
import { getNotifications, markAllNotificationsRead } from '../lib/api'

function timeAgo(ts) {
  const secs = Math.floor((Date.now() - new Date(ts)) / 1000)
  if (secs < 60) return 'just now'
  if (secs < 3600) return `${Math.floor(secs / 60)}m ago`
  if (secs < 86400) return `${Math.floor(secs / 3600)}h ago`
  return `${Math.floor(secs / 86400)}d ago`
}

function NotifIcon({ type }) {
  if (type === 'like')            return <Heart size={13} className="text-rose-500 fill-rose-500" />
  if (type === 'comment')         return <MessageCircle size={13} className="text-blue-500" />
  if (type === 'friend_request')  return <UserPlus size={13} className="text-amber-500" />
  if (type === 'friend_accepted') return <UserCheck size={13} className="text-emerald-500" />
  return <Bell size={13} className="text-gray-400" />
}

function notifText(type, name) {
  const n = name ?? 'Someone'
  if (type === 'like')            return `${n} liked your post`
  if (type === 'comment')         return `${n} commented on your post`
  if (type === 'friend_request')  return `${n} sent you a friend request`
  if (type === 'friend_accepted') return `${n} accepted your friend request`
  return 'New notification'
}

export default function NotificationsScreen({ onClose, onUnreadChange }) {
  const [notifs, setNotifs] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getNotifications()
      .then(data => {
        setNotifs(data)
        const hasUnread = data.some(n => !n.read_at)
        if (hasUnread) {
          markAllNotificationsRead().then(() => onUnreadChange?.(0)).catch(() => {})
        } else {
          onUnreadChange?.(0)
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-40 animate-fade-in" onClick={onClose} />
      <div className="fixed inset-x-0 bottom-0 top-16 max-w-[430px] mx-auto bg-stone-50 z-50 rounded-t-3xl flex flex-col shadow-2xl overflow-hidden animate-slide-up">

        {/* Header */}
        <div className="flex items-center gap-3 px-5 pt-5 pb-3 bg-white border-b border-gray-100 flex-shrink-0">
          <button onClick={onClose} className="text-gray-400 p-1 -ml-1">
            <X size={20} />
          </button>
          <h2 className="text-base font-bold text-gray-900 flex-1">Notifications</h2>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto px-4 py-4">
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="w-5 h-5 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : notifs.length === 0 ? (
            <div className="text-center py-20 text-gray-400">
              <Bell size={44} className="mx-auto mb-3 opacity-20" strokeWidth={1.5} />
              <p className="text-sm font-medium">No notifications yet</p>
              <p className="text-xs mt-1 text-gray-300">Likes, comments, and friend requests will show up here</p>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {notifs.map(n => (
                <div
                  key={n.id}
                  className={`flex items-center gap-3 rounded-2xl px-4 py-3 border ${
                    n.read_at ? 'bg-white border-gray-50' : 'bg-amber-50/60 border-amber-100'
                  }`}
                >
                  <div className="relative flex-shrink-0">
                    <Avatar profile={n.from_profile} size={42} />
                    <div className="absolute -bottom-0.5 -right-0.5 w-5 h-5 bg-white rounded-full flex items-center justify-center shadow-sm border border-gray-100">
                      <NotifIcon type={n.type} />
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-800 leading-snug">
                      <span className="font-semibold">{n.from_profile?.name ?? 'Someone'}</span>
                      {' '}{notifText(n.type, '').replace('Someone ', '')}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">{timeAgo(n.created_at)}</p>
                  </div>
                  {!n.read_at && (
                    <div className="w-2 h-2 rounded-full bg-amber-500 flex-shrink-0" />
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  )
}
