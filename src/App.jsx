import { useState, useEffect } from 'react'
import { supabase } from './lib/supabase'
import { getProfile, getUserStats, signOut, getTotalUnread, getUnreadNotificationCount } from './lib/api'
import ErrorBoundary from './components/ErrorBoundary'
import OfflineBanner from './components/OfflineBanner'
import BottomNav from './components/BottomNav'
import AuthScreen from './screens/AuthScreen'
import OnboardingScreen from './screens/OnboardingScreen'
import CardsScreen from './screens/CardsScreen'
import CardDetail from './screens/CardDetail'
import QRScreen from './screens/QRScreen'
import DiscoverScreen from './screens/DiscoverScreen'
import PostsScreen from './screens/PostsScreen'
import MessagesScreen from './screens/MessagesScreen'

function StatusBar() {
  return (
    <div className="px-6 pt-3 pb-1.5 flex justify-between items-center text-xs font-semibold sticky top-0 z-10"
      style={{ background: '#FAF8F4', color: '#1a1a1a' }}>
      <span className="font-bold tracking-tight">9:41</span>
      <div className="flex items-center gap-1.5" style={{ color: '#555' }}>
        <span className="text-[10px]">●●●</span>
        <svg width="16" height="12" viewBox="0 0 16 12" fill="none">
          <rect x="1" y="4" width="2" height="8" rx="0.5" fill="currentColor" opacity="0.3"/>
          <rect x="5" y="2.5" width="2" height="9.5" rx="0.5" fill="currentColor" opacity="0.5"/>
          <rect x="9" y="1" width="2" height="11" rx="0.5" fill="currentColor" opacity="0.75"/>
          <rect x="13" y="0" width="2" height="12" rx="0.5" fill="currentColor"/>
        </svg>
        <svg width="25" height="12" viewBox="0 0 25 12" fill="none">
          <rect x="0.5" y="0.5" width="21" height="11" rx="2.5" stroke="currentColor" strokeOpacity="0.35"/>
          <rect x="2" y="2" width="17" height="8" rx="1.5" fill="currentColor"/>
          <path d="M23 4.5V7.5C23.8 7.16 24.5 6.5 24.5 6C24.5 5.5 23.8 4.84 23 4.5Z" fill="currentColor" opacity="0.4"/>
        </svg>
      </div>
    </div>
  )
}

function LoadingScreen() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-stone-50">
      <div className="text-4xl mb-4">☕</div>
      <div className="w-6 h-6 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )
}

export default function App() {
  const [authState, setAuthState] = useState('loading')
  const [session, setSession] = useState(null)
  const [profile, setProfile] = useState(null)
  const [stats, setStats] = useState(null)
  const [screen, setScreen] = useState('cards')
  const [selectedCard, setSelectedCard] = useState(null)
  const [unreadMessages, setUnreadMessages] = useState(0)
  const [unreadNotifications, setUnreadNotifications] = useState(0)
  const [onboarded] = useState(() => !!localStorage.getItem('beened_onboarded'))

  // Listen for auth changes
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setAuthState(session ? 'authed' : 'guest')
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      setAuthState(session ? 'authed' : 'guest')
    })

    return () => subscription.unsubscribe()
  }, [])

  // Load profile + stats when authed
  useEffect(() => {
    if (!session?.user) return
    async function load() {
      try {
        const p = await getProfile(session.user.id).catch(() => null)
        const s = await getUserStats(session.user.id).catch(() => ({ totalStamps: 0, rewardsEarned: 0, activeCards: 0 }))
        setProfile(p ?? {
          id: session.user.id,
          name: session.user.user_metadata?.name ?? session.user.email.split('@')[0],
          username: session.user.email.split('@')[0],
          avatar_initials: (session.user.user_metadata?.name ?? session.user.email)[0].toUpperCase(),
        })
        setStats(s)
      } catch (err) {
        console.error('Failed to load profile:', err)
      }
    }
    load()
  }, [session])

  // Poll unread messages every 30s
  useEffect(() => {
    if (!session?.user) return
    function fetchUnread() {
      getTotalUnread().then(setUnreadMessages).catch(() => {})
    }
    fetchUnread()
    const interval = setInterval(fetchUnread, 30000)
    return () => clearInterval(interval)
  }, [session])

  // Poll unread notifications every 60s
  useEffect(() => {
    if (!session?.user) return
    function fetchNotifCount() {
      getUnreadNotificationCount().then(setUnreadNotifications).catch(() => {})
    }
    fetchNotifCount()
    const interval = setInterval(fetchNotifCount, 60000)
    return () => clearInterval(interval)
  }, [session])

  function navigate(newScreen) {
    setScreen(newScreen)
    setSelectedCard(null)
    if (newScreen === 'messages') setUnreadMessages(0)
  }

  function handleCardClaimed() {
    if (session?.user) {
      getUserStats(session.user.id).then(setStats).catch(console.error)
    }
  }

  function handleProfileUpdate(updatedProfile) {
    setProfile(prev => ({ ...prev, ...updatedProfile }))
  }

  if (authState === 'loading') return <LoadingScreen />

  if (authState === 'guest') {
    return (
      <div className="min-h-screen bg-stone-200 flex justify-center">
        <div className="w-full max-w-[430px] min-h-screen shadow-2xl">
          <ErrorBoundary>
            <AuthScreen />
          </ErrorBoundary>
        </div>
      </div>
    )
  }

  // Show onboarding for first-time users
  if (!onboarded) {
    return (
      <div className="min-h-screen bg-stone-200 flex justify-center">
        <div className="w-full max-w-[430px] min-h-screen shadow-2xl">
          <OnboardingScreen onDone={() => window.location.reload()} />
        </div>
      </div>
    )
  }

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-stone-200 flex justify-center items-start">
        <div className="w-full max-w-[430px] min-h-screen relative shadow-2xl flex flex-col" style={{ background: '#FAF8F4' }}>
          <StatusBar />
          <OfflineBanner />

          <div
            data-scroll-container
            className="flex-1 overflow-y-auto"
            style={{ paddingBottom: '88px' }}
          >
            {screen === 'cards' && !selectedCard && (
              <CardsScreen
                user={profile ?? { id: session.user.id, name: session.user.email, avatar_initials: '?' }}
                unreadNotifications={unreadNotifications}
                onCardSelect={setSelectedCard}
                onSignOut={() => signOut().catch(console.error)}
                onProfileUpdate={handleProfileUpdate}
                onNotificationsRead={() => setUnreadNotifications(0)}
              />
            )}
            {screen === 'cards' && selectedCard && (
              <CardDetail
                card={selectedCard}
                userId={session.user.id}
                onBack={() => setSelectedCard(null)}
                onClaimed={handleCardClaimed}
              />
            )}
            {screen === 'qr' && (
              <QRScreen
                user={profile ?? { id: session.user.id, name: session.user.email, username: '' }}
                stats={stats}
              />
            )}
            {screen === 'posts' && (
              <PostsScreen user={profile ?? { id: session.user.id }} />
            )}
            {screen === 'messages' && (
              <MessagesScreen user={profile ?? { id: session.user.id }} />
            )}
            {screen === 'discover' && (
              <DiscoverScreen user={profile ?? { id: session.user.id }} />
            )}
          </div>

          <BottomNav
            current={screen}
            onChange={navigate}
            badges={{ messages: unreadMessages }}
          />
        </div>
      </div>
    </ErrorBoundary>
  )
}
