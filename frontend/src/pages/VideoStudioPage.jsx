import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { videoAPI } from '../services/api'
import toast from 'react-hot-toast'

const VIDEO_MODELS = [
  { id: 'luma', name: 'Luma Dream Machine', icon: '🌙', badge: 'Luma AI' },
  { id: 'runway', name: 'Runway Gen-3', icon: '🚀', badge: 'RunwayML' },
]

export default function VideoStudioPage() {
  const [prompt, setPrompt] = useState('')
  const [model, setModel] = useState('luma')
  const [job, setJob] = useState(null)
  const [loading, setLoading] = useState(false)
  const [polling, setPolling] = useState(false)
  const [videoUrl, setVideoUrl] = useState(null)

  const generate = async () => {
    if (!prompt.trim()) return toast.error('Enter a prompt')
    setLoading(true)
    setJob(null)
    setVideoUrl(null)
    try {
      const res = await videoAPI.generate({ prompt, model })
      setJob(res.data)
      toast.success('Video generation started! Polling for result...')
      pollStatus(res.data.id)
    } catch (e) {
      toast.error(e.response?.data?.error || 'Generation failed')
    } finally {
      setLoading(false)
    }
  }

  const pollStatus = async (jobId) => {
    setPolling(true)
    const interval = setInterval(async () => {
      try {
        const res = await videoAPI.getStatus(jobId)
        setJob(res.data)
        if (res.data.status === 'completed' && res.data.videoUrl) {
          setVideoUrl(res.data.videoUrl)
          clearInterval(interval)
          setPolling(false)
          toast.success('Video ready! 🎬')
        }
      } catch (e) {
        clearInterval(interval)
        setPolling(false)
      }
    }, 5000)
  }

  return (
    <div className="studio-grid" style={{ padding: '24px' }}>
      {/* Control Panel */}
      <div className="studio-panel">
        <div className="section-header">
          <div className="section-icon" style={{ background: 'rgba(255, 107, 107, 0.1)' }}>🎬</div>
          <div>
            <div className="section-title">Video Studio</div>
            <div className="section-subtitle">AI text-to-video generation</div>
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">AI Model</label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {VIDEO_MODELS.map((m) => (
              <button
                key={m.id}
                id={`video-model-${m.id}`}
                onClick={() => setModel(m.id)}
                style={{
                  padding: '12px 14px',
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
                <span style={{ fontSize: 24 }}>{m.icon}</span>
                <div style={{ textAlign: 'left' }}>
                  <div style={{ fontWeight: 600, color: 'var(--clr-text)', fontSize: 14 }}>{m.name}</div>
                  <div style={{ fontSize: 12, color: 'var(--clr-text-muted)' }}>{m.badge}</div>
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">Video Prompt</label>
          <textarea
            id="video-prompt"
            className="form-input form-textarea"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Describe your video... E.g. 'A futuristic city at night with flying cars and neon lights'"
            style={{ minHeight: 120 }}
          />
        </div>

        <div className="card card-gradient" style={{ padding: '14px', borderRadius: 12 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--clr-primary)', marginBottom: 6 }}>
            💡 Pro Tips
          </div>
          <ul style={{ color: 'var(--clr-text-muted)', fontSize: 12, lineHeight: 1.8, paddingLeft: 16 }}>
            <li>Include camera movement (pan, zoom, dolly)</li>
            <li>Specify lighting conditions</li>
            <li>Video takes 1-5 minutes to generate</li>
            <li>Requires Luma AI or Runway API key</li>
          </ul>
        </div>

        {job && (
          <div style={{
            padding: '12px 14px',
            background: 'rgba(0,212,255,0.08)',
            border: '1px solid rgba(0,212,255,0.2)',
            borderRadius: 10,
            fontSize: 13,
          }}>
            <div style={{ color: 'var(--clr-accent)', fontWeight: 600, marginBottom: 4 }}>
              {polling ? '⏳ Processing...' : job.status === 'completed' ? '✅ Completed' : '🔄 ' + job.status}
            </div>
            <div style={{ color: 'var(--clr-text-muted)' }}>Job ID: {job.id.substring(0, 16)}...</div>
          </div>
        )}

        <button
          id="btn-generate-video"
          onClick={generate}
          disabled={loading || polling || !prompt.trim()}
          className="btn btn-primary btn-lg"
          style={{ width: '100%' }}
        >
          {loading || polling ? (
            <><div className="spinner" style={{ width: 18, height: 18, borderWidth: 2 }} /> {polling ? 'Processing...' : 'Starting...'}</>
          ) : '🎬 Generate Video'}
        </button>
      </div>

      {/* Video Canvas */}
      <div className="studio-canvas">
        <AnimatePresence>
          {videoUrl ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              style={{ width: '100%', height: '100%', position: 'relative' }}
            >
              <video
                src={videoUrl}
                controls
                autoPlay
                loop
                style={{ width: '100%', height: '100%', objectFit: 'contain', borderRadius: 'var(--radius-xl)' }}
              />
              <div style={{ position: 'absolute', bottom: 16, right: 16 }}>
                <a href={videoUrl} download="nexus-video.mp4" className="btn btn-secondary glass btn-sm">
                  ⬇️ Download
                </a>
              </div>
            </motion.div>
          ) : (
            <motion.div className="image-placeholder" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              {polling ? (
                <>
                  <div style={{ fontSize: 72 }}>⏳</div>
                  <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 20, color: 'var(--clr-text-muted)' }}>
                    Generating your video...
                  </h3>
                  <p style={{ fontSize: 14, color: 'var(--clr-text-dim)', textAlign: 'center' }}>
                    This can take 1-5 minutes. We'll notify you when it's ready.
                  </p>
                  <div className="spinner" style={{ width: 36, height: 36 }} />
                </>
              ) : (
                <>
                  <div style={{ fontSize: 72 }}>🎬</div>
                  <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 20, color: 'var(--clr-text-muted)' }}>
                    Your video appears here
                  </h3>
                  <p style={{ fontSize: 14, color: 'var(--clr-text-dim)', maxWidth: 280, textAlign: 'center' }}>
                    Describe a scene and generate an AI video
                  </p>
                </>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}

