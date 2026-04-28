import { useState, useEffect, useRef, useCallback } from 'react'

// Stopwatch hook for competitive mode.
//
// - Idle until start() is called (on the player's first move).
// - Pauses while the tab is hidden or while `active` is false.
// - addPenalty(ms) bumps the elapsed time forward (used for hint penalties).
// - restore({ accumulatedMs, hasStarted }) re-hydrates from a saved cookie.
// - snapshot() folds the running portion into `accumulatedMs` and returns the
//   value that should be persisted.

export function useGameTimer({ active }) {
  const stateRef = useRef({
    accumulatedMs: 0,
    runningSince: null,
    hasStarted: false,
  })
  const [, setTickCount] = useState(0)
  const tick = useCallback(() => setTickCount((t) => (t + 1) | 0), [])

  const fold = useCallback(() => {
    const s = stateRef.current
    if (s.runningSince != null) {
      const now = Date.now()
      s.accumulatedMs += now - s.runningSince
      s.runningSince = now
    }
  }, [])

  const start = useCallback(() => {
    const s = stateRef.current
    if (s.hasStarted) return
    s.hasStarted = true
    if (active && document.visibilityState === 'visible') {
      s.runningSince = Date.now()
    }
    tick()
  }, [active, tick])

  const addPenalty = useCallback((ms) => {
    fold()
    stateRef.current.accumulatedMs += ms
    tick()
  }, [fold, tick])

  const reset = useCallback(() => {
    stateRef.current = { accumulatedMs: 0, runningSince: null, hasStarted: false }
    tick()
  }, [tick])

  const restore = useCallback((init) => {
    stateRef.current = {
      accumulatedMs: init?.accumulatedMs || 0,
      runningSince: null,
      hasStarted: !!init?.hasStarted,
    }
    tick()
  }, [tick])

  const snapshot = useCallback(() => {
    fold()
    const s = stateRef.current
    return { accumulatedMs: s.accumulatedMs, hasStarted: s.hasStarted }
  }, [fold])

  // React to active+visibility changes: pause/resume.
  useEffect(() => {
    const update = () => {
      const s = stateRef.current
      if (!s.hasStarted) return
      const shouldRun = active && document.visibilityState === 'visible'
      if (shouldRun && s.runningSince == null) {
        s.runningSince = Date.now()
        tick()
      } else if (!shouldRun && s.runningSince != null) {
        fold()
        s.runningSince = null
        tick()
      }
    }
    update()
    document.addEventListener('visibilitychange', update)
    window.addEventListener('focus', update)
    window.addEventListener('blur', update)
    return () => {
      document.removeEventListener('visibilitychange', update)
      window.removeEventListener('focus', update)
      window.removeEventListener('blur', update)
    }
  }, [active, fold, tick])

  // 250ms repaint while running.
  useEffect(() => {
    const id = setInterval(() => {
      if (stateRef.current.runningSince != null) tick()
    }, 250)
    return () => clearInterval(id)
  }, [tick])

  const s = stateRef.current
  const elapsedMs = s.accumulatedMs + (s.runningSince != null ? Date.now() - s.runningSince : 0)

  return { elapsedMs, hasStarted: s.hasStarted, start, addPenalty, reset, restore, snapshot }
}

export function formatTime(ms) {
  const totalSec = Math.max(0, Math.floor(ms / 1000))
  const min = Math.floor(totalSec / 60)
  const sec = totalSec % 60
  return `${min}:${sec.toString().padStart(2, '0')}`
}
