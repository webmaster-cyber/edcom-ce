import { createContext, useContext, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'

type GuardFn = () => Promise<boolean>

interface NavigationGuardContextValue {
  setGuard: (fn: GuardFn) => void
  clearGuard: () => void
  guardedNavigate: (to: string) => Promise<void>
}

const NavigationGuardContext = createContext<NavigationGuardContextValue | null>(null)

export function NavigationGuardProvider({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate()
  const guardRef = useRef<GuardFn | null>(null)

  const setGuard = useCallback((fn: GuardFn) => {
    guardRef.current = fn
  }, [])

  const clearGuard = useCallback(() => {
    guardRef.current = null
  }, [])

  const guardedNavigate = useCallback(async (to: string) => {
    if (guardRef.current) {
      const canLeave = await guardRef.current()
      if (!canLeave) return
    }
    navigate(to)
  }, [navigate])

  return (
    <NavigationGuardContext.Provider value={{ setGuard, clearGuard, guardedNavigate }}>
      {children}
    </NavigationGuardContext.Provider>
  )
}

export function useNavigationGuardContext() {
  const ctx = useContext(NavigationGuardContext)
  if (!ctx) throw new Error('useNavigationGuardContext must be used within NavigationGuardProvider')
  return ctx
}
