import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import api from '../../config/api'
import { Spinner } from '../../components/ui/Spinner'
import { ReportNav } from './ReportNav'

interface BroadcastConfig {
  name: string
  fromname: string
  returnpath: string
  replyto: string
  subject: string
  preheader: string
  type: string
  lists: string[]
  segments: string[]
  tags: string[]
  supplists: string[]
  suppsegs: string[]
  supptags: string[]
  route: string
  disableopens: boolean
  randomize: boolean
  newestfirst: boolean
  openaddtags: string[]
  openremtags: string[]
  clickaddtags: string[]
  clickremtags: string[]
  sendaddtags: string[]
  sendremtags: string[]
}

export function BroadcastSummarySettingsPage() {
  const [searchParams] = useSearchParams()
  const id = searchParams.get('id') || ''

  const [data, setData] = useState<BroadcastConfig | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const res = await api.get(`/api/broadcasts/${id}`)
        setData(res.data)
      } finally {
        setIsLoading(false)
      }
    }
    load()
  }, [id])

  if (isLoading || !data) {
    return (
      <div className="flex min-h-[300px] items-center justify-center">
        <Spinner size="lg" />
      </div>
    )
  }

  return (
    <div>
      <ReportNav id={id} activeTab="settings" title={data.name} />

      <div className="card p-5">
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          <Section title="Sender">
            <Field label="From Name" value={data.fromname} />
            <Field label="From Email" value={data.returnpath} />
            {data.replyto && <Field label="Reply-To" value={data.replyto} />}
          </Section>

          <Section title="Content">
            <Field label="Subject" value={data.subject} />
            {data.preheader && <Field label="Preheader" value={data.preheader} />}
            <Field label="Template Type" value={data.type === 'beefree' ? 'Visual Editor' : 'Raw HTML'} />
          </Section>

          <Section title="Recipients">
            {data.lists.length > 0 && <Field label="Lists" value={data.lists.join(', ')} />}
            {data.segments.length > 0 && <Field label="Segments" value={data.segments.join(', ')} />}
            {data.tags.length > 0 && <Field label="Tags" value={data.tags.join(', ')} />}
          </Section>

          <Section title="Suppressions">
            {data.supplists.length > 0 && <Field label="Excluded Lists" value={data.supplists.join(', ')} />}
            {data.suppsegs.length > 0 && <Field label="Excluded Segments" value={data.suppsegs.join(', ')} />}
            {data.supptags.length > 0 && <Field label="Excluded Tags" value={data.supptags.join(', ')} />}
            {!data.supplists.length && !data.suppsegs.length && !data.supptags.length && (
              <p className="text-xs text-text-muted italic">None configured</p>
            )}
          </Section>

          <Section title="Options">
            <Field label="Open Tracking" value={data.disableopens ? 'Disabled' : 'Enabled'} />
            <Field label="Send Order" value={data.randomize ? 'Random' : data.newestfirst ? 'Newest First' : 'Default'} />
          </Section>

          {(data.openaddtags.length > 0 || data.clickaddtags.length > 0 || data.sendaddtags.length > 0) && (
            <Section title="Tagging Rules">
              {data.openaddtags.length > 0 && <Field label="On Open → Add" value={data.openaddtags.join(', ')} />}
              {data.openremtags.length > 0 && <Field label="On Open → Remove" value={data.openremtags.join(', ')} />}
              {data.clickaddtags.length > 0 && <Field label="On Click → Add" value={data.clickaddtags.join(', ')} />}
              {data.clickremtags.length > 0 && <Field label="On Click → Remove" value={data.clickremtags.join(', ')} />}
              {data.sendaddtags.length > 0 && <Field label="On Send → Add" value={data.sendaddtags.join(', ')} />}
              {data.sendremtags.length > 0 && <Field label="On Send → Remove" value={data.sendremtags.join(', ')} />}
            </Section>
          )}
        </div>
      </div>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="text-sm font-semibold text-text-primary mb-2">{title}</h3>
      <div className="space-y-1.5">{children}</div>
    </div>
  )
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start gap-2 text-xs">
      <span className="text-text-muted shrink-0 w-28">{label}:</span>
      <span className="text-text-secondary break-all">{value || '-'}</span>
    </div>
  )
}
