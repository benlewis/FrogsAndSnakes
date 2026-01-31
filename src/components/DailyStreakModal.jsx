import { useState, useEffect } from 'react'
import { useAuth0 } from '@auth0/auth0-react'

const API_BASE = import.meta.env.DEV ? 'http://localhost:3002' : ''

// Helper to read streaks from cookies
const getStreaksFromCookie = () => {
  const match = document.cookie.match(/(^| )streaks=([^;]+)/)
  if (match) {
    try {
      return JSON.parse(decodeURIComponent(match[2]))
    } catch {
      return null
    }
  }
  return null
}

function DailyStreakModal({ onClose, visitorId }) {
  const { user, isAuthenticated } = useAuth0()
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchStats = async () => {
      // For logged-in users, fetch from API
      if (isAuthenticated && user?.sub) {
        try {
          const res = await fetch(`${API_BASE}/api/user-stats?userId=${encodeURIComponent(user.sub)}`)
          if (res.ok) {
            const data = await res.json()
            setStats(data.stats)
          }
        } catch (error) {
          console.error('Error fetching stats:', error)
        }
      } else {
        // For anonymous users, use cookie-based streaks
        const cookieStreaks = getStreaksFromCookie()
        if (cookieStreaks) {
          setStats({
            easy: { total: 0, currentStreak: cookieStreaks.easy?.current || 0, bestStreak: cookieStreaks.easy?.best || 0 },
            medium: { total: 0, currentStreak: cookieStreaks.medium?.current || 0, bestStreak: cookieStreaks.medium?.best || 0 },
            hard: { total: 0, currentStreak: cookieStreaks.hard?.current || 0, bestStreak: cookieStreaks.hard?.best || 0 }
          })
        }
      }
      setLoading(false)
    }

    fetchStats()
  }, [user?.sub, isAuthenticated])

  const hasAnyStreak = stats && (
    stats.easy?.currentStreak > 0 ||
    stats.medium?.currentStreak > 0 ||
    stats.hard?.currentStreak > 0
  )

  const hasAnyCompletions = stats && (
    stats.easy?.total > 0 ||
    stats.medium?.total > 0 ||
    stats.hard?.total > 0 ||
    stats.easy?.currentStreak > 0 ||
    stats.medium?.currentStreak > 0 ||
    stats.hard?.currentStreak > 0 ||
    stats.easy?.bestStreak > 0 ||
    stats.medium?.bestStreak > 0 ||
    stats.hard?.bestStreak > 0
  )

  return (
    <div className="streak-overlay" onClick={onClose}>
      <div className="streak-modal" onClick={e => e.stopPropagation()}>
        <h2 className="streak-title">Welcome Back!</h2>

        {loading ? (
          <div className="streak-loading">Loading...</div>
        ) : !hasAnyCompletions ? (
          <div className="streak-welcome">
            <p className="streak-subtitle">Ready to start your puzzle streak?</p>
            <p className="streak-tip">Complete puzzles daily to build your streak!</p>
          </div>
        ) : (
          <>
            <p className="streak-subtitle">
              {hasAnyStreak ? "Keep your streaks alive!" : "Start a new streak today!"}
            </p>

            <div className="streak-grid">
              {['easy', 'medium', 'hard'].map(difficulty => {
                const streak = stats?.[difficulty]?.currentStreak || 0
                const isActive = streak > 0
                return (
                  <div key={difficulty} className={`streak-card ${isActive ? 'streak-active' : ''}`}>
                    <div className="streak-difficulty">
                      {difficulty.charAt(0).toUpperCase() + difficulty.slice(1)}
                    </div>
                    <div className="streak-count">
                      {streak}
                    </div>
                    <div className="streak-label">
                      {streak === 1 ? 'day' : 'days'}
                    </div>
                  </div>
                )
              })}
            </div>
          </>
        )}

        <button className="streak-play-btn" onClick={onClose}>
          Play Today's Puzzle
        </button>
      </div>
    </div>
  )
}

export default DailyStreakModal
