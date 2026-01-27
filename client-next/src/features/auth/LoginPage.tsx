import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import api from '../../config/api'
import type { LoginResponse } from '../../types/auth'

export function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { uid, login } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  // Redirect if already logged in
  useEffect(() => {
    if (uid) {
      const redirect = searchParams.get('redirect')
      navigate(redirect && redirect !== '/' ? redirect : '/', { replace: true })
    }
  }, [uid, navigate, searchParams])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const { data } = await api.post<LoginResponse>('/api/login', {
        username: email,
        password,
      })

      login(data.uid, data.cookie)

      if (data.changepass) {
        navigate('/welcome', { replace: true })
      } else {
        const redirect = searchParams.get('redirect')
        navigate(redirect && redirect !== '/' ? redirect : '/', { replace: true })
      }
    } catch (err: unknown) {
      const message =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { description?: string } } }).response?.data?.description
          : null
      setError(message || 'Invalid username or password')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm">
        {/* Logo - always show SendMail branding on login */}
        <div className="mb-8 text-center">
          <img src="/logo.svg" alt="SendMail" className="mx-auto h-12 max-w-[200px] object-contain" />
        </div>

        {/* Login form */}
        <div className="card p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              autoComplete="email"
              required
            />

            <Input
              label="Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              autoComplete="current-password"
              required
            />

            {error && (
              <div className="rounded-md bg-danger/10 px-3 py-2 text-sm text-danger">
                {error}
              </div>
            )}

            <Button type="submit" loading={loading} className="w-full">
              Sign In
            </Button>
          </form>
        </div>
      </div>
    </div>
  )
}
