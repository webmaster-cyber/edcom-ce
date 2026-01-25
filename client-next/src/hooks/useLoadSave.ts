import { useState, useEffect, useCallback, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'

interface UseLoadSaveOptions<T> {
  initial: T
  get?: (params: { id: string }) => Promise<T>
  post?: (args: { data: T; id: string }) => Promise<{ data: { id?: string } }>
  patch?: (args: { data: T; id: string }) => Promise<{ data: { id?: string } }>
  extra?: Record<string, (params: { id: string }) => Promise<unknown>>
}

interface UseLoadSaveResult<T> {
  id: string
  data: T
  extra: Record<string, unknown>
  isLoading: boolean
  isSaving: boolean
  update: (updater: Partial<T> | ((prev: T) => T)) => void
  save: (merge?: Partial<T>) => Promise<{ id?: string } | undefined>
  reload: () => Promise<void>
}

export function useLoadSave<T extends Record<string, unknown>>(
  options: UseLoadSaveOptions<T>
): UseLoadSaveResult<T> {
  const [searchParams] = useSearchParams()
  const id = searchParams.get('id') || ''
  const [data, setData] = useState<T>(options.initial)
  const [extra, setExtra] = useState<Record<string, unknown>>({})
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const optionsRef = useRef(options)
  optionsRef.current = options

  const reload = useCallback(async () => {
    setIsLoading(true)
    try {
      const opts = optionsRef.current

      // Load extra data
      if (opts.extra) {
        const entries = Object.entries(opts.extra)
        const results = await Promise.all(
          entries.map(([, fn]) => fn({ id }))
        )
        const extraData: Record<string, unknown> = {}
        entries.forEach(([key], i) => {
          extraData[key] = results[i]
        })
        setExtra(extraData)
      }

      // Load main data
      if (id && id !== 'new' && opts.get) {
        const result = await opts.get({ id })
        setData(result)
      } else {
        setData({ ...opts.initial })
      }
    } finally {
      setIsLoading(false)
    }
  }, [id])

  useEffect(() => {
    reload()
  }, [reload])

  const update = useCallback((updater: Partial<T> | ((prev: T) => T)) => {
    setData((prev) => {
      if (typeof updater === 'function') {
        return updater(prev)
      }
      return { ...prev, ...updater }
    })
  }, [])

  const save = useCallback(async (merge?: Partial<T>) => {
    setIsSaving(true)
    try {
      const opts = optionsRef.current
      const saveData = merge ? { ...data, ...merge } : data

      if (id === 'new') {
        if (!opts.post) throw new Error('post handler not defined')
        const result = await opts.post({ data: saveData, id })
        return result.data
      } else {
        if (!opts.patch) throw new Error('patch handler not defined')
        const result = await opts.patch({ data: saveData, id })
        return result.data
      }
    } finally {
      setIsSaving(false)
    }
  }, [data, id])

  return { id, data, extra, isLoading, isSaving, update, save, reload }
}
