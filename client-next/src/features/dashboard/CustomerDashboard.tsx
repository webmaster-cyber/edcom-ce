import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

export function CustomerDashboard() {
  const navigate = useNavigate()

  // Customer dashboard redirects to broadcasts (same as existing behavior)
  useEffect(() => {
    navigate('/broadcasts', { replace: true })
  }, [navigate])

  return null
}
