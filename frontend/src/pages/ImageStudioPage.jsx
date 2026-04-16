import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { imageAPI } from '../services/api'
import toast from 'react-hot-toast'

const MODELS = [
  { id: 'dall-e-3', name: 'DALL-E 3', icon: '🟢', badge: 'OpenAI' },
  { id: 'stable-diffusion-xl', name: 'Stable Diffusion XL', icon: '🟣', badge: 'Stability' },
  { id: 'flux-1-schnell', name: 'FLUX.1 Schnell', icon: '⚡', badge: 'BFL' },
]

const STYLES = ['photorealistic', 'anime', 'oil painting', 'watercolor', 'cyberpunk', 'fantasy art', 'minimalist', 'vaporwave']
const SIZES = ['512x512', '1024x1024', '1024x1792', '1792x1024']

export default function ImageStudioPage() {
  const [prompt, setPrompt] = useState('')
  const [model, setModel] = useState('dall-e-3')
  const [style, setStyle] = useState('photorealistic')
  const [size, setSize] = useState('1024x1024')
  const [count, setCount] = useState(1)
  const [images, setImages] = useState([])
  const [loading, setLoading] = useState(false)
  const [optimizing, setOptimizing] = useState(false)
  const [selectedImage, setSelectedImage] = useState(null)
  const [progress, setProgress] = useState(0)

  const optimizePrompt = async () => {
    if (!prompt.trim()) return
    setOptimizing(true)
    try {
      const res = await imageAPI.optimizePrompt({ prompt, style })
      setPrompt(res.data.enhanced)
      toast.success('Prompt optimized! ✨')
    } catch (e) {
      toast.error('Optimization failed. Check your OpenAI key.')
    } finally {
      setOptimizing(false)
    }
  }

  const generate = async () => {
    if (!prompt.trim()) return toast.error('Enter a prompt first')
    setLoading(true)
    setProgress(0)
    setImages([])

    // Simulate progress
    const interval = setInterval(() => {
      setProgress(p => Math.min(p + 8, 90))
    }, 500)

    try {
      const res = await imageAPI.generate({ prompt, model, style, size, count })
      setImages(res.data.images)
      setSelectedImage(res.data.images[0])
      setProgress(100)
      toast.success(`Generated ${res.data.images.length} image(s)!`)
    } catch (e) {
      toast.error(e.response?.data?.error || 'Generation failed')
    } finally {
      clearInterval(interval)
      setLoading(false)
    }
  }

  return (
    <div className="studio-grid" style={{ padding: '24px' }}>
      {/* Control Panel */}
      <div className="studio-panel">
        <div className="section-header">
          <div className="section-icon" style={{ background: 'rgba(168, 85, 247, 0.15)' }}>🎨</div>
          <div>
            <div className="section-title">Image Studio</div>
            <div className="section-subtitle">AI-powered image generation</div>
          </div>
        </div>

        {/* Model Selection */}
        <div className="form-group">
          <label className="form-label">AI Model</label>
          <div style={{ display: 'flex', gap: 8, flexDirection: 'column' }}>
            {MODELS.map((m) => (
              <button
                key={m.id}
                id={`model-${m.id}`}
                onClick={() => setModel(m.id)}
                style={{
                  padding: '10px 14px',
                  borderRadius: 10,
                  border: `1px solid ${model === m.id ? 'var(--clr-primary)' : 'var(--clr-border)'}`,
                  background: model === m.id ? 'rgba(124,107,255,0.1)' : 'var(--clr-surface)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  transition: 'all 0.2s ease',
                  fontFamily: 'var(--font-body)',
                }}
              >
                <span style={{ fontSize: 20 }}>{m.icon}</span>
                <span style={{ flex: 1, fontWeight: 600, color: 'var(--clr-text)', fontSize: 14, textAlign: 'left' }}>{m.name}</span>
                <span className="badge badge-primary">{m.badge}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Prompt */}
        <div className="form-group">
          <label className="form-label">Prompt</label>
          <textarea
            id="image-prompt"
            className="form-input form-textarea"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Describe what you want to create..."
            style={{ minHeight: 120 }}
          />
          <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
            <button
              id="btn-optimize-prompt"
              onClick={optimizePrompt}
              disabled={optimizing || !prompt.trim()}
              className="btn btn-secondary btn-sm"
              style={{ flex: 1 }}
            >
              {optimizing ? '⏳ Optimizing...' : '✨ Optimize Prompt'}
            </button>
            <button
              id="btn-generate-quick"
              onClick={generate}
              disabled={loading || !prompt.trim()}
              className="btn btn-primary btn-sm"
              style={{ flex: 1.5 }}
            >
              {loading ? '⏳ Generating...' : '🎨 Generate Image'}
            </button>
          </div>
        </div>

        {/* Style */}
        <div className="form-group">
          <label className="form-label">Style</label>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {STYLES.map((s) => (
              <button
                key={s}
                id={`style-${s.replace(/\s+/g, '-')}`}
                onClick={() => setStyle(s)}
                className={`model-chip ${style === s ? 'active' : ''}`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        {/* Size */}
        <div className="form-group">
          <label className="form-label">Resolution</label>
          <select
            id="image-size"
            className="form-input form-select"
            value={size}
            onChange={(e) => setSize(e.target.value)}
          >
            {SIZES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>

        {/* Count */}
        <div className="form-group">
          <label className="form-label">Variations: {count}</label>
          <input
            type="range"
            min={1} max={4}
            value={count}
            id="image-count"
            onChange={(e) => setCount(Number(e.target.value))}
            style={{ width: '100%', accentColor: 'var(--clr-primary)' }}
          />
        </div>

        {loading && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 13, color: 'var(--clr-text-muted)' }}>
              <span>Generating...</span>
              <span>{progress}%</span>
            </div>
            <div className="progress-bar">
              <div className="progress-fill" style={{ width: `${progress}%` }} />
            </div>
          </div>
        )}

        <button
          id="btn-generate-image"
          onClick={generate}
          disabled={loading || !prompt.trim()}
          className="btn btn-primary btn-lg"
          style={{ width: '100%' }}
        >
          {loading ? (
            <><div className="spinner" style={{ width: 18, height: 18, borderWidth: 2 }} /> Generating...</>
          ) : (
            '🎨 Generate Image'
          )}
        </button>
      </div>

      {/* Canvas / Preview */}
      <div className="studio-canvas">
        <AnimatePresence mode="wait">
          {selectedImage ? (
            <motion.div
              key={selectedImage.url}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.4 }}
              style={{ width: '100%', height: '100%', position: 'relative' }}
            >
              <img
                src={selectedImage.url}
                alt="Generated"
                className="image-result"
                referrerPolicy="no-referrer"
              />
              <div style={{
                position: 'absolute',
                bottom: 16, right: 16,
                display: 'flex',
                gap: 8,
              }}>
                <a
                  href={selectedImage.url}
                  download="nexus-ai-image.png"
                  className="btn btn-secondary btn-sm glass"
                  referrerPolicy="no-referrer"
                  target="_blank"
                  rel="noreferrer"
                >
                  ⬇️ Download
                </a>
              </div>
              {images.length > 1 && (
                <div style={{
                  position: 'absolute',
                  bottom: 16, left: 16,
                  display: 'flex',
                  gap: 8,
                }}>
                  {images.map((img, i) => (
                    <div
                      key={i}
                      onClick={() => setSelectedImage(img)}
                      style={{
                        width: 52, height: 52,
                        borderRadius: 8,
                        overflow: 'hidden',
                        border: `2px solid ${selectedImage === img ? 'var(--clr-primary)' : 'var(--clr-border)'}`,
                        cursor: 'pointer',
                      }}
                    >
                      <img src={img.url} alt="" referrerPolicy="no-referrer" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          ) : (
            <motion.div
              className="image-placeholder"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              <div style={{ fontSize: 72, marginBottom: 8 }}>🎨</div>
              <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 20, color: 'var(--clr-text-muted)' }}>
                Your creation appears here
              </h3>
              <p style={{ fontSize: 14, color: 'var(--clr-text-dim)', maxWidth: 300, textAlign: 'center' }}>
                Enter a prompt, choose your style, and click Generate
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}

