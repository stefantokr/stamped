import { useState, useEffect } from 'react'
import { X, MapPin, Navigation, Instagram, Globe, Coffee, Users, Star } from 'lucide-react'
import { getCafeDetails, getCafeMemberCount } from '../lib/api'

function openInMaps(name, lat, lng) {
  if (!lat || !lng) {
    window.open(`https://www.google.com/maps/search/${encodeURIComponent(name + ' Oxford')}`, '_blank')
    return
  }
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent)
  const url = isIOS
    ? `maps://maps.apple.com/?q=${encodeURIComponent(name)}&ll=${lat},${lng}`
    : `https://www.google.com/maps/search/${encodeURIComponent(name)}/@${lat},${lng},18z`
  window.open(url, '_blank')
}

export default function CafeProfileSheet({ cafeId, cafe: cafeProp, onClose }) {
  const [cafe, setCafe] = useState(cafeProp ?? null)
  const [members, setMembers] = useState(null)
  const [loading, setLoading] = useState(!cafeProp)

  useEffect(() => {
    async function load() {
      try {
        const [cafeData, memberCount] = await Promise.all([
          cafeProp ? Promise.resolve(cafeProp) : getCafeDetails(cafeId),
          getCafeMemberCount(cafeId ?? cafeProp?.id),
        ])
        setCafe(cafeData)
        setMembers(memberCount)
      } catch (e) {
        console.error(e)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [cafeId])

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-40 animate-fade-in" onClick={onClose} />
      <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] bg-white rounded-t-3xl z-50 shadow-2xl pb-10 animate-slide-up overflow-hidden">

        {/* Coloured header band */}
        <div
          className="relative flex flex-col items-center pt-8 pb-6 px-6"
          style={{ background: cafe?.color ? `linear-gradient(160deg, ${cafe.color}cc 0%, ${cafe.color}88 100%)` : 'linear-gradient(160deg, #F59E0B99 0%, #F59E0B55 100%)' }}
        >
          {/* Close */}
          <button onClick={onClose} className="absolute top-4 right-4 w-8 h-8 rounded-full bg-black/20 flex items-center justify-center text-white">
            <X size={16} />
          </button>

          {/* Logo */}
          {loading ? (
            <div className="w-20 h-20 rounded-2xl bg-white/30 animate-pulse mb-3" />
          ) : (
            <div
              className="w-20 h-20 rounded-2xl flex items-center justify-center text-white font-black text-4xl shadow-lg border-4 border-white/30 mb-3"
              style={{ backgroundColor: cafe?.color ?? '#F59E0B' }}
            >
              {cafe?.logo_letter ?? '☕'}
            </div>
          )}

          {/* Name */}
          {loading ? (
            <div className="h-6 w-40 bg-white/30 rounded animate-pulse mb-1" />
          ) : (
            <h2 className="text-xl font-black text-white text-center leading-tight drop-shadow">{cafe?.name}</h2>
          )}

          {/* Member count */}
          {members !== null && (
            <div className="flex items-center gap-1 mt-1.5 bg-black/20 rounded-full px-3 py-1">
              <Users size={11} className="text-white/80" />
              <span className="text-xs text-white/90 font-semibold">{members} {members === 1 ? 'member' : 'members'}</span>
            </div>
          )}
        </div>

        {/* Body */}
        <div className="px-5 pt-4 flex flex-col gap-4">

          {loading ? (
            <div className="flex flex-col gap-3">
              <div className="h-4 bg-gray-100 rounded w-3/4 animate-pulse" />
              <div className="h-4 bg-gray-100 rounded w-full animate-pulse" />
              <div className="h-4 bg-gray-100 rounded w-2/3 animate-pulse" />
            </div>
          ) : (
            <>
              {/* Description */}
              {cafe?.description && (
                <p className="text-sm text-gray-600 leading-relaxed">{cafe.description}</p>
              )}

              {/* Stamp reward info */}
              <div className="bg-amber-50 rounded-2xl px-4 py-3 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
                  style={{ backgroundColor: cafe?.color ?? '#F59E0B' }}>
                  <Coffee size={18} className="text-white" />
                </div>
                <div>
                  <p className="text-sm font-bold text-gray-900">Collect {cafe?.stamp_target} stamps</p>
                  <p className="text-xs text-amber-700 mt-0.5">Earn: {cafe?.reward_description}</p>
                </div>
                <Star size={16} className="text-amber-400 ml-auto flex-shrink-0 fill-amber-400" />
              </div>

              {/* Address */}
              {cafe?.address && (
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-xl bg-gray-100 flex items-center justify-center flex-shrink-0">
                    <MapPin size={16} className="text-gray-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-700 leading-snug">{cafe.address}</p>
                    <button
                      onClick={() => openInMaps(cafe.name, cafe.latitude, cafe.longitude)}
                      className="flex items-center gap-1 text-xs text-blue-500 font-semibold mt-1 active:opacity-70"
                    >
                      <Navigation size={11} /> Open in Maps
                    </button>
                  </div>
                </div>
              )}

              {/* Links row */}
              {(cafe?.instagram || cafe?.website) && (
                <div className="flex gap-2">
                  {cafe.instagram && (
                    <a
                      href={`https://instagram.com/${cafe.instagram.replace('@', '')}`}
                      target="_blank"
                      rel="noreferrer"
                      className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl bg-gradient-to-r from-purple-500 to-pink-500 text-white text-sm font-semibold active:scale-95 transition-transform"
                    >
                      <Instagram size={16} />
                      Instagram
                    </a>
                  )}
                  {cafe.website && (
                    <a
                      href={cafe.website}
                      target="_blank"
                      rel="noreferrer"
                      className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl bg-gray-100 text-gray-700 text-sm font-semibold active:scale-95 transition-transform"
                    >
                      <Globe size={16} />
                      Website
                    </a>
                  )}
                </div>
              )}

              {/* Maps CTA if no address shown separately */}
              {!cafe?.address && (
                <button
                  onClick={() => openInMaps(cafe?.name ?? '', cafe?.latitude, cafe?.longitude)}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl bg-blue-50 text-blue-600 font-semibold text-sm active:scale-95 transition-transform"
                >
                  <Navigation size={16} /> Open in Maps
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </>
  )
}
