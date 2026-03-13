import { useState, useRef } from 'react'
import { X, Camera, Check } from 'lucide-react'
import { updateProfile, uploadAvatar } from '../lib/api'
import Avatar from '../components/Avatar'

export default function ProfileSheet({ profile, stats, onClose, onSaved }) {
  const [name, setName] = useState(profile?.name ?? '')
  const [bio, setBio] = useState(profile?.bio ?? '')
  const [previewUrl, setPreviewUrl] = useState(null)   // local preview before upload
  const [selectedFile, setSelectedFile] = useState(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const fileInputRef = useRef(null)

  // Build a fake profile object for Avatar preview
  const previewProfile = {
    ...profile,
    avatar_url: previewUrl ?? profile?.avatar_url,
  }

  function handleFileChange(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setSelectedFile(file)
    const reader = new FileReader()
    reader.onloadend = () => setPreviewUrl(reader.result)
    reader.readAsDataURL(file)
  }

  async function handleSave() {
    if (!name.trim()) return
    setSaving(true)
    setError(null)
    try {
      let avatarUrl = undefined
      if (selectedFile) {
        avatarUrl = await uploadAvatar(selectedFile)
      }
      const updated = await updateProfile({
        name: name.trim(),
        bio: bio.trim(),
        avatarUrl,
      })
      onSaved(updated)
      onClose()
    } catch (err) {
      setError(err.message)
      setSaving(false)
    }
  }

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/50 z-40" onClick={onClose} />

      {/* Sheet */}
      <div className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] bg-white rounded-t-3xl z-50 shadow-2xl">
        {/* Handle + header */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 bg-gray-200 rounded-full" />
        </div>
        <div className="flex items-center justify-between px-5 pt-2 pb-4 border-b border-gray-100">
          <button onClick={onClose} className="text-gray-400 p-1">
            <X size={20} />
          </button>
          <h2 className="text-base font-bold text-gray-900">Edit Profile</h2>
          <button
            onClick={handleSave}
            disabled={!name.trim() || saving}
            className="text-amber-500 font-bold text-sm disabled:opacity-40 flex items-center gap-1"
          >
            <Check size={16} />
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>

        <div className="px-5 py-5 overflow-y-auto" style={{ maxHeight: '75vh' }}>

          {/* Avatar picker */}
          <div className="flex flex-col items-center mb-6">
            <div className="relative">
              <Avatar profile={previewProfile} size="xl" />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="absolute bottom-0 right-0 w-8 h-8 bg-amber-500 rounded-full flex items-center justify-center shadow-lg border-2 border-white"
              >
                <Camera size={14} className="text-white" />
              </button>
            </div>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="text-amber-500 text-sm font-semibold mt-2"
            >
              {profile?.avatar_url || previewUrl ? 'Change photo' : 'Add photo'}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileChange}
            />
          </div>

          {/* Stats row */}
          <div className="flex gap-2.5 mb-6">
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

          {/* Name field */}
          <div className="mb-4">
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5 block">
              Name
            </label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Your name"
              maxLength={50}
              className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-400"
            />
          </div>

          {/* Bio field */}
          <div className="mb-4">
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5 block">
              Bio
            </label>
            <textarea
              value={bio}
              onChange={e => setBio(e.target.value)}
              placeholder="Coffee lover ☕ Always chasing the perfect flat white"
              maxLength={160}
              rows={3}
              className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-400 resize-none"
            />
            <div className="text-right text-xs text-gray-400 mt-1">{bio.length}/160</div>
          </div>

          {/* Username (read-only) */}
          {profile?.username && (
            <div className="mb-4">
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5 block">
                Username
              </label>
              <div className="bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3 text-sm text-gray-400">
                @{profile.username}
              </div>
            </div>
          )}

          {error && (
            <p className="text-red-500 text-sm bg-red-50 rounded-xl px-4 py-3 mb-4">{error}</p>
          )}
        </div>
      </div>
    </>
  )
}
