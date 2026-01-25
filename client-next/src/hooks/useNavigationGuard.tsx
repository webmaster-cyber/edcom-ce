import { useEffect, useCallback, useRef } from 'react'
import { useNavigationGuardContext } from '../contexts/NavigationGuardContext'

interface UseNavigationGuardOptions {
  dirty: boolean
  onSave: () => Promise<void>
}

export function useNavigationGuard({ dirty, onSave }: UseNavigationGuardOptions) {
  const { setGuard, clearGuard } = useNavigationGuardContext()
  const dirtyRef = useRef(dirty)
  dirtyRef.current = dirty

  const confirmNavigation = useCallback(async (): Promise<boolean> => {
    if (!dirtyRef.current) return true

    const action = window.confirm(
      'You have unsaved changes. Press OK to save and continue, or Cancel to stay.'
    )
    if (action) {
      await onSave()
      return true
    }
    return false
  }, [onSave])

  // Register guard with global context
  useEffect(() => {
    setGuard(confirmNavigation)
    return () => clearGuard()
  }, [setGuard, clearGuard, confirmNavigation])

  // Handle browser tab/window close
  useEffect(() => {
    function handleBeforeUnload(e: BeforeUnloadEvent) {
      if (dirtyRef.current) {
        e.preventDefault()
      }
    }
    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [])

  return { dirty, confirmNavigation }
}
