# Phase 6: Funnels Feature

Automated email sequences triggered by tags, broadcasts, or form submissions.

---

## Pages to Create

| Page | Route | Purpose |
|------|-------|---------|
| FunnelsPage | `/funnels` | List all funnels with status, count, type |
| FunnelSettingsPage | `/funnels/settings?id=` | Create/edit funnel settings |
| FunnelMessagesPage | `/funnels/messages?id=` | View/manage message sequence |
| FunnelMessageEditPage | `/funnels/message?id=` | Edit message content & settings |
| FunnelMessageStatsPage | `/funnels/message/stats?id=` | Message analytics |

---

## Types to Add (src/types/funnel.ts)

```typescript
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
}

export interface FunnelMessage {
  id: string
  funnel: string
  subject: string
  preheader?: string
  parts?: Record<string, unknown>
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
```

---

## API Endpoints

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/api/funnels` | List all funnels |
| POST | `/api/funnels` | Create funnel |
| GET | `/api/funnels/{id}` | Get funnel details |
| PATCH | `/api/funnels/{id}` | Update funnel |
| POST | `/api/funnels/{id}/duplicate` | Duplicate funnel |
| GET | `/api/funnels/{id}/messages` | Get messages in funnel |
| POST | `/api/messages` | Create message |
| GET | `/api/messages/{id}` | Get message |
| PATCH | `/api/messages/{id}` | Update message |
| POST | `/api/messages/{id}/duplicate` | Duplicate message |
| POST | `/api/messages/{id}/test` | Send test email |
| GET | `/api/messages/{id}/clientstats` | Client/device stats |
| GET | `/api/messages/{id}/domainstats` | Domain stats |

---

## Implementation Order

### Step 1: Types & Routes
- Add `src/types/funnel.ts`
- Add routes to `src/config/routes.tsx`
- Add Funnels to sidebar navigation

### Step 2: FunnelsPage (List)
- Table with columns: Name, Contacts, Type, Status, Modified, Actions
- Actions: Edit Settings, View Messages, Duplicate, Activate/Deactivate, Delete
- Create button → FunnelSettingsPage?id=new

### Step 3: FunnelSettingsPage (Create/Edit)
- Form fields:
  - Name (required)
  - Type: Tags / Broadcast Responders
  - Trigger tags (if type=tags)
  - Exit tags (if type=tags)
  - From Name, Sender Email, Reply-To
  - Route selector
  - Allow multiple entries checkbox
- Save → redirect to FunnelMessagesPage

### Step 4: FunnelMessagesPage (Message Sequence)
- Header: Funnel name, status toggle, back button
- Message cards in sequence showing:
  - Timing (immediately / wait X days/hours/mins)
  - Subject line
  - Stats (sent, open rate, click rate)
  - Edit / Duplicate / Delete actions
- Add Message button
- Drag-and-drop reordering (future)

### Step 5: FunnelMessageEditPage (Message Editor)
- Tabs:
  - **Message**: Subject, preheader, template editor (Beefree/Code)
  - **Settings**: Send timing, days of week, who to send to
  - **Tagging**: Add/remove tags on open/click/send
  - **Suppression**: Exclude by list, segment, or tag
- Test email button
- Save / Cancel buttons

### Step 6: FunnelMessageStatsPage (Analytics)
- Message preview/screenshot
- Stats summary: Sent, Delivered, Opened, Clicked, Unsubs, Bounces
- Device/browser/location breakdown (reuse broadcast components)
- Link click breakdown

---

## Components to Create

| Component | Location | Purpose |
|-----------|----------|---------|
| FunnelStatusBadge | `features/funnels/components/` | Active/Inactive badge |
| FunnelTypeBadge | `features/funnels/components/` | Tags/Responders badge |
| MessageCard | `features/funnels/components/` | Message in sequence view |
| MessageTimingForm | `features/funnels/components/` | When to send controls |
| TagActionForm | `features/funnels/components/` | Add/remove tags config |
| SuppressionForm | `features/funnels/components/` | Exclusion rules |

---

## Reusable Components from Broadcasts

- BeefreeEditor
- CodeEditor
- SearchInput
- ConfirmDialog
- LoadingOverlay
- EmptyState
- Tabs

---

## Files to Create

```
src/types/funnel.ts
src/features/funnels/FunnelsPage.tsx
src/features/funnels/FunnelSettingsPage.tsx
src/features/funnels/FunnelMessagesPage.tsx
src/features/funnels/FunnelMessageEditPage.tsx
src/features/funnels/FunnelMessageStatsPage.tsx
src/features/funnels/components/MessageCard.tsx
src/features/funnels/components/MessageTimingForm.tsx
```

---

## Verification

1. `/funnels` - See list of funnels, create new
2. Create tag-based funnel with trigger tags
3. Add 3 messages with different timing
4. Edit message content in Beefree
5. Configure tagging rules on message
6. Send test email
7. View message stats
8. Activate/deactivate funnel
9. Duplicate funnel
