import { createContext, useContext, useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { AuthState, User } from '../types/auth'
import api, { configureInterceptors } from '../config/api'

interface AuthContextValue {
  uid: string
  cookie: string
  impersonate: string
  user: User | null
  isLoading: boolean
  login: (uid: string, cookie: string) => void
  logout: () => void
  startImpersonation: (id: string) => void
  clearImpersonation: () => void
  reloadUser: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate()
  const interceptorsConfigured = useRef(false)

  const [state, setState] = useState<AuthState>(() => {
    const uid = localStorage.getItem('uid') || ''
    const cookie = localStorage.getItem('cookieid') || ''
    const impersonate = sessionStorage.getItem('impersonateid') || ''
    return { uid, cookie, impersonate, user: null, isLoading: !!uid }
  })

  const handleUnauthorized = useCallback(() => {
    localStorage.removeItem('uid')
    localStorage.removeItem('cookieid')
    sessionStorage.removeItem('impersonateid')
    setState({ uid: '', cookie: '', impersonate: '', user: null, isLoading: false })
    navigate('/login')
  }, [navigate])

  // Configure interceptors once
  useEffect(() => {
    if (!interceptorsConfigured.current) {
      configureInterceptors(
        () => ({
          uid: localStorage.getItem('uid') || '',
          cookie: localStorage.getItem('cookieid') || '',
          impersonate: sessionStorage.getItem('impersonateid') || '',
        }),
        handleUnauthorized
      )
      interceptorsConfigured.current = true
    }
  }, [handleUnauthorized])

  const reloadUser = useCallback(async () => {
    if (!state.uid) return
    try {
      const { data } = await api.get<User>(`/api/users/${state.uid}`)
      setState((prev) => ({ ...prev, user: data, isLoading: false }))
    } catch {
      setState((prev) => ({ ...prev, isLoading: false }))
    }
  }, [state.uid])

  // Load user on mount if authenticated
  useEffect(() => {
    if (state.uid && !state.user) {
      reloadUser()
    }
  }, [state.uid, state.user, reloadUser])

  const login = useCallback((uid: string, cookie: string) => {
    localStorage.setItem('uid', uid)
    localStorage.setItem('cookieid', cookie)
    setState((prev) => ({ ...prev, uid, cookie, isLoading: true }))
  }, [])

  const logout = useCallback(async () => {
    try {
      await api.post('/api/logout')
    } catch {
      // Proceed with client-side logout regardless
    }
    localStorage.removeItem('uid')
    localStorage.removeItem('cookieid')
    sessionStorage.removeItem('impersonateid')
    setState({ uid: '', cookie: '', impersonate: '', user: null, isLoading: false })
    navigate('/login')
  }, [navigate])

  const startImpersonation = useCallback((id: string) => {
    sessionStorage.setItem('impersonateid', id)
    setState((prev) => ({ ...prev, impersonate: id, user: null, isLoading: true }))
  }, [])

  const clearImpersonation = useCallback(() => {
    sessionStorage.removeItem('impersonateid')
    setState((prev) => ({ ...prev, impersonate: '', user: null, isLoading: true }))
  }, [])

  return (
    <AuthContext.Provider
      value={{
        ...state,
        login,
        logout,
        startImpersonation,
        clearImpersonation,
        reloadUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}

export { AuthContext }
