import { QRCodeSVG } from 'qrcode.react'
import { Shield } from 'lucide-react'
import Avatar from '../components/Avatar'

export default function QRScreen({ user, stats }) {
  return (
    <div className="px-4 pt-4 pb-4">
      <div className="mb-5">
        <h1 className="text-2xl font-bold text-gray-900">My QR Code</h1>
        <p className="text-sm text-gray-400 mt-1">Show this at the counter to collect stamps</p>
      </div>

      {/* QR Card */}
      <div
        className="rounded-3xl p-6 flex flex-col items-center shadow-xl mb-5"
        style={{ background: 'linear-gradient(135deg, #d97706 0%, #7c2d12 100%)' }}
      >
        {/* Avatar */}
        <div className="mb-4 ring-4 ring-white/40 rounded-full">
          <Avatar profile={user} size={72} />
        </div>

        <p className="text-white font-bold text-xl mb-0.5">{user.name}</p>
        <p className="text-amber-200 text-sm mb-1">@{user.username}</p>
        {user.bio && (
          <p className="text-amber-100/80 text-xs text-center mb-3 max-w-[220px] leading-relaxed">
            {user.bio}
          </p>
        )}

        <div className="bg-white rounded-2xl p-5 shadow-inner mb-4 w-full flex justify-center">
          <QRCodeSVG
            value={`STAMPED:${user.id}`}
            size={200}
            bgColor="#ffffff"
            fgColor="#1c1c1e"
            level="M"
            includeMargin={false}
          />
        </div>

        <div className="flex items-center gap-1.5 bg-white/20 rounded-full px-3 py-1.5">
          <Shield size={12} className="text-amber-100" />
          <span className="text-xs text-amber-100 font-medium">Verified Beened account</span>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2.5 mb-5">
        <div className="bg-gray-50 rounded-2xl p-3 text-center">
          <div className="text-xl font-bold text-gray-900">{stats?.totalStamps ?? 0}</div>
          <div className="text-[11px] text-gray-500 mt-0.5">Total stamps</div>
        </div>
        <div className="bg-emerald-50 rounded-2xl p-3 text-center">
          <div className="text-xl font-bold text-emerald-600">{stats?.rewardsEarned ?? 0}</div>
          <div className="text-[11px] text-gray-500 mt-0.5">Rewards</div>
        </div>
        <div className="bg-amber-50 rounded-2xl p-3 text-center">
          <div className="text-xl font-bold text-amber-600">{stats?.activeCards ?? 0}</div>
          <div className="text-[11px] text-gray-500 mt-0.5">Active cards</div>
        </div>
      </div>

      {/* How it works */}
      <div className="bg-gray-50 rounded-2xl p-4">
        <p className="text-sm font-semibold text-gray-800 mb-3">How to collect stamps</p>
        <div className="flex flex-col gap-3">
          {[
            { icon: '📱', text: 'Open this screen at the counter' },
            { icon: '🔍', text: 'Staff scan your personal QR code' },
            { icon: '✅', text: 'Stamp added instantly to the right card' },
            { icon: '🏆', text: 'Hit the target to unlock your free reward' },
          ].map((step, i) => (
            <div key={i} className="flex items-center gap-3">
              <span className="text-xl w-7 flex-shrink-0 text-center">{step.icon}</span>
              <span className="text-sm text-gray-600">{step.text}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
