export interface FunnelMessageRef {
  id: string
  whennum: number
  whentype: 'mins' | 'hours' | 'days'
  whentime?: string
  unpublished?: boolean
  fromname?: string
  returnpath?: string
  fromemail?: string
  replyto?: string
  msgroute?: string
}

export interface Funnel {
  id: string
  name: string
  type: 'tags' | 'responders'
  active: boolean
  count: number
  modified: string
  tags?: string[]
  exittags?: string[]
  fromname?: string
  fromemail?: string
  returnpath?: string
  replyto?: string
  route?: string
  multiple?: boolean
  messages?: FunnelMessageRef[]
}

export interface FunnelMessage {
  id: string
  funnel: string
  subject: string
  preheader?: string
  parts?: Record<string, unknown>
  rawText?: string
  type: 'wysiwyg' | 'beefree' | 'raw'
  who: 'all' | 'openany' | 'openlast' | 'clickany' | 'clicklast'
  whennum: number
  whentype: 'mins' | 'hours' | 'days'
  whentime?: string
  days?: boolean[]
  dayoffset?: number
  unpublished?: boolean
  // Tag actions
  openaddtags?: string[]
  openremtags?: string[]
  clickaddtags?: string[]
  clickremtags?: string[]
  sendaddtags?: string[]
  sendremtags?: string[]
  // Suppression
  supplists?: string[]
  suppsegs?: string[]
  supptags?: string[]
  // Stats
  send?: number
  delivered?: number
  opened?: number
  clicked?: number
  unsubscribed?: number
  complained?: number
  bounced?: number
  // Display
  screenshot?: string
}

export interface MessageClientStats {
  devices: { name: string; count: number }[]
  browsers: { name: string; count: number }[]
  locations: { country: string; region: string; count: number }[]
}

export interface MessageDomainStats {
  domain: string
  sent: number
  delivered: number
  opened: number
  clicked: number
  bounced: number
  complained: number
}
