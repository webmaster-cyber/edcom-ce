# Future Development Roadmap

Opportunities ranked by effort vs. return for the Zimbabwe/Africa market.

---

## Priority 0: Universal Bounce Ingestion Service

Make bounce handling work with ANY sending method — not just SES/SparkPost/Mailgun webhooks.

**Problem:** Currently, bounce processing only works via webhook integrations with three providers. Generic SMTP relays, custom MTAs, and Velocity all send bounces as NDR emails that the platform can't process. Bounces hit the user's inbox, contacts don't get suppressed, and dead addresses keep getting mailed.

**Implementation:**
- Dedicated bounce subdomain: `bounces.{brand}.co.zw`
- MX record pointing to platform's bounce processor
- SMTP listener service (Python — aiosmtpd or similar) receives NDR emails
- DSN parser (RFC 3464) extracts: bounced address, bounce type, diagnostic code
- Parsed bounces pushed to existing Redis `webhooks-pending` queue
- Same downstream processing as SES/SparkPost/Mailgun (contact suppression, stats)
- Return-Path on all outgoing mail set to `bounce+{tracking-id}@bounces.{brand}.co.zw`
- Tracking ID encodes campaign + contact for correlation (VERP pattern)

**Architecture:**
```
Outgoing mail:  Return-Path: bounce+abc123@bounces.sendmail.co.zw
                         ↓ (mail bounces)
Remote MTA:     NDR → bounces.sendmail.co.zw (MX record)
                         ↓
Bounce SMTP:    Receives NDR, parses DSN envelope
                         ↓
Redis queue:    Same "webhooks-pending" queue as webhook providers
                         ↓
Webhook processor: Same contact suppression + stats pipeline
```

**New Docker service:**
```yaml
bounce-processor:
  image: edcom/bounce-processor
  build:
    context: .
    dockerfile: services/bounce-processor.Dockerfile
  ports:
    - "${PLATFORM_IP}:25:25"  # SMTP inbound for bounces
  volumes:
    - "./data/logs:/logs"
    - "./config:/config"
```

**DNS setup per brand:**
```
bounces.sendmail.co.zw   MX  10  esp.sendmail.co.zw
```

**Effort:** Low-medium (small Python service, ~500 lines)
**Impact:** High — makes platform truly sending-method-agnostic

---

## Priority 1: SMS + WhatsApp Channel

Transform from "email marketing tool" into "customer communication platform."

**Why:** Zimbabwe is mobile-first. Email open rates are lower than mobile messaging. Same contacts, segments, and automation — just adding delivery channels.

**Implementation:**
- Africa's Talking API for SMS (covers Zimbabwe)
- WhatsApp Business API for templated messages
- Channel selector in broadcast/funnel UI (email, SMS, WhatsApp, multi-channel)
- Per-message pricing on top of carrier costs
- SMS character count / segment calculator
- WhatsApp template approval workflow
- Unified inbox for replies

**Revenue model:** Per-message markup + premium plan feature

---

## Priority 2: SaaS Signup + Payments

Public-facing self-service signup with configurable plans.

**Implementation:**
- Plan definitions (contacts, sends, features per tier)
- Free trial tier (limited contacts/sends, no approval needed)
- Public signup flow with email verification
- Payment gateway abstraction layer
- Paynow/EcoCash (Zimbabwe — no subscriptions, per-payment)
- Stripe (international — subscriptions supported)
- Usage metering and enforcement
- Upgrade/downgrade flows
- Billing dashboard for admin
- Usage bars in customer UI ("2,450 / 5,000 sends used")
- Warning emails at 80%/90%/100% thresholds
- Overage handling (block, warn, or charge extra)

**Revenue model:** Monthly/annual subscription tiers

---

## Priority 3: Reseller/Agency Model

Let agencies whitelabel and resell to their clients.

**Implementation:**
- Three-tier hierarchy: Platform → Agency → End Customer
- Agency gets branded portal with their logo/domain
- Agency manages sub-accounts
- Agency sets their own pricing for sub-accounts
- Platform charges agency wholesale, agency charges retail
- Commission/revenue share reporting
- Agency-level usage aggregation
- **Agency marketing pages:** Templated public-facing page per agency (hero, features, pricing table, signup CTA). Configurable via admin panel — not a full CMS, just structured editable fields. Lets agencies acquire their own customers with their branding.

**Revenue model:** Wholesale pricing to agencies, they markup for their clients

---

## Priority 4: A/B Testing

Subject line, content, and send time testing.

**Implementation:**
- Split recipient list into test groups (10/10/80 pattern)
- Variations: subject line, from name, content, send time
- Winner criteria: open rate, click rate, or revenue
- Auto-send winner to remainder after test period
- Statistical significance indicator
- Reporting on test results

**Revenue model:** Premium plan feature

---

## Priority 5: Contact Verification

Built-in email verification to reduce bounces and protect sender reputation.

**Implementation:**
- MX record validation
- SMTP handshake verification (without sending)
- Disposable email domain detection
- Syntax and format validation
- Bulk verification on list import
- Real-time verification on form submission
- Risk scoring (safe / risky / invalid)
- Auto-suppress invalid contacts

**Revenue model:** Per-verification charge or premium plan feature

---

## Priority 6: Landing Pages

Extend form builder to full landing page builder.

**Implementation:**
- Drag-and-drop page builder (extend existing form builder concepts)
- Template gallery for landing pages
- Custom domains per landing page
- Conversion tracking (views, submissions, conversion rate)
- A/B testing for pages
- Mobile-responsive templates
- Integration with contact lists (form → list)
- Thank-you page customization

**Revenue model:** Premium plan feature, per-page pricing on lower tiers

---

## Priority 7: Automation Upgrades

Evolve linear funnels into visual automation workflows.

**Implementation:**
- Visual node-based flowchart builder
- Conditional branching (if opened → A, if not → B)
- Behavioral triggers (clicked link, visited page, tag added)
- Wait-until conditions (wait for open, then proceed)
- Lead scoring (accumulate points from actions)
- Goal tracking (conversion events that exit the automation)
- Multi-channel steps (email → wait → SMS → wait → WhatsApp)
- Time-based conditions (wait 3 days, wait until Tuesday)

**Revenue model:** Premium/enterprise plan feature

---

## Priority 8: Transactional Email API (Developer Product)

Package existing SMTP relay + API as a developer product.

**Implementation:**
- Already mostly exists (transactional SMTP and API endpoints)
- Per-email pricing ($0.50-$1.00 per 1000 emails)
- Developer documentation portal
- SDKs: PHP, Python, Node.js, Ruby
- API key management in dashboard
- Webhook events for delivery status
- Template management via API
- Dedicated IPs for transactional (separate from marketing)

**Revenue model:** Pay-per-email, volume discounts

---

## Priority 9: Deliverability Dashboard (Premium Add-on)

Monitoring and diagnostics for sender reputation.

**Implementation:**
- DMARC/DKIM/SPF record monitoring
- Blacklist monitoring (Spamhaus, Barracuda, etc.)
- Inbox placement testing (seed list approach)
- Domain reputation scoring over time
- IP reputation tracking
- Complaint rate trending
- Bounce rate analysis by domain
- Recommended actions for issues

**Revenue model:** Premium add-on, per-domain pricing

---

## Implementation Order

After the core frontend modernization (Phases 1-10 in migration-plan.md):

1. SaaS signup + payments (Paynow + Stripe) — unlocks recurring revenue
2. SMS + WhatsApp — unlocks the mobile-first market
3. A/B testing — low effort, immediate value for existing users
4. Contact verification — protects reputation, easy upsell
5. Reseller/Agency model — extends SaaS for scale
6. Landing pages — natural extension of forms
7. Automation upgrades — premium feature for power users
8. Transactional API — developer market
9. Deliverability dashboard — niche premium add-on
