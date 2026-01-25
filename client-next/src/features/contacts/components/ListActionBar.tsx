import { useState } from 'react'
import { toast } from 'sonner'
import { UserPlus, UserMinus, Download, Trash2 } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import api from '../../../config/api'
import { Button } from '../../../components/ui/Button'
import { Modal } from '../../../components/ui/Modal'
import { FileUpload } from '../../../components/ui/FileUpload'
import { ConfirmDialog } from '../../../components/data/ConfirmDialog'

interface ListActionBarProps {
  listId: string
  listName: string
  onRefresh: () => void
  canExport?: boolean
}

export function ListActionBar({ listId, listName, onRefresh, canExport = true }: ListActionBarProps) {
  const navigate = useNavigate()
  const [showUnsubModal, setShowUnsubModal] = useState(false)
  const [unsubFile, setUnsubFile] = useState<File | null>(null)
  const [isUnsubscribing, setIsUnsubscribing] = useState(false)
  const [isExporting, setIsExporting] = useState(false)
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean
    title: string
    message: string
    onConfirm: () => Promise<void>
    confirmLabel: string
  }>({ open: false, title: '', message: '', onConfirm: async () => {}, confirmLabel: '' })
  const [confirmLoading, setConfirmLoading] = useState(false)

  const handleAddSubscribers = () => {
    navigate(`/contacts/add?id=${listId}`)
  }

  const handleMassUnsubscribe = async () => {
    if (!unsubFile) {
      toast.error('Please select a file')
      return
    }

    setIsUnsubscribing(true)
    try {
      const formData = new FormData()
      formData.append('file', unsubFile)

      await api.post(`/api/lists/${listId}/importunsubs`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })

      toast.success('Mass unsubscribe started')
      setShowUnsubModal(false)
      setUnsubFile(null)
      onRefresh()
    } catch {
      toast.error('Failed to start mass unsubscribe')
    } finally {
      setIsUnsubscribing(false)
    }
  }

  const handleExport = async () => {
    setIsExporting(true)
    try {
      await api.post(`/api/lists/${listId}/export`)
      toast.success('Export started. Download from Data Exports page.')
    } catch {
      toast.error('Failed to start export')
    } finally {
      setIsExporting(false)
    }
  }

  const handleDelete = () => {
    setConfirmDialog({
      open: true,
      title: 'Delete List',
      message: `Are you sure you want to delete "${listName}"? This will remove all contacts from this list and cannot be undone.`,
      confirmLabel: 'Delete List',
      onConfirm: async () => {
        await api.delete(`/api/lists/${listId}`)
        toast.success('List deleted')
        navigate('/contacts')
      },
    })
  }

  const handleConfirm = async () => {
    setConfirmLoading(true)
    try {
      await confirmDialog.onConfirm()
    } finally {
      setConfirmLoading(false)
      setConfirmDialog((prev) => ({ ...prev, open: false }))
    }
  }

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <Button
          variant="secondary"
          size="sm"
          icon={<UserPlus className="h-4 w-4" />}
          onClick={handleAddSubscribers}
        >
          Add Subscribers
        </Button>
        <Button
          variant="secondary"
          size="sm"
          icon={<UserMinus className="h-4 w-4" />}
          onClick={() => setShowUnsubModal(true)}
        >
          Mass Unsubscribe
        </Button>
        {canExport && (
          <Button
            variant="secondary"
            size="sm"
            icon={<Download className="h-4 w-4" />}
            onClick={handleExport}
            loading={isExporting}
          >
            Export All
          </Button>
        )}
        <Button
          variant="danger"
          size="sm"
          icon={<Trash2 className="h-4 w-4" />}
          onClick={handleDelete}
        >
          Delete List
        </Button>
      </div>

      {/* Mass Unsubscribe Modal */}
      <Modal
        open={showUnsubModal}
        onClose={() => setShowUnsubModal(false)}
        title="Mass Unsubscribe"
        size="md"
      >
        <div className="space-y-4">
          <p className="text-sm text-text-secondary">
            Upload a CSV file containing email addresses to unsubscribe from this list.
            The file should have one email per line or a column header named "email".
          </p>
          <FileUpload
            accept=".csv,.txt"
            selectedFile={unsubFile}
            onFileSelect={setUnsubFile}
            onClear={() => setUnsubFile(null)}
          />
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setShowUnsubModal(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleMassUnsubscribe}
              loading={isUnsubscribing}
              disabled={!unsubFile}
            >
              Unsubscribe
            </Button>
          </div>
        </div>
      </Modal>

      {/* Confirm Dialog */}
      <ConfirmDialog
        open={confirmDialog.open}
        onClose={() => setConfirmDialog((prev) => ({ ...prev, open: false }))}
        onConfirm={handleConfirm}
        title={confirmDialog.title}
        message={confirmDialog.message}
        confirmLabel={confirmDialog.confirmLabel}
        loading={confirmLoading}
      />
    </>
  )
}
