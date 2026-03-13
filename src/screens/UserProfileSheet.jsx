import { useState, useEffect } from 'react'
import { X, UserPlus, UserCheck, UserX, Clock, MessageCircle, ShieldOff, Flag } from 'lucide-react'
import Avatar from '../components/Avatar'
import {
  getProfile,
  getFriendshipWith,
  sendFriendRequest,
  respondToRequest,
  withdrawRequest,
  getOrCreateConversation,
  getBlockStatus,
  blockUser,
  unblockUser,
} from '../lib/api'
import ChatSheet from './ChatSheet'
import ReportSheet from '../components/ReportSheet'

export default function UserProfileSheet({ userId, myId, onClose }) {
  const [profile, setProfile] = useState(null)
  const [friendship, setFriendship] = useState(null)
  const [loadingProfile, setLoadingProfile] = useState(true)
  const [acting, setActing] = useState(false)
  const [chat, setChat] = useState(null)
  const [isBlocked, setIsBlocked] = useState(false)
  const [showReport, setShowReport] = useState(false)

  useEffect(() => {
    async function load() {
      try {
        const [p, { friendship: f }, blocked] = await Promise.all([
          getProfile(userId),
          getFriendshipWith(userId),
          getBlockStatus(userId),
        ])
        setProfile(p)
        setFriendship(f)
        setIsBlocked(blocked)
      } catch (e) {
        console.error(e)
      } finally {
        setLoadingProfile(false)
      }
    }
    load()
  }, [userId])

  const isAccepted = friendship?.status === 'accepted'
  const isPending  = friendship?.status === 'pending'
  const iSentIt    = isPending && friendship?.requester_id === myId
  const theySentIt = isPending && friendship?.addressee_id === myId

  async function handleAdd() {
    setActing(true)
    try { const f = await sendFriendRequest(userId); setFriendship(f) }
    catch (e) { console.error(e) }
    finally { setActing(false) }
  }

  async function handleWithdraw() {
    setActing(true)
    try { await withdrawRequest(friendship.id); setFriendship(null) }
    catch (e) { console.error(e) }
    finally { setActing(false) }
  }

  async function handleAccept() {
    setActing(true)
    try { const f = await respondToRequest(friendship.id, 'accepted'); setFriendship(f) }
    catch (e) { console.error(e) }
    finally { setActing(false) }
  }

  async function handleDecline() {
    setActing(true)
    try { await respondToRequest(friendship.id, 'declined'); setFriendship(null) }
    catch (e) { console.error(e) }
    finally { setActing(false) }
  }

  async function handleMessage() {
    setActing(true)
    try {
      const convId = await getOrCreateConversation(userId)
      setChat({ conversationId: convId, otherUser: profile })
    } catch (e) { console.error(e) }
    finally { setActing(false) }
  }

  async function handleBlock() {
    setActing(true)
    try {
      if (isBlocked) {
        await unblockUser(userId)
        setIsBlocked(false)
      } else {
        await blockUser(userId)
        setIsBlocked(true)
        setFriendship(null)
      }
    } catch (e) { console.error(e) }
    finally { setActing(false) }
  }

  if (chat) {
    return (
      <ChatSheet
        conversationId={chat.conversationId}
        otherUser={chat.otherUser}
        myId={myId}
        onClose={() => setChat(null)}
      />
    )
  }

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-40 animate-fade-in" onClick={onClose} />
      <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] bg-white rounded-t-3xl z-50 shadow-2xl pb-10 animate-slide-up">

        {/* Handle */}
        <div className="flex justify-center pt-3 pb-2">
          <div className="w-10 h-1 bg-gray-200 rounded-full" />
        </div>

        {/* Close */}
        <div className="flex justify-end px-5 pb-2">
          <button onClick={onClose} className="text-gray-400 p-1">
            <X size={20} />
          </button>
        </div>

        {loadingProfile ? (
          <div className="flex flex-col items-center py-12 gap-3">
            <div className="w-16 h-16 rounded-full bg-gray-200 animate-pulse" />
            <div className="h-4 w-32 bg-gray-200 rounded animate-pulse" />
            <div className="h-3 w-24 bg-gray-100 rounded animate-pulse" />
          </div>
        ) : profile ? (
          <div className="flex flex-col items-center px-6 pb-2">
            <Avatar profile={profile} size={72} />
            <h2 className="text-xl font-bold text-gray-900 mt-3">{profile.name}</h2>
            {profile.username && (
              <p className="text-sm text-gray-400 mt-0.5">@{profile.username}</p>
            )}
            {profile.bio && (
              <p className="text-sm text-gray-600 text-center mt-3 leading-relaxed">{profile.bio}</p>
            )}

            {/* Action buttons */}
            <div className="w-full mt-6 flex flex-col gap-3">

              {/* Friend button — hidden if blocked */}
              {!isBlocked && (
                <div className="flex gap-3">
                  {isAccepted ? (
                    <div className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl bg-emerald-50 text-emerald-600 font-semibold text-sm">
                      <UserCheck size={18} /> Friends
                    </div>
                  ) : theySentIt ? (
                    <>
                      <button onClick={handleAccept} disabled={acting}
                        className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl bg-amber-500 text-white font-bold text-sm disabled:opacity-50 active:scale-95 transition-transform">
                        <UserPlus size={18} /> Accept
                      </button>
                      <button onClick={handleDecline} disabled={acting}
                        className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl bg-gray-100 text-gray-500 font-semibold text-sm disabled:opacity-50 active:scale-95 transition-transform">
                        <UserX size={18} /> Decline
                      </button>
                    </>
                  ) : iSentIt ? (
                    <button onClick={handleWithdraw} disabled={acting}
                      className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl bg-gray-100 text-gray-500 font-semibold text-sm disabled:opacity-50 active:scale-95 transition-transform">
                      <Clock size={18} /> Request Sent — Cancel
                    </button>
                  ) : (
                    <button onClick={handleAdd} disabled={acting}
                      className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl bg-amber-500 text-white font-bold text-sm disabled:opacity-50 active:scale-95 transition-transform">
                      <UserPlus size={18} /> Add Friend
                    </button>
                  )}
                </div>
              )}

              {/* Message button — hidden if blocked */}
              {!isBlocked && (
                <button onClick={handleMessage} disabled={acting}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl bg-gray-100 text-gray-700 font-semibold text-sm disabled:opacity-50 active:scale-95 transition-transform">
                  <MessageCircle size={18} />
                  {acting ? 'Opening…' : 'Message'}
                </button>
              )}

              {/* Block + Report row */}
              <div className="flex gap-3">
                <button
                  onClick={handleBlock}
                  disabled={acting}
                  className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl text-sm font-semibold disabled:opacity-50 active:scale-95 transition-transform ${
                    isBlocked ? 'bg-amber-50 text-amber-600' : 'bg-gray-100 text-gray-500'
                  }`}
                >
                  <ShieldOff size={16} />
                  {isBlocked ? 'Unblock' : 'Block'}
                </button>
                <button
                  onClick={() => setShowReport(true)}
                  className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl bg-gray-100 text-gray-500 font-semibold text-sm active:scale-95 transition-transform"
                >
                  <Flag size={16} />
                  Report
                </button>
              </div>
            </div>
          </div>
        ) : (
          <p className="text-center text-gray-400 py-12 text-sm">Could not load profile</p>
        )}
      </div>

      {showReport && (
        <ReportSheet
          reportedUserId={userId}
          onClose={() => setShowReport(false)}
        />
      )}
    </>
  )
}
