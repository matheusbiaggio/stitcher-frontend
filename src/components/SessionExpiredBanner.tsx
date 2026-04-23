import { useState, useEffect } from 'react'

export function SessionExpiredBanner() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    function handle() {
      setVisible(true)
      setTimeout(() => {
        window.location.href = '/login'
      }, 1500)
    }
    window.addEventListener('session:expired', handle)
    return () => window.removeEventListener('session:expired', handle)
  }, [])

  if (!visible) return null

  return (
    <div
      style={{
        position: 'fixed',
        top: '1.5rem',
        left: '50%',
        transform: 'translateX(-50%)',
        background: 'var(--black2)',
        border: '1px solid var(--danger)',
        borderRadius: 'var(--radius)',
        padding: '0.75rem 1.5rem',
        zIndex: 9999,
        fontFamily: 'var(--font-body)',
        fontSize: '0.875rem',
        color: 'var(--danger)',
      }}
    >
      Sessão expirou. Redirecionando...
    </div>
  )
}
