import { useState, useEffect } from 'react'
import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'

export default function Layout() {
  const [collapsed, setCollapsed] = useState(false)

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      {/* Animated background */}
      <div className="nexus-bg" />

      {/* Sidebar */}
      <Sidebar collapsed={collapsed} onToggle={() => setCollapsed(!collapsed)} />

      {/* Main content */}
      <main className={`main-content ${collapsed ? 'sidebar-collapsed' : ''}`}>
        <Outlet />
      </main>
    </div>
  )
}

