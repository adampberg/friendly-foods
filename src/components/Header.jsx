import { useAuth } from '../AuthContext.jsx'
import './Header.css'

export default function Header({ onOpenAuth }) {
  const { user, logout } = useAuth()

  return (
    <header className="header">
      <div className="header-inner">
        <div className="logo">
          <span className="logo-icon">😋</span>
          <div className="logo-text">
            <span className="logo-name">Friendly Foods</span>
            <span className="logo-tagline">Find your allergy friendly recipes today!</span>
          </div>
        </div>
        <div className="header-auth">
          {user ? (
            <>
              <span className="header-username">{user.username}</span>
              <button className="header-btn header-btn--signout" type="button" onClick={logout}>
                Sign Out
              </button>
            </>
          ) : (
            <button className="header-btn header-btn--signin" type="button" onClick={onOpenAuth}>
              Sign In
            </button>
          )}
        </div>
      </div>
    </header>
  )
}
