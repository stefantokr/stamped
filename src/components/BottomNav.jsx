import { CreditCard, QrCode, Compass, Newspaper, MessageSquare } from 'lucide-react'

const tabs = [
  { id: 'cards',    label: 'Cards',   Icon: CreditCard },
  { id: 'posts',    label: 'Posts',   Icon: Newspaper },
  { id: 'qr',       label: 'QR',      Icon: QrCode,    primary: true },
  { id: 'messages', label: 'DMs',     Icon: MessageSquare },
  { id: 'discover', label: 'Explore', Icon: Compass },
]

export default function BottomNav({ current, onChange, badges = {} }) {
  return (
    <div
      className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] z-20 flex justify-around items-end px-3 pb-8 pt-3"
      style={{
        background: '#111111',
        boxShadow: '0 -1px 0 rgba(255,255,255,0.06)',
      }}
    >
      {tabs.map(({ id, label, Icon, primary }) => {
        const active = current === id
        const badge  = badges[id]

        if (primary) {
          return (
            <button
              key={id}
              onClick={() => onChange(id)}
              className="flex flex-col items-center gap-1.5 -mt-6 active:scale-95 transition-transform"
            >
              <div
                className={`w-14 h-14 rounded-[22px] flex items-center justify-center shadow-xl transition-all ${
                  active ? 'bg-amber-400' : 'bg-amber-500'
                }`}
                style={{ boxShadow: '0 4px 20px rgba(245,158,11,0.45)' }}
              >
                <Icon size={24} strokeWidth={2} className="text-white" />
              </div>
              <span className={`text-[10px] font-semibold transition-colors ${
                active ? 'text-amber-400' : 'text-white/40'
              }`}>{label}</span>
            </button>
          )
        }

        return (
          <button
            key={id}
            onClick={() => onChange(id)}
            className="relative flex flex-col items-center gap-1.5 px-2 py-0.5 active:opacity-70 transition-opacity"
          >
            {/* Active top bar */}
            <div
              className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full transition-all duration-300"
              style={{
                width: active ? 20 : 0,
                height: 2.5,
                background: '#F59E0B',
                opacity: active ? 1 : 0,
              }}
            />

            <div className="relative">
              <Icon
                size={22}
                strokeWidth={active ? 2.2 : 1.6}
                className={`transition-all duration-200 ${active ? 'text-white' : 'text-white/30'}`}
              />
              {badge > 0 && (
                <span className="absolute -top-1.5 -right-2 min-w-[15px] h-[15px] bg-rose-500 rounded-full flex items-center justify-center text-white text-[8px] font-bold px-0.5">
                  {badge > 9 ? '9+' : badge}
                </span>
              )}
            </div>

            <span className={`text-[10px] font-semibold transition-all duration-200 ${
              active ? 'text-white' : 'text-white/30'
            }`}>
              {label}
            </span>
          </button>
        )
      })}
    </div>
  )
}
