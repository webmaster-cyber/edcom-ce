import { useState, useCallback, useEffect, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import Papa from 'papaparse'
import { ArrowLeft, Check, Upload, Table2, Settings, Loader2 } from 'lucide-react'
import api from '../../config/api'
import { usePolling } from '../../hooks/usePolling'
import { Button } from '../../components/ui/Button'
import { FileUpload } from '../../components/ui/FileUpload'
import { LoadingOverlay } from '../../components/feedback/LoadingOverlay'
import { ColumnMapper } from './ColumnMapper'
import type { ContactList } from '../../types/contact'

type Step = 'upload' | 'header' | 'mapping' | 'options' | 'processing'

export function ContactsAddPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const listId = searchParams.get('id') || ''

  const [list, setList] = useState<ContactList | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [step, setStep] = useState<Step>('upload')

  // Upload state
  const [file, setFile] = useState<File | null>(null)
  const [pasteText, setPasteText] = useState('')
  const [uploadKey, setUploadKey] = useState<string | null>(null)
  const [isUploading, setIsUploading] = useState(false)

  // Header state
  const [hasHeader, setHasHeader] = useState(true)
  const [previewRows, setPreviewRows] = useState<string[][]>([])
  const [columns, setColumns] = useState<string[]>([])

  // Mapping state
  const [mapping, setMapping] = useState<Record<string, string>>({})
  const [availableFields, setAvailableFields] = useState<string[]>([])

  // Options state
  const [resubscribe, setResubscribe] = useState(false)

  // Processing state
  const [isProcessing, setIsProcessing] = useState(false)
  const [processingStatus, setProcessingStatus] = useState<string>('')

  // Load list info
  useEffect(() => {
    async function loadList() {
      try {
        const [listRes, fieldsRes] = await Promise.all([
          api.get<ContactList>(`/api/lists/${listId}`),
          api.get<string[]>('/api/allfields').catch(() => ({ data: [] })),
        ])
        setList(listRes.data)
        setAvailableFields(fieldsRes.data)
      } finally {
        setIsLoading(false)
      }
    }
    if (listId) loadList()
  }, [listId])

  // Parse CSV when file/text changes
  const parseCSV = useCallback((text: string) => {
    const result = Papa.parse<string[]>(text, {
      preview: 10,
      skipEmptyLines: true,
    })
    if (result.data.length > 0) {
      setPreviewRows(result.data)
      setColumns(result.data[0] || [])
    }
  }, [])

  // Handle file upload
  const handleFileSelect = async (selectedFile: File) => {
    setFile(selectedFile)

    // Read file preview
    const reader = new FileReader()
    reader.onload = (e) => {
      const text = e.target?.result as string
      parseCSV(text)
    }
    reader.readAsText(selectedFile.slice(0, 50000)) // Preview first 50KB
  }

  // Upload file to server
  const handleUpload = async () => {
    if (!file && !pasteText.trim()) {
      toast.error('Please select a file or paste data')
      return
    }

    setIsUploading(true)
    try {
      let key: string

      if (file) {
        const formData = new FormData()
        formData.append('file', file)
        const { data } = await api.post<{ key: string }>('/api/uploadfile', formData)
        key = data.key
      } else {
        // Upload pasted text as file
        const blob = new Blob([pasteText], { type: 'text/csv' })
        const formData = new FormData()
        formData.append('file', blob, 'paste.csv')
        const { data } = await api.post<{ key: string }>('/api/uploadfile', formData)
        key = data.key
        parseCSV(pasteText)
      }

      setUploadKey(key)
      setStep('header')
    } catch {
      toast.error('Failed to upload file')
    } finally {
      setIsUploading(false)
    }
  }

  // Track if we've done auto-detection for current columns
  const autoDetectedRef = useRef(false)

  // Auto-detect email column - only run once when entering mapping step
  useEffect(() => {
    if (step === 'mapping' && columns.length > 0 && !autoDetectedRef.current) {
      autoDetectedRef.current = true
      const newMapping: Record<string, string> = {}
      columns.forEach((col, index) => {
        const lower = col.toLowerCase()
        if (lower.includes('email') || lower === 'e-mail') {
          newMapping[index.toString()] = 'email'
        } else if (lower === 'firstname' || lower === 'first_name' || lower === 'first name') {
          newMapping[index.toString()] = 'firstname'
        } else if (lower === 'lastname' || lower === 'last_name' || lower === 'last name') {
          newMapping[index.toString()] = 'lastname'
        } else if (lower === 'name' || lower === 'fullname' || lower === 'full_name') {
          newMapping[index.toString()] = 'name'
        }
      })
      setMapping(newMapping)
    }
    // Reset auto-detection flag when leaving mapping step
    if (step !== 'mapping') {
      autoDetectedRef.current = false
    }
  }, [step, columns])

  // Handle header confirmation
  const handleHeaderConfirm = () => {
    if (hasHeader && previewRows.length > 0) {
      setColumns(previewRows[0])
    } else {
      setColumns(previewRows[0]?.map((_, i) => `Column ${i + 1}`) || [])
    }
    setStep('mapping')
  }

  // Start import
  const handleImport = async () => {
    // Validate email mapping
    const emailMapped = Object.values(mapping).includes('email')
    if (!emailMapped) {
      toast.error('Please map a column to the Email field')
      return
    }

    setStep('processing')
    setIsProcessing(true)
    setProcessingStatus('Starting import...')

    try {
      // Convert mapping from {columnIndex: fieldName} to array format
      // API expects: ["Email", "Firstname", ""] where index = column position
      // Empty string means skip that column
      const colmap: string[] = columns.map((_, index) => {
        const fieldName = mapping[index.toString()]
        if (!fieldName) return ''
        // Capitalize first letter for API (Email, Firstname, etc.)
        return fieldName.charAt(0).toUpperCase() + fieldName.slice(1)
      })

      await api.post(`/api/lists/${listId}/import`, {
        key: uploadKey,
        colmap,
        headers: hasHeader,
        override: resubscribe,
      })
      setProcessingStatus('Import started. Processing contacts...')
    } catch (err) {
      toast.error('Failed to start import')
      setStep('options')
      setIsProcessing(false)
    }
  }

  // Poll for processing status
  usePolling({
    callback: async () => {
      try {
        const { data } = await api.get<ContactList>(`/api/lists/${listId}`)
        if (data.processing) {
          setProcessingStatus(
            typeof data.processing === 'string' ? data.processing : 'Processing...'
          )
        } else if (data.processing_error) {
          setProcessingStatus('')
          setIsProcessing(false)
          toast.error(data.processing_error)
        } else {
          setProcessingStatus('')
          setIsProcessing(false)
          toast.success('Import complete!')
          navigate(`/contacts/find?id=${listId}`)
        }
      } catch {
        // Ignore poll errors
      }
    },
    intervalMs: 3000,
    enabled: isProcessing,
  })

  const emailMapped = Object.values(mapping).includes('email')

  const steps = [
    { key: 'upload', label: 'Upload', icon: Upload },
    { key: 'header', label: 'Header', icon: Table2 },
    { key: 'mapping', label: 'Mapping', icon: Table2 },
    { key: 'options', label: 'Options', icon: Settings },
  ]

  return (
    <div>
      {/* Header */}
      <div className="mb-4 flex items-center gap-4">
        <button
          onClick={() => navigate('/contacts')}
          className="rounded-md p-1.5 text-text-muted hover:bg-gray-100 hover:text-text-primary"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div>
          <h1 className="text-xl font-semibold text-text-primary">Add Contacts</h1>
          {list && <p className="text-sm text-text-muted">to {list.name}</p>}
        </div>
      </div>

      {/* Steps indicator */}
      {step !== 'processing' && (
        <div className="mb-6 flex items-center justify-center gap-2">
          {steps.map((s, i) => {
            const stepIndex = steps.findIndex((st) => st.key === step)
            const isComplete = i < stepIndex
            const isCurrent = s.key === step
            const Icon = s.icon

            return (
              <div key={s.key} className="flex items-center">
                {i > 0 && (
                  <div
                    className={`h-0.5 w-8 ${
                      isComplete ? 'bg-primary' : 'bg-border'
                    }`}
                  />
                )}
                <div
                  className={`flex h-8 w-8 items-center justify-center rounded-full ${
                    isComplete
                      ? 'bg-primary text-white'
                      : isCurrent
                      ? 'border-2 border-primary text-primary'
                      : 'border border-border text-text-muted'
                  }`}
                >
                  {isComplete ? <Check className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
                </div>
              </div>
            )
          })}
        </div>
      )}

      <LoadingOverlay loading={isLoading}>
        <div className="card max-w-2xl mx-auto p-6">
          {/* Step 1: Upload */}
          {step === 'upload' && (
            <div>
              <h2 className="mb-4 text-lg font-medium text-text-primary">Upload Contact Data</h2>

              <FileUpload
                onFileSelect={handleFileSelect}
                selectedFile={file}
                onClear={() => setFile(null)}
                accept=".csv,.txt"
                maxSizeMB={50}
              />

              <div className="my-4 flex items-center gap-4">
                <div className="h-px flex-1 bg-border" />
                <span className="text-sm text-text-muted">or</span>
                <div className="h-px flex-1 bg-border" />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-text-primary">
                  Paste data
                </label>
                <textarea
                  value={pasteText}
                  onChange={(e) => {
                    setPasteText(e.target.value)
                    if (e.target.value.trim()) {
                      setFile(null)
                      parseCSV(e.target.value)
                    }
                  }}
                  placeholder="Paste CSV data here..."
                  rows={6}
                  className="input w-full font-mono text-sm"
                />
              </div>

              <div className="mt-6 flex justify-end">
                <Button
                  onClick={handleUpload}
                  loading={isUploading}
                  disabled={!file && !pasteText.trim()}
                >
                  Continue
                </Button>
              </div>
            </div>
          )}

          {/* Step 2: Header detection */}
          {step === 'header' && (
            <div>
              <h2 className="mb-4 text-lg font-medium text-text-primary">Header Row</h2>
              <p className="mb-4 text-sm text-text-secondary">
                Does your file have a header row with column names?
              </p>

              {/* Preview table */}
              {previewRows.length > 0 && (
                <div className="mb-4 overflow-x-auto rounded-lg border border-border">
                  <table className="min-w-full text-sm">
                    <thead>
                      <tr className={hasHeader ? 'bg-primary/5' : 'bg-gray-50'}>
                        {previewRows[0].map((cell, i) => (
                          <th key={i} className="px-3 py-2 text-left font-medium text-text-primary">
                            {cell || <span className="text-text-muted">(empty)</span>}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {previewRows.slice(1, 4).map((row, ri) => (
                        <tr key={ri} className={ri % 2 ? 'bg-gray-50' : ''}>
                          {row.map((cell, ci) => (
                            <td key={ci} className="px-3 py-2 text-text-secondary">
                              {cell || <span className="text-text-muted">-</span>}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    checked={hasHeader}
                    onChange={() => setHasHeader(true)}
                    className="text-primary"
                  />
                  <span className="text-sm text-text-primary">
                    Yes, first row contains column names
                  </span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    checked={!hasHeader}
                    onChange={() => setHasHeader(false)}
                    className="text-primary"
                  />
                  <span className="text-sm text-text-primary">No, first row is data</span>
                </label>
              </div>

              <div className="mt-6 flex justify-between">
                <Button variant="secondary" onClick={() => setStep('upload')}>
                  Back
                </Button>
                <Button onClick={handleHeaderConfirm}>Continue</Button>
              </div>
            </div>
          )}

          {/* Step 3: Column mapping */}
          {step === 'mapping' && (
            <div>
              <h2 className="mb-4 text-lg font-medium text-text-primary">Map Columns</h2>

              <ColumnMapper
                columns={columns}
                mapping={mapping}
                onChange={setMapping}
                availableFields={availableFields}
                hasHeader={hasHeader}
              />

              <div className="mt-6 flex justify-between">
                <Button variant="secondary" onClick={() => setStep('header')}>
                  Back
                </Button>
                <Button onClick={() => setStep('options')} disabled={!emailMapped}>
                  Continue
                </Button>
              </div>
            </div>
          )}

          {/* Step 4: Options */}
          {step === 'options' && (
            <div>
              <h2 className="mb-4 text-lg font-medium text-text-primary">Import Options</h2>

              <div className="space-y-4">
                <label className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    checked={resubscribe}
                    onChange={(e) => setResubscribe(e.target.checked)}
                    className="mt-1 text-primary"
                  />
                  <div>
                    <span className="text-sm font-medium text-text-primary">
                      Resubscribe unsubscribed contacts
                    </span>
                    <p className="text-xs text-text-muted">
                      If enabled, contacts that were previously unsubscribed will be re-subscribed.
                      Use with caution to comply with email regulations.
                    </p>
                  </div>
                </label>
              </div>

              {/* Summary */}
              <div className="mt-6 rounded-lg bg-gray-50 p-4">
                <h3 className="mb-2 text-sm font-medium text-text-primary">Import Summary</h3>
                <div className="space-y-1 text-sm text-text-secondary">
                  <div>
                    File: {file?.name || 'Pasted data'}
                  </div>
                  <div>
                    Header row: {hasHeader ? 'Yes' : 'No'}
                  </div>
                  <div>
                    Mapped columns: {Object.keys(mapping).length} of {columns.length}
                  </div>
                </div>
              </div>

              <div className="mt-6 flex justify-between">
                <Button variant="secondary" onClick={() => setStep('mapping')}>
                  Back
                </Button>
                <Button onClick={handleImport}>Start Import</Button>
              </div>
            </div>
          )}

          {/* Processing */}
          {step === 'processing' && (
            <div className="py-12 text-center">
              <Loader2 className="mx-auto h-12 w-12 animate-spin text-primary" />
              <h2 className="mt-4 text-lg font-medium text-text-primary">Importing Contacts</h2>
              <p className="mt-2 text-sm text-text-secondary">{processingStatus}</p>
              <p className="mt-4 text-xs text-text-muted">
                You can leave this page. The import will continue in the background.
              </p>
              <Button variant="secondary" onClick={() => navigate('/contacts')} className="mt-4">
                Return to Lists
              </Button>
            </div>
          )}
        </div>
      </LoadingOverlay>
    </div>
  )
}
