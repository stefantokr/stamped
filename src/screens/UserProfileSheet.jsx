import { useState, useEffect } from 'react'
import { X, UserPlus, UserCheck, UserX, Clock } from 'lucide-react'
import Avatar from '../components/Avatar'
import {
  getProfile,
  getFriendshipWith,
  sendFriendRequest,
  respondToRequest,
  withdrawRequest,
} from '../lib/api'

export default function UserProfileSheet({ userId, myId, onClose }) {
  const [profile, setProfile] = useState(null)
  const [friendship, setFriendship] = useState(null)
  const [loadingProfile, setLoadingProfile] = useState(true)
  const [acting, setActing] = useState(false)

  useEffect(() => {
    async function load() {
      try {
        const [p, { friendship: f }] = await Promise.all([
          getProfile(userId),
          getFriendshipWith(userId),
        ])
        setProfile(p)
        setFriendship(f)
      } catch (e) {
        console.error(e)
      } finally {
        setLoadingProfile(false)
      }
    }
    load()
  }, [userId])

  // Derive friendship state
  const isAccepted   = friendship?.status === 'accepted'
  const isPending    = friendship?.status === 'pending'
  const iSentIt      = isPending && friendship?.requester_id === myId
  const theySentIt   = isPending && friendship?.addressee_id === myId

  async function handleAdd() {
    setActing(true)
    try {
      const f = await sendFriendRequest(userId)
      setFriendship(f)
    } catch (e) { console.error(e) }
    finally { setActing(false) }
  }

  async function handleWithdraw() {
    setActing(true)
    try {
      await withdrawRequest(friendship.id)
      setFriendship(null)
    } catch (e) { console.error(e) }
    finally { setActing(false) }
  }

  async function handleAccept() {
    setActing(true)
    try {
      const f = await respondToRequest(friendship.id, 'accepted')
      setFriendship(f)
    } catch (e) { console.error(e) }
    finally { setActing(false) }
  }

  async function handleDecline() {
    setActing(true)
    try {
      await respondToRequest(friendship.id, 'declined')
      setFriendship(null)
    } catch (e) { console.error(e) }
    finally { setActing(false) }
  }

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-40" onClick={onClose} />
      <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] bg-white rounded-t-3xl z-50 shadow-2xl pb-10">

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
            {/* Avatar */}
            <Avatar profile={profile} size={72} />

            {/* Name & username */}
            <h2 className="text-xl font-bold text-gray-900 mt-3">{profile.name}</h2>
            {profile.username && (
              <p className="text-sm text-gray-400 mt-0.5">@{profile.username}</p>
            )}

            {/* Bio */}
            {profile.bio && (
              <p className="text-sm text-gray-600 text-center mt-3 leading-relaxed">{profile.bio}</p>
            )}

            {/* Friend action button(s) */}
            <div className="w-full mt-6 flex gap-3">
              {isAccepted ? (
                <div className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl bg-emerald-50 text-emerald-600 font-semibold text-sm">
                  <UserCheck size={18} />
                  Friends
                </div>
              ) : theySentIt ? (
                <>
                  <button
                    onClick={handleAccept}
                    disabled={acting}
                    className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl bg-amber-500 text-white font-bold text-sm disabled:opacity-50 active:scale-95 transition-transform"
                  >
                    <UserPlus size={18} />
                    Accept
                  </button>
                  <button
                    onClick={handleDecline}
                    disabled={acting}
                    className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl bg-gray-100 text-gray-500 font-semibold text-sm disabled:opacity-50 active:scale-95 transition-transform"
                  >
                    <UserX size={18} />
                    Decline
                  </button>
                </>
              ) : iSentIt ? (
                <button
                  onClick={handleWithdraw}
                  disabled={acting}
                  className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl bg-gray-100 text-gray-500 font-semibold text-sm disabled:opacity-50 active:scale-95 transition-transform"
                >
                  <Clock size={18} />
                  Request Sent — Cancel
                </button>
              ) : (
                <button
                  onClick={handleAdd}
                  disabled={acting}
                  className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl bg-amber-500 text-white font-bold text-sm disabled:opacity-50 active:scale-95 transition-transform"
                >
                  <UserPlus size={18} />
                  Add Friend
                </button>
              )}
            </div>
          </div>
        ) : (
          <p className="text-center text-gray-400 py-12 text-sm">Could not load profile</p>
        )}
      </div>
    </>
  )
}
