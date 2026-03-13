import { useEffect, useState } from 'react'
import { getStampCards, getUserStats } from '../lib/api'
import { LogOut } from 'lucide-react'
import Avatar from '../components/Avatar'
import ProfileSheet from './ProfileSheet'

function MiniStampGrid({ stamps, target }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {Array.from({ length: target }).map((_, i) => (
        <div
          key={i}
          className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] transition-all ${
            i < stamps
              ? 'bg-amber-500 text-white shadow-sm'
              : 'bg-gray-100 border border-gray-200'
          }`}
        >
          {i < stamps ? '☕' : ''}
        </div>
      ))}
    </div>
  )
}

function CardSkeleton() {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 animate-pulse">
      <div className="flex items-center gap-3 mb-3">
        <div className="w-11 h-11 rounded-xl bg-gray-200" />
        <div className="flex-1">
          <div className="h-3.5 bg-gray-200 rounded w-32 mb-1.5" />
          <div className="h-3 bg-gray-100 rounded w-20" />
        </div>
      </div>
      <div className="flex gap-1.5">
        {Array.from({ length: 9 }).map((_, i) => (
          <div key={i} className="w-6 h-6 rounded-full bg-gray-100" />
        ))}
      </div>
    </div>
  )
}

export default function CardsScreen({ user, onCardSelect, onSignOut, onProfileUpdate }) {
  const [cards, setCards] = useState([])
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [showProfile, setShowProfile] = useState(false)

  useEffect(() => {
    async function load() {
      try {
        const [cardsData, statsData] = await Promise.all([
          getStampCards(user.id),
          getUserStats(user.id),
        ])
        setCards(cardsData)
        setStats(statsData)
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [user.id])

  const rewardReady = cards.filter(c => c.stamps >= c.cafe.stamp_target)
  const firstName = user.name?.split(' ')[0] ?? 'there'

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'
  const greetingEmoji = hour < 12 ? '☀️' : hour < 17 ? '🌤️' : '🌙'

  return (
    <div className="px-4 pt-4 pb-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <p className="text-sm text-gray-400 font-medium">{greeting},</p>
          <h1 className="text-2xl font-bold text-gray-900">{firstName} {greetingEmoji}</h1>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onSignOut}
            className="w-9 h-9 rounded-full flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
            title="Sign out"
          >
            <LogOut size={18} />
          </button>
          {/* Tapping avatar opens profile */}
          <button
            onClick={() => setShowProfile(true)}
            className="relative active:scale-95 transition-transform"
            title="Edit profile"
          >
            <Avatar profile={user} size={40} />
            <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-amber-500 rounded-full border-2 border-white flex items-center justify-center">
              <span className="text-white text-[8px] font-bold">✎</span>
            </div>
          </button>
        </div>
      </div>

      {/* Stats */}
      {loading ? (
        <div className="flex gap-2.5 mb-5">
          {[1, 2, 3].map(i => (
            <div key={i} className="flex-1 bg-gray-100 rounded-2xl p-3 h-16 animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="flex gap-2.5 mb-5">
          <div className="flex-1 bg-amber-50 rounded-2xl p-3 text-center">
            <div className="text-xl font-bold text-amber-600">{stats?.totalStamps ?? 0}</div>
            <div className="text-[11px] text-gray-500 mt-0.5">Stamps</div>
          </div>
          <div className="flex-1 bg-emerald-50 rounded-2xl p-3 text-center">
            <div className="text-xl font-bold text-emerald-600">{stats?.rewardsEarned ?? 0}</div>
            <div className="text-[11px] text-gray-500 mt-0.5">Rewards</div>
          </div>
          <div className="flex-1 bg-blue-50 rounded-2xl p-3 text-center">
            <div className="text-xl font-bold text-blue-600">{stats?.activeCards ?? 0}</div>
            <div className="text-[11px] text-gray-500 mt-0.5">Cards</div>
          </div>
        </div>
      )}

      {/* Reward ready banner */}
      {rewardReady.length > 0 && (
        <div className="bg-emerald-500 text-white rounded-2xl p-3.5 mb-5 flex items-center gap-3 shadow-sm">
          <span className="text-2xl">🏆</span>
          <div>
            <p className="font-semibold text-sm">You have a reward to claim!</p>
            <p className="text-xs text-emerald-100 mt-0.5">
              Tap {rewardReady[0].cafe.name} to claim your {rewardReady[0].cafe.reward_description}
            </p>
          </div>
        </div>
      )}

      {/* Cards list */}
      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Your Cards</p>

      {loading ? (
        <div className="flex flex-col gap-3">
          {[1, 2, 3].map(i => <CardSkeleton key={i} />)}
        </div>
      ) : cards.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <div className="text-4xl mb-3">☕</div>
          <p className="text-sm font-medium">No stamp cards yet</p>
          <p className="text-xs mt-1">Visit a cafe and show your QR code to get started</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {cards.map(card => {
            const isReady = card.stamps >= card.cafe.stamp_target
            const lastVisit = card.last_visit
              ? new Date(card.last_visit).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
              : 'Not visited yet'

            return (
              <button
                key={card.id}
                onClick={() => onCardSelect(card)}
                className="w-full text-left bg-white rounded-2xl border border-gray-100 shadow-sm p-4 active:scale-[0.98] transition-transform"
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-11 h-11 rounded-xl flex items-center justify-center text-white font-bold text-lg shadow-sm"
                      style={{ backgroundColor: card.cafe.color }}
                    >
                      {card.cafe.logo_letter}
                    </div>
                    <div>
                      <div className="font-semibold text-gray-900 text-sm leading-tight">{card.cafe.name}</div>
                      <div className="text-xs text-gray-400 mt-0.5">{lastVisit}</div>
                    </div>
                  </div>
                  {isReady ? (
                    <span className="bg-emerald-100 text-emerald-700 text-xs font-bold px-2.5 py-1 rounded-full">
                      🏆 Ready!
                    </span>
                  ) : (
                    <span className="text-xs font-bold text-gray-400">
                      {card.stamps}/{card.cafe.stamp_target}
                    </span>
                  )}
                </div>

                <MiniStampGrid stamps={card.stamps} target={card.cafe.stamp_target} />

                {!isReady && (
                  <div className="mt-3">
                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-amber-400 to-amber-500 rounded-full"
                        style={{ width: `${(card.stamps / card.cafe.stamp_target) * 100}%` }}
                      />
                    </div>
                    <p className="text-xs text-gray-400 mt-1.5">
                      {card.cafe.stamp_target - card.stamps} more for {card.cafe.reward_description}
                    </p>
                  </div>
                )}
              </button>
            )
          })}
        </div>
      )}

      {/* Profile sheet */}
      {showProfile && (
        <ProfileSheet
          profile={user}
          stats={stats}
          onClose={() => setShowProfile(false)}
          onSaved={updated => {
            onProfileUpdate?.(updated)
            setShowProfile(false)
          }}
        />
      )}
    </div>
  )
}
