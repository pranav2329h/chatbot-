import { useRef, useState, useEffect, Suspense } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { OrbitControls, Environment, Float, Sphere, MeshDistortMaterial, Text, Stars } from '@react-three/drei'
import { motion, AnimatePresence } from 'framer-motion'
import * as THREE from 'three'
import { chatAPI, audioAPI } from '../services/api'
import toast from 'react-hot-toast'

// ─── 3D Nova Character (Stylized Anime Robot) ─────────────────────────────────
function NovaCharacter({ speaking, emotion, gesture }) {
  const bodyRef = useRef()
  const headRef = useRef()
  const leftArmRef = useRef()
  const rightArmRef = useRef()
  const eyeLeftRef = useRef()
  const eyeRightRef = useRef()
  const glowRef = useRef()
  const t = useRef(0)

  // Color mapping by emotion
  const emotionColors = {
    happy: '#FFD700',
    thinking: '#7C6BFF',
    surprised: '#FF6B6B',
    neutral: '#00D4FF',
    talking: '#00FF88',
  }
  const color = emotionColors[emotion] || '#00D4FF'

  useFrame((state, delta) => {
    t.current += delta
    if (!bodyRef.current) return

    // Idle body sway
    bodyRef.current.position.y = Math.sin(t.current * 1.2) * 0.04
    bodyRef.current.rotation.z = Math.sin(t.current * 0.8) * 0.015

    // Head bob
    if (headRef.current) {
      headRef.current.rotation.y = Math.sin(t.current * 0.5) * 0.1
      if (speaking) {
        headRef.current.rotation.x = Math.sin(t.current * 8) * 0.03
      }
    }

    // Arm gestures
    if (leftArmRef.current && rightArmRef.current) {
      if (gesture === 'wave') {
        rightArmRef.current.rotation.z = -Math.sin(t.current * 4) * 0.4 - 0.8
      } else if (gesture === 'point') {
        rightArmRef.current.rotation.x = -0.6
        rightArmRef.current.rotation.z = -0.3
      } else if (gesture === 'thinking') {
        rightArmRef.current.rotation.x = -0.4
        rightArmRef.current.rotation.z = 0.6
      } else {
        // Natural swing
        leftArmRef.current.rotation.x = Math.sin(t.current * 1.2) * 0.08
        rightArmRef.current.rotation.x = -Math.sin(t.current * 1.2) * 0.08
        leftArmRef.current.rotation.z = 0.15
        rightArmRef.current.rotation.z = -0.15
      }
    }

    // Glow pulse
    if (glowRef.current) {
      glowRef.current.scale.setScalar(1 + Math.sin(t.current * 2) * 0.05)
    }

    // Eye blink
    if (eyeLeftRef.current && eyeRightRef.current) {
      const blink = Math.sin(t.current * 0.4) > 0.97
      const eyeScaleY = blink ? 0.1 : 1
      eyeLeftRef.current.scale.y = THREE.MathUtils.lerp(eyeLeftRef.current.scale.y, eyeScaleY, 0.3)
      eyeRightRef.current.scale.y = THREE.MathUtils.lerp(eyeRightRef.current.scale.y, eyeScaleY, 0.3)
    }
  })

  return (
    <group ref={bodyRef}>
      {/* Ambient glow */}
      <mesh ref={glowRef} position={[0, 0, -0.5]}>
        <sphereGeometry args={[1.2, 16, 16]} />
        <meshBasicMaterial color={color} transparent opacity={0.04} />
      </mesh>

      {/* Torso */}
      <mesh position={[0, 0, 0]}>
        <boxGeometry args={[0.7, 0.9, 0.4]} />
        <meshStandardMaterial color="#1a1a3e" metalness={0.8} roughness={0.2} />
      </mesh>

      {/* Chest panel glow */}
      <mesh position={[0, 0.1, 0.21]}>
        <boxGeometry args={[0.3, 0.3, 0.01]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={1.5} />
      </mesh>

      {/* Head */}
      <group ref={headRef} position={[0, 0.75, 0]}>
        <mesh>
          <boxGeometry args={[0.6, 0.6, 0.5]} />
          <meshStandardMaterial color="#1a1a3e" metalness={0.9} roughness={0.1} />
        </mesh>

        {/* Eyes */}
        <mesh ref={eyeLeftRef} position={[-0.15, 0.05, 0.26]}>
          <boxGeometry args={[0.12, 0.1, 0.01]} />
          <meshStandardMaterial color={color} emissive={color} emissiveIntensity={2} />
        </mesh>
        <mesh ref={eyeRightRef} position={[0.15, 0.05, 0.26]}>
          <boxGeometry args={[0.12, 0.1, 0.01]} />
          <meshStandardMaterial color={color} emissive={color} emissiveIntensity={2} />
        </mesh>

        {/* Mouth — animates when speaking */}
        <mesh position={[0, -0.1, 0.26]}>
          <boxGeometry args={[speaking ? 0.14 : 0.08, speaking ? 0.06 : 0.03, 0.01]} />
          <meshStandardMaterial color={color} emissive={color} emissiveIntensity={1.5} />
        </mesh>

        {/* Antennas */}
        <mesh position={[-0.15, 0.38, 0]}>
          <cylinderGeometry args={[0.02, 0.02, 0.24, 8]} />
          <meshStandardMaterial color="#2a2a5a" metalness={0.9} />
        </mesh>
        <mesh position={[-0.15, 0.5, 0]}>
          <sphereGeometry args={[0.04, 8, 8]} />
          <meshStandardMaterial color={color} emissive={color} emissiveIntensity={2} />
        </mesh>
        <mesh position={[0.15, 0.38, 0]}>
          <cylinderGeometry args={[0.02, 0.02, 0.2, 8]} />
          <meshStandardMaterial color="#2a2a5a" metalness={0.9} />
        </mesh>
        <mesh position={[0.15, 0.48, 0]}>
          <sphereGeometry args={[0.03, 8, 8]} />
          <meshStandardMaterial color={color} emissive={color} emissiveIntensity={2} />
        </mesh>
      </group>

      {/* Left arm */}
      <group ref={leftArmRef} position={[-0.5, 0.1, 0]}>
        <mesh position={[0, -0.25, 0]}>
          <capsuleGeometry args={[0.1, 0.4, 4, 8]} />
          <meshStandardMaterial color="#141430" metalness={0.8} roughness={0.2} />
        </mesh>
        <mesh position={[0, -0.55, 0]}>
          <sphereGeometry args={[0.12, 8, 8]} />
          <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.5} />
        </mesh>
      </group>

      {/* Right arm */}
      <group ref={rightArmRef} position={[0.5, 0.1, 0]}>
        <mesh position={[0, -0.25, 0]}>
          <capsuleGeometry args={[0.1, 0.4, 4, 8]} />
          <meshStandardMaterial color="#141430" metalness={0.8} roughness={0.2} />
        </mesh>
        <mesh position={[0, -0.55, 0]}>
          <sphereGeometry args={[0.12, 8, 8]} />
          <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.5} />
        </mesh>
      </group>

      {/* Legs */}
      {[-0.2, 0.2].map((x, i) => (
        <group key={i} position={[x, -0.65, 0]}>
          <mesh position={[0, -0.3, 0]}>
            <capsuleGeometry args={[0.12, 0.45, 4, 8]} />
            <meshStandardMaterial color="#141430" metalness={0.8} roughness={0.2} />
          </mesh>
          <mesh position={[0, -0.6, 0.08]}>
            <boxGeometry args={[0.2, 0.14, 0.3]} />
            <meshStandardMaterial color="#1a1a3e" metalness={0.9} />
          </mesh>
        </group>
      ))}

      {/* Floating particles */}
      {speaking && [
        [0.4, 0.9, 0.2],
        [-0.5, 1.1, 0.1],
        [0.2, 1.3, -0.1],
      ].map(([px, py, pz], i) => (
        <mesh key={i} position={[px, py, pz]}>
          <sphereGeometry args={[0.03, 6, 6]} />
          <meshBasicMaterial color={color} transparent opacity={0.8} />
        </mesh>
      ))}

      {/* Name text */}
      <Text
        position={[0, -1.4, 0]}
        fontSize={0.18}
        color={color}
        fontWeight="bold"
        anchorX="center"
        anchorY="middle"
      >
        NOVA
      </Text>
    </group>
  )
}

function Scene({ speaking, emotion, gesture }) {
  return (
    <>
      <ambientLight intensity={0.3} />
      <directionalLight position={[2, 4, 2]} intensity={0.8} />
      <pointLight position={[0, 2, 2]} intensity={1} color="#7C6BFF" />
      <pointLight position={[-2, -1, -1]} intensity={0.5} color="#00D4FF" />

      <Stars radius={50} depth={20} count={300} factor={2} fade />

      <Float speed={1.5} rotationIntensity={0.1} floatIntensity={0.3}>
        <NovaCharacter speaking={speaking} emotion={emotion} gesture={gesture} />
      </Float>

      {/* Ground ring */}
      <mesh position={[0, -1.8, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[1.2, 1.6, 32]} />
        <meshBasicMaterial color="#7C6BFF" transparent opacity={0.15} />
      </mesh>

      <Environment preset="night" />
    </>
  )
}

// ─── NOVA Page ─────────────────────────────────────────────────────────────────
export default function NovaPage() {
  const [message, setMessage] = useState('')
  const [novaText, setNovaText] = useState('Hi! I\'m NOVA, your personal AI companion. I\'m here to assist you with anything. Just talk to me! 🌟')
  const [speaking, setSpeaking] = useState(false)
  const [emotion, setEmotion] = useState('neutral')
  const [gesture, setGesture] = useState('idle')
  const [loading, setLoading] = useState(false)
  const [listening, setListening] = useState(false)
  const [conversation, setConversation] = useState([
    { role: 'assistant', content: 'Hi! I\'m NOVA, your personal AI companion. I\'m here to assist you with anything. Just talk to me! 🌟' }
  ])
  const recognitionRef = useRef(null)
  const audioRef = useRef(null)

  // Web Speech API
  const startListening = () => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      toast.error('Speech recognition not supported in this browser')
      return
    }
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    recognitionRef.current = new SpeechRecognition()
    recognitionRef.current.continuous = false
    recognitionRef.current.interimResults = false
    recognitionRef.current.lang = 'en-US'
    recognitionRef.current.onresult = (e) => {
      const transcript = e.results[0][0].transcript
      setMessage(transcript)
      setListening(false)
    }
    recognitionRef.current.onerror = () => setListening(false)
    recognitionRef.current.onend = () => setListening(false)
    recognitionRef.current.start()
    setListening(true)
  }

  const sendToNova = async () => {
    if (!message.trim() || loading) return
    const userMsg = message.trim()
    setMessage('')
    setLoading(true)
    setEmotion('thinking')
    setGesture('thinking')

    const newConvo = [...conversation, { role: 'user', content: userMsg }]
    setConversation(newConvo)

    let fullResponse = ''

    await chatAPI.streamChat({
      messages: newConvo,
      model: 'gemini-2.0-flash',
      systemPrompt: 'You are NOVA, a friendly, expressive, and playful 3D anime-style AI companion. You are enthusiastic, kind, and use occasional emojis to express yourself. Keep responses concise (2-4 sentences) since they will be spoken aloud.',
      onChunk: (chunk) => {
        fullResponse += chunk
        setNovaText(fullResponse)
      },
      onDone: async () => {
        setConversation(prev => [...prev, { role: 'assistant', content: fullResponse }])
        
        // Detect emotion from response
        if (fullResponse.includes('!') || fullResponse.includes('😊') || fullResponse.includes('🌟')) {
          setEmotion('happy')
          setGesture('wave')
        } else if (fullResponse.includes('?')) {
          setEmotion('thinking')
          setGesture('thinking')
        } else {
          setEmotion('talking')
          setGesture('idle')
        }

        // 100% Free Text to speech via Browser Native API
        setSpeaking(true)
        try {
          window.speechSynthesis.cancel() // Stop any current speech
          const utterance = new SpeechSynthesisUtterance(fullResponse.substring(0, 300))
          utterance.lang = 'en-US'
          utterance.pitch = 1.2
          utterance.rate = 1.0
          
          // Try to find a female voice
          const voices = window.speechSynthesis.getVoices()
          const femaleVoice = voices.find(v => v.name.includes('Female') || v.name.includes('Google UK English Female') || v.name.includes('Zira') || v.name.includes('Samantha') || v.name.includes('Karen'))
          if (femaleVoice) {
            utterance.voice = femaleVoice
          }

          utterance.onend = () => {
            setSpeaking(false)
            setEmotion('neutral')
            setGesture('idle')
          }
          utterance.onerror = () => {
            setSpeaking(false)
            setEmotion('neutral')
          }
          
          window.speechSynthesis.speak(utterance)
        } catch {
          setSpeaking(false)
          setEmotion('neutral')
        }
        setLoading(false)
      },
      onError: (err) => {
        toast.error('NOVA encountered an error')
        setLoading(false)
        setEmotion('neutral')
      }
    })
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendToNova()
    }
  }

  return (
    <div style={{
      height: '100vh',
      display: 'grid',
      gridTemplateColumns: '1fr 420px',
      overflow: 'hidden',
    }}>
      {/* 3D Canvas */}
      <div style={{
        position: 'relative',
        background: 'linear-gradient(to bottom, #060610, #0a0a1a)',
      }}>
        <Canvas camera={{ position: [0, 0, 3.5], fov: 50 }}>
          <Suspense fallback={null}>
            <Scene speaking={speaking} emotion={emotion} gesture={gesture} />
          </Suspense>
          <OrbitControls
            enablePan={false}
            minDistance={2}
            maxDistance={6}
            maxPolarAngle={Math.PI / 1.5}
          />
        </Canvas>

        {/* Emotion indicator */}
        <div style={{
          position: 'absolute',
          top: 20, left: 20,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          background: 'rgba(10,10,20,0.8)',
          border: '1px solid var(--clr-border)',
          borderRadius: 20,
          padding: '6px 14px',
          backdropFilter: 'blur(10px)',
        }}>
          <div style={{
            width: 8, height: 8,
            borderRadius: '50%',
            background: emotion === 'happy' ? '#FFD700' : emotion === 'thinking' ? 'var(--clr-primary)' : 'var(--clr-accent)',
            boxShadow: `0 0 8px ${emotion === 'happy' ? '#FFD700' : 'var(--clr-accent)'}`,
          }} />
          <span style={{ fontSize: 12, color: 'var(--clr-text-muted)', textTransform: 'capitalize' }}>
            {speaking ? 'Speaking' : loading ? 'Thinking...' : emotion}
          </span>
        </div>

        {/* AR Mode badge */}
        <div style={{
          position: 'absolute',
          top: 20, right: 20,
          background: 'rgba(10,10,20,0.8)',
          border: '1px solid rgba(124,107,255,0.3)',
          borderRadius: 12,
          padding: '6px 14px',
          backdropFilter: 'blur(10px)',
        }}>
          <span className="badge badge-new">3D Interactive</span>
        </div>

        {/* Drag hint */}
        <div style={{
          position: 'absolute',
          bottom: 16, left: '50%',
          transform: 'translateX(-50%)',
          color: 'var(--clr-text-dim)',
          fontSize: 12,
        }}>
          🖱️ Drag to rotate · Scroll to zoom
        </div>
      </div>

      {/* Chat Panel */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        borderLeft: '1px solid var(--clr-border)',
        background: 'rgba(10,10,20,0.5)',
        backdropFilter: 'blur(20px)',
      }}>
        {/* Header */}
        <div style={{
          padding: '16px 20px',
          borderBottom: '1px solid var(--clr-border)',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
        }}>
          <div style={{
            width: 44, height: 44,
            borderRadius: '50%',
            background: 'linear-gradient(135deg, var(--clr-primary), var(--clr-accent))',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 22,
            boxShadow: '0 0 20px var(--clr-primary-glow)',
          }}>🤖</div>
          <div>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 18 }}>NOVA</div>
            <div style={{ fontSize: 12, color: 'var(--clr-success)' }}>● Online — Your AI Companion</div>
          </div>
        </div>

        {/* NOVA's speech bubble */}
        <div style={{ padding: '16px 20px' }}>
          <AnimatePresence mode="wait">
            <motion.div
              key={novaText.substring(0, 20)}
              className="nova-bubble"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              style={{ maxHeight: 120 }}
            >
              {novaText}
              {loading && <span className="pulse" style={{ display: 'inline-block', marginLeft: 4 }}>...</span>}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Conversation history */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '0 20px' }}>
          {conversation.slice(-10).map((msg, i) => (
            <div key={i} style={{
              marginBottom: 12,
              display: 'flex',
              flexDirection: msg.role === 'user' ? 'row-reverse' : 'row',
              gap: 8,
              alignItems: 'flex-end',
            }}>
              <div style={{
                maxWidth: '80%',
                padding: '8px 12px',
                borderRadius: msg.role === 'user' ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                background: msg.role === 'user' ? 'var(--clr-primary)' : 'var(--clr-card)',
                border: msg.role === 'assistant' ? '1px solid var(--clr-border)' : 'none',
                fontSize: 13,
                lineHeight: 1.5,
              }}>
                {msg.content}
              </div>
            </div>
          ))}
        </div>

        {/* Input area */}
        <div style={{ padding: '16px 20px', borderTop: '1px solid var(--clr-border)' }}>
          <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
            {/* Quick gestures */}
            {[
              { label: '👋', action: 'wave', tip: 'Wave' },
              { label: '🤔', action: 'thinking', tip: 'Think' },
              { label: '👉', action: 'point', tip: 'Point' },
            ].map(({ label, action, tip }) => (
              <button
                key={action}
                id={`nova-gesture-${action}`}
                onClick={() => setGesture(action)}
                className="btn btn-ghost btn-sm"
                title={tip}
                style={{ padding: '6px 10px', fontSize: 16 }}
              >
                {label}
              </button>
            ))}
            <div style={{ flex: 1 }} />
            <button
              id="btn-nova-listen"
              onClick={startListening}
              className={`btn ${listening ? 'btn-primary' : 'btn-secondary'} btn-sm`}
            >
              {listening ? '🔴 Listening...' : '🎤 Speak'}
            </button>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              id="nova-input"
              type="text"
              className="form-input"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Talk to NOVA..."
              style={{ flex: 1 }}
            />
            <button
              id="btn-nova-send"
              onClick={sendToNova}
              disabled={!message.trim() || loading}
              className="btn btn-primary"
            >
              Send
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

