import { useState, useEffect, useRef } from 'react'
import { toast } from 'sonner'
import { Download, FileText, Loader2, AlertCircle } from 'lucide-react'
import api from '../../config/api'
import { LoadingOverlay } from '../../components/feedback/LoadingOverlay'
import { EmptyState } from '../../components/feedback/EmptyState'

interface Export {
  id: string
  name: string
  started_at: string
  complete?: boolean
  error?: string
  count?: number
  size?: number
  url?: string
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
}

function formatDate(dateString: string): string {
  const date = new Date(dateString)
  return date.toLocaleString()
}

export function ExportsPage() {
  const [exports, setExports] = useState<Export[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const pollRef = useRef<NodeJS.Timeout | null>(null)

  const loadExports = async () => {
    try {
      const { data } = await api.get<Export[]>('/api/exports')
      setExports(data)

      // Check if any exports are still processing
      const hasProcessing = data.some((exp) => !exp.complete && !exp.error)
      if (hasProcessing && !pollRef.current) {
        pollRef.current = setInterval(loadExports, 10000)
      } else if (!hasProcessing && pollRef.current) {
        clearInterval(pollRef.current)
        pollRef.current = null
      }
    } catch (err) {
      console.error('Failed to load exports:', err)
      toast.error('Failed to load exports')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadExports()
    return () => {
      if (pollRef.current) {
        clearInterval(pollRef.current)
      }
    }
  }, [])

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-text-primary">Data Exports</h1>
        <p className="mt-1 text-sm text-text-muted">Download your exported data files</p>
      </div>

      <LoadingOverlay loading={isLoading}>
        {exports.length === 0 ? (
          <EmptyState
            icon={<FileText className="h-12 w-12" />}
            title="No exports"
            description="Data exports you create will appear here. Exports are generated from various sections of the application."
          />
        ) : (
          <>
            <div className="card">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border bg-gray-50 text-left text-sm font-medium text-text-secondary">
                    <th className="px-4 py-3">Export</th>
                    <th className="px-4 py-3">Started</th>
                    <th className="px-4 py-3 text-right">Entries</th>
                    <th className="px-4 py-3 text-right">Size</th>
                    <th className="px-4 py-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {exports.map((exp) => (
                    <tr
                      key={exp.id}
                      className="border-b border-border last:border-0 hover:bg-gray-50"
                    >
                      <td className="px-4 py-3">
                        <span className="font-medium text-text-primary">{exp.name}</span>
                      </td>
                      <td className="px-4 py-3 text-sm text-text-muted">
                        {formatDate(exp.started_at)}
                      </td>
                      <td className="px-4 py-3 text-right text-sm text-text-muted">
                        {exp.complete ? exp.count?.toLocaleString() : '-'}
                      </td>
                      <td className="px-4 py-3 text-right text-sm text-text-muted">
                        {exp.complete && exp.size ? formatFileSize(exp.size) : '-'}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {exp.error ? (
                          <span className="inline-flex items-center gap-1 text-sm text-danger">
                            <AlertCircle className="h-4 w-4" />
                            Failed
                          </span>
                        ) : exp.complete ? (
                          exp.url ? (
                            <a
                              href={exp.url}
                              download
                              className="inline-flex items-center gap-1 rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-white hover:bg-primary-hover"
                            >
                              <Download className="h-4 w-4" />
                              Download
                            </a>
                          ) : (
                            <span className="text-sm text-text-muted">No file</span>
                          )
                        ) : (
                          <span className="inline-flex items-center gap-1 text-sm text-text-muted">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Processing...
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-4 rounded-lg border border-yellow-200 bg-yellow-50 p-4">
              <p className="text-sm text-yellow-800">
                <strong>Note:</strong> Exported files will be automatically removed after 24 hours.
              </p>
            </div>
          </>
        )}
      </LoadingOverlay>
    </div>
  )
}
