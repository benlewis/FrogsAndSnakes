import React from 'react'
import ReactDOM from 'react-dom/client'
import { Auth0Provider } from '@auth0/auth0-react'
import { Analytics } from '@vercel/analytics/react'
import App from './App.jsx'
import Learn from './Learn.jsx'
import LevelEditor from './LevelEditor.jsx'
import AssetPortal from './AssetPortal.jsx'
import Users from './Users.jsx'
import { startVersionCheck } from './lib/versionCheck.js'
import './index.css'

startVersionCheck()

const path = window.location.pathname
const isGamePath = path === '/' || path === '/color-jump'
const Page = path === '/learn' ? Learn
  : path === '/level-editor' ? LevelEditor
  : path === '/asset-portal' ? AssetPortal
  : path === '/users' ? Users
  : App
const initialGame = path === '/color-jump' ? 'color-jump' : 'jumping-frogs'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <Auth0Provider
      domain={import.meta.env.VITE_AUTH0_DOMAIN}
      clientId={import.meta.env.VITE_AUTH0_CLIENT_ID}
      authorizationParams={{
        redirect_uri: window.location.origin
      }}
      cacheLocation="localstorage"
      useRefreshTokens={true}
    >
      <Page initialGame={isGamePath ? initialGame : undefined} />
      <Analytics />
    </Auth0Provider>
  </React.StrictMode>,
)
