import { useState, useEffect } from 'react'
import { useAuth0 } from '@auth0/auth0-react'

const API_BASE = import.meta.env.DEV ? 'http://localhost:3002' : ''

function StatsModal({ onClose, currentDate }) {
  const { user } = useAuth0()
  const [stats, setStats] = useState(null)
  const [aggregates, setAggregates] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      if (!user?.sub) return

      try {
        const [statsRes, aggRes] = await Promise.all([
          fetch(`${API_BASE}/api/stats/${encodeURIComponent(user.sub)}`),
          fetch(`${API_BASE}/api/stats/aggregates/${currentDate}`)
        ])

        if (statsRes.ok) {
          const data = await statsRes.json()
          setStats(data.stats)
        }

        if (aggRes.ok) {
          const data = await aggRes.json()
          setAggregates(data)
        }
      } catch (error) {
        console.error('Error fetching stats:', error)
      }
      setLoading(false)
    }

    fetchData()
  }, [user?.sub, currentDate])

  return (
    <div className="stats-overlay" onClick={onClose}>
      <div className="stats-modal" onClick={e => e.stopPropagation()}>
        <button className="stats-close-btn" onClick={onClose}>&times;</button>
        <h2>Your Stats</h2>

        {loading ? (
          <div className="stats-loading">Loading stats...</div>
        ) : !stats ? (
          <div className="stats-empty">No stats yet. Complete some puzzles!</div>
        ) : (
          <>
            <div className="stats-grid">
              {['easy', 'medium', 'hard'].map(difficulty => (
                <div key={difficulty} className="stats-card">
                  <h3 className="stats-card-title">{difficulty.charAt(0).toUpperCase() + difficulty.slice(1)}</h3>
                  <div className="stats-card-content">
                    <div className="stats-row">
                      <span className="stats-label">Completed</span>
                      <span className="stats-value">{stats[difficulty]?.total || 0}</span>
                    </div>
                    <div className="stats-row">
                      <span className="stats-label">Current Streak</span>
                      <span className="stats-value">{stats[difficulty]?.currentStreak || 0} days</span>
                    </div>
                    <div className="stats-row">
                      <span className="stats-label">Best Streak</span>
                      <span className="stats-value">{stats[difficulty]?.bestStreak || 0} days</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {aggregates && Object.keys(aggregates).length > 0 && (
              <>
                <h3 className="stats-section-title">Today's Puzzle Comparison</h3>
                <div className="stats-comparison">
                  {['easy', 'medium', 'hard'].map(difficulty => {
                    const agg = aggregates[difficulty]
                    if (!agg) return null
                    return (
                      <div key={difficulty} className="stats-comparison-row">
                        <span className="stats-comparison-label">
                          {difficulty.charAt(0).toUpperCase() + difficulty.slice(1)}
                        </span>
                        <span className="stats-comparison-value">
                          Avg: {agg.avgMoves} moves | Best: {agg.minMoves} moves
                        </span>
                        <span className="stats-comparison-count">
                          ({agg.totalCompletions} players)
                        </span>
                      </div>
                    )
                  })}
                </div>
              </>
            )}
          </>
        )}
      </div>
    </div>
  )
}

export default StatsModal
