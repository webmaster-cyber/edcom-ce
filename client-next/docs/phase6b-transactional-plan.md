# Phase 6b: Transactional Templates

## Overview

Transactional emails are one-off messages triggered by events (receipts, password resets, alerts). Unlike broadcasts, they're sent individually via API with variable substitution.

---

## Pages to Create

| Page | Route | Purpose |
|------|-------|---------|
| TransactionalPage | `/transactional` | Dashboard with tag stats chart |
| TransactionalTemplatesPage | `/transactional/templates` | List all templates |
| TransactionalTemplateEditPage | `/transactional/template?id=` | Create/edit template |
| TransactionalTagPage | `/transactional/tag?id=` | Tag delivery stats |
| TransactionalDomainsPage | `/transactional/domains?id=` | Domain performance for tag |
| TransactionalMessagesPage | `/transactional/messages?tag=&domain=&type=` | Bounce messages |
| TransactionalLogPage | `/transactional/log` | Activity log with export |
| TransactionalSettingsPage | `/transactional/settings` | Default route, open tracking |

---

## API Endpoints

### Templates
- `GET /api/transactional/templates` - List templates
- `POST /api/transactional/templates` - Create template
- `GET /api/transactional/templates/{id}` - Get template
- `PATCH /api/transactional/templates/{id}` - Update template
- `DELETE /api/transactional/templates/{id}` - Delete template
- `POST /api/transactional/templates/{id}/duplicate` - Clone template
- `POST /api/transactional/templates/{id}/test` - Send test email

### Analytics
- `GET /api/transactional/tags` - Tags with stats (date range filter)
- `GET /api/transactional/stats` - Stats over time (chart data)
- `GET /api/transactional/tag/{tag}` - Tag detail stats
- `GET /api/transactional/tag/{tag}/domainstats` - Domain stats for tag
- `GET /api/transactional/tag/{tag}/msgs` - Bounce messages

### Log
- `GET /api/transactional/log` - Paginated send log
- `POST /api/transactional/log/export` - Export to CSV

### Settings
- `GET /api/transactional/settings` - Get settings
- `PATCH /api/transactional/settings` - Update settings

---

## Types (src/types/transactional.ts)

```typescript
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
}

export interface TransactionalTag {
  tag: string
  send: number
  delivered: number
  opened: number
  clicked: number
  hard: number
  soft: number
  complaint: number
  unsub: number
}

export interface TransactionalStats {
  ts: string
  send: number
  delivered: number
  opened: number
  clicked: number
  hard: number
  soft: number
}

export interface TransactionalDomainStats {
  domain: string
  send: number
  delivered: number
  opened: number
  clicked: number
  hard: number
  soft: number
  complaint: number
}

export interface TransactionalLogEntry {
  id: string
  ts: string
  msgid: string
  email: string
  subject: string
  tag: string
  status: string
}

export interface TransactionalSettings {
  route?: string
  disableopens?: boolean
}
```

---

## Implementation Order

1. **Types** - Create transactional.ts
2. **TransactionalTemplatesPage** - List with CRUD actions
3. **TransactionalTemplateEditPage** - Beefree editor (reuse from funnels)
4. **TransactionalPage** - Dashboard with stats chart
5. **TransactionalTagPage** - Tag detail view
6. **TransactionalDomainsPage** - Domain breakdown
7. **TransactionalMessagesPage** - Bounce messages
8. **TransactionalLogPage** - Activity log with export
9. **TransactionalSettingsPage** - Settings form
10. **Routes** - Add to App.tsx

---

## UI Notes

- Reuse BeefreeEditor component (with transactional=true prop for {{variable}} merge tags)
- Reuse chart components from broadcasts
- Templates list similar to funnels list
- Log page needs pagination (10 per page from API)
- Export creates downloadable ZIP file

---

## Files to Create

```
src/types/transactional.ts
src/features/transactional/TransactionalPage.tsx
src/features/transactional/TransactionalTemplatesPage.tsx
src/features/transactional/TransactionalTemplateEditPage.tsx
src/features/transactional/TransactionalTagPage.tsx
src/features/transactional/TransactionalDomainsPage.tsx
src/features/transactional/TransactionalMessagesPage.tsx
src/features/transactional/TransactionalLogPage.tsx
src/features/transactional/TransactionalSettingsPage.tsx
```

---

## Estimated Scope

- 9 new pages
- 1 new types file
- ~2000 lines of code
