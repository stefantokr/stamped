import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { getAssignedCafes, signIn, signOut } from '../lib/api'
import Scanner from './Scanner'
import { LogOut } from 'lucide-react'

function PortalAuth({ onAuthed }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      await signIn(email, password)
      onAuthed()
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col justify-center px-6">
      <div className="text-center mb-10">
        <div className="text-5xl mb-3">☕</div>
        <h1 className="text-3xl font-bold text-white">Staff Portal</h1>
        <p className="text-gray-400 text-sm mt-1">Beened · Cafe management</p>
      </div>

      <div className="bg-gray-900 rounded-3xl border border-gray-800 p-6">
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <input
            type="email"
            placeholder="Staff email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-amber-500"
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
            minLength={6}
            className="w-full bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-amber-500"
          />
          {error && <p className="text-red-400 text-sm bg-red-900/20 rounded-xl px-4 py-3">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-amber-500 text-white font-bold py-3.5 rounded-xl mt-1 disabled:opacity-60"
          >
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
      </div>

      <p className="text-center text-gray-600 text-xs mt-6">
        Staff accounts are set up by your manager.
      </p>
    </div>
  )
}

function CafeSelect({ onSelect, onSignOut }) {
  const [cafes, setCafes] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getAssignedCafes()
      .then(data => { setCafes(data); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col px-5 pt-12 pb-8">
      <div className="flex items-start justify-between mb-8">
        <div>
          <p className="text-gray-400 text-sm">Beened Portal</p>
          <h1 className="text-white text-2xl font-bold mt-1">Select your cafe</h1>
        </div>
        <button onClick={onSignOut} className="text-gray-500 p-2">
          <LogOut size={20} />
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center flex-1">
          <div className="w-6 h-6 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : cafes.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center text-center px-6 gap-3">
          <span className="text-4xl">🔒</span>
          <p className="text-white font-semibold">No cafes assigned</p>
          <p className="text-gray-400 text-sm">Your account hasn't been linked to a cafe yet. Contact your manager.</p>
          <button onClick={onSignOut} className="text-amber-500 text-sm mt-2">Sign out</button>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {cafes.map(cafe => (
            <button
              key={cafe.id}
              onClick={() => onSelect(cafe)}
              className="flex items-center gap-4 bg-gray-900 border border-gray-800 rounded-2xl p-4 text-left active:scale-[0.98] transition-transform"
            >
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center text-white text-xl font-bold flex-shrink-0"
                style={{ backgroundColor: cafe.color }}
              >
                {cafe.logo_letter}
              </div>
              <div>
                <p className="text-white font-semibold">{cafe.name}</p>
                <p className="text-gray-400 text-xs mt-0.5">{cafe.address}</p>
                <p className="text-amber-500 text-xs mt-1">
                  {cafe.stamp_target} stamps → {cafe.reward_description}
                </p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export default function Portal() {
  const [authState, setAuthState] = useState('loading')
  const [selectedCafe, setSelectedCafe] = useState(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setAuthState(session ? 'authed' : 'guest')
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      setAuthState(session ? 'authed' : 'guest')
    })
    return () => subscription.unsubscribe()
  }, [])

  if (authState === 'loading') {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (authState === 'guest') return <PortalAuth onAuthed={() => setAuthState('authed')} />
  if (selectedCafe) return <Scanner cafe={selectedCafe} onBack={() => setSelectedCafe(null)} />

  return (
    <CafeSelect
      onSelect={setSelectedCafe}
      onSignOut={() => { signOut(); setSelectedCafe(null) }}
    />
  )
}
