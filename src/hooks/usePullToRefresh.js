import { useState, useEffect, useRef } from 'react'

const THRESHOLD = 65

export function usePullToRefresh(onRefresh, enabled = true) {
  const [pullProgress, setPullProgress] = useState(0) // 0 → 1
  const [refreshing, setRefreshing] = useState(false)
  const startY = useRef(0)
  const pullDist = useRef(0)
  const dragging = useRef(false)
  const isRefreshing = useRef(false)
  const onRefreshRef = useRef(onRefresh)
  onRefreshRef.current = onRefresh

  useEffect(() => {
    if (!enabled) return

    function getScrollTop() {
      return document.querySelector('[data-scroll-container]')?.scrollTop ?? 0
    }

    function onTouchStart(e) {
      if (getScrollTop() <= 2) {
        startY.current = e.touches[0].clientY
        dragging.current = true
        pullDist.current = 0
      }
    }

    function onTouchMove(e) {
      if (!dragging.current) return
      const dy = e.touches[0].clientY - startY.current
      if (dy > 0) {
        pullDist.current = Math.min(dy, 110)
        setPullProgress(Math.min(pullDist.current / THRESHOLD, 1))
      } else {
        dragging.current = false
        setPullProgress(0)
        pullDist.current = 0
      }
    }

    async function onTouchEnd() {
      if (!dragging.current) return
      dragging.current = false
      if (pullDist.current >= THRESHOLD && !isRefreshing.current) {
        isRefreshing.current = true
        setRefreshing(true)
        setPullProgress(0)
        try { await onRefreshRef.current() } catch {}
        setRefreshing(false)
        isRefreshing.current = false
      } else {
        setPullProgress(0)
      }
      pullDist.current = 0
    }

    document.addEventListener('touchstart', onTouchStart, { passive: true })
    document.addEventListener('touchmove', onTouchMove, { passive: true })
    document.addEventListener('touchend', onTouchEnd)
    return () => {
      document.removeEventListener('touchstart', onTouchStart)
      document.removeEventListener('touchmove', onTouchMove)
      document.removeEventListener('touchend', onTouchEnd)
    }
  }, [enabled])

  return { pullProgress, refreshing }
}

// Render this at the very top of a screen that uses PTR
export function PullIndicator({ pullProgress, refreshing }) {
  if (pullProgress === 0 && !refreshing) return null
  return (
    <div className="flex justify-center py-2.5">
      <div
        className={`w-6 h-6 border-2 border-amber-500 rounded-full transition-opacity ${
          refreshing ? 'border-t-transparent animate-spin' : 'border-t-transparent'
        }`}
        style={{
          opacity: refreshing ? 1 : Math.min(pullProgress, 1),
          transform: refreshing ? undefined : `scale(${Math.min(pullProgress, 1)}) rotate(${pullProgress * 180}deg)`,
        }}
      />
    </div>
  )
}
