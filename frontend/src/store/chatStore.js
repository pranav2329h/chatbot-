import { create } from 'zustand'

const useChatStore = create((set, get) => ({
  sessions: [],
  activeSessionId: null,
  messages: {},
  streamingMessage: '',
  isStreaming: false,
  selectedModel: 'pollinations-text',
  systemPrompt: 'You are NEXUS AI, an incredibly intelligent, creative, and helpful AI assistant. You are knowledgeable across all domains, speak naturally, and strive to give accurate, thoughtful responses.',

  setModel: (model) => set({ selectedModel: model }),
  setSystemPrompt: (prompt) => set({ systemPrompt: prompt }),
  
  setActiveSession: (sessionId) => set({ activeSessionId: sessionId }),
  
  addSession: (session) => set((state) => ({
    sessions: [session, ...state.sessions],
    activeSessionId: session.id,
    messages: { ...state.messages, [session.id]: [] },
  })),

  setSessions: (sessions) => set({ sessions }),

  getActiveMessages: () => {
    const { messages, activeSessionId } = get()
    return activeSessionId ? (messages[activeSessionId] || []) : []
  },

  addMessage: (sessionId, message) => set((state) => ({
    messages: {
      ...state.messages,
      [sessionId]: [...(state.messages[sessionId] || []), message],
    },
  })),

  setStreamingMessage: (text) => set({ streamingMessage: text }),
  setIsStreaming: (val) => set({ isStreaming: val }),

  appendToStream: (chunk) => set((state) => ({
    streamingMessage: state.streamingMessage + chunk,
  })),

  finalizeStream: (sessionId) => {
    const { streamingMessage, messages } = get()
    if (streamingMessage) {
      const aiMessage = {
        id: Date.now().toString(),
        role: 'assistant',
        content: streamingMessage,
        timestamp: new Date().toISOString(),
        model: get().selectedModel,
      }
      set((state) => ({
        messages: {
          ...state.messages,
          [sessionId]: [...(state.messages[sessionId] || []), aiMessage],
        },
        streamingMessage: '',
        isStreaming: false,
      }))
      return aiMessage
    }
    set({ isStreaming: false, streamingMessage: '' })
    return null
  },

  clearSession: (sessionId) => set((state) => {
    const { [sessionId]: _, ...rest } = state.messages
    return { messages: rest }
  }),
}))

export default useChatStore
