export interface TransactionalTemplate {
  id: string
  name: string
  type: 'raw' | 'beefree' | 'wysiwyg'
  subject: string
  fromname?: string
  fromemail?: string
  returnpath?: string
  replyto?: string
  tag?: string
  rawText?: string
  parts?: unknown
  bodyStyle?: unknown
  preheader?: string
  image?: string
  example?: boolean
}

export interface TransactionalTag {
  tag: string
  send: number
  count: number
  open: number
  click: number
  complaint: number
  unsub: number
}

export interface TransactionalStats {
  ts: string
  send: number
  soft: number
  hard: number
  open: number
}

export interface TransactionalDomainStats {
  domain: string
  send: number
  count: number
  open: number
  click: number
  hard: number
  soft: number
  complaint: number
  unsub: number
}

export interface TransactionalBounceMessage {
  msg: string
  count: number
}

export interface TransactionalLogEntry {
  id: string
  ts: string
  msgid: string
  to: string
  subject: string
  tag: string
  event: string
  fromemail?: string
}

export interface TransactionalSettings {
  route?: string
  disableopens?: boolean
}
