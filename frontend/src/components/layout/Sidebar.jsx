import { NavLink, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import useAuthStore from '../../store/authStore'

const NAV_ITEMS = [
  {
    section: 'AI Studio',
    items: [
      { path: '/chat', icon: '💬', label: 'Chat', description: 'Multi-model AI chat' },
      { path: '/image', icon: '🎨', label: 'Image Studio', description: 'AI image generation', badge: 'HOT' },
      { path: '/video', icon: '🎬', label: 'Video Studio', description: 'AI video creation' },
      { path: '/audio', icon: '🎵', label: 'Audio Studio', description: 'TTS & Music AI' },
    ]
  },
  {
    section: 'Explore',
    items: [
      { path: '/nova', icon: '🤖', label: 'NOVA Assistant', description: '3D AI companion', badge: 'NEW' },
      { path: '/debate', icon: '⚔️', label: 'AI Debate', description: 'Multi-model debates', badge: 'UNIQUE' },
    ]
  },
  {
    section: 'Account',
    items: [
      { path: '/analytics', icon: '📊', label: 'Analytics', description: 'Usage insights' },
      { path: '/settings', icon: '⚙️', label: 'Settings', description: 'Preferences & API keys' },
    ]
  },
]

export default function Sidebar({ collapsed, onToggle }) {
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  return (
    <aside className={`sidebar ${collapsed ? 'collapsed' : ''}`}>
      {/* Logo */}
      <div className="sidebar-logo">
        <div className="sidebar-logo-icon">⚡</div>
        {!collapsed && (
          <span className="sidebar-logo-text">NEXUS AI</span>
        )}
      </div>

      {/* Navigation */}
      <nav className="sidebar-nav">
        {NAV_ITEMS.map((section) => (
          <div key={section.section}>
            {!collapsed && (
              <div className="nav-section-label">{section.section}</div>
            )}
            {section.items.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                id={`nav-${item.label.toLowerCase().replace(/\s+/g, '-')}`}
                className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
                title={collapsed ? item.label : undefined}
              >
                <div className="nav-item-icon">{item.icon}</div>
                {!collapsed && (
                  <>
                    <span style={{ flex: 1 }}>{item.label}</span>
                    {item.badge && (
                      <span className={`badge ${item.badge === 'NEW' ? 'badge-accent' : item.badge === 'UNIQUE' ? 'badge-new' : 'badge-primary'}`}>
                        {item.badge}
                      </span>
                    )}
                  </>
                )}
              </NavLink>
            ))}
          </div>
        ))}
      </nav>

      {/* User section */}
      <div style={{
        padding: '16px',
        borderTop: '1px solid var(--clr-border)',
      }}>
        {user ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: 36, height: 36,
              borderRadius: '50%',
              background: 'linear-gradient(135deg, var(--clr-primary), var(--clr-accent))',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
              overflow: 'hidden',
            }}>
              {user.photoURL ? (
                <img src={user.photoURL} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <span style={{ fontSize: 14, fontWeight: 700, color: 'white' }}>
                  {(user.displayName || user.email || 'U')[0].toUpperCase()}
                </span>
              )}
            </div>
            {!collapsed && (
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--clr-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {user.displayName || 'User'}
                </div>
                <div style={{ fontSize: 11, color: 'var(--clr-text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {user.email}
                </div>
              </div>
            )}
            {!collapsed && (
              <button
                onClick={handleLogout}
                className="btn btn-ghost btn-sm btn-icon"
                title="Sign out"
                id="btn-sign-out"
              >
                🚪
              </button>
            )}
          </div>
        ) : (
          !collapsed && (
            <NavLink to="/login" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }}>
              Sign In
            </NavLink>
          )
        )}
      </div>

      {/* Collapse toggle */}
      <button
        onClick={onToggle}
        id="btn-sidebar-toggle"
        style={{
          position: 'absolute',
          top: 20,
          right: collapsed ? -14 : -14,
          width: 28, height: 28,
          borderRadius: '50%',
          background: 'var(--clr-card)',
          border: '1px solid var(--clr-border)',
          color: 'var(--clr-text-muted)',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 12,
          transition: 'var(--transition)',
          zIndex: 10,
        }}
      >
        {collapsed ? '→' : '←'}
      </button>
    </aside>
  )
}

