import { useState } from 'react'
import { X, LogOut, Trash2, Shield, FileText, Lock, ChevronRight, AlertTriangle, Settings } from 'lucide-react'
import Avatar from '../components/Avatar'
import { updateProfile, signOut, deleteAccount } from '../lib/api'

export default function SettingsScreen({ profile, onClose, onSignOut, onProfileUpdate }) {
  const [isPrivate, setIsPrivate] = useState(profile?.is_private ?? false)
  const [savingPrivacy, setSavingPrivacy] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleting, setDeleting] = useState(false)

  async function togglePrivate() {
    const newVal = !isPrivate
    setIsPrivate(newVal)
    setSavingPrivacy(true)
    try {
      const updated = await updateProfile({ name: profile.name, bio: profile.bio, isPrivate: newVal })
      onProfileUpdate?.(updated)
    } catch (e) {
      console.error(e)
      setIsPrivate(!newVal) // revert
    } finally {
      setSavingPrivacy(false)
    }
  }

  async function handleDeleteAccount() {
    setDeleting(true)
    try {
      await deleteAccount()
      await signOut()
    } catch (e) {
      console.error(e)
      setDeleting(false)
    }
  }

  function handleSignOut() {
    signOut().catch(console.error)
    onSignOut?.()
  }

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-40 animate-fade-in" onClick={onClose} />
      <div className="fixed inset-x-0 bottom-0 top-16 max-w-[430px] mx-auto bg-stone-50 z-50 rounded-t-3xl flex flex-col shadow-2xl overflow-hidden animate-slide-up">

        {/* Header */}
        <div className="flex items-center gap-3 px-5 pt-5 pb-3 bg-white border-b border-gray-100 flex-shrink-0">
          <button onClick={onClose} className="text-gray-400 p-1 -ml-1">
            <X size={20} />
          </button>
          <h2 className="text-base font-bold text-gray-900 flex-1">Settings</h2>
          <Settings size={18} className="text-gray-300" />
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-5 flex flex-col gap-4">

          {/* Profile card */}
          <div className="bg-white rounded-2xl p-4 flex items-center gap-3 border border-gray-100 shadow-sm">
            <Avatar profile={profile} size={48} />
            <div className="flex-1 min-w-0">
              <p className="font-bold text-gray-900 text-sm truncate">{profile?.name ?? 'Your Profile'}</p>
              {profile?.username && <p className="text-xs text-gray-400">@{profile.username}</p>}
            </div>
          </div>

          {/* Privacy section */}
          <div className="bg-white rounded-2xl overflow-hidden border border-gray-100 shadow-sm">
            <p className="px-4 pt-3.5 pb-1.5 text-[11px] font-bold text-gray-400 uppercase tracking-wider">Privacy</p>
            <button
              onClick={togglePrivate}
              disabled={savingPrivacy}
              className="w-full flex items-center gap-3 px-4 py-3.5 border-t border-gray-50 active:bg-gray-50 transition-colors disabled:opacity-60"
            >
              <Lock size={18} className="text-gray-500 flex-shrink-0" />
              <div className="flex-1 text-left">
                <p className="text-sm font-semibold text-gray-800">Private Profile</p>
                <p className="text-xs text-gray-400 mt-0.5">Only friends can see your posts</p>
              </div>
              {/* iOS-style toggle */}
              <div className={`w-11 h-6 rounded-full transition-colors duration-200 flex-shrink-0 flex items-center px-0.5 ${isPrivate ? 'bg-amber-500' : 'bg-gray-200'}`}>
                <div className={`w-5 h-5 bg-white rounded-full shadow-sm transition-transform duration-200 ${isPrivate ? 'translate-x-5' : 'translate-x-0'}`} />
              </div>
            </button>
          </div>

          {/* Legal section */}
          <div className="bg-white rounded-2xl overflow-hidden border border-gray-100 shadow-sm">
            <p className="px-4 pt-3.5 pb-1.5 text-[11px] font-bold text-gray-400 uppercase tracking-wider">Legal</p>
            <a
              href="https://beened.app/privacy"
              target="_blank"
              rel="noreferrer"
              className="w-full flex items-center gap-3 px-4 py-3.5 border-t border-gray-50 active:bg-gray-50 transition-colors"
            >
              <Shield size={18} className="text-gray-500 flex-shrink-0" />
              <span className="flex-1 text-sm font-semibold text-gray-800 text-left">Privacy Policy</span>
              <ChevronRight size={16} className="text-gray-300" />
            </a>
            <a
              href="https://beened.app/terms"
              target="_blank"
              rel="noreferrer"
              className="w-full flex items-center gap-3 px-4 py-3.5 border-t border-gray-50 active:bg-gray-50 transition-colors"
            >
              <FileText size={18} className="text-gray-500 flex-shrink-0" />
              <span className="flex-1 text-sm font-semibold text-gray-800 text-left">Terms of Service</span>
              <ChevronRight size={16} className="text-gray-300" />
            </a>
          </div>

          {/* Account section */}
          <div className="bg-white rounded-2xl overflow-hidden border border-gray-100 shadow-sm">
            <p className="px-4 pt-3.5 pb-1.5 text-[11px] font-bold text-gray-400 uppercase tracking-wider">Account</p>

            <button
              onClick={handleSignOut}
              className="w-full flex items-center gap-3 px-4 py-3.5 border-t border-gray-50 active:bg-gray-50 transition-colors"
            >
              <LogOut size={18} className="text-amber-500 flex-shrink-0" />
              <span className="flex-1 text-sm font-semibold text-amber-600 text-left">Sign Out</span>
            </button>

            {!showDeleteConfirm ? (
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="w-full flex items-center gap-3 px-4 py-3.5 border-t border-gray-50 active:bg-gray-50 transition-colors"
              >
                <Trash2 size={18} className="text-rose-400 flex-shrink-0" />
                <span className="flex-1 text-sm font-semibold text-rose-500 text-left">Delete Account</span>
              </button>
            ) : (
              <div className="px-4 py-4 border-t border-gray-50 bg-rose-50/70">
                <div className="flex items-start gap-2 mb-3">
                  <AlertTriangle size={15} className="text-rose-500 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-rose-700 leading-relaxed">
                    This permanently deletes your account and all your data. This cannot be undone.
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowDeleteConfirm(false)}
                    className="flex-1 py-2.5 rounded-xl bg-gray-100 text-gray-600 text-sm font-semibold active:scale-95 transition-transform"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleDeleteAccount}
                    disabled={deleting}
                    className="flex-1 py-2.5 rounded-xl bg-rose-500 text-white text-sm font-bold disabled:opacity-50 active:scale-95 transition-transform"
                  >
                    {deleting ? 'Deleting…' : 'Delete'}
                  </button>
                </div>
              </div>
            )}
          </div>

          <p className="text-center text-xs text-gray-300 pb-4">Beened v1.0</p>
        </div>
      </div>
    </>
  )
}
