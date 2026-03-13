import { useState } from 'react'

// Reusable avatar — shows image if available, falls back to initials circle
// profile: { avatar_url?, avatar_initials?, name? }
// size: number (px) or one of 'sm' | 'md' | 'lg' | 'xl'
const PRESET = { sm: 32, md: 40, lg: 64, xl: 88 }

export default function Avatar({ profile, size = 'md', className = '' }) {
  const [imgErr, setImgErr] = useState(false)
  const px = typeof size === 'number' ? size : (PRESET[size] ?? 40)
  const fontSize = Math.round(px * 0.36)
  const initials = profile?.avatar_initials ?? profile?.name?.[0]?.toUpperCase() ?? '?'

  if (profile?.avatar_url && !imgErr) {
    return (
      <img
        src={profile.avatar_url}
        alt={profile?.name ?? 'avatar'}
        onError={() => setImgErr(true)}
        className={`rounded-full object-cover flex-shrink-0 ${className}`}
        style={{ width: px, height: px }}
      />
    )
  }

  return (
    <div
      className={`rounded-full bg-amber-100 flex items-center justify-center text-amber-700 font-bold flex-shrink-0 ${className}`}
      style={{ width: px, height: px, fontSize }}
    >
      {initials}
    </div>
  )
}
