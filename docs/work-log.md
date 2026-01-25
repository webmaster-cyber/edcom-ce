# Work Log

## 2026-01-24 — Project Setup

### Done
- Forked `emaildelivery/edcom-ce` to `webmaster-cyber/edcom-ce`
- Cloned to `/Users/davidmcallister/Desktop/sendmail/edcom-ce`
- Installed Docker Desktop
- Built base images (`dev/build_node_base.sh`, `dev/build_python_base.sh`)
- Built and started all services with `docker compose --profile=lite up --build -d`
- Created config: `config/edcom.json` (admin_url → localhost:3000), `.env` (PLATFORM_IP=0.0.0.0)
- Added commercial license key to `config/commercial_license.key`
- Created admin account: `david@kirbybrowne.com` / company: Sendmail.co.zw
- Fixed password hash (shell escaping mangled `??P4r4n01d!!` during initial create)
- All 8 containers running: database, cache, api, tasks, cron, smtprelay, client, proxy

### Codebase Assessment
- Backend (Python/Falcon): solid, modern, well-typed
- Frontend (React 15.6.2): severely outdated, needs full modernization
- Decision: fresh Vite + React 18 + TypeScript + Tailwind app, port screens incrementally

### Migration Plan Created
- See `docs/migration-plan.md` for full details
- 10 phases, starting with login → dashboard proof of concept
- Multi-brand theming via CSS custom properties + Tailwind
- Headless UI for accessible, unstyled component primitives

### Decisions Made
- UI library: Tailwind CSS + Headless UI (maximum whitelabel flexibility)
- Migration approach: Fresh Vite app, port screens incrementally
- Payment gateways: Paynow/EcoCash (ZW) + Stripe (international), abstracted interface
- Future roadmap documented: SMS/WhatsApp, agency model, A/B testing, landing pages, etc.

---

## 2026-01-25 — Phases 1-5 Complete + Contacts Enhancements

### Phase 1: Foundation + Login → Dashboard ✅
- Scaffolded `client-next/` with Vite + React 18 + TypeScript + Tailwind
- Implemented AuthContext and BrandContext
- Built AppShell (sidebar + topbar navigation)
- Created Login page with brand theming
- Core UI components: Button, Input, Modal, Tabs, Select, Badge
- Docker service running on port 5173

### Phase 2: Broadcasts List ✅
- DataTable, Tabs, SearchInput, Pagination, ConfirmDialog components
- Broadcasts list with Sent/Scheduled/Drafts tabs
- Polling hook, toast notifications (sonner)
- Empty/loading states

### Phase 3: Broadcast Create/Edit ✅
- Broadcast wizard (Settings → Template → Recipients → Review)
- BeefreeEditor component wrapping window.BeePlugin
- Code editor for raw HTML
- react-hook-form integration

### Phase 4: Broadcast Reports ✅
- Summary, Heatmap, Domains, Messages, Details pages
- Chart components using recharts 2.x
- Full analytics for sent broadcasts

### Phase 5: Contacts + Segments ✅
- Contact lists page with grid/table views
- List detail page with subscriber table
- Add contacts (manual + CSV upload)
- Find/search contacts with filters
- Edit contact page with properties

### Contacts Feature Enhancements ✅
Extended Phase 5 with additional features based on reference designs:

**New Shared Components:**
- `Badge.tsx` - Reusable status badges (success/warning/danger/info)
- `AreaChart.tsx` - Recharts-based growth visualization
- `NoticeBanner.tsx` - Dismissible info/warning banners

**Lists Page (ContactsPage.tsx):**
- Table view (now default) with sortable columns
- Search filter for lists by name
- Grid/table view toggle
- Correct active subscriber calculation

**List Detail Page (ContactsFindPage.tsx):**
- Status donut chart (Active/Unsub/Bounced/Complained breakdown)
- Subscriber growth area chart
- Action bar (Add Subscribers, Mass Unsubscribe, Export, Delete)
- Sortable columns (Name, Email, Last Activity, Status)
- Default sort by most recent activity
- Status badges per row
- Inline unsubscribe/delete buttons

**Contact Edit Page (ContactEditPage.tsx):**
- Contact info card with avatar, email, list memberships
- Notes field with yellow notepad styling
- Campaign activity placeholder section

**API Enhancements:**
- Added `!!lastactivity` field to segments.py (greatest of: added, last open, last click)
- Updated lists.py `fix_row()` to include `!!lastactivity` and `!!added` in responses

### Phase 6: Funnels ✅
- Funnels list page with status indicators
- Funnel settings page (create/edit)
- Funnel messages page with message list
- Funnel message edit page with template editor
- Funnel message stats page

### Phase 6b: Transactional ✅
- Transactional overview page with tag stats
- Templates list and edit pages
- Tag detail page with message stats
- Domains management page
- Messages log with filtering
- Settings page

### Phase 7: Subscribe Forms ✅
- Forms list page (table layout)
- Form settings page (create/edit with tags, success messages)
- List subscribe form page (forms filtered by list)
- Backend form rendering with card-style layout (version 3)
- Form preview and embed code generation
- Mobile-responsive form design with centered card layout

### Campaign Activity API ✅
- API endpoint for contact campaign activity
- Shows campaigns received and interactions (opens, clicks)

### Next Steps
- [ ] Integrations (webhooks, Zapier)
- [ ] Visual form builder (drag-and-drop customization)
- [ ] Additional reporting features

---

## Production Server Reference
- IP: `92.119.124.102`
- Install path: `/root/edcom-install/`
- Restart: `cd /root/edcom-install && ./restart.sh`
- License: `E246BF-CC8F7D-F6234E-E24C9B-E148B7-V3`
