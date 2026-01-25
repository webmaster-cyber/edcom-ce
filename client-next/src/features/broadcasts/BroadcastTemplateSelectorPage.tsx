import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import { FileText } from 'lucide-react'
import api from '../../config/api'
import { Spinner } from '../../components/ui/Spinner'
import { WizardNav } from './WizardNav'

interface TemplateItem {
  id: string
  name: string
  image: string | null
  templatetype?: string
}

interface TemplatesResponse {
  featured: TemplateItem[]
  recent: TemplateItem[]
}

export function BroadcastTemplateSelectorPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const id = searchParams.get('id') || ''

  const [templates, setTemplates] = useState<TemplatesResponse | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [applying, setApplying] = useState<string | null>(null)
  const [hasExisting, setHasExisting] = useState(false)

  useEffect(() => {
    async function load() {
      try {
        const [templatesRes, bcRes] = await Promise.all([
          api.get<TemplatesResponse>('/api/allbeefreetemplates'),
          api.get(`/api/broadcasts/${id}`),
        ])
        setTemplates(templatesRes.data)
        // If broadcast already has template content, show "continue editing" option
        if (bcRes.data.rawText) {
          setHasExisting(true)
        }
      } finally {
        setIsLoading(false)
      }
    }
    load()
  }, [id])

  async function applyTemplate(templateId: string) {
    setApplying(templateId)
    try {
      const { data: tmpl } = await api.get(`/api/allbeefreetemplates/${templateId}`)
      await api.patch(`/api/broadcasts/${id}`, {
        rawText: tmpl.rawText,
        type: 'beefree',
      })
      navigate(`/broadcasts/template?id=${id}`)
    } catch {
      toast.error('Failed to apply template')
    } finally {
      setApplying(null)
    }
  }

  function startFromScratch() {
    navigate(`/broadcasts/template?id=${id}`)
  }

  function continueEditing() {
    navigate(`/broadcasts/template?id=${id}`)
  }

  if (isLoading) {
    return (
      <div className="flex min-h-[300px] items-center justify-center">
        <Spinner size="lg" />
      </div>
    )
  }

  return (
    <div>
      <WizardNav
        title="Choose Template"
        step={1}
        totalSteps={5}
        id={id}
        backTo={`/broadcasts/settings?id=${id}`}
        nextLabel="Start from Scratch"
        onNext={startFromScratch}
      />

      {hasExisting && (
        <div className="mb-6 card p-4 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-text-primary">This broadcast already has a template</p>
            <p className="text-xs text-text-muted">You can continue editing or choose a new template below.</p>
          </div>
          <button
            onClick={continueEditing}
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary-hover"
          >
            Continue Editing
          </button>
        </div>
      )}

      {/* Featured Templates */}
      {templates?.featured && templates.featured.length > 0 && (
        <section className="mb-8">
          <h3 className="mb-4 text-sm font-semibold text-text-primary">Templates</h3>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {templates.featured.map((tmpl) => (
              <TemplateCard
                key={tmpl.id}
                template={tmpl}
                onClick={() => applyTemplate(tmpl.id)}
                loading={applying === tmpl.id}
                disabled={applying !== null}
              />
            ))}
          </div>
        </section>
      )}

      {/* Recent Templates */}
      {templates?.recent && templates.recent.length > 0 && (
        <section>
          <h3 className="mb-4 text-sm font-semibold text-text-primary">Recent Designs</h3>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {templates.recent.map((tmpl) => (
              <TemplateCard
                key={tmpl.id}
                template={tmpl}
                onClick={() => applyTemplate(tmpl.id)}
                loading={applying === tmpl.id}
                disabled={applying !== null}
              />
            ))}
          </div>
        </section>
      )}

      {(!templates?.featured?.length && !templates?.recent?.length) && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <FileText className="mb-3 h-12 w-12 text-text-muted" />
          <p className="text-sm text-text-muted">No templates available yet.</p>
          <p className="text-xs text-text-muted">Click "Start from Scratch" to begin with a blank template.</p>
        </div>
      )}
    </div>
  )
}

interface TemplateCardProps {
  template: TemplateItem
  onClick: () => void
  loading: boolean
  disabled: boolean
}

function getImagePath(url: string): string {
  // Image URLs are stored as full URLs (e.g. http://domain/i/abc.png)
  // Extract just the path so it goes through the Vite proxy
  try {
    const parsed = new URL(url)
    return parsed.pathname
  } catch {
    return url
  }
}

function TemplateCard({ template, onClick, loading, disabled }: TemplateCardProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="group card overflow-hidden text-left transition-shadow hover:shadow-md disabled:opacity-60"
    >
      <div className="aspect-[3/4] w-full overflow-hidden bg-gray-50">
        {template.image ? (
          <img
            src={getImagePath(template.image)}
            alt={template.name}
            className="h-full w-full object-cover object-top transition-transform group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full items-center justify-center">
            <FileText className="h-10 w-10 text-text-muted" />
          </div>
        )}
      </div>
      <div className="p-3">
        <p className="truncate text-sm font-medium text-text-primary">{template.name}</p>
        {loading && (
          <p className="mt-1 text-xs text-primary">Applying...</p>
        )}
      </div>
    </button>
  )
}
