import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import ReactMarkdown from 'react-markdown'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism'
import TextareaAutosize from 'react-textarea-autosize'
import { chatAPI } from '../services/api'
import useChatStore from '../store/chatStore'
import toast from 'react-hot-toast'

const MODELS = [
  { id: 'pollinations-text', name: 'Nexus Free AI', icon: '⚡', provider: 'pollinations' },
  { id: 'gemini-2.0-flash', name: 'Gemini 2.0 Flash', icon: '🔵', provider: 'google' },
  { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro', icon: '🔷', provider: 'google' },
  { id: 'gpt-4o', name: 'GPT-4o', icon: '🟢', provider: 'openai' },
  { id: 'gpt-4o-mini', name: 'GPT-4o Mini', icon: '🟩', provider: 'openai' },
  { id: 'claude-3-5-sonnet-20241022', name: 'Claude 3.5', icon: '🟠', provider: 'anthropic' },
]

function TypingIndicator() {
  return (
    <div className="chat-message">
      <div className="chat-avatar ai">⚡</div>
      <div className="chat-bubble ai">
        <div className="typing-indicator">
          <div className="typing-dot" />
          <div className="typing-dot" />
          <div className="typing-dot" />
        </div>
      </div>
    </div>
  )
}

function CodeBlock({ language, children }) {
  const [copied, setCopied] = useState(false)
  const copy = () => {
    navigator.clipboard.writeText(children)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  return (
    <div className="code-block">
      <div className="code-block-header">
        <span>{language || 'code'}</span>
        <button onClick={copy} className="btn btn-ghost btn-sm" style={{ padding: '2px 8px', fontSize: 11 }}>
          {copied ? '✓ Copied' : 'Copy'}
        </button>
      </div>
      <SyntaxHighlighter
        language={language}
        style={oneDark}
        customStyle={{ margin: 0, background: 'transparent', padding: '16px', fontSize: 13 }}
      >
        {children}
      </SyntaxHighlighter>
    </div>
  )
}

function MessageBubble({ message }) {
  const isUser = message.role === 'user'
  return (
    <motion.div
      className={`chat-message ${isUser ? 'user' : ''}`}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className={`chat-avatar ${isUser ? 'user' : 'ai'}`}>
        {isUser ? '👤' : '⚡'}
      </div>
      <div className={`chat-bubble ${isUser ? 'user' : 'ai'}`}>
        {isUser ? (
          <span style={{ whiteSpace: 'pre-wrap' }}>{message.content}</span>
        ) : (
          <ReactMarkdown
            components={{
              code({ node, inline, className, children, ...props }) {
                const match = /language-(\w+)/.exec(className || '')
                return !inline && match ? (
                  <CodeBlock language={match[1]}>{String(children).replace(/\n$/, '')}</CodeBlock>
                ) : (
                  <code style={{
                    background: 'rgba(124,107,255,0.15)',
                    padding: '2px 6px',
                    borderRadius: 4,
                    fontFamily: 'var(--font-mono)',
                    fontSize: '0.9em',
                    color: 'var(--clr-accent)',
                    wordBreak: 'break-word',
                    whiteSpace: 'pre-wrap'
                  }} {...props}>{children}</code>
                )
              },
              p: ({ children }) => <p style={{ marginBottom: 8 }}>{children}</p>,
              ul: ({ children }) => <ul style={{ paddingLeft: 20, marginBottom: 8 }}>{children}</ul>,
              ol: ({ children }) => <ol style={{ paddingLeft: 20, marginBottom: 8 }}>{children}</ol>,
              li: ({ children }) => <li style={{ marginBottom: 4 }}>{children}</li>,
              h1: ({ children }) => <h1 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8, color: 'var(--clr-text)' }}>{children}</h1>,
              h2: ({ children }) => <h2 style={{ fontSize: 17, fontWeight: 700, marginBottom: 6 }}>{children}</h2>,
              h3: ({ children }) => <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 4 }}>{children}</h3>,
              blockquote: ({ children }) => (
                <blockquote style={{
                  borderLeft: '3px solid var(--clr-primary)',
                  paddingLeft: 12,
                  margin: '8px 0',
                  color: 'var(--clr-text-muted)',
                  fontStyle: 'italic',
                }}>{children}</blockquote>
              ),
              table: ({ children }) => (
                <div style={{ overflowX: 'auto', margin: '8px 0' }}>
                  <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: 13 }}>{children}</table>
                </div>
              ),
              th: ({ children }) => (
                <th style={{ padding: '8px 12px', background: 'rgba(124,107,255,0.1)', borderBottom: '1px solid var(--clr-border)', textAlign: 'left', fontWeight: 600 }}>{children}</th>
              ),
              td: ({ children }) => (
                <td style={{ padding: '8px 12px', borderBottom: '1px solid var(--clr-border)' }}>{children}</td>
              ),
            }}
          >
            {message.content}
          </ReactMarkdown>
        )}
        <div style={{ fontSize: 11, color: 'var(--clr-text-dim)', marginTop: 6, display: 'flex', gap: 8 }}>
          {!isUser && message.model && <span>{MODELS.find(m => m.id === message.model)?.icon} {MODELS.find(m => m.id === message.model)?.name}</span>}
          <span>{new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
        </div>
      </div>
    </motion.div>
  )
}

export default function ChatPage() {
  const {
    sessions, activeSessionId, messages, streamingMessage, isStreaming,
    selectedModel, systemPrompt,
    setModel, addSession, setActiveSession, addMessage,
    setStreamingMessage, setIsStreaming, appendToStream, finalizeStream,
    getActiveMessages,
  } = useChatStore()

  const [input, setInput] = useState('')
  const [searchEnabled, setSearchEnabled] = useState(false)
  const messagesEndRef = useRef(null)
  const inputRef = useRef(null)

  const activeMessages = getActiveMessages()

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(scrollToBottom, [activeMessages, streamingMessage])

  const createNewSession = useCallback(async () => {
    const session = {
      id: `session_${Date.now()}`,
      title: 'New Chat',
      model: selectedModel,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    addSession(session)
    return session
  }, [selectedModel, addSession])

  const sendMessage = useCallback(async () => {
    if (!input.trim() || isStreaming) return

    let sessionId = activeSessionId
    if (!sessionId) {
      const session = await createNewSession()
      sessionId = session.id
    }

    const currentInput = input.trim()
    const userMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: currentInput,
      timestamp: new Date().toISOString(),
    }

    addMessage(sessionId, userMessage)
    setInput('')
    setIsStreaming(true)
    setStreamingMessage('')

    let finalSystemPrompt = systemPrompt

    if (searchEnabled) {
      try {
        setStreamingMessage('Searching the web for accurate and related content...\n\n')
        const searchRes = await chatAPI.searchWeb(currentInput)
        setStreamingMessage('')
        if (searchRes.data && searchRes.data.results && searchRes.data.results.length > 0) {
          const searchContext = searchRes.data.results.map((r, i) => `[${i+1}] ${r.title}\n${r.snippet}\nUrl: ${r.url}`).join('\n\n')
          finalSystemPrompt += `\n\n=== WEB SEARCH RESULTS ===\nBelow are real-time web search results related to the user's latest message. Use this exact information to provide high-accuracy and related content in your response:\n${searchContext}`
        }
      } catch (err) {
        console.error('Web search failed:', err)
        setStreamingMessage('')
      }
    }

    // Build message history for API
    const history = [...(messages[sessionId] || []), userMessage].map(m => ({
      role: m.role,
      content: m.content,
    }))

    await chatAPI.streamChat({
      messages: history,
      model: selectedModel,
      sessionId,
      systemPrompt: finalSystemPrompt,
      onChunk: (chunk) => appendToStream(chunk),
      onDone: () => {
        finalizeStream(sessionId)
      },
      onError: (err) => {
        toast.error(`AI Error: ${err}`)
        setIsStreaming(false)
        setStreamingMessage('')
      },
    })
  }, [input, isStreaming, activeSessionId, selectedModel, systemPrompt, searchEnabled, messages, createNewSession, addMessage, setIsStreaming, setStreamingMessage, appendToStream, finalizeStream])

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      {/* Sessions sidebar */}
      <div style={{
        width: 240,
        borderRight: '1px solid var(--clr-border)',
        display: 'flex',
        flexDirection: 'column',
        background: 'rgba(10,10,20,0.3)',
        flexShrink: 0,
      }}>
        <div style={{ padding: '16px', borderBottom: '1px solid var(--clr-border)' }}>
          <button
            id="btn-new-chat"
            onClick={createNewSession}
            className="btn btn-primary"
            style={{ width: '100%' }}
          >
            + New Chat
          </button>
        </div>
        <div style={{ flex: 1, overflow: 'auto', padding: '8px' }}>
          {sessions.length === 0 && (
            <div style={{ padding: '20px 8px', color: 'var(--clr-text-dim)', fontSize: 13, textAlign: 'center' }}>
              No chats yet.<br />Start a new conversation!
            </div>
          )}
          {sessions.map((session) => (
            <div
              key={session.id}
              id={`session-${session.id}`}
              onClick={() => setActiveSession(session.id)}
              style={{
                padding: '10px 12px',
                borderRadius: 8,
                cursor: 'pointer',
                marginBottom: 4,
                background: session.id === activeSessionId ? 'rgba(124,107,255,0.12)' : 'transparent',
                border: `1px solid ${session.id === activeSessionId ? 'rgba(124,107,255,0.3)' : 'transparent'}`,
                transition: 'all 0.2s ease',
                fontSize: 13,
                color: session.id === activeSessionId ? 'var(--clr-text)' : 'var(--clr-text-muted)',
              }}
            >
              <div style={{ fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                💬 {session.title}
              </div>
              <div style={{ fontSize: 11, color: 'var(--clr-text-dim)', marginTop: 2 }}>
                {new Date(session.createdAt).toLocaleDateString()}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Main chat area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Header with model selector */}
        <div style={{
          padding: '12px 20px',
          borderBottom: '1px solid var(--clr-border)',
          background: 'rgba(10,10,20,0.5)',
          backdropFilter: 'blur(12px)',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          flexWrap: 'wrap',
        }}>
          <span style={{ fontSize: 13, color: 'var(--clr-text-muted)', fontWeight: 600 }}>Model:</span>
          <div className="model-selector" style={{ margin: 0, flex: 1 }}>
            {MODELS.map((model) => (
              <button
                key={model.id}
                id={`model-chip-${model.id}`}
                className={`model-chip ${selectedModel === model.id ? 'active' : ''}`}
                onClick={() => setModel(model.id)}
              >
                {model.icon} {model.name}
              </button>
            ))}
          </div>
          <button
            id="btn-web-search-toggle"
            onClick={() => setSearchEnabled(!searchEnabled)}
            className={`btn btn-sm ${searchEnabled ? 'btn-primary' : 'btn-secondary'}`}
            style={{ flexShrink: 0 }}
          >
            🔍 Web Search {searchEnabled ? 'ON' : 'OFF'}
          </button>
        </div>

        {/* Messages */}
        <div className="chat-messages" style={{ flex: 1 }}>
          {activeMessages.length === 0 && !isStreaming && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 24,
                paddingTop: 60,
              }}
            >
              <div style={{
                width: 80, height: 80,
                borderRadius: 20,
                background: 'linear-gradient(135deg, var(--clr-primary), var(--clr-accent))',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 40,
                boxShadow: '0 0 40px var(--clr-primary-glow)',
              }}>⚡</div>
              <div style={{ textAlign: 'center' }}>
                <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 800, marginBottom: 8 }}>
                  <span className="gradient-text">NEXUS AI</span>
                </h2>
                <p style={{ color: 'var(--clr-text-muted)', fontSize: 15 }}>
                  Your multi-model AI assistant. Start a conversation.
                </p>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 200px)', gap: 12 }}>
                {[
                  { emoji: '📝', text: 'Write a short story about...' },
                  { emoji: '💻', text: 'Help me debug this code...' },
                  { emoji: '🧠', text: 'Explain quantum computing...' },
                  { emoji: '🎨', text: 'Creative ideas for...' },
                ].map((suggestion) => (
                  <button
                    key={suggestion.text}
                    onClick={() => setInput(suggestion.text)}
                    style={{
                      background: 'var(--clr-card)',
                      border: '1px solid var(--clr-border)',
                      borderRadius: 12,
                      padding: '14px',
                      cursor: 'pointer',
                      color: 'var(--clr-text-muted)',
                      fontSize: 13,
                      textAlign: 'left',
                      transition: 'all 0.2s ease',
                      fontFamily: 'var(--font-body)',
                    }}
                    className="glass-hover"
                  >
                    {suggestion.emoji} {suggestion.text}
                  </button>
                ))}
              </div>
            </motion.div>
          )}

          {activeMessages.map((msg) => (
            <MessageBubble key={msg.id} message={msg} />
          ))}

          {isStreaming && streamingMessage && (
            <motion.div
              className="chat-message"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <div className="chat-avatar ai">⚡</div>
              <div className="chat-bubble ai">
                <ReactMarkdown>{streamingMessage}</ReactMarkdown>
                <span style={{
                  display: 'inline-block',
                  width: 8, height: 16,
                  background: 'var(--clr-primary)',
                  borderRadius: 2,
                  marginLeft: 2,
                  animation: 'typingBounce 1s infinite',
                }} />
              </div>
            </motion.div>
          )}

          {isStreaming && !streamingMessage && <TypingIndicator />}
          <div ref={messagesEndRef} />
        </div>

        {/* Input area */}
        <div className="chat-input-area">
          <div className="chat-input-wrapper">
            <TextareaAutosize
              ref={inputRef}
              id="chat-input"
              className="chat-input"
              placeholder={`Message NEXUS AI (${MODELS.find(m => m.id === selectedModel)?.name})...`}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              minRows={1}
              maxRows={8}
              disabled={isStreaming}
            />
            <button
              id="btn-send-message"
              className="chat-send-btn"
              onClick={sendMessage}
              disabled={!input.trim() || isStreaming}
            >
              {isStreaming ? (
                <div className="spinner" style={{ width: 16, height: 16, borderWidth: 2 }} />
              ) : '➤'}
            </button>
          </div>
          <div style={{ textAlign: 'center', marginTop: 8, fontSize: 11, color: 'var(--clr-text-dim)' }}>
            Enter to send · Shift+Enter for new line · Supports all major AI models
          </div>
        </div>
      </div>
    </div>
  )
}

