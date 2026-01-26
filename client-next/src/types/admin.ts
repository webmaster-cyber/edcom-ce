// Admin types for Phase 8

export interface Customer {
  id: string
  name: string
  email: string
  uid?: string
  frontend: string
  routes: string[]
  minlimit: number | null
  hourlimit: number | null
  daylimit: number | null
  monthlimit: number | null
  defaultminlimit?: number
  defaulthourlimit?: number
  defaultdaylimit?: number
  defaultmonthlimit?: number
  trialend: string | null
  created: string
  admin: boolean
  inreview: boolean
  approved_at: string | null
  paused: boolean
  banned: boolean
  paid: boolean
  moderation?: {
    status?: string
    ticket?: string
  } | null
  moderation_ticket?: string
  params?: Record<string, string>
  exampletemplate?: boolean
  reverse_funnel_order?: boolean
  skip_list_validation?: boolean
  // Computed stats
  contacts: number
  complaint: number
  open: number
  send: number
  hard: number
  cqueue: number
  fqueue: number
  tqueue: number
  lasttime: string | null
}

export interface CustomerCredits {
  unlimited: number
  expire: number
}

export interface PostalRoute {
  id: string
  name: string
  dirty: boolean
  published: object | null
  usedefault?: boolean
}

export interface Frontend {
  id: string
  name: string
  // Profile
  useforlogin?: boolean
  image?: string | null
  favicon?: string | null
  // Custom CSS
  customcss?: string | null
  // Broadcast Alert Thresholds
  bouncerate?: number
  complaintrate?: number
  domainrates?: {
    domain: string
    bouncerate: number
    complaintrate: number
  }[]
  // Default Send Limits
  useapprove?: boolean
  usetrial?: boolean
  trialdays?: number
  minlimit?: number
  hourlimit?: number
  daylimit?: number
  monthlimit?: number
  bouncethreshold?: number
  unsubthreshold?: number
  complaintthreshold?: number
  // Header Template
  headers?: string
  fromencoding?: 'none' | 'b64' | 'qp'
  subjectencoding?: 'none' | 'b64' | 'qp'
  // Password Reset & Signup Emails
  invitename?: string
  inviteemail?: string
  txnaccount?: string
}

export interface ApiConnection {
  id: string
  name: string
  type: 'mailgun' | 'ses' | 'sparkpost'
}

export interface CustomerUser {
  id: string
  fullname: string
  username: string
  disabled: boolean
  apikey: string
}

export interface PendingList {
  id: string
  name: string
  approval_ticket?: string
  validation: {
    status: 'pending' | 'error' | 'complete' | 'skipped'
    message?: string
    quantity?: number
    records_processed?: number
    download_url?: string
    result?: {
      do_not_send: number
      undeliverable: number
      deliverable: number
      unknown: number
    }
    risk?: {
      high: number
      medium: number
      low: number
      unknown: number
    }
  }
}

export interface PendingListsResponse {
  lists: PendingList[]
  zendesk_host?: string
}

export interface CompanyLimit {
  name: string
  monthlimit: number
  daylimit: number
  hourlimit: number
  minlimit: number
}

export type CustomerFilter =
  | 'all'
  | 'banned'
  | 'nosubmit'
  | 'waiting'
  | 'free'
  | 'ended'
  | 'paid'
  | 'paused'
  | 'probation'

export const CUSTOMER_FILTER_OPTIONS: { value: CustomerFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'banned', label: 'Banned' },
  { value: 'nosubmit', label: 'No Approval Submitted' },
  { value: 'waiting', label: 'Awaiting Approval' },
  { value: 'free', label: 'Free Trial' },
  { value: 'ended', label: 'Trial Ended' },
  { value: 'paid', label: 'Paid' },
  { value: 'paused', label: 'Paused' },
  { value: 'probation', label: 'Probation' },
]
