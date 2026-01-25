export interface Broadcast {
  id: string
  name: string
  modified: string

  // Sending state
  sent_at: string | null
  finished_at: string | null
  canceled: boolean
  error: string | null

  // Scheduling
  scheduled_for: string | null

  // Counts
  count: number
  delivered: number

  // Metrics
  send: number
  opened: number
  clicked: number
  unsubscribed: number
  complained: number
  bounced: number
  soft: number
  hard: number

  // Alert flags
  overdomaincomplaint: boolean
  overdomainbounce: boolean
}

export interface BroadcastFormData {
  name: string
  fromname: string
  returnpath: string
  fromemail: string
  replyto: string
  subject: string
  preheader: string

  // Template
  type: '' | 'beefree' | 'raw' | 'wysiwyg'
  rawText: string
  parts: unknown[]
  bodyStyle: Record<string, unknown>

  // Recipients
  lists: string[]
  segments: string[]
  tags: string[]
  supplists: string[]
  suppsegs: string[]
  supptags: string[]

  // Scheduling
  when: 'draft' | 'now' | 'schedule'
  scheduled_for: string | null

  // Options
  disableopens: boolean
  randomize: boolean
  newestfirst: boolean
  funnel: string

  // Resend
  resend?: boolean
  resendwhennum: number
  resendwhentype: 'days' | 'hours'
  resendsubject: string
  resendpreheader: string

  // Tagging
  openaddtags: string[]
  openremtags: string[]
  clickaddtags: string[]
  clickremtags: string[]
  sendaddtags: string[]
  sendremtags: string[]

  // Suppression calc results
  last_calc?: {
    count: number
    unavailable: number
    suppressed: number
    remaining: number
  } | null
}

export interface BroadcastsResponse {
  broadcasts: Broadcast[]
  count: number
}

export type BroadcastStatus =
  | 'Canceled'
  | 'Error'
  | 'Complete'
  | 'Scheduled'
  | 'Initializing'
  | 'Sending'
  | 'Draft'

export type BroadcastTab = 'sent' | 'scheduled' | 'drafts'

// Re-export from contact.ts for backwards compatibility
export type { ContactList, Segment } from './contact'

export interface SendRoute {
  id: string
  name: string
}
