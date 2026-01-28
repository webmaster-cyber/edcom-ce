import { useState, useCallback, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { toast } from 'sonner'
import { ArrowLeft, CreditCard, Smartphone, Check } from 'lucide-react'
import api from '../../config/api'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { LoadingOverlay } from '../../components/feedback/LoadingOverlay'
import { Badge } from '../../components/ui/Badge'
import type { Plan, CheckoutResponse } from '../../types/billing'

type PaymentMethod = 'paynow' | 'stripe'

export function CheckoutPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const preselectedPlan = searchParams.get('plan')

  const [plans, setPlans] = useState<Plan[]>([])
  const [selectedPlan, setSelectedPlan] = useState<string | null>(preselectedPlan)
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('paynow')
  const [phone, setPhone] = useState('')
  const [currency, setCurrency] = useState('USD')
  const [isLoading, setIsLoading] = useState(true)
  const [isProcessing, setIsProcessing] = useState(false)
  const [pollUrl, setPollUrl] = useState<string | null>(null)

  const reload = useCallback(async () => {
    setIsLoading(true)
    try {
      const { data } = await api.get<Plan[]>('/api/public/plans')
      setPlans(data.filter((p) => !p.is_free))
      if (!selectedPlan && data.length > 0) {
        const paid = data.find((p) => !p.is_free)
        if (paid) setSelectedPlan(paid.id)
      }
    } finally {
      setIsLoading(false)
    }
  }, [selectedPlan])

  useEffect(() => {
    reload()
  }, [reload])

  const handleCheckout = async () => {
    if (!selectedPlan) {
      toast.error('Please select a plan')
      return
    }

    if (paymentMethod === 'paynow' && !phone.trim()) {
      toast.error('Please enter your mobile number')
      return
    }

    setIsProcessing(true)
    try {
      const { data } = await api.post<CheckoutResponse>('/api/billing/checkout', {
        plan_id: selectedPlan,
        gateway: paymentMethod,
        phone: phone.trim() || undefined,
        currency,
      })

      if (data.error) {
        toast.error(data.error)
        return
      }

      if (data.redirect_url) {
        window.location.href = data.redirect_url
        return
      }

      if (data.poll_url) {
        setPollUrl(data.poll_url)
        toast.success('Payment initiated. Please complete the payment on your phone.')
        // Start polling
        pollPayment(data.poll_url)
        return
      }

      toast.success('Payment initiated')
    } catch {
      toast.error('Failed to initiate payment')
    } finally {
      setIsProcessing(false)
    }
  }

  const pollPayment = async (url: string) => {
    const maxAttempts = 30
    for (let i = 0; i < maxAttempts; i++) {
      await new Promise((r) => setTimeout(r, 5000))
      try {
        const { data } = await api.post<{ paid: boolean }>('/api/billing/verify', {
          reference: url,
          gateway: 'paynow',
        })
        if (data.paid) {
          toast.success('Payment successful!')
          setPollUrl(null)
          navigate('/billing')
          return
        }
      } catch {
        // continue polling
      }
    }
    setPollUrl(null)
    toast.error('Payment verification timed out. Check your invoices for status.')
  }

  const currentPlan = plans.find((p) => p.id === selectedPlan)

  return (
    <div>
      <div className="mb-4 flex items-center gap-4">
        <Button variant="ghost" onClick={() => navigate('/billing')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-xl font-semibold text-text-primary">Choose a Plan</h1>
      </div>

      <LoadingOverlay loading={isLoading}>
        <div className="mx-auto max-w-3xl space-y-6">
          {/* Plan Selection */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {plans.map((plan) => (
              <button
                key={plan.id}
                onClick={() => setSelectedPlan(plan.id)}
                className={`card cursor-pointer p-5 text-left transition-all ${
                  selectedPlan === plan.id
                    ? 'ring-2 ring-primary'
                    : 'hover:border-gray-300'
                }`}
              >
                <div className="mb-2 flex items-center justify-between">
                  <h3 className="font-semibold">{plan.name}</h3>
                  {selectedPlan === plan.id && (
                    <Check className="h-5 w-5 text-primary" />
                  )}
                </div>
                <p className="mb-3 text-sm text-text-secondary">{plan.description}</p>
                <div className="text-2xl font-bold">
                  ${plan.price_usd}
                  <span className="text-sm font-normal text-text-muted">
                    /{plan.billing_period === 'yearly' ? 'yr' : 'mo'}
                  </span>
                </div>
                <div className="mt-3 space-y-1 text-xs text-text-secondary">
                  <div>
                    {plan.subscriber_limit
                      ? `${plan.subscriber_limit.toLocaleString()} subscribers`
                      : 'Unlimited subscribers'}
                  </div>
                  <div>
                    {plan.send_limit_monthly
                      ? `${plan.send_limit_monthly.toLocaleString()} sends/month`
                      : 'Unlimited sends'}
                  </div>
                  {plan.trial_days > 0 && (
                    <div>
                      <Badge variant="info">{plan.trial_days}-day trial</Badge>
                    </div>
                  )}
                </div>
              </button>
            ))}
          </div>

          {/* Payment Method */}
          {selectedPlan && (
            <div className="card space-y-4 p-6">
              <h2 className="text-lg font-medium">Payment Method</h2>
              <div className="flex gap-3">
                <button
                  onClick={() => setPaymentMethod('paynow')}
                  className={`flex items-center gap-2 rounded-lg border px-4 py-3 text-sm transition-all ${
                    paymentMethod === 'paynow'
                      ? 'border-primary bg-primary/5 text-primary'
                      : 'border-border hover:border-gray-300'
                  }`}
                >
                  <Smartphone className="h-4 w-4" />
                  EcoCash / Mobile Money
                </button>
                <button
                  onClick={() => setPaymentMethod('stripe')}
                  className={`flex items-center gap-2 rounded-lg border px-4 py-3 text-sm transition-all ${
                    paymentMethod === 'stripe'
                      ? 'border-primary bg-primary/5 text-primary'
                      : 'border-border hover:border-gray-300'
                  }`}
                >
                  <CreditCard className="h-4 w-4" />
                  Card Payment
                </button>
              </div>

              {paymentMethod === 'paynow' && (
                <div className="space-y-3">
                  <Input
                    label="Mobile Number"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="0771234567"
                  />
                  <div className="flex gap-3">
                    <button
                      onClick={() => setCurrency('USD')}
                      className={`rounded-md px-3 py-1.5 text-sm ${
                        currency === 'USD'
                          ? 'bg-primary text-white'
                          : 'bg-gray-100 text-text-secondary'
                      }`}
                    >
                      USD
                    </button>
                    <button
                      onClick={() => setCurrency('ZWL')}
                      className={`rounded-md px-3 py-1.5 text-sm ${
                        currency === 'ZWL'
                          ? 'bg-primary text-white'
                          : 'bg-gray-100 text-text-secondary'
                      }`}
                    >
                      ZWL
                    </button>
                  </div>
                </div>
              )}

              {/* Summary */}
              {currentPlan && (
                <div className="rounded-lg bg-gray-50 p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-text-secondary">{currentPlan.name}</span>
                    <span className="font-semibold">
                      {currency === 'ZWL'
                        ? `ZWL ${currentPlan.price_zwl}`
                        : `$${currentPlan.price_usd}`}
                      /{currentPlan.billing_period === 'yearly' ? 'yr' : 'mo'}
                    </span>
                  </div>
                </div>
              )}

              <Button
                className="w-full"
                onClick={handleCheckout}
                loading={isProcessing}
                disabled={!!pollUrl}
              >
                {pollUrl ? 'Waiting for payment...' : 'Pay Now'}
              </Button>
            </div>
          )}
        </div>
      </LoadingOverlay>
    </div>
  )
}
