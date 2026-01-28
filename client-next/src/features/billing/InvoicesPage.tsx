import { useState, useCallback, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, FileText } from 'lucide-react'
import api from '../../config/api'
import { Button } from '../../components/ui/Button'
import { Badge } from '../../components/ui/Badge'
import { LoadingOverlay } from '../../components/feedback/LoadingOverlay'
import { EmptyState } from '../../components/feedback/EmptyState'
import type { Invoice } from '../../types/billing'

function invoiceStatusBadge(status: string) {
  switch (status) {
    case 'paid':
      return <Badge variant="success">Paid</Badge>
    case 'pending':
      return <Badge variant="warning">Pending</Badge>
    case 'failed':
      return <Badge variant="danger">Failed</Badge>
    case 'refunded':
      return <Badge variant="info">Refunded</Badge>
    default:
      return <Badge variant="default">{status}</Badge>
  }
}

export function InvoicesPage() {
  const navigate = useNavigate()
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const reload = useCallback(async () => {
    setIsLoading(true)
    try {
      const { data } = await api.get<Invoice[]>('/api/billing/invoices')
      setInvoices(data)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    reload()
  }, [reload])

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  return (
    <div>
      <div className="mb-4 flex items-center gap-4">
        <Button variant="ghost" onClick={() => navigate('/billing')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-xl font-semibold text-text-primary">Invoices</h1>
      </div>

      <LoadingOverlay loading={isLoading}>
        {invoices.length === 0 ? (
          <EmptyState
            icon={<FileText className="h-10 w-10" />}
            title="No invoices"
            description="Your invoices will appear here once you make a payment."
          />
        ) : (
          <div className="card overflow-hidden">
            <table className="min-w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-text-muted">
                    Date
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-text-muted">
                    Description
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-text-muted">
                    Amount
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider text-text-muted">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-text-muted">
                    Gateway
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {invoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm">{formatDate(inv.created)}</td>
                    <td className="px-4 py-3 text-sm">{inv.description}</td>
                    <td className="px-4 py-3 text-right text-sm font-medium">
                      {inv.currency} {inv.amount.toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-center">{invoiceStatusBadge(inv.status)}</td>
                    <td className="px-4 py-3 text-sm capitalize text-text-secondary">
                      {inv.gateway}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </LoadingOverlay>
    </div>
  )
}
