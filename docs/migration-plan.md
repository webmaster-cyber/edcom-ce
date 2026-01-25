# Frontend Modernization Plan: React 15 → Vite + React 18 + Tailwind

## Approach
New `client-next/` directory alongside existing `client/`. Port screens incrementally. Old client stays running on port 3000, new on port 3001 until cutover.

---

## Tech Stack

| Concern | Current | New |
|---------|---------|-----|
| Build | CRA 1.0.13 | **Vite 5** |
| Framework | React 15.6.2 | **React 18 + TypeScript** |
| Styling | Bootstrap 3 + plain CSS | **Tailwind CSS + CSS variables** |
| Components | react-bootstrap 0.32 | **Headless UI** |
| Tables | react-table 6 | **@tanstack/react-table v8** |
| Forms | Manual setState | **react-hook-form + zod** |
| Notifications | react-notify-toast | **sonner** |
| Dates | moment.js | **date-fns** |
| HTTP | axios 0.16 | **axios 1.x (typed)** |
| Charts | recharts beta | **recharts 2.x** |
| Rich Text | Draft.js | **TipTap** |
| Email Editor | Beefree Plugin | **Beefree Plugin (keep)** |
| Icons | Font Awesome 4 + custom SVGs | **Lucide React** |
| State | Props drilling + localStorage | **React Context + hooks** |
| Router | React Router 4 | **React Router 6** |
| Validation | Manual | **zod** |

---

## Multi-Brand Theming Architecture

CSS custom properties as the theming layer, Tailwind configured to consume them:

```css
:root {
  --color-primary: #2dcca1;
  --color-primary-hover: #25b38e;
  --color-nav-bg: #4c84ff;
  --color-sidebar-bg: #1c263f;
  --color-surface: #ffffff;
  --color-background: #f5f6fa;
  /* ...etc */
}
```

Each brand gets a CSS file that overrides these variables. `BrandContext` loads the right brand based on domain (via `GET /api/loginfrontend`) and applies variables at runtime.

Tailwind config references variables: `colors: { primary: 'var(--color-primary)' }` — so `bg-primary`, `text-primary` etc. all respond to brand switching.

---

## Project Structure (client-next/)

```
src/
  config/          - API client, routes, brand definitions
  types/           - TypeScript interfaces (api, auth, brand, entities)
  contexts/        - AuthContext, BrandContext
  hooks/           - useAuth, useBrand, useApi, useLoadSave, useBeefree, usePolling
  components/
    ui/            - Button, Input, Modal, Tabs, Select, Badge, etc.
    layout/        - AppShell, PageHeader, Section, FormLayout
    data/          - DataTable, Pagination, SearchInput, ConfirmDialog
    navigation/    - Sidebar, TopBar, UserMenu, BrandLogo
    editors/       - BeefreeEditor, RichTextEditor, CodeEditor
    charts/        - PieChart, BarChart wrappers
    feedback/      - LoadingOverlay, EmptyState, ErrorBoundary
  features/
    auth/          - Login, Reset, Activate, Welcome pages
    dashboard/     - Admin + Customer dashboards
    broadcasts/    - List, Summary, Settings, Template, Recipients, Review
    contacts/      - Lists, Segments, Add, Find, Edit
    funnels/       - List, Settings, Messages
    transactional/ - Overview, Tags, Templates, Log
    forms/         - List, Editor
    integrations/  - API, SMTP, Webhooks, Zapier, Pabbly
    admin/         - Customers, Servers, Policies, Routes, Reports, etc.
  styles/
    index.css      - Tailwind directives + default CSS variables
    brands/        - betting.css, fanzone.css, agriculture.css, mwosfc.css
  lib/             - date, format, download, clipboard utilities
```

---

## Auth System

Same API contract (backend unchanged). `AuthContext` replaces the current `App.js` state:
- Reads `uid`/`cookieid` from localStorage on mount
- Configures axios interceptors (X-Auth-UID, X-Auth-Cookie, X-Auth-Impersonate headers)
- Handles 401 → redirect to login
- Provides `login()`, `logout()`, `impersonate()`, `reloadUser()` via context

---

## Phased Migration

### Phase 1: Foundation + Login → Dashboard
- Initialize Vite + React 18 + TypeScript + Tailwind
- CSS variable theming system + default brand
- AuthContext + BrandContext
- AppShell (sidebar + topbar navigation)
- Login page
- Dashboard (admin + customer views)
- Core UI: Button, Input, Spinner, Modal
- Docker service on port 3001
- **Verify:** Login at localhost:3001, see branded nav + dashboard

### Phase 2: Broadcasts List
- DataTable, Tabs, SearchInput, Pagination, ConfirmDialog
- Broadcasts list (Sent/Scheduled/Drafts tabs)
- Polling hook, toast notifications, empty/loading states
- **Verify:** Full broadcast list with search, tabs, actions

### Phase 3: Broadcast Create/Edit
- react-hook-form integration
- Broadcast wizard (Settings → Template → Recipients → Review)
- BeefreeEditor component (wrapping window.BeePlugin)
- Code editor for raw HTML
- **Verify:** Create broadcast, design in Beefree, select recipients, send

### Phase 4: Broadcast Reports
- Summary, Heatmap, Domains, Messages, Details pages
- Chart components (recharts 2.x)
- **Verify:** Full analytics for sent broadcasts

### Phase 5: Contacts + Segments
- Contact lists, add, find, edit pages
- Segment editor (rule builder UI)
- File upload component
- **Verify:** Full contact/segment management

### Phase 6: Funnels + Transactional
- Funnel list/settings/messages pages
- Transactional templates/tags/log pages
- **Verify:** Create funnels and transactional templates

### Phase 7: Forms + Integrations
- Form builder, webhooks, API/SMTP connect pages
- Suppression/exclusion lists
- **Verify:** Create forms, manage integrations

### Phase 8: Admin Backend
- Customers, Servers, Policies, Routes, Connections, Reports
- Frontend/template management
- **Verify:** Full admin portal

### Phase 9: Multi-Brand Polish
- Brand CSS files for all four brands
- Feature flags per brand
- Brand-specific logos/favicons
- **Verify:** Each brand domain shows distinct identity

### Phase 10: Payment Gateway Abstraction
- Payment gateway interface (abstract provider, webhook handler)
- Paynow/EcoCash integration (per-payment, no subscriptions)
- Stripe integration (subscriptions + one-time payments)
- Plan definitions (contacts, sends, features per tier)
- Usage metering service (track sends, contacts against limits)
- Billing admin dashboard
- **Account types (coexist):**
  - **Admin-created (no billing)** — existing behavior, for own brands/partners. No plan required, no usage limits enforced, no payment prompts. Stays as-is.
  - **Self-signup (billed)** — SaaS customers assigned a plan, usage metered, payment required
  - **Free tier (self-signup)** — limited contacts/sends, can upgrade to paid
- Billing layer is optional — admin-created accounts bypass it entirely
- **Verify:** Test payment via Paynow sandbox, Stripe test mode. Admin-created accounts unaffected.

### Phase 11: Public Signup + Plans
- Self-service signup flow (email verification, plan selection)
- Free tier auto-provisioning (limited contacts/sends)
- Payment checkout flow (Paynow for ZW, Stripe for international)
- Upgrade/downgrade UI
- Usage indicators in customer dashboard ("2,450 / 5,000 sends")
- Threshold warning emails (80%/90%/100%)
- Overage handling (block sends at limit)
- **Verify:** Full signup → free trial → upgrade → payment flow. Admin-created accounts show no billing UI.

### Phase 12: Marketing Site (Sendmail.co.zw only)
- Astro project in `marketing/` with shared Tailwind config
- Keystatic CMS for content editing without code
- Pages: Home, Features, Pricing, Blog, Signup, Contact
- SEO: sitemaps, meta tags, structured data, OpenGraph
- Signup form → POST `/api/signup` → redirect to `/app/welcome`
- Nginx: `sendmail.co.zw/` → marketing, `sendmail.co.zw/app/` → client-next
- Not per-brand — only for selling the Sendmail.co.zw SaaS product
- Agency templated pages are a future roadmap item
- **Verify:** Google can crawl pages, Lighthouse 90+, CMS editing works, signup flow end-to-end

### Phase 13: Cutover
- Update Docker/nginx to serve new client
- Remove old `client/` directory
- Performance + accessibility audit
- **Verify:** Production deployment works on all brands

---

## Docker Integration (During Migration)

Add to `docker-compose.override.yml`:
```yaml
client-next:
  image: node:20-alpine
  container_name: edcom-client-next
  working_dir: /app
  command: sh -c "npm install && npm run dev -- --host 0.0.0.0"
  volumes:
    - "./client-next:/app"
    - "client-next-node-modules:/app/node_modules"
  ports:
    - "3001:5173"
  profiles:
    - lite
    - full
```

Vite proxy config mirrors current CRA proxy:
- `/api` → `http://api:8000`
- `/l` → `http://api:8000`
- `/signup` → `http://api:8000`

---

## Domain Routing Architecture

### Sendmail.co.zw (the SaaS product — has marketing site)
```
sendmail.co.zw/                → Marketing site (Astro static)
sendmail.co.zw/app/            → App (client-next SPA)
sendmail.co.zw/api/            → Backend API
sendmail.co.zw/l               → Link tracking
```

### Own brands (app only — no marketing pages)
```
esp.betting.co.zw/             → App (client-next SPA, betting brand theme)
esp.fanzone.co.zw/             → App (client-next SPA, fanzone brand theme)
esp.agriculture.co.zw/         → App (client-next SPA, agriculture brand theme)
esp.mwosfc.co.zw/              → App (client-next SPA, mwosfc brand theme)
```

### Account types
- **Admin-created (no billing):** Own brands, partners, VIPs. No plan, no limits, no payment UI.
- **Self-signup (billed):** External customers on sendmail.co.zw. Assigned plan, usage metered, payment required.
- **Free tier:** Self-signup with limited contacts/sends. Can upgrade to paid.

### Nginx routing (production)
```nginx
# Sendmail.co.zw — marketing + app
server {
    server_name sendmail.co.zw;
    location /app/ { alias /usr/share/nginx/html/app/; try_files $uri /app/index.html; }
    location /api/ { proxy_pass http://api:8000; }
    location = /l  { proxy_pass http://api:8000; }
    location /     { root /usr/share/nginx/html/marketing; try_files $uri $uri/index.html =404; }
}

# Own brands — app only
server {
    server_name esp.betting.co.zw esp.fanzone.co.zw esp.agriculture.co.zw esp.mwosfc.co.zw;
    location /api/ { proxy_pass http://api:8000; }
    location = /l  { proxy_pass http://api:8000; }
    location /     { root /usr/share/nginx/html/app; try_files $uri /index.html; }
}
```

Brand detection: The API's `GET /api/loginfrontend` already returns brand config based on the requesting domain. The app's BrandContext uses this to apply the correct theme.

---

## Key Patterns to Preserve

1. **LoadSave HOC → `useLoadSave` hook**: Same GET/POST/PATCH pattern, typed
2. **Beefree**: Keep `window.BeePlugin` script tag approach, wrap in `useBeefree` hook
3. **Query params for entity IDs**: `?id=new` / `?id=abc123` pattern stays
4. **Admin impersonation**: Preserved in AuthContext
5. **Custom CSS injection**: Fallback `<style>` tag for brands not yet using CSS variables

---

## Starting Point (Phase 1 Files to Create)

1. `client-next/package.json`
2. `client-next/vite.config.ts`
3. `client-next/tsconfig.json`
4. `client-next/tailwind.config.ts`
5. `client-next/postcss.config.js`
6. `client-next/index.html`
7. `client-next/src/main.tsx`
8. `client-next/src/App.tsx`
9. `client-next/src/config/api.ts`
10. `client-next/src/config/routes.tsx`
11. `client-next/src/contexts/AuthContext.tsx`
12. `client-next/src/contexts/BrandContext.tsx`
13. `client-next/src/styles/index.css`
14. `client-next/src/components/layout/AppShell.tsx`
15. `client-next/src/features/auth/LoginPage.tsx`
16. `client-next/src/features/dashboard/AdminDashboard.tsx`
