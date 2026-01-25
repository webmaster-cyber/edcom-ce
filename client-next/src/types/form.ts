// Subscribe form types

export interface SubscribeForm {
  id: string
  name: string
  list: string  // List ID this form adds contacts to
  disabled?: boolean

  // Stats
  views?: number
  views_uniq?: number
  submits?: number
  submits_uniq?: number

  // Display settings
  display?: 'inline' | 'modal' | 'slide' | 'hello'
  slidelocation?: string
  hellolocation?: string

  // Behavior settings
  hideaftersubmit?: boolean
  returnaftersubmit?: boolean
  returnaftersubmitdays?: number
  hideaftershow?: boolean
  returnaftershow?: boolean
  returnaftershowdays?: number
  showwhen?: 'immediately' | 'exitintent' | 'delay'
  showdelay?: number

  // Tags to add on submit
  tags?: string[]

  // Success/error messages
  successmsg?: string
  errormsg?: string

  // Visual design (simplified - full design stored in parts/bodyStyle)
  parts?: unknown[]
  bodyStyle?: Record<string, unknown>
  mobile?: {
    parts?: unknown[]
    bodyStyle?: Record<string, unknown>
    display?: string
    slidelocation?: string
    hellolocation?: string
  }
}

export interface FormListItem {
  id: string
  name: string
  list: string
  disabled?: boolean
  views?: number
  views_uniq?: number
  submits?: number
  submits_uniq?: number
  display?: string
}
