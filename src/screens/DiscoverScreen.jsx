import { useState, useEffect } from 'react'
import { MapPin, Navigation } from 'lucide-react'
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { deals } from '../data/mockData'
import { getStampCards, getCafes, getFriendsActivity } from '../lib/api'
import Avatar from '../components/Avatar'

// ── Helpers ────────────────────────────────────────────────────
function timeAgo(ts) {
  const secs = Math.floor((Date.now() - new Date(ts)) / 1000)
  if (secs < 60) return 'just now'
  if (secs < 3600) return `${Math.floor(secs / 60)}m ago`
  if (secs < 86400) return `${Math.floor(secs / 3600)}h ago`
  return `${Math.floor(secs / 86400)}d ago`
}

function haversine(lat1, lng1, lat2, lng2) {
  const R = 6371e3
  const φ1 = (lat1 * Math.PI) / 180, φ2 = (lat2 * Math.PI) / 180
  const Δφ = ((lat2 - lat1) * Math.PI) / 180
  const Δλ = ((lng2 - lng1) * Math.PI) / 180
  const a = Math.sin(Δφ / 2) ** 2 + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

function formatDist(m) {
  return m < 1000 ? `${Math.round(m)}m` : `${(m / 1000).toFixed(1)}km`
}

// Fetch real cafes from OpenStreetMap's Overpass API (free, no key)
async function fetchOverpassCafes(lat, lng, radiusM = 1200) {
  const query = `[out:json][timeout:15];
(
  node["amenity"="cafe"](around:${radiusM},${lat},${lng});
  node["amenity"="coffee_shop"](around:${radiusM},${lat},${lng});
);
out body;`
  const res = await fetch('https://overpass-api.de/api/interpreter', {
    method: 'POST',
    body: `data=${encodeURIComponent(query)}`,
  })
  if (!res.ok) throw new Error('Overpass error')
  const data = await res.json()
  return data.elements
    .filter(el => el.tags?.name)
    .map(el => ({
      id: `osm-${el.id}`,
      name: el.tags.name,
      lat: el.lat,
      lng: el.lon,
      address: [el.tags['addr:housenumber'], el.tags['addr:street']].filter(Boolean).join(' '),
      brand: el.tags.brand,
    }))
}

function openInMaps(name, lat, lng) {
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent)
  const url = isIOS
    ? `maps://maps.apple.com/?q=${encodeURIComponent(name)}&ll=${lat},${lng}`
    : `https://www.google.com/maps/search/${encodeURIComponent(name)}/@${lat},${lng},18z`
  window.open(url, '_blank')
}

// ── Leaflet icons ──────────────────────────────────────────────
function makeStampedIcon(color, letter) {
  return L.divIcon({
    className: '',
    html: `<div style="
      background:${color};width:36px;height:36px;border-radius:50%;
      border:3px solid white;box-shadow:0 2px 10px rgba(0,0,0,0.3);
      display:flex;align-items:center;justify-content:center;
      color:white;font-size:13px;font-weight:800;font-family:sans-serif;
    ">${letter}</div>`,
    iconSize: [36, 36], iconAnchor: [18, 18], popupAnchor: [0, -22],
  })
}

function makeOsmIcon(isKnownChain) {
  const bg = isKnownChain ? '#4B5563' : '#9CA3AF'
  return L.divIcon({
    className: '',
    html: `<div style="
      background:${bg};width:26px;height:26px;border-radius:50%;
      border:2.5px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.2);
      display:flex;align-items:center;justify-content:center;font-size:11px;
    ">☕</div>`,
    iconSize: [26, 26], iconAnchor: [13, 13], popupAnchor: [0, -18],
  })
}

const userLocIcon = L.divIcon({
  className: '',
  html: `<div style="
    width:18px;height:18px;background:#3B82F6;border-radius:50%;
    border:3px solid white;box-shadow:0 0 0 6px rgba(59,130,246,0.2);
  "></div>`,
  iconSize: [18, 18], iconAnchor: [9, 9],
})

function FlyTo({ pos }) {
  const map = useMap()
  useEffect(() => {
    if (pos) map.flyTo([pos.lat, pos.lng], 15, { animate: true, duration: 1.2 })
  }, [pos, map])
  return null
}

// ── Nearby tab ─────────────────────────────────────────────────
function NearbyTab({ userId }) {
  const [userPos, setUserPos] = useState(null)
  const [geoStatus, setGeoStatus] = useState('loading')
  const [stampedCafes, setStampedCafes] = useState([])
  const [osmCafes, setOsmCafes] = useState([])
  const [osmLoading, setOsmLoading] = useState(false)
  const [osmError, setOsmError] = useState(false)
  const [userCards, setUserCards] = useState([])
  const [dataLoading, setDataLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      getCafes(),
      userId ? getStampCards(userId) : Promise.resolve([]),
    ]).then(([cafesData, cardsData]) => {
      setStampedCafes(cafesData.filter(c => c.latitude && c.longitude))
      setUserCards(cardsData)
    }).catch(console.error).finally(() => setDataLoading(false))

    if (!('geolocation' in navigator)) { setGeoStatus('unsupported'); return }
    navigator.geolocation.getCurrentPosition(
      pos => { setUserPos({ lat: pos.coords.latitude, lng: pos.coords.longitude }); setGeoStatus('ok') },
      () => setGeoStatus('denied'),
      { enableHighAccuracy: true, timeout: 10000 }
    )
  }, [userId])

  useEffect(() => {
    if (!userPos) return
    setOsmLoading(true)
    setOsmError(false)
    fetchOverpassCafes(userPos.lat, userPos.lng)
      .then(setOsmCafes)
      .catch(() => setOsmError(true))
      .finally(() => setOsmLoading(false))
  }, [userPos])

  const cardByCafeId = Object.fromEntries(userCards.map(c => [c.cafe_id, c]))

  const stampedWithDist = stampedCafes
    .map(c => ({ ...c, distance: userPos ? haversine(userPos.lat, userPos.lng, c.latitude, c.longitude) : null }))
    .sort((a, b) => (a.distance ?? Infinity) - (b.distance ?? Infinity))

  const realOnlyOsm = osmCafes
    .filter(osm => !stampedCafes.some(sc => haversine(osm.lat, osm.lng, sc.latitude, sc.longitude) < 80))
    .map(c => ({ ...c, distance: haversine(userPos.lat, userPos.lng, c.lat, c.lng) }))
    .sort((a, b) => a.distance - b.distance)

  const myCards = stampedWithDist.filter(c => cardByCafeId[c.id])
  const otherStamped = stampedWithDist.filter(c => !cardByCafeId[c.id])

  const DEFAULT_CENTER = [51.505, -0.09]
  const mapCenter = userPos ? [userPos.lat, userPos.lng] : DEFAULT_CENTER

  if (dataLoading) {
    return (
      <div className="flex flex-col gap-3">
        <div className="w-full h-52 bg-gray-100 rounded-2xl animate-pulse" />
        {[1, 2, 3].map(i => <div key={i} className="h-16 bg-gray-100 rounded-2xl animate-pulse" />)}
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-2xl overflow-hidden shadow-sm border border-gray-100" style={{ height: 240 }}>
        <MapContainer center={mapCenter} zoom={15} style={{ height: '100%', width: '100%' }}
          zoomControl={false} attributionControl={false}>
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
          <FlyTo pos={userPos} />
          {userPos && (
            <Marker position={[userPos.lat, userPos.lng]} icon={userLocIcon}>
              <Popup><span className="font-semibold text-sm">You</span></Popup>
            </Marker>
          )}
          {stampedWithDist.map(cafe => (
            <Marker key={cafe.id} position={[cafe.latitude, cafe.longitude]}
              icon={makeStampedIcon(cafe.color ?? '#F59E0B', cafe.logo_letter ?? '☕')}>
              <Popup>
                <div>
                  <p className="font-semibold text-sm">{cafe.name}</p>
                  <p className="text-xs text-amber-600 font-medium">On Stamped ✦</p>
                  {cafe.distance != null && <p className="text-xs text-gray-500">{formatDist(cafe.distance)} away</p>}
                </div>
              </Popup>
            </Marker>
          ))}
          {realOnlyOsm.map(cafe => (
            <Marker key={cafe.id} position={[cafe.lat, cafe.lng]} icon={makeOsmIcon(!!cafe.brand)}>
              <Popup>
                <div>
                  <p className="font-semibold text-sm">{cafe.name}</p>
                  {cafe.address && <p className="text-xs text-gray-500">{cafe.address}</p>}
                  <p className="text-xs text-gray-400">{formatDist(cafe.distance)} away</p>
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 px-1">
        <div className="flex items-center gap-1.5">
          <div className="w-4 h-4 rounded-full bg-amber-500 border-2 border-white shadow-sm" />
          <span className="text-xs text-gray-500">On Stamped</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3.5 h-3.5 rounded-full bg-gray-400 border-2 border-white shadow-sm" />
          <span className="text-xs text-gray-500">Other cafes</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3.5 h-3.5 rounded-full bg-blue-500 border-2 border-white shadow-sm" />
          <span className="text-xs text-gray-500">You</span>
        </div>
        {osmLoading && (
          <div className="ml-auto flex items-center gap-1.5 text-gray-400">
            <div className="w-3 h-3 border border-gray-400 border-t-transparent rounded-full animate-spin" />
            <span className="text-xs">Loading…</span>
          </div>
        )}
      </div>

      {geoStatus !== 'ok' && (
        <p className="text-xs text-amber-600 flex items-center gap-1.5">
          <MapPin size={12} />
          {geoStatus === 'denied' && 'Location access denied — allow it to see real cafes near you'}
          {geoStatus === 'unsupported' && 'Location not supported on this browser'}
          {geoStatus === 'loading' && 'Getting your location…'}
        </p>
      )}
      {osmError && (
        <p className="text-xs text-red-400 flex items-center gap-1.5">
          <MapPin size={12} /> Couldn't load nearby cafes — check your connection
        </p>
      )}

      {myCards.length > 0 && (
        <section>
          <h3 className="text-sm font-semibold text-gray-900 mb-2">Your active cards</h3>
          <div className="flex flex-col gap-2">
            {myCards.map(cafe => {
              const card = cardByCafeId[cafe.id]
              const isReady = card.stamps >= cafe.stamp_target
              return (
                <div key={cafe.id} className="flex items-center justify-between bg-white rounded-2xl p-3.5 shadow-sm border border-gray-50">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-sm flex-shrink-0"
                      style={{ backgroundColor: cafe.color }}>{cafe.logo_letter}</div>
                    <div>
                      <p className="text-sm font-semibold text-gray-900">{cafe.name}</p>
                      <p className="text-xs text-gray-400">{cafe.distance != null ? `${formatDist(cafe.distance)} away` : cafe.address ?? ''}</p>
                    </div>
                  </div>
                  {isReady ? (
                    <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full">🏆 Claim</span>
                  ) : (
                    <div className="text-right">
                      <span className="text-sm font-bold text-amber-600">{card.stamps}/{cafe.stamp_target}</span>
                      <p className="text-xs text-gray-400">stamps</p>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </section>
      )}

      {otherStamped.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-2">
            <h3 className="text-sm font-semibold text-gray-900">On Stamped nearby</h3>
            <span className="text-xs bg-amber-100 text-amber-700 font-semibold px-2 py-0.5 rounded-full">✦ Stamped</span>
          </div>
          <div className="flex flex-col gap-2">
            {otherStamped.map(cafe => (
              <div key={cafe.id} className="flex items-center justify-between bg-white rounded-2xl p-3.5 shadow-sm border border-gray-50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-sm flex-shrink-0"
                    style={{ backgroundColor: cafe.color }}>{cafe.logo_letter}</div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{cafe.name}</p>
                    <p className="text-xs text-gray-400">{cafe.distance != null ? `${formatDist(cafe.distance)} away` : cafe.address ?? ''}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs text-amber-600 font-semibold">{cafe.stamp_target} stamps</p>
                  <p className="text-xs text-gray-400">{cafe.reward_description}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {userPos && (
        <section>
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold text-gray-900">
              {osmLoading ? 'Finding cafes near you…' : `Cafes nearby (${realOnlyOsm.length})`}
            </h3>
            <span className="text-xs text-gray-400">from OpenStreetMap</span>
          </div>
          {osmLoading ? (
            <div className="flex flex-col gap-2">
              {[1, 2, 3].map(i => <div key={i} className="h-16 bg-gray-100 rounded-2xl animate-pulse" />)}
            </div>
          ) : realOnlyOsm.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-6">No other cafes found within 1.2km</p>
          ) : (
            <div className="flex flex-col gap-2">
              {realOnlyOsm.map(cafe => (
                <div key={cafe.id} className="flex items-center justify-between bg-white rounded-2xl p-3.5 shadow-sm border border-gray-50">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center text-xl flex-shrink-0">☕</div>
                    <div>
                      <p className="text-sm font-semibold text-gray-900">{cafe.name}</p>
                      <p className="text-xs text-gray-400">
                        {formatDist(cafe.distance)} away{cafe.address ? ` · ${cafe.address}` : ''}
                      </p>
                    </div>
                  </div>
                  <button onClick={() => openInMaps(cafe.name, cafe.lat, cafe.lng)}
                    className="flex items-center gap-1 text-blue-500 text-xs font-semibold flex-shrink-0 ml-2">
                    <Navigation size={13} /> Maps
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {!userPos && geoStatus !== 'loading' && (
        <p className="text-sm text-gray-400 text-center py-6">
          Enable location to find real cafes near you
        </p>
      )}
    </div>
  )
}

// ── Activity item renderer ──────────────────────────────────────
function ActivityItem({ item }) {
  const cafeColor = item.cafe?.color ?? '#F59E0B'

  // Right-hand visual
  let badge
  if (item.type === 'reward') {
    badge = (
      <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-xl flex-shrink-0">
        🏆
      </div>
    )
  } else if (item.type === 'stamp') {
    badge = (
      <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 text-base font-bold text-white"
        style={{ backgroundColor: cafeColor }}>
        {item.cafe?.logo_letter ?? '☕'}
      </div>
    )
  } else {
    // post
    badge = item.media_url && item.media_type === 'image' ? (
      <img src={item.media_url} alt=""
        className="w-10 h-10 rounded-xl object-cover flex-shrink-0" />
    ) : (
      <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
        style={{ backgroundColor: cafeColor + '22' }}>
        {item.emoji}
      </div>
    )
  }

  // Description line
  const desc = item.type === 'stamp' ? (
    <p className="text-sm leading-snug">
      <span className="font-semibold text-gray-900">{item.profile?.name}</span>
      <span className="text-gray-500"> scanned at </span>
      <span className="font-medium text-gray-800">{item.cafe?.name}</span>
    </p>
  ) : item.type === 'reward' ? (
    <p className="text-sm leading-snug">
      <span className="font-semibold text-gray-900">{item.profile?.name}</span>
      <span className="text-gray-500"> claimed a reward at </span>
      <span className="font-medium text-gray-800">{item.cafe?.name}</span>
    </p>
  ) : (
    <p className="text-sm leading-snug">
      <span className="font-semibold text-gray-900">{item.profile?.name}</span>
      {item.cafe
        ? <><span className="text-gray-500"> posted at </span><span className="font-medium text-gray-800">{item.cafe.name}</span></>
        : <span className="text-gray-500"> shared a moment</span>}
    </p>
  )

  return (
    <div className="flex items-start gap-3 bg-white rounded-2xl p-3.5 shadow-sm border border-gray-50">
      <Avatar profile={item.profile} size={40} />
      <div className="flex-1 min-w-0">
        {desc}
        {item.type === 'post' && item.caption && (
          <p className="text-xs text-gray-500 mt-0.5 line-clamp-2 leading-relaxed">{item.caption}</p>
        )}
        {item.type === 'post' && item.stamp_label && (
          <span className={`inline-block text-[10px] font-semibold px-2 py-0.5 rounded-full mt-1 ${
            item.is_reward ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
          }`}>{item.stamp_label}</span>
        )}
        <p className="text-xs text-gray-400 mt-1">{timeAgo(item.created_at)}</p>
      </div>
      {badge}
    </div>
  )
}

// ── For You tab ────────────────────────────────────────────────
function ForYouTab() {
  const [activity, setActivity] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getFriendsActivity()
      .then(setActivity)
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="flex flex-col gap-6">

      {/* Friends' Activity */}
      <section>
        <h3 className="text-sm font-semibold text-gray-900 mb-2.5">Friends' Activity</h3>
        {loading ? (
          <div className="flex flex-col gap-2">
            {[1, 2, 3].map(i => (
              <div key={i} className="flex items-center gap-3 bg-white rounded-2xl p-3.5 animate-pulse border border-gray-50">
                <div className="w-10 h-10 rounded-full bg-gray-200 flex-shrink-0" />
                <div className="flex-1">
                  <div className="h-3.5 bg-gray-200 rounded w-40 mb-2" />
                  <div className="h-3 bg-gray-100 rounded w-28" />
                </div>
                <div className="w-10 h-10 bg-gray-100 rounded-xl flex-shrink-0" />
              </div>
            ))}
          </div>
        ) : activity.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 p-6 text-center">
            <p className="text-3xl mb-2">👥</p>
            <p className="text-sm font-medium text-gray-600">No friend activity yet</p>
            <p className="text-xs mt-1 text-gray-400">Add friends in the Posts tab to see their stamps, rewards & posts here</p>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {activity.map(item => (
              <ActivityItem key={`${item.type}-${item.id}`} item={item} />
            ))}
          </div>
        )}
      </section>

      {/* Active Deals teaser */}
      <section>
        <h3 className="text-sm font-semibold text-gray-900 mb-2.5">Active Deals</h3>
        <div className="bg-amber-50 rounded-2xl p-4 flex items-center gap-3">
          <span className="text-2xl">🎉</span>
          <div>
            <p className="text-sm font-semibold text-gray-900">Workshop Coffee — Double Stamps Tuesdays</p>
            <p className="text-xs text-amber-600 font-medium mt-0.5">Ends Mar 31 · Tap Deals tab to see all</p>
          </div>
        </div>
      </section>
    </div>
  )
}

// ── Deals tab ──────────────────────────────────────────────────
function DealsTab() {
  return (
    <div className="flex flex-col gap-3">
      {deals.map(deal => (
        <div key={deal.id} className="bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-50">
          <div className="h-1.5" style={{ backgroundColor: deal.color }} />
          <div className="p-4 flex items-start gap-3">
            <div className="w-11 h-11 rounded-xl flex items-center justify-center text-white font-bold text-lg flex-shrink-0"
              style={{ backgroundColor: deal.color }}>{deal.letter}</div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <p className="text-sm font-semibold text-gray-900">{deal.cafe}</p>
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${deal.tagClass}`}>{deal.tag}</span>
              </div>
              <p className="text-sm text-gray-600 leading-snug mb-1.5">{deal.description}</p>
              <p className="text-xs text-gray-400">{deal.expiry}</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

// ── Main screen ────────────────────────────────────────────────
const TABS = [
  { id: 'foryou', label: 'For You' },
  { id: 'nearby', label: 'Nearby' },
  { id: 'deals', label: 'Deals' },
]

export default function DiscoverScreen({ user }) {
  const [activeTab, setActiveTab] = useState('foryou')

  return (
    <div className="px-4 pt-4 pb-4">
      <div className="mb-4">
        <h1 className="text-2xl font-bold text-gray-900">Discover</h1>
      </div>
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 mb-5">
        {TABS.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all ${
              activeTab === tab.id ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'
            }`}>{tab.label}</button>
        ))}
      </div>
      {activeTab === 'foryou' && <ForYouTab />}
      {activeTab === 'nearby' && <NearbyTab userId={user?.id} />}
      {activeTab === 'deals' && <DealsTab />}
    </div>
  )
}
