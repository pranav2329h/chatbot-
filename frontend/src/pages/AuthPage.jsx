import { useState } from 'react'
import { motion } from 'framer-motion'
import { signInWithPopup, signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth'
import { auth, googleProvider, githubProvider } from '../firebase/config'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'

export default function AuthPage() {
  const [mode, setMode] = useState('login') // login | register
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const handleGoogleLogin = async () => {
    setLoading(true)
    try {
      await signInWithPopup(auth, googleProvider)
      toast.success('Welcome back! 🎉')
      navigate('/chat')
    } catch (e) {
      toast.error(e.message)
    } finally {
      setLoading(false)
    }
  }

  const handleGithubLogin = async () => {
    setLoading(true)
    try {
      await signInWithPopup(auth, githubProvider)
      toast.success('Welcome back! 🚀')
      navigate('/chat')
    } catch (e) {
      toast.error(e.message)
    } finally {
      setLoading(false)
    }
  }

  const handleEmailAuth = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      if (mode === 'login') {
        await signInWithEmailAndPassword(auth, email, password)
      } else {
        await createUserWithEmailAndPassword(auth, email, password)
      }
      toast.success(mode === 'login' ? 'Welcome back! ⚡' : 'Account created! 🎉')
      navigate('/chat')
    } catch (e) {
      toast.error(e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-page">
      <div className="nexus-bg" />

      <motion.div
        className="auth-card glass"
        initial={{ opacity: 0, y: 30, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
      >
        {/* Logo */}
        <div className="auth-logo">
          <div style={{
            width: 70, height: 70,
            borderRadius: 20,
            background: 'linear-gradient(135deg, var(--clr-primary), var(--clr-accent))',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 36,
            margin: '0 auto 16px',
            boxShadow: '0 0 40px var(--clr-primary-glow)',
          }}>⚡</div>
          <h1 className="auth-title">NEXUS AI</h1>
          <p className="auth-subtitle">
            {mode === 'login' ? 'Welcome back to the future of AI' : 'Join the next generation of AI'}
          </p>
        </div>

        {/* Social buttons */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
          <button
            id="btn-google-login"
            onClick={handleGoogleLogin}
            disabled={loading}
            className="btn btn-secondary"
            style={{ width: '100%', gap: 12 }}
          >
            <svg width="18" height="18" viewBox="0 0 18 18">
              <path fill="#4285F4" d="M16.51 8H8.98v3h4.3c-.18 1-.74 1.48-1.6 2.04v2.01h2.6a7.8 7.8 0 002.38-5.88c0-.57-.05-.66-.15-1.18z"/>
              <path fill="#34A853" d="m8.98 17 2.6-2.04a7.17 7.17 0 01-2.6.46A7 7 0 012.08 10l-2.38 1.3A9 9 0 008.98 17z"/>
              <path fill="#FBBC05" d="M2.08 10A7.06 7.06 0 012 9a7.06 7.06 0 01.08-1L-.3 6.7A9.04 9.04 0 000 9c0 1.52.36 2.96 1 4.22z"/>
              <path fill="#EA4335" d="M8.98 2a9 9 0 016.16 2.4L13.3 6.15A7.04 7.04 0 008.98 4c-3.12 0-5.77 2.1-6.9 5H-.3A9 9 0 018.98 2z"/>
            </svg>
            Continue with Google
          </button>

          <button
            id="btn-github-login"
            onClick={handleGithubLogin}
            disabled={loading}
            className="btn btn-secondary"
            style={{ width: '100%', gap: 12 }}
          >
            <svg width="18" height="18" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/>
            </svg>
            Continue with GitHub
          </button>
        </div>

        <div className="divider">or</div>

        {/* Mode toggle */}
        <div style={{ display: 'flex', gap: 4, background: 'var(--clr-surface)', borderRadius: 10, padding: 4, marginBottom: 20 }}>
          {['login', 'register'].map(m => (
            <button
              key={m}
              id={`auth-tab-${m}`}
              onClick={() => setMode(m)}
              style={{
                flex: 1, padding: '8px 0',
                borderRadius: 8, border: 'none',
                background: mode === m ? 'var(--clr-card)' : 'transparent',
                color: mode === m ? 'var(--clr-text)' : 'var(--clr-text-muted)',
                fontWeight: mode === m ? 600 : 400,
                cursor: 'pointer',
                fontSize: 14,
                transition: 'all 0.2s ease',
                fontFamily: 'var(--font-body)',
              }}
            >
              {m === 'login' ? 'Sign In' : 'Create Account'}
            </button>
          ))}
        </div>

        <form onSubmit={handleEmailAuth} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {mode === 'register' && (
            <div className="form-group">
              <label className="form-label">Display Name</label>
              <input
                id="auth-name"
                type="text"
                className="form-input"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name"
              />
            </div>
          )}
          <div className="form-group">
            <label className="form-label">Email</label>
            <input
              id="auth-email"
              type="email"
              className="form-input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
            />
          </div>
          <div className="form-group">
            <label className="form-label">Password</label>
            <input
              id="auth-password"
              type="password"
              className="form-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
          </div>
          <button
            id="btn-auth-submit"
            type="submit"
            disabled={loading}
            className="btn btn-primary btn-lg"
            style={{ width: '100%', marginTop: 4 }}
          >
            {loading ? (
              <><div className="spinner" style={{ width: 18, height: 18, borderWidth: 2 }} /> {mode === 'login' ? 'Signing in...' : 'Creating account...'}</>
            ) : (
              mode === 'login' ? '⚡ Sign In' : '🚀 Create Account'
            )}
          </button>
        </form>

        <p style={{ textAlign: 'center', fontSize: 12, color: 'var(--clr-text-dim)', marginTop: 24 }}>
          By continuing, you agree to our Terms of Service and Privacy Policy.
          <br />NEXUS AI uses your API keys — your data stays private.
        </p>
      </motion.div>
    </div>
  )
}

