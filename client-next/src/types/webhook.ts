export type WebhookEvent =
  | 'form_submit'
  | 'list_add'
  | 'tag_add'
  | 'tag_remove'
  | 'send'
  | 'unsub'
  | 'complaint'
  | 'hard_bounce'
  | 'soft_bounce'
  | 'click'
  | 'open'
  | 'bounce'
  | 'open_click'
  | 'unsub_complaint'

export interface Webhook {
  id: string
  cid: string
  name: string
  target_url: string
  event: WebhookEvent
  created?: string
  updated?: string
}

export interface WebhookTestResult {
  success: boolean
  status_code?: number
  response?: string
  error?: string
}

export const WEBHOOK_EVENTS: { value: WebhookEvent; label: string; description: string }[] = [
  { value: 'form_submit', label: 'Form Submit', description: 'When a contact submits a subscribe form' },
  { value: 'list_add', label: 'List Add', description: 'When a contact is added to a list' },
  { value: 'tag_add', label: 'Tag Add', description: 'When a tag is added to a contact' },
  { value: 'tag_remove', label: 'Tag Remove', description: 'When a tag is removed from a contact' },
  { value: 'send', label: 'Send', description: 'When a message is sent to a contact' },
  { value: 'open', label: 'Open', description: 'When a contact opens an email' },
  { value: 'click', label: 'Click', description: 'When a contact clicks a link' },
  { value: 'unsub', label: 'Unsubscribe', description: 'When a contact unsubscribes' },
  { value: 'complaint', label: 'Complaint', description: 'When a contact marks email as spam' },
  { value: 'hard_bounce', label: 'Hard Bounce', description: 'When an email permanently bounces' },
  { value: 'soft_bounce', label: 'Soft Bounce', description: 'When an email temporarily bounces' },
  { value: 'bounce', label: 'Any Bounce', description: 'When an email bounces (hard or soft)' },
  { value: 'open_click', label: 'Open or Click', description: 'When a contact opens or clicks' },
  { value: 'unsub_complaint', label: 'Unsub or Complaint', description: 'When a contact unsubs or complains' },
]

export const WEBHOOK_EXAMPLE_PAYLOADS: Record<WebhookEvent, object> = {
  form_submit: {
    type: 'form_submit',
    form: 'abcdefghijklmnopqrstuv',
    email: 'contact@example.com',
    timestamp: '2025-01-25T12:00:00Z',
    fields: { name: 'John Doe', company: 'Acme Inc' },
  },
  list_add: {
    type: 'list_add',
    list: 'abcdefghijklmnopqrstuv',
    email: 'contact@example.com',
    timestamp: '2025-01-25T12:00:00Z',
  },
  tag_add: {
    type: 'tag_add',
    tag: 'customer',
    email: 'contact@example.com',
    timestamp: '2025-01-25T12:00:00Z',
  },
  tag_remove: {
    type: 'tag_remove',
    tag: 'prospect',
    email: 'contact@example.com',
    timestamp: '2025-01-25T12:00:00Z',
  },
  send: {
    type: 'send',
    source: { broadcast: 'abcdefghijklmnopqrstuv' },
    email: 'contact@example.com',
    timestamp: '2025-01-25T12:00:00Z',
  },
  open: {
    type: 'open',
    source: { broadcast: 'abcdefghijklmnopqrstuv' },
    email: 'contact@example.com',
    timestamp: '2025-01-25T12:00:00Z',
    device: 'Mobile',
    os: 'iOS',
    browser: 'Safari',
    country: 'United States',
    country_code: 'US',
  },
  click: {
    type: 'click',
    source: { broadcast: 'abcdefghijklmnopqrstuv' },
    linkindex: 0,
    email: 'contact@example.com',
    timestamp: '2025-01-25T12:00:00Z',
    device: 'PC',
    os: 'Windows',
    browser: 'Chrome',
    country: 'United States',
    country_code: 'US',
  },
  unsub: {
    type: 'unsub',
    source: { broadcast: 'abcdefghijklmnopqrstuv' },
    email: 'contact@example.com',
    timestamp: '2025-01-25T12:00:00Z',
  },
  complaint: {
    type: 'complaint',
    source: { broadcast: 'abcdefghijklmnopqrstuv' },
    email: 'contact@example.com',
    timestamp: '2025-01-25T12:00:00Z',
  },
  hard_bounce: {
    type: 'hard_bounce',
    source: { broadcast: 'abcdefghijklmnopqrstuv' },
    email: 'contact@example.com',
    timestamp: '2025-01-25T12:00:00Z',
    reason: 'User unknown',
  },
  soft_bounce: {
    type: 'soft_bounce',
    source: { broadcast: 'abcdefghijklmnopqrstuv' },
    email: 'contact@example.com',
    timestamp: '2025-01-25T12:00:00Z',
    reason: 'Mailbox full',
  },
  bounce: {
    type: 'bounce',
    bounce_type: 'hard',
    source: { broadcast: 'abcdefghijklmnopqrstuv' },
    email: 'contact@example.com',
    timestamp: '2025-01-25T12:00:00Z',
    reason: 'User unknown',
  },
  open_click: {
    type: 'open',
    source: { broadcast: 'abcdefghijklmnopqrstuv' },
    email: 'contact@example.com',
    timestamp: '2025-01-25T12:00:00Z',
  },
  unsub_complaint: {
    type: 'unsub',
    source: { broadcast: 'abcdefghijklmnopqrstuv' },
    email: 'contact@example.com',
    timestamp: '2025-01-25T12:00:00Z',
  },
}
