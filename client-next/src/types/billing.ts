export interface PlanFeature {
  name: string
  included: boolean
}

export interface Plan {
  id: string
  name: string
  slug: string
  description: string
  price_usd: number
  price_zwl: number
  billing_period: 'monthly' | 'yearly'
  subscriber_limit: number | null
  send_limit_monthly: number | null
  features: PlanFeature[]
  trial_days: number
  is_free: boolean
  active: boolean
  sort_order: number
}

export type SubscriptionStatus = 'active' | 'trialing' | 'past_due' | 'cancelled' | 'expired' | 'none' | 'pending'

export interface Subscription {
  id: string
  company_id: string
  plan_id: string
  status: SubscriptionStatus
  trial_start: string | null
  trial_end: string | null
  current_period_start: string | null
  current_period_end: string | null
  gateway: 'paynow' | 'stripe' | 'admin' | 'free' | ''
  gateway_subscription_id: string | null
  cancel_at_period_end: boolean
  created: string
  plan?: Plan
}

export type InvoiceStatus = 'pending' | 'paid' | 'failed' | 'refunded'

export interface Invoice {
  id: string
  company_id: string
  subscription_id: string
  plan_id: string
  amount: number
  currency: string
  status: InvoiceStatus
  gateway: string
  gateway_payment_id: string | null
  paid_at: string | null
  description: string
  created: string
}

export interface CheckoutResponse {
  invoice_id: string
  redirect_url: string | null
  poll_url: string | null
  reference: string
  instructions: string | null
  error: string | null
}

export interface SubscriptionUsage {
  subscription: Subscription | null
  plan: Plan | null
  usage: {
    subscribers: number
    sends_this_month: number
  }
  limits: {
    subscriber_limit: number | null
    send_limit_monthly: number | null
  }
}

export interface PaymentGatewayConfig {
  id: string
  name: string
  type: 'paynow' | 'stripe'
  enabled: boolean
  // Paynow fields
  integration_id?: string
  integration_key?: string
  return_url?: string
  result_url?: string
  // Stripe fields
  secret_key?: string
  publishable_key?: string
  webhook_secret?: string
  success_url?: string
  cancel_url?: string
}
