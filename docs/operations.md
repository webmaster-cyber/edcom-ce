# Operational Notes

## Fix: SES Bounce Emails Flooding Inbox

**Problem:** AWS SES sends NDR (bounce) emails to your inbox even though the platform processes bounces via SNS webhooks. This is because SES has "Email Feedback Forwarding" enabled by default — it sends bounces both via SNS AND via email.

**Fix:** Disable email feedback forwarding for each SES identity once SNS notifications are confirmed working.

### Via AWS Console:
1. Go to SES → Verified Identities → Select your domain/email
2. Click **Notifications** tab
3. Under **Email Feedback Forwarding**, click **Edit**
4. Disable for Bounces and Complaints
5. Save

### Via AWS CLI:
```bash
# Disable email bounce forwarding (bounces go via SNS only)
aws ses set-identity-notifications-enabled \
  --identity yourdomain.com \
  --notification-type Bounce \
  --enabled false

# Disable email complaint forwarding
aws ses set-identity-notifications-enabled \
  --identity yourdomain.com \
  --notification-type Complaint \
  --enabled false
```

### Verify SNS is working first:
```bash
# Check that SNS topics exist and are subscribed
aws sns list-topics
aws sns list-subscriptions-by-topic --topic-arn arn:aws:sns:region:account:edcom-ses-XXXX
```

The platform automatically creates SNS topics (`edcom-ses-{id}`) and subscribes the webhook URL when you add an SES account via the admin portal. Confirm the subscription is "Confirmed" before disabling email forwarding.

---

## Bounce Handling: How It Works

### Supported providers (automatic via webhooks):
| Provider | Webhook Endpoint | Bounce Classification |
|----------|-----------------|----------------------|
| SES | `/api/seswebhook` (SNS) | bounceType: Permanent/Transient |
| SparkPost | `/api/spwebhook` | bounce_class: 10,30,90 = hard |
| Mailgun | `/api/mgwebhook` | severity: permanent/temporary |

### Not supported (bounces go to inbox, no processing):
- Generic SMTP relays
- Custom MTAs
- Velocity MTA (built-in)
- Any provider without a webhook integration

See `docs/future-roadmap.md` → "Priority 0: Universal Bounce Ingestion Service" for the planned fix.

### What happens when a bounce is processed:
1. Webhook received → pushed to Redis `webhooks-pending` queue
2. `process_webhooks.py` service dequeues and classifies
3. Hard bounce: contact added to `unsublogs` suppression table, contact property `Bounced = true`
4. Soft bounce: logged only, contact can be retried
5. Complaint: same as hard bounce (immediate suppression)
6. Campaign/list statistics updated (bounce counters)

---

## Production Server Reference

- **IP:** 92.119.124.102
- **Install path:** `/root/edcom-install/`
- **Restart:** `cd /root/edcom-install && ./restart.sh`
- **License:** `E246BF-CC8F7D-F6234E-E24C9B-E148B7-V3`
- **Backup:** `/root/edcom-install-backup-20260124/`
- **DB dump:** `/root/edcom-db-backup-20260124.sql`
