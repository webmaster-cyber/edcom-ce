import { useEffect, useRef } from 'react'

interface UsePollingOptions {
  callback: () => void | Promise<void>
  intervalMs: number
  enabled?: boolean
}

export function usePolling({ callback, intervalMs, enabled = true }: UsePollingOptions) {
  const callbackRef = useRef(callback)
  callbackRef.current = callback

  useEffect(() => {
    if (!enabled) return

    const id = setInterval(() => {
      callbackRef.current()
    }, intervalMs)

    return () => clearInterval(id)
  }, [intervalMs, enabled])
}
