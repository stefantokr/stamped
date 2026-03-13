import { CreditCard, QrCode, Compass, Newspaper, MessageSquare } from 'lucide-react'

const tabs = [
  { id: 'cards',    label: 'Cards',    Icon: CreditCard },
  { id: 'qr',       label: 'My QR',    Icon: QrCode },
  { id: 'posts',    label: 'Posts',    Icon: Newspaper },
  { id: 'messages', label: 'Messages', Icon: MessageSquare },
  { id: 'discover', label: 'Discover', Icon: Compass },
]

export default function BottomNav({ current, onChange, badges = {} }) {
  return (
    <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] bg-white border-t border-gray-100 px-1 pt-2 pb-7 flex justify-around items-center z-20">
      {tabs.map(({ id, label, Icon }) => {
        const active = current === id
        const badge = badges[id]
        return (
          <button
            key={id}
            onClick={() => onChange(id)}
            className={`relative flex flex-col items-center gap-0.5 px-4 py-1 rounded-xl transition-colors ${
              active ? 'text-amber-600' : 'text-gray-400'
            }`}
          >
            <Icon size={22} strokeWidth={active ? 2.5 : 1.8} />
            {badge > 0 && (
              <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 bg-rose-500 rounded-full flex items-center justify-center text-white text-[9px] font-bold px-1">
                {badge > 9 ? '9+' : badge}
              </span>
            )}
            <span className={`text-[10px] font-semibold ${active ? 'text-amber-600' : 'text-gray-400'}`}>
              {label}
            </span>
          </button>
        )
      })}
    </div>
  )
}
