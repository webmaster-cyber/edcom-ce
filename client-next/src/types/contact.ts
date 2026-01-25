export interface ContactList {
  id: string
  name: string
  count: number
  active: number
  active30: number
  active60: number
  active90: number
  unsubscribed: number
  bounced: number
  soft: number
  complained: number
  domaincount: number
  processing: boolean | string
  processing_error: string | null
  unapproved: boolean
  lastactivity?: string
}

export interface ContactRecord {
  email: string
  [key: string]: unknown
}

export interface ContactSearchResult {
  records: ContactRecord[]
  total: number
  fields: string[]
}

export interface Tag {
  tag: string
  count: number
  added: string
}

export interface DomainStat {
  domain: string
  count: number
}

export interface SegmentRule {
  type: 'info' | 'lists' | 'responses'
  // info: property/tag tests
  field?: string
  operator?: string
  value?: string
  // lists: membership tests
  listid?: string
  listop?: 'in' | 'notin'
  // responses: engagement tests
  engagetype?: 'opened' | 'clicked' | 'delivered' | 'unsubscribed' | 'bounced' | 'complained'
  engageop?: 'any' | 'none' | 'count'
  engagecount?: number
  engageperiod?: number
  engageunit?: 'days' | 'hours'
  broadcastid?: string
}

export interface SegmentGroup {
  logic: 'and' | 'or' | 'nor'
  rules: (SegmentRule | SegmentGroup)[]
}

export interface Segment {
  id: string
  name: string
  rules: SegmentGroup
  subset?: {
    type: 'percent' | 'count'
    value: number
    sort: string
  }
  count?: number
  calculating?: boolean
}

export interface SegmentFormData {
  name: string
  rules: SegmentGroup
  subset_enabled: boolean
  subset_type: 'percent' | 'count'
  subset_value: number
  subset_sort: string
}

export const OPERATORS = {
  text: [
    { value: 'eq', label: 'equals' },
    { value: 'neq', label: 'does not equal' },
    { value: 'contains', label: 'contains' },
    { value: 'notcontains', label: 'does not contain' },
    { value: 'starts', label: 'starts with' },
    { value: 'ends', label: 'ends with' },
    { value: 'set', label: 'is set' },
    { value: 'notset', label: 'is not set' },
  ],
  number: [
    { value: 'eq', label: 'equals' },
    { value: 'neq', label: 'does not equal' },
    { value: 'gt', label: 'greater than' },
    { value: 'gte', label: 'greater than or equal' },
    { value: 'lt', label: 'less than' },
    { value: 'lte', label: 'less than or equal' },
    { value: 'set', label: 'is set' },
    { value: 'notset', label: 'is not set' },
  ],
  date: [
    { value: 'before', label: 'is before' },
    { value: 'after', label: 'is after' },
    { value: 'on', label: 'is on' },
    { value: 'daysago', label: 'is within last X days' },
    { value: 'set', label: 'is set' },
    { value: 'notset', label: 'is not set' },
  ],
  tag: [
    { value: 'has', label: 'has tag' },
    { value: 'nothas', label: 'does not have tag' },
  ],
} as const

export const ENGAGEMENT_TYPES = [
  { value: 'opened', label: 'Opened' },
  { value: 'clicked', label: 'Clicked' },
  { value: 'delivered', label: 'Delivered' },
  { value: 'unsubscribed', label: 'Unsubscribed' },
  { value: 'bounced', label: 'Bounced' },
  { value: 'complained', label: 'Complained' },
] as const

// Growth data point for charts
export interface GrowthDataPoint {
  label: string
  value: number
}

// Campaign activity (for future API)
export interface ContactCampaignActivity {
  broadcastId: string
  broadcastName: string
  sentAt: string
  opens: number
  clicks: number
}
