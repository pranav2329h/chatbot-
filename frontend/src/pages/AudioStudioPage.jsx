import { useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { audioAPI } from '../services/api'
import toast from 'react-hot-toast'

const VOICES = {
  openai: ['alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer'],
  elevenlabs: [
    { key: 'nova', name: 'Nova', desc: 'Young, energetic female' },
    { key: 'aria', name: 'Aria', desc: 'Warm, professional female' },
    { key: 'roger', name: 'Roger', desc: 'Confident, articulate male' },
    { key: 'bill', name: 'Bill', desc: 'Deep, trustworthy male' },
  ],
}

const EMOTIONS = ['neutral', 'happy', 'sad', 'excited', 'calm', 'angry']

function Waveform({ active }) {
  return (
    <div className="waveform" style={{ opacity: active ? 1 : 0.3 }}>
      {[...Array(16)].map((_, i) => (
        <div
          key={i}
          className="waveform-bar"
          style={{
            height: active ? undefined : 4,
            animationPlayState: active ? 'running' : 'paused',
            animationDelay: `${(i % 8) * 0.1}s`,
          }}
        />
      ))}
    </div>
  )
}

export default function AudioStudioPage() {
  const [text, setText] = useState('')
  const [provider, setProvider] = useState('openai')
  const [voice, setVoice] = useState('nova')
  const [emotion, setEmotion] = useState('neutral')
  const [loading, setLoading] = useState(false)
  const [audioUrl, setAudioUrl] = useState(null)
  const [playing, setPlaying] = useState(false)
  const audioRef = useRef(null)

  const [activeTab, setActiveTab] = useState('tts') // tts | music | clone

  const generateTTS = async () => {
    if (!text.trim()) return toast.error('Enter text first')
    setLoading(true)
    try {
      const res = await audioAPI.tts({ text, provider, voice, emotion })
      const blob = new Blob([res.data], { type: 'audio/mpeg' })
      const url = URL.createObjectURL(blob)
      setAudioUrl(url)
      toast.success('Audio generated! 🎵')
    } catch (e) {
      toast.error(e.response?.data?.error || 'TTS failed')
    } finally {
      setLoading(false)
    }
  }

  const togglePlay = () => {
    if (!audioRef.current) return
    if (playing) {
      audioRef.current.pause()
      setPlaying(false)
    } else {
      audioRef.current.play()
      setPlaying(true)
    }
  }

  return (
    <div className="studio-grid" style={{ padding: '24px' }}>
      {/* Control Panel */}
      <div className="studio-panel">
        <div className="section-header">
          <div className="section-icon" style={{ background: 'rgba(0, 212, 255, 0.1)' }}>🎵</div>
          <div>
            <div className="section-title">Audio Studio</div>
            <div className="section-subtitle">AI voice & music generation</div>
          </div>
        </div>

        {/* Tab switcher */}
        <div style={{ display: 'flex', gap: 4, background: 'var(--clr-surface)', borderRadius: 12, padding: 4 }}>
          {['tts', 'music', 'clone'].map(tab => (
            <button
              key={tab}
              id={`audio-tab-${tab}`}
              onClick={() => setActiveTab(tab)}
              style={{
                flex: 1,
                padding: '8px 0',
                borderRadius: 8,
                border: 'none',
                background: activeTab === tab ? 'var(--clr-card)' : 'transparent',
                color: activeTab === tab ? 'var(--clr-text)' : 'var(--clr-text-muted)',
                fontWeight: activeTab === tab ? 600 : 400,
                cursor: 'pointer',
                fontSize: 13,
                transition: 'all 0.2s ease',
                fontFamily: 'var(--font-body)',
              }}
            >
              {tab === 'tts' ? '🗣️ TTS' : tab === 'music' ? '🎼 Music' : '🎤 Clone'}
            </button>
          ))}
        </div>

        {activeTab === 'tts' && (
          <>
            {/* Text */}
            <div className="form-group">
              <label className="form-label">Text to speak</label>
              <textarea
                id="tts-text"
                className="form-input form-textarea"
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Enter text to convert to speech..."
                style={{ minHeight: 120 }}
              />
            </div>

            {/* Provider */}
            <div className="form-group">
              <label className="form-label">Provider</label>
              <div style={{ display: 'flex', gap: 8 }}>
                {['openai', 'elevenlabs'].map(p => (
                  <button
                    key={p}
                    id={`provider-${p}`}
                    onClick={() => { setProvider(p); setVoice(p === 'openai' ? 'nova' : 'nova') }}
                    className={`model-chip ${provider === p ? 'active' : ''}`}
                    style={{ flex: 1 }}
                  >
                    {p === 'openai' ? '🟢 OpenAI TTS' : '🟠 ElevenLabs'}
                  </button>
                ))}
              </div>
            </div>

            {/* Voice */}
            <div className="form-group">
              <label className="form-label">Voice</label>
              {provider === 'openai' ? (
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {VOICES.openai.map(v => (
                    <button key={v} id={`voice-${v}`} onClick={() => setVoice(v)} className={`model-chip ${voice === v ? 'active' : ''}`}>{v}</button>
                  ))}
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {VOICES.elevenlabs.map(v => (
                    <button
                      key={v.key}
                      id={`voice-el-${v.key}`}
                      onClick={() => setVoice(v.key)}
                      style={{
                        padding: '10px 12px',
                        borderRadius: 8,
                        border: `1px solid ${voice === v.key ? 'var(--clr-primary)' : 'var(--clr-border)'}`,
                        background: voice === v.key ? 'rgba(124,107,255,0.1)' : 'var(--clr-surface)',
                        cursor: 'pointer',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'flex-start',
                        fontFamily: 'var(--font-body)',
                      }}
                    >
                      <span style={{ fontWeight: 600, color: 'var(--clr-text)', fontSize: 13 }}>{v.name}</span>
                      <span style={{ color: 'var(--clr-text-muted)', fontSize: 11 }}>{v.desc}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Emotion (unique feature) */}
            <div className="form-group">
              <label className="form-label">
                🆕 Emotional Tone
                <span className="badge badge-new" style={{ marginLeft: 8 }}>UNIQUE</span>
              </label>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {EMOTIONS.map(e => (
                  <button key={e} id={`emotion-${e}`} onClick={() => setEmotion(e)} className={`model-chip ${emotion === e ? 'active' : ''}`}>
                    {e === 'happy' ? '😊' : e === 'sad' ? '😢' : e === 'excited' ? '🤩' : e === 'calm' ? '😌' : e === 'angry' ? '😤' : '😐'} {e}
                  </button>
                ))}
              </div>
            </div>

            <button
              id="btn-generate-audio"
              onClick={generateTTS}
              disabled={loading || !text.trim()}
              className="btn btn-primary btn-lg"
              style={{ width: '100%' }}
            >
              {loading ? (
                <><div className="spinner" style={{ width: 18, height: 18, borderWidth: 2 }} /> Generating...</>
              ) : '🎵 Generate Audio'}
            </button>
          </>
        )}

        {activeTab === 'music' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16, alignItems: 'center', padding: '20px 0' }}>
            <div style={{ fontSize: 48 }}>🎼</div>
            <h3 style={{ fontFamily: 'var(--font-display)', color: 'var(--clr-text)' }}>AI Music Generation</h3>
            <p style={{ color: 'var(--clr-text-muted)', fontSize: 14, textAlign: 'center' }}>
              Configure Suno AI or Udio API keys in your backend .env to enable music generation.
            </p>
            <div className="badge badge-new">Coming Soon</div>
          </div>
        )}

        {activeTab === 'clone' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16, alignItems: 'center', padding: '20px 0' }}>
            <div style={{ fontSize: 48 }}>🎤</div>
            <h3 style={{ fontFamily: 'var(--font-display)', color: 'var(--clr-text)' }}>Voice Cloning</h3>
            <p style={{ color: 'var(--clr-text-muted)', fontSize: 14, textAlign: 'center' }}>
              Upload a voice sample and clone it with ElevenLabs. Requires ElevenLabs API key.
            </p>
            <div className="badge badge-accent">ElevenLabs Required</div>
          </div>
        )}
      </div>

      {/* Preview Canvas */}
      <div className="studio-canvas" style={{ flexDirection: 'column', gap: 32 }}>
        <AnimatePresence>
          {audioUrl ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 32,
                padding: 40,
                width: '100%',
              }}
            >
              {/* Visual */}
              <div style={{
                width: 160, height: 160,
                borderRadius: '50%',
                background: 'linear-gradient(135deg, var(--clr-primary), var(--clr-accent))',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: playing ? '0 0 60px var(--clr-primary-glow)' : 'none',
                cursor: 'pointer',
                fontSize: 60,
                transition: 'all 0.3s ease',
                animation: playing ? 'pulse 2s infinite' : 'none',
              }} onClick={togglePlay}>
                {playing ? '⏸' : '▶'}
              </div>

              <Waveform active={playing} />

              <audio
                ref={audioRef}
                src={audioUrl}
                onEnded={() => setPlaying(false)}
                onPlay={() => setPlaying(true)}
                onPause={() => setPlaying(false)}
              />

              <div style={{ display: 'flex', gap: 12 }}>
                <button onClick={togglePlay} className="btn btn-primary">
                  {playing ? '⏸ Pause' : '▶ Play'}
                </button>
                <a href={audioUrl} download="nexus-audio.mp3" className="btn btn-secondary">
                  ⬇️ Download
                </a>
              </div>
            </motion.div>
          ) : (
            <motion.div className="image-placeholder" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <div style={{ fontSize: 72 }}>🎵</div>
              <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 20, color: 'var(--clr-text-muted)' }}>
                Audio appears here
              </h3>
              <p style={{ fontSize: 14, color: 'var(--clr-text-dim)', maxWidth: 280, textAlign: 'center' }}>
                Enter text, select a voice and emotion, then generate
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}

