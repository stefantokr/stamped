import { useState, useEffect, useRef } from 'react'
import { X, Search, UserPlus, Check, Clock, Users, UserCheck } from 'lucide-react'
import Avatar from '../components/Avatar'
import {
  searchUsers,
  getMyFriendships,
  sendFriendRequest,
  respondToRequest,
  withdrawRequest,
} from '../lib/api'

// Derive a user's friendship status from the full friendships array
function getStatus(friendships, myId, otherId) {
  const f = friendships.find(f =>
    (f.requester_id === myId && f.addressee_id === otherId) ||
    (f.requester_id === otherId && f.addressee_id === myId)
  )
  if (!f) return { status: 'none' }
  if (f.status === 'accepted') return { status: 'friends', id: f.id }
  if (f.status === 'pending' && f.requester_id === myId) return { status: 'sent', id: f.id }
  if (f.status === 'pending' && f.addressee_id === myId) return { status: 'received', id: f.id }
  return { status: 'none' }
}

function ActionButton({ rel, onAdd, onWithdraw, onAccept, onDecline }) {
  const [busy, setBusy] = useState(false)

  async function run(fn) {
    setBusy(true)
    try { await fn() } finally { setBusy(false) }
  }

  if (rel.status === 'friends') {
    return (
      <span className="flex items-center gap-1 text-emerald-600 text-xs font-semibold">
        <UserCheck size={14} /> Friends
      </span>
    )
  }
  if (rel.status === 'sent') {
    return (
      <button
        onClick={() => run(onWithdraw)}
        disabled={busy}
        className="flex items-center gap-1 text-xs font-semibold text-gray-400 border border-gray-200 px-3 py-1.5 rounded-full disabled:opacity-50"
      >
        <Clock size={12} /> Pending
      </button>
    )
  }
  if (rel.status === 'received') {
    return (
      <div className="flex gap-1.5">
        <button
          onClick={() => run(onAccept)}
          disabled={busy}
          className="flex items-center gap-1 text-xs font-bold text-white bg-amber-500 px-3 py-1.5 rounded-full disabled:opacity-50"
        >
          <Check size={12} /> Accept
        </button>
        <button
          onClick={() => run(onDecline)}
          disabled={busy}
          className="text-xs font-semibold text-gray-400 border border-gray-200 px-3 py-1.5 rounded-full disabled:opacity-50"
        >
          Decline
        </button>
      </div>
    )
  }
  // none
  return (
    <button
      onClick={() => run(onAdd)}
      disabled={busy}
      className="flex items-center gap-1 text-xs font-bold text-white bg-amber-500 px-3 py-1.5 rounded-full disabled:opacity-50"
    >
      <UserPlus size={12} /> Add
    </button>
  )
}

export default function FriendsSheet({ onClose, onPendingChange }) {
  const [query, setQuery] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [searching, setSearching] = useState(false)
  const [friendships, setFriendships] = useState([])
  const [myId, setMyId] = useState(null)
  const [loading, setLoading] = useState(true)
  const inputRef = useRef(null)

  useEffect(() => {
    inputRef.current?.focus()
    getMyFriendships()
      .then(({ friendships: fs, myId: id }) => {
        setFriendships(fs)
        setMyId(id)
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  // Notify parent of pending count changes
  useEffect(() => {
    if (!myId) return
    const count = friendships.filter(
      f => f.status === 'pending' && f.addressee_id === myId
    ).length
    onPendingChange?.(count)
  }, [friendships, myId])

  // Debounced search
  useEffect(() => {
    if (!query.trim()) { setSearchResults([]); return }
    setSearching(true)
    const t = setTimeout(async () => {
      try { setSearchResults(await searchUsers(query)) }
      catch (e) { console.error(e) }
      finally { setSearching(false) }
    }, 350)
    return () => clearTimeout(t)
  }, [query])

  // ── Derived lists ──────────────────────────────────────────
  const pendingIn = friendships
    .filter(f => f.status === 'pending' && f.addressee_id === myId)
    .map(f => ({ fid: f.id, user: f.requester }))

  const friends = friendships
    .filter(f => f.status === 'accepted')
    .map(f => ({ fid: f.id, user: f.requester_id === myId ? f.addressee : f.requester }))

  // ── Mutation handlers ──────────────────────────────────────
  async function handleAdd(otherId) {
    const newF = await sendFriendRequest(otherId)
    setFriendships(prev => [...prev, newF])
  }

  async function handleWithdraw(fid) {
    await withdrawRequest(fid)
    setFriendships(prev => prev.filter(f => f.id !== fid))
  }

  async function handleAccept(fid) {
    await respondToRequest(fid, 'accepted')
    setFriendships(prev => prev.map(f => f.id === fid ? { ...f, status: 'accepted' } : f))
  }

  async function handleDecline(fid) {
    await respondToRequest(fid, 'declined')
    setFriendships(prev => prev.filter(f => f.id !== fid))
  }

  const isSearching = query.trim().length > 0

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-40" onClick={onClose} />

      <div className="fixed inset-x-0 bottom-0 top-12 max-w-[430px] mx-auto bg-stone-50 z-50 rounded-t-3xl flex flex-col shadow-2xl overflow-hidden">

        {/* Header */}
        <div className="flex items-center gap-3 px-5 pt-5 pb-3 bg-white border-b border-gray-100 flex-shrink-0">
          <button onClick={onClose} className="text-gray-400 p-1 -ml-1">
            <X size={20} />
          </button>
          <h2 className="text-base font-bold text-gray-900 flex-1">Friends</h2>
          {!isSearching && (
            <span className="text-xs text-gray-400">{friends.length} friends</span>
          )}
        </div>

        {/* Search bar */}
        <div className="px-4 py-3 bg-white border-b border-gray-100 flex-shrink-0">
          <div className="flex items-center gap-2 bg-gray-100 rounded-2xl px-3 py-2.5">
            <Search size={15} className="text-gray-400 flex-shrink-0" />
            <input
              ref={inputRef}
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search by name or username…"
              className="flex-1 bg-transparent text-sm text-gray-900 placeholder-gray-400 focus:outline-none"
            />
            {query && (
              <button onClick={() => setQuery('')} className="text-gray-400">
                <X size={14} />
              </button>
            )}
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-4 pb-8">

          {/* ── Search results ── */}
          {isSearching && (
            <div className="pt-4">
              {searching ? (
                <div className="flex justify-center py-8">
                  <div className="w-5 h-5 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : searchResults.length === 0 ? (
                <div className="text-center py-10 text-gray-400">
                  <Users size={32} className="mx-auto mb-2 opacity-30" />
                  <p className="text-sm">No users found for "{query}"</p>
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  {searchResults.map(user => {
                    const rel = getStatus(friendships, myId, user.id)
                    return (
                      <div key={user.id}
                        className="flex items-center gap-3 bg-white rounded-2xl p-3.5 shadow-sm border border-gray-50">
                        <Avatar profile={user} size={44} />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-gray-900 truncate">{user.name}</p>
                          {user.username && (
                            <p className="text-xs text-gray-400">@{user.username}</p>
                          )}
                        </div>
                        <ActionButton
                          rel={rel}
                          onAdd={() => handleAdd(user.id)}
                          onWithdraw={() => handleWithdraw(rel.id)}
                          onAccept={() => handleAccept(rel.id)}
                          onDecline={() => handleDecline(rel.id)}
                        />
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {/* ── Requests + friends (when not searching) ── */}
          {!isSearching && (
            <div className="pt-4 flex flex-col gap-5">

              {/* Pending incoming requests */}
              {pendingIn.length > 0 && (
                <section>
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                    Requests · {pendingIn.length}
                  </p>
                  <div className="flex flex-col gap-2">
                    {pendingIn.map(({ fid, user }) => (
                      <div key={fid}
                        className="flex items-center gap-3 bg-white rounded-2xl p-3.5 shadow-sm border border-amber-100">
                        <Avatar profile={user} size={44} />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-gray-900 truncate">{user.name}</p>
                          {user.username && (
                            <p className="text-xs text-gray-400">@{user.username}</p>
                          )}
                        </div>
                        <div className="flex gap-1.5 flex-shrink-0">
                          <button
                            onClick={() => handleAccept(fid)}
                            className="text-xs font-bold text-white bg-amber-500 px-3 py-1.5 rounded-full"
                          >
                            Accept
                          </button>
                          <button
                            onClick={() => handleDecline(fid)}
                            className="text-xs font-semibold text-gray-400 border border-gray-200 px-3 py-1.5 rounded-full"
                          >
                            Decline
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* Friends list */}
              <section>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                  Friends
                </p>
                {loading ? (
                  <div className="flex flex-col gap-2">
                    {[1, 2, 3].map(i => (
                      <div key={i} className="flex items-center gap-3 bg-white rounded-2xl p-3.5 animate-pulse">
                        <div className="w-11 h-11 rounded-full bg-gray-200" />
                        <div className="flex-1">
                          <div className="h-3.5 bg-gray-200 rounded w-32 mb-1.5" />
                          <div className="h-3 bg-gray-100 rounded w-20" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : friends.length === 0 ? (
                  <div className="text-center py-10 text-gray-400">
                    <Users size={36} className="mx-auto mb-2 opacity-20" />
                    <p className="text-sm font-medium">No friends yet</p>
                    <p className="text-xs mt-1">Search above to find people you know</p>
                  </div>
                ) : (
                  <div className="flex flex-col gap-2">
                    {friends.map(({ fid, user }) => (
                      <div key={fid}
                        className="flex items-center gap-3 bg-white rounded-2xl p-3.5 shadow-sm border border-gray-50">
                        <Avatar profile={user} size={44} />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-gray-900 truncate">{user.name}</p>
                          {user.username && (
                            <p className="text-xs text-gray-400">@{user.username}</p>
                          )}
                        </div>
                        <UserCheck size={16} className="text-emerald-500 flex-shrink-0" />
                      </div>
                    ))}
                  </div>
                )}
              </section>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
