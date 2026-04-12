import axios from 'axios'

export const api = axios.create({
  baseURL: '/api',       // proxy do Vite em dev, URL absoluta em prod
  withCredentials: true, // OBRIGATÓRIO para enviar httpOnly cookies
  headers: {
    'Content-Type': 'application/json',
  },
})

// Interceptor: redireciona para /login em 401 automático
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Redirect silencioso — não mostra mensagem
      if (window.location.pathname !== '/login') {
        window.location.href = '/login'
      }
    }
    return Promise.reject(error)
  }
)
