import { useState, useRef, useEffect } from 'react'
import { useAuth0 } from '@auth0/auth0-react'

function AccountMenu({ onShowStats, onChangePlayMode, playMode, isAdmin, currentGame }) {
  const { isAuthenticated, isLoading, user, loginWithRedirect, logout } = useAuth0()
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [imgError, setImgError] = useState(false)
  const dropdownRef = useRef(null)

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false)
      }
    }

    if (dropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [dropdownOpen])

  if (isLoading) {
    return <div className="account-menu"><div className="account-loading" /></div>
  }

  const gameLinks = (
    <>
      <div className="account-dropdown-section-label">Games</div>
      <a
        className={`account-dropdown-item${currentGame === 'jumping-frogs' ? ' active' : ''}`}
        href="/"
        onClick={() => setDropdownOpen(false)}
      >
        Jumping Frogs
      </a>
      <a
        className={`account-dropdown-item${currentGame === 'color-jump' ? ' active' : ''}`}
        href="/color-jump"
        onClick={() => setDropdownOpen(false)}
      >
        Color Jump
      </a>
    </>
  )

  const playModeLink = onChangePlayMode ? (
    <button
      className="account-dropdown-item"
      onClick={() => { setDropdownOpen(false); onChangePlayMode(); }}
    >
      Mode: {playMode === 'competitive' ? '⏱️ Competitive' : '🌿 Casual'}
    </button>
  ) : null

  if (!isAuthenticated) {
    return (
      <div className="account-menu" ref={dropdownRef}>
        <button className="account-login-btn" onClick={() => setDropdownOpen(!dropdownOpen)}>
          Menu
        </button>
        {dropdownOpen && (
          <div className="account-dropdown">
            {gameLinks}
            {playModeLink && <div className="account-dropdown-divider" />}
            {playModeLink}
            <div className="account-dropdown-divider" />
            <button
              className="account-dropdown-item"
              onClick={() => { setDropdownOpen(false); loginWithRedirect(); }}
            >
              Log In
            </button>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="account-menu" ref={dropdownRef}>
      <button
        className="account-icon-btn"
        onClick={() => setDropdownOpen(!dropdownOpen)}
        aria-label="Account menu"
      >
        {user?.picture && !imgError ? (
          <img
            src={user.picture}
            alt={user.name || 'User'}
            className="account-avatar"
            onError={() => setImgError(true)}
            referrerPolicy="no-referrer"
          />
        ) : (
          <div className="account-avatar-placeholder">
            {user?.name?.charAt(0) || user?.email?.charAt(0) || '?'}
          </div>
        )}
      </button>

      {dropdownOpen && (
        <div className="account-dropdown">
          <div className="account-dropdown-header">
            {user?.name && <div className="account-dropdown-name">{user.name}</div>}
            {user?.email && <div className="account-dropdown-email">{user.email}</div>}
          </div>
          <div className="account-dropdown-divider" />
          {gameLinks}
          <div className="account-dropdown-divider" />
          {playModeLink}
          {isAdmin && (
            <a
              className="account-dropdown-item"
              href="/level-editor"
              onClick={() => setDropdownOpen(false)}
            >
              Level Editor
            </a>
          )}
          <button
            className="account-dropdown-item"
            onClick={() => { setDropdownOpen(false); onShowStats?.(); }}
          >
            See Stats
          </button>
          <button
            className="account-dropdown-item"
            onClick={() => logout({ logoutParams: { returnTo: window.location.origin } })}
          >
            Logout
          </button>
        </div>
      )}
    </div>
  )
}

export default AccountMenu
