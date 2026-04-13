import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { useEffect } from 'react'
import Layout from './components/layout/Layout'
import AuthPage from './pages/AuthPage'
import ChatPage from './pages/ChatPage'
import ImageStudioPage from './pages/ImageStudioPage'
import VideoStudioPage from './pages/VideoStudioPage'
import AudioStudioPage from './pages/AudioStudioPage'
import NovaPage from './pages/NovaPage'
import DebatePage from './pages/DebatePage'
import useAuthStore from './store/authStore'

function AnalyticsPage() {
  return (
    <div style={{ padding: 40, textAlign: 'center' }}>
      <div style={{ fontSize: 64, marginBottom: 16 }}>📊</div>
      <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 24, color: 'var(--clr-text)' }}>Analytics Dashboard</h2>
      <p style={{ color: 'var(--clr-text-muted)', marginTop: 8 }}>Coming in Module 7 — AI usage insights and charts.</p>
    </div>
  )
}

function SettingsPage() {
  return (
    <div style={{ padding: 40, textAlign: 'center' }}>
      <div style={{ fontSize: 64, marginBottom: 16 }}>⚙️</div>
      <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 24, color: 'var(--clr-text)' }}>Settings</h2>
      <p style={{ color: 'var(--clr-text-muted)', marginTop: 8 }}>API key management and preferences coming soon.</p>
    </div>
  )
}

export default function App() {
  const { initialize } = useAuthStore()

  useEffect(() => {
    const unsubscribe = initialize()
    return () => { if (typeof unsubscribe === 'function') unsubscribe() }
  }, [initialize])

  return (
    <BrowserRouter>
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: 'var(--clr-card)',
            color: 'var(--clr-text)',
            border: '1px solid var(--clr-border)',
            fontFamily: 'var(--font-body)',
            fontSize: 14,
          },
          success: { icon: '✅' },
          error: { icon: '❌' },
        }}
      />
      <Routes>
        <Route path="/login" element={<AuthPage />} />
        <Route path="/" element={<Layout />}>
          <Route index element={<Navigate to="/chat" replace />} />
          <Route path="chat" element={<ChatPage />} />
          <Route path="image" element={<ImageStudioPage />} />
          <Route path="video" element={<VideoStudioPage />} />
          <Route path="audio" element={<AudioStudioPage />} />
          <Route path="nova" element={<NovaPage />} />
          <Route path="debate" element={<DebatePage />} />
          <Route path="analytics" element={<AnalyticsPage />} />
          <Route path="settings" element={<SettingsPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/chat" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
