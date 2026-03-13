import { useState } from 'react'
import { ArrowLeft, MapPin, Clock, Gift, CheckCircle } from 'lucide-react'
import { claimReward } from '../lib/api'

function StampGrid({ stamps, target }) {
  return (
    <div className="grid grid-cols-3 gap-3">
      {Array.from({ length: target }).map((_, i) => (
        <div
          key={i}
          className={`aspect-square rounded-2xl flex items-center justify-center text-2xl transition-all ${
            i < stamps
              ? 'bg-amber-500 shadow-md'
              : 'bg-gray-100 border-2 border-dashed border-gray-200'
          }`}
        >
          {i < stamps ? '☕' : ''}
        </div>
      ))}
    </div>
  )
}

export default function CardDetail({ card, userId, onBack, onClaimed }) {
  const [claiming, setClaiming] = useState(false)
  const [claimed, setClaimed] = useState(false)
  const [error, setError] = useState(null)

  const cafe = card.cafe
  const isReady = card.stamps >= cafe.stamp_target

  const lastVisit = card.last_visit
    ? new Date(card.last_visit).toLocaleDateString('en-GB', {
        weekday: 'short', day: 'numeric', month: 'short',
      })
    : 'Not visited yet'

  async function handleClaim() {
    setClaiming(true)
    setError(null)
    try {
      await claimReward(userId, cafe.id)
      setClaimed(true)
      onClaimed?.()
    } catch (err) {
      setError(err.message)
    } finally {
      setClaiming(false)
    }
  }

  return (
    <div className="flex flex-col min-h-full">
      {/* Coloured header */}
      <div className="px-4 pt-4 pb-12 text-white" style={{ backgroundColor: cafe.color }}>
        <button
          onClick={onBack}
          className="mb-5 flex items-center gap-1.5 opacity-80 hover:opacity-100 transition-opacity"
        >
          <ArrowLeft size={19} />
          <span className="text-sm font-medium">Back</span>
        </button>
        <div className="flex items-center gap-3.5">
          <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center text-3xl font-bold">
            {cafe.logo_letter}
          </div>
          <div>
            <h1 className="text-xl font-bold leading-tight">{cafe.name}</h1>
            <p className="text-sm opacity-70 mt-0.5">{cafe.category}</p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="px-4 -mt-6 flex flex-col gap-3 pb-4">
        {/* Stamp grid card */}
        <div className="bg-white rounded-3xl shadow-md p-5">
          <div className="flex justify-between items-center mb-4">
            <div>
              <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider">Progress</p>
              <p className="text-3xl font-bold text-gray-900 mt-1">
                {claimed ? 0 : card.stamps}
                <span className="text-xl text-gray-300 font-normal">/{cafe.stamp_target}</span>
              </p>
            </div>
            {isReady && !claimed && (
              <button
                onClick={handleClaim}
                disabled={claiming}
                className="bg-emerald-500 text-white px-4 py-2 rounded-full text-sm font-bold shadow-sm active:scale-95 transition-transform disabled:opacity-60"
              >
                {claiming ? 'Claiming…' : '🏆 Claim reward'}
              </button>
            )}
            {claimed && (
              <div className="flex items-center gap-1.5 text-emerald-600">
                <CheckCircle size={18} />
                <span className="text-sm font-semibold">Claimed!</span>
              </div>
            )}
          </div>
          <StampGrid stamps={claimed ? 0 : card.stamps} target={cafe.stamp_target} />
          {error && <p className="text-xs text-red-500 mt-3">{error}</p>}
        </div>

        {/* Reward */}
        <div className="bg-amber-50 rounded-2xl p-4 flex items-center gap-3">
          <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center flex-shrink-0">
            <Gift size={18} className="text-amber-600" />
          </div>
          <div>
            <p className="text-xs text-amber-600 font-semibold uppercase tracking-wider">
              Reward at {cafe.stamp_target} stamps
            </p>
            <p className="text-sm font-semibold text-gray-900 mt-0.5">{cafe.reward_description}</p>
          </div>
        </div>

        {/* Address */}
        <div className="bg-gray-50 rounded-2xl p-4 flex items-center gap-3">
          <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center flex-shrink-0">
            <MapPin size={18} className="text-gray-500" />
          </div>
          <div>
            <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider">Address</p>
            <p className="text-sm text-gray-800 mt-0.5">{cafe.address}</p>
          </div>
        </div>

        {/* Last visit */}
        <div className="bg-gray-50 rounded-2xl p-4 flex items-center gap-3">
          <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center flex-shrink-0">
            <Clock size={18} className="text-gray-500" />
          </div>
          <div>
            <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider">Last visit</p>
            <p className="text-sm text-gray-800 mt-0.5">{lastVisit}</p>
          </div>
        </div>
      </div>
    </div>
  )
}
