function PlayModeDialog({ onChoose, currentMode = null, onClose = null, allowDismiss = false }) {
  const handlePick = (mode) => {
    onChoose(mode)
  }

  return (
    <div className="welcome-overlay" onClick={allowDismiss && onClose ? onClose : undefined}>
      <div className="welcome-modal" onClick={e => e.stopPropagation()}>
        {allowDismiss && onClose && (
          <button className="welcome-close-btn" onClick={onClose}>&times;</button>
        )}
        <h2 className="welcome-title">Choose your style</h2>

        <div className="play-mode-options">
          <button
            type="button"
            className={`play-mode-card ${currentMode === 'casual' ? 'play-mode-card-active' : ''}`}
            onClick={() => handlePick('casual')}
          >
            <span className="play-mode-card-icon">🌿</span>
            <span className="play-mode-card-title">Casual</span>
            <span className="play-mode-card-desc">
              No timer. Take your time. Leaderboard ranks by fewest moves.
            </span>
          </button>

          <button
            type="button"
            className={`play-mode-card ${currentMode === 'competitive' ? 'play-mode-card-active' : ''}`}
            onClick={() => handlePick('competitive')}
          >
            <span className="play-mode-card-icon">⏱️</span>
            <span className="play-mode-card-title">Competitive</span>
            <span className="play-mode-card-desc">
              Timer starts on your first move. Each hint adds 10 seconds. Leaderboard ranks by fastest time.
            </span>
          </button>
        </div>

        <p className="play-mode-footnote">
          You can change this anytime from the account menu.
        </p>
      </div>
    </div>
  )
}

export default PlayModeDialog
