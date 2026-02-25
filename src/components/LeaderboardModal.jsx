import { useState, useEffect } from 'react'
import { useAuth0 } from '@auth0/auth0-react'

const API_BASE = import.meta.env.DEV ? 'http://localhost:3002' : ''

// Get visitor ID from cookie (same logic as App.jsx)
const getVisitorId = () => {
  const match = document.cookie.match(/(^| )visitor_id=([^;]+)/)
  return match ? match[2] : null
}

function LeaderboardModal({ currentDate, completedLevels, onClose }) {
  const { user, isAuthenticated } = useAuth0()
  const [leaderboard, setLeaderboard] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchLeaderboard = async () => {
      const userId = isAuthenticated && user?.sub ? user.sub : getVisitorId()
      const params = new URLSearchParams({ date: currentDate })
      if (userId) params.set('userId', userId)

      try {
        const res = await fetch(`${API_BASE}/api/leaderboard?${params}`)
        if (res.ok) {
          setLeaderboard(await res.json())
        }
      } catch (error) {
        console.error('Error fetching leaderboard:', error)
      }
      setLoading(false)
    }

    fetchLeaderboard()
  }, [currentDate, isAuthenticated, user?.sub])

  const difficulties = ['easy', 'medium', 'hard', 'expert']

  return (
    <div className="leaderboard-overlay" onClick={onClose}>
      <div className="leaderboard-modal" onClick={e => e.stopPropagation()}>
        <button className="leaderboard-close-btn" onClick={onClose}>&times;</button>
        <h2 className="leaderboard-title">Leaderboard</h2>

        {loading ? (
          <div className="leaderboard-loading">Loading leaderboard...</div>
        ) : !leaderboard || Object.keys(leaderboard).length === 0 ? (
          <div className="leaderboard-empty">No completions yet today. Be the first!</div>
        ) : (
          <div className="leaderboard-cards">
            {difficulties.map(diff => {
              const data = leaderboard[diff]
              if (!data) return null
              const hasCompleted = data.userMoves !== null
              return (
                <div key={diff} className={`leaderboard-card ${diff === 'expert' ? 'leaderboard-card-expert' : ''}`}>
                  <h3 className="leaderboard-card-title">{diff.charAt(0).toUpperCase() + diff.slice(1)}</h3>
                  <div className="leaderboard-stat">
                    <span className="leaderboard-stat-label">Players</span>
                    <span className="leaderboard-stat-value">{data.totalCompletions}</span>
                  </div>
                  <div className="leaderboard-stat">
                    <span className="leaderboard-stat-label">Avg Moves</span>
                    <span className="leaderboard-stat-value">{data.avgMoves}</span>
                  </div>
                  <div className="leaderboard-stat">
                    <span className="leaderboard-stat-label">Best</span>
                    <span className="leaderboard-stat-value">{data.minMoves}</span>
                  </div>
                  {hasCompleted ? (
                    <div className="leaderboard-user-row">
                      <div className="leaderboard-stat">
                        <span className="leaderboard-stat-label">Your Moves</span>
                        <span className="leaderboard-stat-value">{data.userMoves}</span>
                      </div>
                      <div className="leaderboard-rank">
                        #{data.userRank} <span className="leaderboard-rank-of">of {data.totalCompletions}</span>
                      </div>
                    </div>
                  ) : (
                    <div className="leaderboard-not-completed">Not completed yet</div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

export default LeaderboardModal
