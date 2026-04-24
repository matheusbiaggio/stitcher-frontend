import axios from 'axios'

// Em dev: '/api' é proxiado pelo Vite (vite.config.ts) para http://localhost:3001
// Em prod: VITE_API_BASE_URL aponta para o backend (ex.: https://bonistore-api.onrender.com/api)
const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '/api'

export const api = axios.create({
  baseURL: BASE_URL,
  withCredentials: true, // OBRIGATÓRIO para enviar httpOnly cookies
  headers: {
    'Content-Type': 'application/json',
  },
})

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      if (window.location.pathname !== '/login') {
        window.dispatchEvent(new CustomEvent('session:expired'))
      }
    }
    return Promise.reject(error)
  },
)
