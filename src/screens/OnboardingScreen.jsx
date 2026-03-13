import { useState } from 'react'

const slides = [
  {
    emoji: '☕',
    title: 'Welcome to Beened',
    desc: 'Your digital loyalty card for local cafes. Collect stamps, earn rewards, and share coffee moments.',
    bg: 'from-amber-50 to-orange-50',
  },
  {
    emoji: '🎉',
    title: 'Collect & Earn',
    desc: 'Show your QR code at any Beened cafe to collect stamps. Fill your card to unlock a free drink!',
    bg: 'from-emerald-50 to-teal-50',
  },
  {
    emoji: '👥',
    title: 'Connect with Friends',
    desc: 'Follow friends, share your coffee moments, and see what everyone\'s brewing around you.',
    bg: 'from-blue-50 to-indigo-50',
  },
]

export default function OnboardingScreen({ onDone }) {
  const [page, setPage] = useState(0)
  const slide = slides[page]
  const isLast = page === slides.length - 1

  function finish() {
    localStorage.setItem('beened_onboarded', '1')
    onDone()
  }

  function next() {
    if (isLast) finish()
    else setPage(p => p + 1)
  }

  return (
    <div className={`min-h-screen bg-gradient-to-b ${slide.bg} flex flex-col items-center justify-between px-8 py-14 transition-colors duration-300`}>

      {/* Skip */}
      <div className="w-full flex justify-end">
        {!isLast && (
          <button
            onClick={finish}
            className="text-sm font-semibold text-gray-400 py-1 px-3"
          >
            Skip
          </button>
        )}
      </div>

      {/* Slide content */}
      <div className="flex flex-col items-center text-center flex-1 justify-center gap-6">
        <div key={page} className="text-8xl animate-fade-in-up">{slide.emoji}</div>
        <div className="animate-fade-in-up" style={{ animationDelay: '60ms' }}>
          <h1 className="text-3xl font-bold text-gray-900 mb-3 leading-tight">{slide.title}</h1>
          <p className="text-base text-gray-500 leading-relaxed max-w-xs">{slide.desc}</p>
        </div>
      </div>

      {/* Dots + CTA */}
      <div className="w-full flex flex-col items-center gap-6">
        <div className="flex gap-2">
          {slides.map((_, i) => (
            <button
              key={i}
              onClick={() => setPage(i)}
              className={`h-2 rounded-full transition-all duration-300 ${
                i === page ? 'w-6 bg-amber-500' : 'w-2 bg-gray-300'
              }`}
            />
          ))}
        </div>
        <button
          onClick={next}
          className="w-full bg-amber-500 text-white font-bold py-4 rounded-2xl text-base active:scale-95 transition-transform shadow-lg shadow-amber-200"
        >
          {isLast ? 'Get Started ☕' : 'Next'}
        </button>
      </div>
    </div>
  )
}
