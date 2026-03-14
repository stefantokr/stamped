import { useEffect, useState } from 'react'
import { getStampCards, getUserStats } from '../lib/api'
import { Bell, Settings, ChevronUp } from 'lucide-react'
import Avatar from '../components/Avatar'
import ProfileSheet from './ProfileSheet'
import NotificationsScreen from './NotificationsScreen'
import SettingsScreen from './SettingsScreen'
import { usePullToRefresh, PullIndicator } from '../hooks/usePullToRefresh.jsx'

const CARD_HEIGHT = 188
const PEEK        = 72
const FANNED_GAP  = 14
const SPRING      = 'cubic-bezier(0.34, 1.56, 0.64, 1)'
const EASE_OUT    = 'cubic-bezier(0.16, 1, 0.3, 1)'

function StampCard({ card, fanned, idx, total, onClick }) {
  const isReady  = card.stamps >= card.cafe.stamp_target
  const progress = card.stamps / card.cafe.stamp_target
  const color    = card.cafe.color ?? '#F59E0B'

  // Depth scale: stacked cards behind the top one appear very slightly narrower
  const depthScale = !fanned ? 1 - (total - 1 - idx) * 0.018 : 1

  return (
    <button
      onClick={onClick}
      className="w-full text-left overflow-hidden"
      style={{
        backgroundColor: color,
        height: CARD_HEIGHT,
        borderRadius: 28,
        transform: `scale(${depthScale})`,
        transformOrigin: 'top center',
        transition: `transform 0.45s ${fanned ? SPRING : EASE_OUT}, box-shadow 0.35s ease`,
        boxShadow: fanned
          ? '0 12px 40px rgba(0,0,0,0.22)'
          : idx === total - 1
            ? '0 6px 24px rgba(0,0,0,0.18)'
            : '0 2px 8px rgba(0,0,0,0.10)',
        WebkitTapHighlightColor: 'transparent',
      }}
    >
      {/* Subtle inner highlight at top */}
      <div className="absolute inset-x-0 top-0 h-12 rounded-t-[28px]"
        style={{ background: 'linear-gradient(to bottom, rgba(255,255,255,0.12), transparent)' }} />

      <div className="flex flex-col h-full px-5 py-4 relative">

        {/* Header — visible when peeking */}
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0 pr-3">
            <p className="text-white/55 text-[9px] font-bold uppercase tracking-[0.14em] mb-1">
              Loyalty Card
            </p>
            <h2 className="text-white font-bold text-[18px] leading-tight truncate">
              {card.cafe.name}
            </h2>
          </div>
          <div className="w-11 h-11 rounded-2xl bg-white/20 flex items-center justify-center font-bold text-white text-lg flex-shrink-0">
            {card.cafe.logo_letter}
          </div>
        </div>

        {/* Divider */}
        <div className="h-px bg-white/15 mt-3 mb-3" />

        {/* Stamps grid */}
        <div className="flex flex-wrap gap-1.5">
          {Array.from({ length: card.cafe.stamp_target }).map((_, i) => (
            <div
              key={i}
              className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] transition-all ${
                i < card.stamps ? 'bg-white shadow-sm' : 'bg-white/20'
              }`}
            >
              {i < card.stamps ? '☕' : ''}
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="mt-auto pt-2">
          {isReady ? (
            <div className="flex items-center justify-between">
              <span className="text-white text-xs font-semibold">🏆 {card.cafe.reward_description}</span>
              <span className="bg-white/25 text-white text-[11px] font-bold px-3 py-1 rounded-full">
                Claim →
              </span>
            </div>
          ) : (
            <>
              <div className="h-1 bg-white/20 rounded-full overflow-hidden mb-1.5">
                <div
                  className="h-full bg-white/65 rounded-full transition-all duration-500"
                  style={{ width: `${progress * 100}%` }}
                />
              </div>
              <p className="text-white/55 text-[11px]">
                {card.cafe.stamp_target - card.stamps} more for {card.cafe.reward_description}
              </p>
            </>
          )}
        </div>
      </div>
    </button>
  )
}

function SkeletonCard({ idx }) {
  return (
    <div
      className="w-full overflow-hidden animate-pulse"
      style={{
        backgroundColor: ['#C8A882', '#8FAF8B', '#B08090'][idx % 3],
        height: CARD_HEIGHT,
        borderRadius: 28,
        opacity: 0.4,
      }}
    >
      <div className="flex flex-col h-full px-5 py-4">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="h-2 bg-white/40 rounded w-16 mb-2" />
            <div className="h-5 bg-white/50 rounded w-40" />
          </div>
          <div className="w-11 h-11 rounded-2xl bg-white/25" />
        </div>
      </div>
    </div>
  )
}

export default function CardsScreen({
  user, unreadNotifications, onCardSelect, onSignOut, onProfileUpdate, onNotificationsRead
}) {
  const [cards, setCards]                 = useState([])
  const [stats, setStats]                 = useState(null)
  const [loading, setLoading]             = useState(true)
  const [fanned, setFanned]               = useState(false)
  const [showProfile, setShowProfile]     = useState(false)
  const [showNotifications, setShowNotifications] = useState(false)
  const [showSettings, setShowSettings]   = useState(false)

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

  useEffect(() => { load() }, [user.id])

  const { pullProgress, refreshing } = usePullToRefresh(load)

  const rewardReady = cards.filter(c => c.stamps >= c.cafe.stamp_target)
  const firstName   = user.name?.split(' ')[0] ?? 'there'
  const hour        = new Date().getHours()
  const greeting    = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'
  const greetingEmoji = hour < 12 ? '☀️' : hour < 17 ? '🌤️' : '🌙'

  const total        = loading ? 3 : cards.length
  const stackedH     = total > 0 ? CARD_HEIGHT + (total - 1) * PEEK : 0
  const fannedH      = total > 0 ? total * CARD_HEIGHT + (total - 1) * FANNED_GAP : 0
  const containerH   = fanned ? fannedH : stackedH

  function getTranslateY(idx) {
    return fanned
      ? idx * (CARD_HEIGHT + FANNED_GAP)
      : idx * PEEK
  }

  function getDelay(idx) {
    if (fanned) {
      // Expand: top card (idx 0) moves first, others cascade down
      return `${idx * 0.045}s`
    } else {
      // Collapse: bottom card folds first, top card last
      return `${(total - 1 - idx) * 0.035}s`
    }
  }

  function handleCardTap(card, idx) {
    if (!fanned) {
      setFanned(true)
    } else {
      onCardSelect(card)
    }
  }

  return (
    <div className="px-4 pt-4 pb-4">

      <PullIndicator pullProgress={pullProgress} refreshing={refreshing} />

      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <p className="text-sm text-gray-400 font-medium">{greeting},</p>
          <h1 className="text-2xl font-bold text-gray-900">{firstName} {greetingEmoji}</h1>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowNotifications(true)}
            className="relative w-9 h-9 rounded-full flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors active:scale-95"
          >
            <Bell size={19} />
            {unreadNotifications > 0 && (
              <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 bg-rose-500 rounded-full flex items-center justify-center text-white text-[9px] font-bold px-1 animate-badge-pop">
                {unreadNotifications > 9 ? '9+' : unreadNotifications}
              </span>
            )}
          </button>
          <button
            onClick={() => setShowSettings(true)}
            className="w-9 h-9 rounded-full flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors active:scale-95"
          >
            <Settings size={19} />
          </button>
          <button onClick={() => setShowProfile(true)} className="relative active:scale-95 transition-transform">
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
          {[1, 2, 3].map(i => <div key={i} className="flex-1 bg-gray-100 rounded-2xl p-3 h-16 animate-pulse" />)}
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

      {/* Cards section label + collapse toggle */}
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Your Cards</p>
        {!loading && cards.length > 1 && (
          <button
            onClick={() => setFanned(f => !f)}
            className="flex items-center gap-1 text-xs font-semibold text-amber-500 active:opacity-60 transition-opacity"
          >
            <ChevronUp
              size={14}
              style={{
                transform: fanned ? 'rotate(0deg)' : 'rotate(180deg)',
                transition: `transform 0.4s ${EASE_OUT}`,
              }}
            />
            {fanned ? 'Stack' : 'See all'}
          </button>
        )}
      </div>

      {/* Empty state */}
      {!loading && cards.length === 0 && (
        <div className="text-center py-12 text-gray-400">
          <div className="text-4xl mb-3">☕</div>
          <p className="text-sm font-medium">No stamp cards yet</p>
          <p className="text-xs mt-1">Visit a cafe and show your QR code to get started</p>
        </div>
      )}

      {/* Card stack */}
      {total > 0 && (
        <>
          {/* Tap-to-expand hint (only in stacked state) */}
          {!fanned && !loading && cards.length > 1 && (
            <p className="text-[11px] text-gray-400 text-center mb-2">
              Tap any card to see all
            </p>
          )}

          <div
            className="relative"
            style={{
              height: containerH,
              transition: `height 0.5s ${fanned ? SPRING : EASE_OUT}`,
            }}
          >
            {(loading ? Array.from({ length: 3 }) : cards).map((card, idx) => (
              <div
                key={loading ? idx : card.id}
                className="absolute left-0 right-0"
                style={{
                  top: 0,
                  zIndex: idx + 1,
                  transform: `translateY(${getTranslateY(idx)}px)`,
                  transition: `transform ${fanned ? '0.5s' : '0.4s'} ${fanned ? SPRING : EASE_OUT} ${getDelay(idx)}`,
                  willChange: 'transform',
                }}
              >
                {loading ? (
                  <SkeletonCard idx={idx} />
                ) : (
                  <StampCard
                    card={card}
                    fanned={fanned}
                    idx={idx}
                    total={total}
                    onClick={() => handleCardTap(card, idx)}
                  />
                )}
              </div>
            ))}
          </div>
        </>
      )}

      {/* Sheets */}
      {showProfile && (
        <ProfileSheet
          profile={user}
          stats={stats}
          onClose={() => setShowProfile(false)}
          onSaved={updated => { onProfileUpdate?.(updated); setShowProfile(false) }}
        />
      )}
      {showNotifications && (
        <NotificationsScreen
          onClose={() => setShowNotifications(false)}
          onUnreadChange={onNotificationsRead}
        />
      )}
      {showSettings && (
        <SettingsScreen
          profile={user}
          onClose={() => setShowSettings(false)}
          onSignOut={onSignOut}
          onProfileUpdate={onProfileUpdate}
        />
      )}
    </div>
  )
}
