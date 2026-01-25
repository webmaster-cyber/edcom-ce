import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { ArrowLeft } from 'lucide-react'
import api from '../../config/api'
import { useLoadSave } from '../../hooks/useLoadSave'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { LoadingOverlay } from '../../components/feedback/LoadingOverlay'

interface ListFormData {
  name: string
  [key: string]: unknown
}

export function ContactListEditPage() {
  const navigate = useNavigate()

  const { data, isLoading, isSaving, update, save } = useLoadSave<ListFormData>({
    initial: { name: '' },
    get: async ({ id }) => {
      const { data } = await api.get<{ name: string }>(`/api/lists/${id}`)
      return { name: data.name }
    },
    patch: async ({ data, id }) => {
      await api.patch(`/api/lists/${id}`, data)
      return { data: { id } }
    },
  })

  const handleSave = async () => {
    if (!data.name.trim()) {
      toast.error('List name is required')
      return
    }
    try {
      await save()
      toast.success('List updated')
      navigate('/contacts')
    } catch {
      toast.error('Failed to update list')
    }
  }

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
        <h1 className="text-xl font-semibold text-text-primary">Edit List</h1>
      </div>

      <div className="card max-w-xl p-6">
        <LoadingOverlay loading={isLoading}>
          <form
            onSubmit={(e) => {
              e.preventDefault()
              handleSave()
            }}
          >
            <Input
              label="List Name"
              value={data.name}
              onChange={(e) => update({ name: e.target.value })}
              placeholder="Enter list name"
            />

            <div className="mt-6 flex justify-end gap-2">
              <Button variant="secondary" onClick={() => navigate('/contacts')}>
                Cancel
              </Button>
              <Button type="submit" loading={isSaving} disabled={!data.name.trim()}>
                Save Changes
              </Button>
            </div>
          </form>
        </LoadingOverlay>
      </div>
    </div>
  )
}
