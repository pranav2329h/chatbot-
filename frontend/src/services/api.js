import axios from 'axios'
import { auth } from '../firebase/config'

const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api'

const api = axios.create({ baseURL: API_BASE })

// Attach Firebase token to every request
api.interceptors.request.use(async (config) => {
  const user = auth.currentUser
  if (user) {
    const token = await user.getIdToken()
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// ─── CHAT API ────────────────────────────────────────────────────
export const chatAPI = {
  getModels: () => api.get('/chat/models/'),

  getSessions: () => api.get('/chat/sessions/'),
  createSession: (data) => api.post('/chat/sessions/', data),
  deleteSession: (id) => api.delete(`/chat/sessions/${id}/`),
  getSessionMessages: (id) => api.get(`/chat/sessions/${id}/`),

  saveMessage: (data) => api.post('/chat/history/', data),

  searchWeb: (query) => api.post('/chat/search/', { query }),

  streamChat: async ({ messages, model, sessionId, systemPrompt, onChunk, onDone, onError }) => {
    try {
      const user = auth.currentUser
      const token = user ? await user.getIdToken() : ''
      
      const response = await fetch(`${API_BASE}/chat/stream/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ messages, model, sessionId, systemPrompt }),
      })

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6)
            if (data === '[DONE]') {
              onDone?.()
              return
            }
            try {
              const parsed = JSON.parse(data)
              if (parsed.chunk) onChunk?.(parsed.chunk)
              if (parsed.error) onError?.(parsed.error)
            } catch {}
          }
        }
      }
      onDone?.()
    } catch (error) {
      onError?.(error.message)
    }
  },
}

// ─── IMAGE API ────────────────────────────────────────────────────
export const imageAPI = {
  getModels: () => api.get('/image/models/'),
  generate: (data) => api.post('/image/generate/', data),
  optimizePrompt: (data) => api.post('/image/optimize-prompt/', data),
  getGallery: () => api.get('/image/gallery/'),
}

// ─── VIDEO API ────────────────────────────────────────────────────
export const videoAPI = {
  generate: (data) => api.post('/video/generate/', data),
  getStatus: (jobId) => api.get(`/video/status/${jobId}/`),
  getGallery: () => api.get('/video/gallery/'),
}

// ─── AUDIO API ────────────────────────────────────────────────────
export const audioAPI = {
  getVoices: () => api.get('/audio/voices/'),
  tts: (data) => api.post('/audio/tts/', data, { responseType: 'blob' }),
  generateMusic: (data) => api.post('/audio/music/', data),
  cloneVoice: (formData) => api.post('/audio/voice-clone/', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  getGallery: () => api.get('/audio/gallery/'),
}

// ─── USER API ─────────────────────────────────────────────────────
export const userAPI = {
  getProfile: () => api.get('/users/profile/'),
  updateProfile: (data) => api.put('/users/profile/', data),
  getUsage: () => api.get('/users/usage/'),
}

export default api
