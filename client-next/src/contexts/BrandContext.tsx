import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import type { LoginFrontend, Frontend } from '../types/auth'
import api from '../config/api'

interface BrandContextValue {
  loginFrontend: LoginFrontend | null
  userFrontend: Frontend | null
  isLoading: boolean
  applyFrontend: (frontend: Frontend | null) => void
}

const BrandContext = createContext<BrandContextValue | null>(null)

export function BrandProvider({ children }: { children: React.ReactNode }) {
  const [loginFrontend, setLoginFrontend] = useState<LoginFrontend | null>(null)
  const [userFrontend, setUserFrontend] = useState<Frontend | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // Load login frontend config on mount
  useEffect(() => {
    async function loadLoginFrontend() {
      try {
        const { data } = await api.get<LoginFrontend>('/api/loginfrontend')
        setLoginFrontend(data)
        applyBrandAssets(data.favicon, data.customcss)
      } catch {
        // Use defaults if endpoint fails
      } finally {
        setIsLoading(false)
      }
    }
    loadLoginFrontend()
  }, [])

  const applyFrontend = useCallback((frontend: Frontend | null) => {
    setUserFrontend(frontend)
    if (frontend) {
      applyBrandAssets(frontend.favicon, frontend.customcss)
    } else {
      applyBrandAssets(loginFrontend?.favicon, null)
    }
  }, [loginFrontend])

  return (
    <BrandContext.Provider value={{ loginFrontend, userFrontend, isLoading, applyFrontend }}>
      {children}
    </BrandContext.Provider>
  )
}

export function useBrand() {
  const ctx = useContext(BrandContext)
  if (!ctx) throw new Error('useBrand must be used within BrandProvider')
  return ctx
}

function applyBrandAssets(favicon?: string | null, customcss?: string | null) {
  // Update favicon
  const head = document.head
  const existingLinks = head.querySelectorAll('link[rel="icon"], link[rel="shortcut icon"]')
  existingLinks.forEach((link) => link.remove())

  const link = document.createElement('link')
  link.rel = 'icon'
  link.type = 'image/x-icon'
  link.href = favicon || '/favicon-ed.ico'
  head.appendChild(link)

  // Update custom CSS
  const existingStyle = document.getElementById('frontend-customcss')
  if (existingStyle) existingStyle.remove()

  if (customcss) {
    const style = document.createElement('style')
    style.id = 'frontend-customcss'
    style.textContent = customcss
    head.appendChild(style)
  }
}
