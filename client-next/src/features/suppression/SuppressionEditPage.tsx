import { useState, useEffect, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import { ArrowLeft, Upload, FileText, X } from 'lucide-react'
import api from '../../config/api'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { LoadingOverlay } from '../../components/feedback/LoadingOverlay'

interface SuppressionList {
  id: string
  name: string
  count?: number
}

export function SuppressionEditPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const listId = searchParams.get('id') || ''
  const isNew = listId === 'new' || !listId

  const [isLoading, setIsLoading] = useState(!isNew)
  const [isSaving, setIsSaving] = useState(false)
  const [isUploading, setIsUploading] = useState(false)

  const [name, setName] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!isNew) {
      loadList()
    }
  }, [listId, isNew])

  const loadList = async () => {
    try {
      const { data } = await api.get<SuppressionList>(`/api/supplists/${listId}`)
      setName(data.name)
    } catch (err) {
      console.error('Failed to load suppression list:', err)
      toast.error('Failed to load suppression list')
      navigate('/suppression')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error('Name is required')
      return
    }

    setIsSaving(true)
    try {
      if (isNew) {
        const { data } = await api.post<{ id: string }>('/api/supplists', {
          name: name.trim(),
        })

        // If a file was selected, upload it
        if (file) {
          await uploadFile(data.id)
        }

        toast.success('Suppression list created')
        navigate('/suppression')
      } else {
        await api.patch(`/api/supplists/${listId}`, {
          name: name.trim(),
        })
        toast.success('Suppression list saved')
        navigate('/suppression')
      }
    } catch (err: unknown) {
      console.error('Failed to save suppression list:', err)
      const axiosErr = err as { response?: { data?: { title?: string; description?: string } } }
      const message =
        axiosErr.response?.data?.description ||
        axiosErr.response?.data?.title ||
        'Failed to save suppression list'
      toast.error(message)
    } finally {
      setIsSaving(false)
    }
  }

  const uploadFile = async (id: string) => {
    if (!file) return

    setIsUploading(true)
    try {
      // First upload the file to get S3 key
      const formData = new FormData()
      formData.append('file', file)

      const uploadRes = await api.post<{ key: string }>('/api/uploadfile', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })

      // Then trigger the import
      await api.post(`/api/supplists/${id}/import`, {
        key: uploadRes.data.key,
      })

      toast.success('File uploaded and import started')
    } catch (err) {
      console.error('Failed to upload file:', err)
      toast.error('Failed to upload file')
    } finally {
      setIsUploading(false)
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      // Validate file type
      const validTypes = ['text/csv', 'text/plain', 'application/csv']
      if (!validTypes.includes(selectedFile.type) && !selectedFile.name.endsWith('.csv')) {
        toast.error('Please select a CSV file')
        return
      }
      setFile(selectedFile)
    }
  }

  const handleUploadToExisting = async () => {
    if (!file || isNew) return

    setIsUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)

      const uploadRes = await api.post<{ key: string }>('/api/uploadfile', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })

      await api.post(`/api/supplists/${listId}/import`, {
        key: uploadRes.data.key,
      })

      toast.success('Import started')
      setFile(null)
      navigate('/suppression')
    } catch (err) {
      console.error('Failed to upload file:', err)
      toast.error('Failed to upload file')
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/suppression')}
            className="rounded-md p-1.5 text-text-muted hover:bg-gray-100 hover:text-text-primary"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-xl font-semibold text-text-primary">
              {isNew ? 'New Suppression List' : 'Edit Suppression List'}
            </h1>
            {!isNew && name && <p className="text-sm text-text-muted">{name}</p>}
          </div>
        </div>
        <Button onClick={handleSave} loading={isSaving}>
          {isNew ? 'Create List' : 'Save Changes'}
        </Button>
      </div>

      <LoadingOverlay loading={isLoading}>
        <div className="mx-auto max-w-xl space-y-6">
          {/* Name */}
          <div className="card p-6">
            <h2 className="mb-4 text-lg font-medium text-text-primary">List Details</h2>
            <Input
              label="List Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Do Not Contact"
            />
          </div>

          {/* File Upload */}
          <div className="card p-6">
            <h2 className="mb-4 text-lg font-medium text-text-primary">
              {isNew ? 'Import Contacts (Optional)' : 'Import Additional Contacts'}
            </h2>
            <p className="mb-4 text-sm text-text-muted">
              Upload a CSV file containing email addresses to add to this suppression list.
            </p>

            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,text/csv"
              onChange={handleFileSelect}
              className="hidden"
            />

            {file ? (
              <div className="flex items-center gap-3 rounded-lg border border-border bg-gray-50 p-3">
                <FileText className="h-8 w-8 text-text-muted" />
                <div className="flex-1">
                  <p className="font-medium text-text-primary">{file.name}</p>
                  <p className="text-sm text-text-muted">
                    {(file.size / 1024).toFixed(1)} KB
                  </p>
                </div>
                <button
                  onClick={() => setFile(null)}
                  className="rounded-md p-1 text-text-muted hover:bg-gray-200 hover:text-text-primary"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex w-full items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border p-8 text-text-muted transition-colors hover:border-primary hover:text-primary"
              >
                <Upload className="h-6 w-6" />
                <span>Click to select a CSV file</span>
              </button>
            )}

            {!isNew && file && (
              <div className="mt-4">
                <Button
                  onClick={handleUploadToExisting}
                  loading={isUploading}
                  icon={<Upload className="h-4 w-4" />}
                >
                  Upload & Import
                </Button>
              </div>
            )}
          </div>

          {/* Info */}
          <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
            <h4 className="text-sm font-medium text-blue-800">CSV Format</h4>
            <p className="mt-1 text-sm text-blue-700">
              Your CSV file should contain email addresses, one per line or in the first column.
              A header row is optional.
            </p>
            <pre className="mt-2 rounded bg-blue-100 p-2 text-xs text-blue-800">
              email{'\n'}
              john@example.com{'\n'}
              jane@example.com
            </pre>
          </div>
        </div>
      </LoadingOverlay>
    </div>
  )
}
