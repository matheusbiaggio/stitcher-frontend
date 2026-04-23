import axios from 'axios'

export const api = axios.create({
  baseURL: '/api', // proxy do Vite em dev, URL absoluta em prod
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
