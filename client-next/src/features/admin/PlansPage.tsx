import { useState, useCallback, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { Plus, CreditCard } from 'lucide-react'
import api from '../../config/api'
import { Button } from '../../components/ui/Button'
import { LoadingOverlay } from '../../components/feedback/LoadingOverlay'
import { EmptyState } from '../../components/feedback/EmptyState'
import { ConfirmDialog } from '../../components/data/ConfirmDialog'
import { ActionMenu } from '../../components/ui/ActionMenu'
import { Badge } from '../../components/ui/Badge'
import type { Plan } from '../../types/billing'

export function PlansPage() {
  const navigate = useNavigate()
  const [plans, setPlans] = useState<Plan[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [deleteDialog, setDeleteDialog] = useState<{
    open: boolean
    plan: Plan | null
  }>({ open: false, plan: null })
  const [isDeleting, setIsDeleting] = useState(false)

  const reload = useCallback(async () => {
    setIsLoading(true)
    try {
      const { data } = await api.get<Plan[]>('/api/plans')
      setPlans(data)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    reload()
  }, [reload])

  const handleCreate = () => {
    navigate('/admin/plans/edit?id=new')
  }

  const handleEdit = (id: string) => {
    navigate(`/admin/plans/edit?id=${id}`)
  }

  const handleDelete = async () => {
    if (!deleteDialog.plan) return
    setIsDeleting(true)
    try {
      await api.delete(`/api/plans/${deleteDialog.plan.id}`)
      toast.success('Plan deleted')
      setDeleteDialog({ open: false, plan: null })
      await reload()
    } catch {
      toast.error('Failed to delete plan')
    } finally {
      setIsDeleting(false)
    }
  }

  const formatPrice = (plan: Plan) => {
    if (plan.is_free) return 'Free'
    return `$${plan.price_usd}/${plan.billing_period === 'yearly' ? 'yr' : 'mo'}`
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-text-primary">Plans</h1>
        <Button icon={<Plus className="h-4 w-4" />} onClick={handleCreate}>
          Add Plan
        </Button>
      </div>

      <LoadingOverlay loading={isLoading}>
        {plans.length === 0 ? (
          <EmptyState
            icon={<CreditCard className="h-10 w-10" />}
            title="No plans"
            description="Create billing plans for your customers."
            action={
              <Button icon={<Plus className="h-4 w-4" />} onClick={handleCreate}>
                Add Plan
              </Button>
            }
          />
        ) : (
          <div className="card overflow-hidden">
            <table className="min-w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-text-muted">
                    Name
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-text-muted">
                    Slug
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-text-muted">
                    Price
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider text-text-muted">
                    Subscribers
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider text-text-muted">
                    Sends/mo
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider text-text-muted">
                    Status
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-text-muted">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {plans.map((plan) => (
                  <tr key={plan.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <button
                        onClick={() => handleEdit(plan.id)}
                        className="font-medium text-primary hover:underline"
                      >
                        {plan.name}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-sm text-text-secondary">
                      {plan.slug}
                    </td>
                    <td className="px-4 py-3 text-right text-sm font-medium">
                      {formatPrice(plan)}
                    </td>
                    <td className="px-4 py-3 text-center text-sm">
                      {plan.subscriber_limit ? plan.subscriber_limit.toLocaleString() : 'Unlimited'}
                    </td>
                    <td className="px-4 py-3 text-center text-sm">
                      {plan.send_limit_monthly ? plan.send_limit_monthly.toLocaleString() : 'Unlimited'}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {plan.active ? (
                        <Badge variant="success">Active</Badge>
                      ) : (
                        <Badge variant="default">Inactive</Badge>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <ActionMenu
                        items={[
                          { label: 'Edit', onClick: () => handleEdit(plan.id) },
                          {
                            label: 'Delete',
                            onClick: () => setDeleteDialog({ open: true, plan }),
                            variant: 'danger',
                          },
                        ]}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </LoadingOverlay>

      <ConfirmDialog
        open={deleteDialog.open}
        onClose={() => setDeleteDialog({ open: false, plan: null })}
        onConfirm={handleDelete}
        title="Delete Plan"
        confirmLabel="Delete"
        variant="danger"
        loading={isDeleting}
      >
        Are you sure you want to delete <strong>{deleteDialog.plan?.name}</strong>? This
        action cannot be undone.
      </ConfirmDialog>
    </div>
  )
}
