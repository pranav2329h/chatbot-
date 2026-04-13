import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { chatAPI } from '../services/api'
import toast from 'react-hot-toast'
import ReactMarkdown from 'react-markdown'

const MODELS = [
  { id: 'gemini-2.0-flash', name: 'Gemini 2.0 Flash', icon: '🔵', color: '#4285F4' },
  { id: 'gpt-4o', name: 'GPT-4o', icon: '🟢', color: '#00A67E' },
  { id: 'claude-3-5-sonnet-20241022', name: 'Claude 3.5', icon: '🟠', color: '#FF7043' },
]

export default function DebatePage() {
  const [topic, setTopic] = useState('')
  const [model1, setModel1] = useState('gemini-2.0-flash')
  const [model2, setModel2] = useState('gpt-4o')
  const [rounds, setRounds] = useState(3)
  const [debate, setDebate] = useState([])
  const [running, setRunning] = useState(false)
  const [currentRound, setCurrentRound] = useState(0)

  const startDebate = async () => {
    if (!topic.trim()) return toast.error('Enter a debate topic')
    if (model1 === model2) return toast.error('Select two different models')
    setDebate([])
    setRunning(true)
    setCurrentRound(0)

    const debateHistory = []
    const m1Config = MODELS.find(m => m.id === model1)
    const m2Config = MODELS.find(m => m.id === model2)

    for (let round = 0; round < rounds; round++) {
      setCurrentRound(round + 1)

      // Model 1's argument
      let m1Response = ''
      await chatAPI.streamChat({
        messages: [
          ...debateHistory,
          { role: 'user', content: `Debate topic: "${topic}". This is round ${round + 1} of ${rounds}. You are ${m1Config.name} — argue FOR this topic. Be persuasive, logical, and concise (3-4 sentences). ${round > 0 ? 'Counter the previous argument.' : ''}` }
        ],
        model: model1,
        systemPrompt: `You are an AI debater. You MUST always argue in FAVOR of the given topic. Be confident and persuasive.`,
        onChunk: (chunk) => {
          m1Response += chunk
          setDebate(prev => {
            const copy = [...prev]
            if (copy.length > round * 2) {
              copy[round * 2] = { model: model1, modelConfig: m1Config, content: m1Response, round: round + 1, side: 'FOR' }
            } else {
              copy.push({ model: model1, modelConfig: m1Config, content: m1Response, round: round + 1, side: 'FOR' })
            }
            return copy
          })
        },
        onDone: () => {},
        onError: (err) => toast.error(`${m1Config.name} error: ${err}`),
      })

      debateHistory.push({ role: 'user', content: `${m1Config.name} (FOR): ${m1Response}` })
      debateHistory.push({ role: 'assistant', content: 'Noted.' })

      // Model 2's counter-argument
      let m2Response = ''
      await chatAPI.streamChat({
        messages: [
          ...debateHistory,
          { role: 'user', content: `Debate topic: "${topic}". Round ${round + 1}. Counter this argument from ${m1Config.name}: "${m1Response.substring(0, 200)}". You are ${m2Config.name} — argue AGAINST this topic.` }
        ],
        model: model2,
        systemPrompt: `You are an AI debater. You MUST always argue AGAINST the given topic. Be sharp, critical, and persuasive.`,
        onChunk: (chunk) => {
          m2Response += chunk
          setDebate(prev => {
            const copy = [...prev]
            if (copy.length > round * 2 + 1) {
              copy[round * 2 + 1] = { model: model2, modelConfig: m2Config, content: m2Response, round: round + 1, side: 'AGAINST' }
            } else {
              copy.push({ model: model2, modelConfig: m2Config, content: m2Response, round: round + 1, side: 'AGAINST' })
            }
            return copy
          })
        },
        onDone: () => {},
        onError: (err) => toast.error(`${m2Config.name} error: ${err}`),
      })

      debateHistory.push({ role: 'user', content: `${m2Config.name} (AGAINST): ${m2Response}` })
      debateHistory.push({ role: 'assistant', content: 'Noted.' })
    }

    setRunning(false)
    toast.success(`Debate complete! ${rounds} rounds finished.`)
  }

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Header */}
      <div style={{
        padding: '16px 24px',
        borderBottom: '1px solid var(--clr-border)',
        background: 'rgba(10,10,20,0.5)',
        backdropFilter: 'blur(12px)',
        display: 'flex',
        alignItems: 'center',
        gap: 16,
        flexWrap: 'wrap',
      }}>
        <div className="section-header" style={{ margin: 0 }}>
          <div className="section-icon" style={{ background: 'rgba(255,184,0,0.1)' }}>⚔️</div>
          <div>
            <div className="section-title">AI Debate Arena</div>
            <div className="section-subtitle">Watch two AI models argue against each other</div>
          </div>
          <span className="badge badge-new" style={{ marginLeft: 8 }}>UNIQUE FEATURE</span>
        </div>
      </div>

      {/* Config bar */}
      <div style={{
        padding: '16px 24px',
        borderBottom: '1px solid var(--clr-border)',
        background: 'rgba(10,10,20,0.3)',
        display: 'flex',
        gap: 12,
        alignItems: 'flex-end',
        flexWrap: 'wrap',
      }}>
        <div className="form-group" style={{ flex: 3, minWidth: 240 }}>
          <label className="form-label">Debate Topic</label>
          <input
            id="debate-topic"
            className="form-input"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="E.g. AI will replace human creativity"
          />
        </div>
        <div className="form-group" style={{ flex: 1, minWidth: 140 }}>
          <label className="form-label">Model 1 (FOR)</label>
          <select id="debate-model1" className="form-input form-select" value={model1} onChange={(e) => setModel1(e.target.value)}>
            {MODELS.map(m => <option key={m.id} value={m.id}>{m.icon} {m.name}</option>)}
          </select>
        </div>
        <div className="form-group" style={{ flex: 1, minWidth: 140 }}>
          <label className="form-label">Model 2 (AGAINST)</label>
          <select id="debate-model2" className="form-input form-select" value={model2} onChange={(e) => setModel2(e.target.value)}>
            {MODELS.map(m => <option key={m.id} value={m.id}>{m.icon} {m.name}</option>)}
          </select>
        </div>
        <div className="form-group" style={{ minWidth: 100 }}>
          <label className="form-label">Rounds: {rounds}</label>
          <input type="range" min={1} max={5} value={rounds} id="debate-rounds" onChange={(e) => setRounds(Number(e.target.value))} style={{ accentColor: 'var(--clr-primary)', width: '100%' }} />
        </div>
        <button
          id="btn-start-debate"
          onClick={startDebate}
          disabled={running || !topic.trim()}
          className="btn btn-primary"
          style={{ padding: '10px 24px', flexShrink: 0 }}
        >
          {running ? `⚔️ Round ${currentRound}/${rounds}` : '⚔️ Start Debate'}
        </button>
      </div>

      {/* Debate view */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>
        {debate.length === 0 && !running && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 16 }}>
            <div style={{ fontSize: 64 }}>⚔️</div>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 24, color: 'var(--clr-text-muted)' }}>
              The Arena Awaits
            </h2>
            <p style={{ color: 'var(--clr-text-dim)', textAlign: 'center', maxWidth: 400, fontSize: 14 }}>
              Set a topic, pick two AI models, and watch them battle it out in an intellectual debate.
              This unique feature lets you see how different AIs approach the same topic!
            </p>
          </div>
        )}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, maxWidth: 1100, margin: '0 auto' }}>
          {debate.map((entry, i) => {
            const forModel = MODELS.find(m => m.id === model1)
            const isFor = entry.side === 'FOR'
            return (
              <motion.div
                key={i}
                className="card"
                initial={{ opacity: 0, x: isFor ? -20 : 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 }}
                style={{
                  gridColumn: isFor ? 1 : 2,
                  padding: 20,
                  border: `1px solid ${isFor ? 'rgba(124,107,255,0.3)' : 'rgba(255,107,107,0.3)'}`,
                  background: isFor ? 'rgba(124,107,255,0.05)' : 'rgba(255,107,107,0.05)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                  <span style={{ fontSize: 20 }}>{entry.modelConfig.icon}</span>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 13 }}>{entry.modelConfig.name}</div>
                    <div style={{ fontSize: 11, color: isFor ? 'var(--clr-primary)' : 'var(--clr-error)' }}>
                      Round {entry.round} · {entry.side}
                    </div>
                  </div>
                </div>
                <div style={{ fontSize: 14, lineHeight: 1.7, color: 'var(--clr-text)' }}>
                  <ReactMarkdown>{entry.content}</ReactMarkdown>
                </div>
              </motion.div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

