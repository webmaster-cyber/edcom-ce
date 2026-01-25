import { useState, useRef, useCallback } from 'react'
import { Upload, File, X } from 'lucide-react'

interface FileUploadProps {
  onFileSelect: (file: File) => void
  accept?: string
  maxSizeMB?: number
  disabled?: boolean
  selectedFile?: File | null
  onClear?: () => void
}

export function FileUpload({
  onFileSelect,
  accept = '.csv,.txt',
  maxSizeMB = 50,
  disabled = false,
  selectedFile,
  onClear,
}: FileUploadProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const validateFile = useCallback(
    (file: File): string | null => {
      const maxBytes = maxSizeMB * 1024 * 1024
      if (file.size > maxBytes) {
        return `File size must be less than ${maxSizeMB}MB`
      }
      const ext = '.' + file.name.split('.').pop()?.toLowerCase()
      const acceptList = accept.split(',').map((a) => a.trim().toLowerCase())
      if (!acceptList.some((a) => ext === a || file.type.includes(a.replace('.', '')))) {
        return `File type must be one of: ${accept}`
      }
      return null
    },
    [accept, maxSizeMB]
  )

  const handleFile = useCallback(
    (file: File) => {
      const validationError = validateFile(file)
      if (validationError) {
        setError(validationError)
        return
      }
      setError(null)
      onFileSelect(file)
    },
    [validateFile, onFileSelect]
  )

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    if (!disabled) setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    if (disabled) return

    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) handleFile(file)
    // Reset input so same file can be selected again
    e.target.value = ''
  }

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
  }

  if (selectedFile) {
    return (
      <div className="rounded-lg border border-border bg-gray-50 p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
            <File className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="truncate text-sm font-medium text-text-primary">
              {selectedFile.name}
            </p>
            <p className="text-xs text-text-muted">
              {formatFileSize(selectedFile.size)}
            </p>
          </div>
          {onClear && (
            <button
              type="button"
              onClick={onClear}
              className="rounded-md p-1.5 text-text-muted hover:bg-gray-200 hover:text-text-primary"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    )
  }

  return (
    <div>
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => !disabled && inputRef.current?.click()}
        className={`flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-8 text-center transition-colors ${
          disabled
            ? 'cursor-not-allowed border-gray-200 bg-gray-50'
            : isDragging
            ? 'cursor-pointer border-primary bg-primary/5'
            : 'cursor-pointer border-border hover:border-primary/50 hover:bg-gray-50'
        }`}
      >
        <div
          className={`mb-3 flex h-12 w-12 items-center justify-center rounded-full ${
            isDragging ? 'bg-primary/20' : 'bg-gray-100'
          }`}
        >
          <Upload className={`h-6 w-6 ${isDragging ? 'text-primary' : 'text-text-muted'}`} />
        </div>
        <p className="mb-1 text-sm font-medium text-text-primary">
          {isDragging ? 'Drop file here' : 'Drag and drop your file here'}
        </p>
        <p className="text-xs text-text-muted">
          or <span className="text-primary">browse</span> to select a file
        </p>
        <p className="mt-2 text-xs text-text-muted">
          Accepted formats: {accept} (max {maxSizeMB}MB)
        </p>
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          onChange={handleInputChange}
          disabled={disabled}
          className="hidden"
        />
      </div>
      {error && <p className="mt-2 text-sm text-danger">{error}</p>}
    </div>
  )
}
