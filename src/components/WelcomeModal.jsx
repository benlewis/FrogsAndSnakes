function WelcomeModal({ onClose }) {
  return (
    <div className="welcome-overlay" onClick={onClose}>
      <div className="welcome-modal" onClick={e => e.stopPropagation()}>
        <button className="welcome-close-btn" onClick={onClose}>&times;</button>
        <h2 className="welcome-title">How to Play</h2>

        <div className="welcome-rules">
          <div className="welcome-rule">
            <span className="welcome-rule-icon">🐸</span>
            <p>Move each frog to a lily pad by <strong>jumping over</strong> objects (logs, snakes, or other frogs).</p>
          </div>
          <div className="welcome-rule">
            <span className="welcome-rule-icon">🐍</span>
            <p><strong>Slide snakes</strong> along their length to rearrange the board and open new paths.</p>
          </div>
          <div className="welcome-rule">
            <span className="welcome-rule-icon">🪷</span>
            <p>Every frog on a lily pad means <strong>you win!</strong></p>
          </div>
        </div>

        <button className="welcome-play-btn" onClick={onClose}>
          Let's Play!
        </button>
        <a className="welcome-tutorial-btn" href="/learn">
          Tutorial
        </a>
      </div>
    </div>
  )
}

export default WelcomeModal
