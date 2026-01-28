import falcon
import json
import email.utils
import re
import shortuuid
from datetime import datetime, timedelta
from typing import Any

from .shared import config as _  # noqa: F401
from .shared.crud import CRUDCollection, CRUDSingle
from .shared.db import json_iter, json_obj, open_db, DB
from .shared.utils import user_log, get_webroot
from .shared.payments import get_gateway
from .shared.log import get_logger

log = get_logger()


# --- Billing Email Notifications ---

def send_billing_email(db: DB, company_id: str, subject: str, body: str) -> None:
    """Send a billing notification email to the company's admin user(s)."""
    from .app import send_internal_txn

    company = db.companies.get(company_id)
    if not company:
        log.warning("Cannot send billing email: company %s not found", company_id)
        return

    frontend = db.frontends.get(company.get("frontend", ""))
    if not frontend or not frontend.get("txnaccount"):
        log.warning("Cannot send billing email: no txnaccount configured for frontend")
        return

    # Find admin users for this company
    users = list(json_iter(
        db.execute(
            "select id, cid, data from users where cid = %s and (data->>'admin')::boolean",
            company_id,
        )
    ))
    if not users:
        # Fall back to any user in the company
        users = list(json_iter(
            db.execute(
                "select id, cid, data from users where cid = %s limit 1",
                company_id,
            )
        ))

    for user in users:
        toaddr = email.utils.formataddr((user.get("name", ""), user.get("username", "")))
        try:
            send_internal_txn(db, frontend, toaddr, subject, body)
            log.info("Sent billing email to %s: %s", user.get("username"), subject)
        except Exception:
            log.exception("Failed to send billing email to %s", user.get("username"))


def send_payment_success_email(db: DB, company_id: str, plan_name: str, amount: str, currency: str) -> None:
    """Send payment confirmation email."""
    webroot = get_webroot()
    body = f"""<html><body>
<p>Your payment has been received. Thank you!</p>
<p><strong>Plan:</strong> {plan_name}<br>
<strong>Amount:</strong> {currency} {amount}</p>
<p>Your subscription is now active. You can view your billing details and invoices in your <a href="{webroot}/billing">account settings</a>.</p>
<p>Thank you for your business.</p>
</body></html>"""
    send_billing_email(db, company_id, "Payment Confirmed", body)


def send_payment_failed_email(db: DB, company_id: str, plan_name: str, amount: str, currency: str) -> None:
    """Send payment failure notification."""
    webroot = get_webroot()
    body = f"""<html><body>
<p>We were unable to process your payment.</p>
<p><strong>Plan:</strong> {plan_name}<br>
<strong>Amount:</strong> {currency} {amount}</p>
<p>Please update your payment method or try again. You can manage your subscription in your <a href="{webroot}/billing">account settings</a>.</p>
<p>If you continue to experience issues, please contact support.</p>
</body></html>"""
    send_billing_email(db, company_id, "Payment Failed", body)


def send_renewal_reminder_email(db: DB, company_id: str, plan_name: str, amount: str, currency: str, days_until: int) -> None:
    """Send upcoming renewal reminder."""
    webroot = get_webroot()
    body = f"""<html><body>
<p>This is a reminder that your subscription will renew in {days_until} day{"s" if days_until != 1 else ""}.</p>
<p><strong>Plan:</strong> {plan_name}<br>
<strong>Amount:</strong> {currency} {amount}</p>
<p>No action is required if you wish to continue your subscription. To make changes, visit your <a href="{webroot}/billing">account settings</a>.</p>
</body></html>"""
    send_billing_email(db, company_id, f"Subscription Renewal in {days_until} Days", body)


def send_trial_ending_email(db: DB, company_id: str, plan_name: str, days_until: int) -> None:
    """Send trial ending reminder."""
    webroot = get_webroot()
    body = f"""<html><body>
<p>Your free trial of the <strong>{plan_name}</strong> plan will end in {days_until} day{"s" if days_until != 1 else ""}.</p>
<p>To continue using all features, please add a payment method in your <a href="{webroot}/billing">account settings</a>.</p>
<p>If you have any questions, please don't hesitate to contact support.</p>
</body></html>"""
    send_billing_email(db, company_id, f"Trial Ending in {days_until} Days", body)


def send_subscription_cancelled_email(db: DB, company_id: str, plan_name: str) -> None:
    """Send subscription cancellation confirmation."""
    webroot = get_webroot()
    body = f"""<html><body>
<p>Your subscription to the <strong>{plan_name}</strong> plan has been cancelled.</p>
<p>You will continue to have access until the end of your current billing period.</p>
<p>If you change your mind, you can resubscribe anytime from your <a href="{webroot}/billing">account settings</a>.</p>
<p>We're sorry to see you go. If you have any feedback, we'd love to hear from you.</p>
</body></html>"""
    send_billing_email(db, company_id, "Subscription Cancelled", body)


# --- Plan CRUD (admin only) ---


class Plans(CRUDCollection):

    def __init__(self) -> None:
        self.domain = "plans"
        self.adminonly = True
        self.userlog = "plan"
        self.uniq = "slug"


class Plan(CRUDSingle):

    def __init__(self) -> None:
        self.domain = "plans"
        self.adminonly = True
        self.userlog = "plan"
        self.uniq = "slug"


class PublicPlans(object):
    """Unauthenticated endpoint: GET /api/public/plans"""

    def on_get(self, req: falcon.Request, resp: falcon.Response) -> None:
        with open_db() as db:
            rows = list(
                json_iter(
                    db.execute(
                        "select id, cid, data from plans where (data->>'active')::boolean order by (data->>'sort_order')::int, data->>'name'"
                    )
                )
            )
            # Strip internal fields
            result = []
            for r in rows:
                result.append(
                    {
                        "id": r["id"],
                        "name": r.get("name", ""),
                        "slug": r.get("slug", ""),
                        "description": r.get("description", ""),
                        "price_usd": r.get("price_usd", 0),
                        "price_zwl": r.get("price_zwl", 0),
                        "billing_period": r.get("billing_period", "monthly"),
                        "subscriber_limit": r.get("subscriber_limit"),
                        "send_limit_monthly": r.get("send_limit_monthly"),
                        "features": r.get("features", []),
                        "trial_days": r.get("trial_days", 0),
                        "is_free": r.get("is_free", False),
                        "sort_order": r.get("sort_order", 0),
                    }
                )
            req.context["result"] = result


# --- Subscription ---


class Subscription(object):
    """GET /api/subscription - current company subscription
    POST /api/subscription - create/update subscription
    PATCH /api/subscription - update subscription fields
    """

    def on_get(self, req: falcon.Request, resp: falcon.Response) -> None:
        db = req.context["db"]
        cid = db.get_cid()

        sub = json_obj(
            db.row(
                "select id, cid, data from subscriptions where data->>'company_id' = %s order by data->>'created' desc limit 1",
                cid,
            )
        )

        if sub is None:
            req.context["result"] = {"status": "none"}
            return

        # Attach plan info
        plan = db.plans.get(sub.get("plan_id", ""))
        if plan:
            sub["plan"] = plan

        req.context["result"] = sub

    def on_post(self, req: falcon.Request, resp: falcon.Response) -> None:
        doc = req.context.get("doc")
        if not doc:
            raise falcon.HTTPBadRequest(
                title="Not JSON", description="A valid JSON document is required."
            )

        db = req.context["db"]
        cid = db.get_cid()

        plan_id = doc.get("plan_id")
        if not plan_id:
            raise falcon.HTTPBadRequest(title="Missing plan_id")

        plan = db.plans.get(plan_id)
        if not plan:
            raise falcon.HTTPBadRequest(title="Invalid plan")

        now = datetime.utcnow().isoformat() + "Z"

        # Check for existing active subscription
        existing = json_obj(
            db.row(
                "select id, cid, data from subscriptions where data->>'company_id' = %s and data->>'status' in ('active', 'trialing') limit 1",
                cid,
            )
        )

        if existing:
            # Update existing subscription plan
            db.subscriptions.patch(
                existing["id"],
                {
                    "plan_id": plan_id,
                    "modified": now,
                },
            )
            req.context["result"] = db.subscriptions.get(existing["id"])
            return

        # Create new subscription
        trial_days = plan.get("trial_days", 0)
        is_free = plan.get("is_free", False)

        status = "active" if is_free else ("trialing" if trial_days > 0 else "active")
        trial_start = now if trial_days > 0 else None
        trial_end = (
            (datetime.utcnow() + timedelta(days=trial_days)).isoformat() + "Z"
            if trial_days > 0
            else None
        )

        sub_data = {
            "company_id": cid,
            "plan_id": plan_id,
            "status": status,
            "trial_start": trial_start,
            "trial_end": trial_end,
            "current_period_start": now,
            "current_period_end": (
                datetime.utcnow() + timedelta(days=30)
            ).isoformat()
            + "Z",
            "gateway": "free" if is_free else "",
            "gateway_subscription_id": None,
            "cancel_at_period_end": False,
            "created": now,
        }

        sub_id = db.subscriptions.add(sub_data)
        resp.status = falcon.HTTP_201
        req.context["result"] = db.subscriptions.get(sub_id)

    def on_patch(self, req: falcon.Request, resp: falcon.Response) -> None:
        doc = req.context.get("doc")
        if not doc:
            raise falcon.HTTPBadRequest(
                title="Not JSON", description="A valid JSON document is required."
            )

        db = req.context["db"]
        cid = db.get_cid()

        sub = json_obj(
            db.row(
                "select id, cid, data from subscriptions where data->>'company_id' = %s order by data->>'created' desc limit 1",
                cid,
            )
        )
        if not sub:
            raise falcon.HTTPBadRequest(title="No subscription found")

        allowed_fields = {
            "cancel_at_period_end",
            "gateway",
            "gateway_subscription_id",
            "status",
        }
        patch = {k: v for k, v in doc.items() if k in allowed_fields}
        patch["modified"] = datetime.utcnow().isoformat() + "Z"

        db.subscriptions.patch(sub["id"], patch)
        req.context["result"] = db.subscriptions.get(sub["id"])


class SubscriptionUsage(object):
    """GET /api/subscription/usage - current usage vs plan limits"""

    def on_get(self, req: falcon.Request, resp: falcon.Response) -> None:
        db = req.context["db"]
        cid = db.get_cid()

        sub = json_obj(
            db.row(
                "select id, cid, data from subscriptions where data->>'company_id' = %s and data->>'status' in ('active', 'trialing') limit 1",
                cid,
            )
        )

        if not sub:
            req.context["result"] = {
                "subscription": None,
                "usage": {},
                "limits": {},
            }
            return

        plan = db.plans.get(sub.get("plan_id", ""))

        # Count subscribers across all lists
        subscriber_count = (
            db.single(
                "select count(distinct data->>'email') from contacts.data_%s" % cid
            )
            or 0
        ) if db.single("select to_regclass('contacts.data_%s')" % cid) else 0

        # Count sends this month (from statlogs)
        month_start = datetime.utcnow().replace(day=1).isoformat() + "Z"
        send_count = (
            db.single(
                "select coalesce(sum(send), 0) from hourstats where cid = %s and hour >= %s",
                cid,
                month_start,
            )
            or 0
        )

        subscriber_limit = plan.get("subscriber_limit") if plan else None
        send_limit = plan.get("send_limit_monthly") if plan else None

        req.context["result"] = {
            "subscription": sub,
            "plan": plan,
            "usage": {
                "subscribers": subscriber_count,
                "sends_this_month": send_count,
            },
            "limits": {
                "subscriber_limit": subscriber_limit,
                "send_limit_monthly": send_limit,
            },
        }


# --- Invoices ---


class Invoices(object):
    """GET /api/billing/invoices - list invoices for current company"""

    def on_get(self, req: falcon.Request, resp: falcon.Response) -> None:
        db = req.context["db"]
        cid = db.get_cid()

        req.context["result"] = list(
            json_iter(
                db.execute(
                    "select id, cid, data from invoices where data->>'company_id' = %s order by data->>'created' desc",
                    cid,
                )
            )
        )


class Invoice(object):
    """GET /api/billing/invoices/{id} - single invoice"""

    def on_get(self, req: falcon.Request, resp: falcon.Response, id: str) -> None:
        db = req.context["db"]
        inv = db.invoices.get(id)
        if not inv:
            raise falcon.HTTPNotFound()
        req.context["result"] = inv


# --- Checkout ---


class Checkout(object):
    """POST /api/billing/checkout - initiate payment for a subscription"""

    def on_post(self, req: falcon.Request, resp: falcon.Response) -> None:
        doc = req.context.get("doc")
        if not doc:
            raise falcon.HTTPBadRequest(
                title="Not JSON", description="A valid JSON document is required."
            )

        db = req.context["db"]
        cid = db.get_cid()

        plan_id = doc.get("plan_id")
        gateway_type = doc.get("gateway", "paynow")
        phone = doc.get("phone")
        currency = doc.get("currency", "usd")

        plan = db.plans.get(plan_id)
        if not plan:
            raise falcon.HTTPBadRequest(title="Invalid plan")

        if plan.get("is_free"):
            raise falcon.HTTPBadRequest(title="Cannot checkout a free plan")

        # Get or create subscription
        sub = json_obj(
            db.row(
                "select id, cid, data from subscriptions where data->>'company_id' = %s order by data->>'created' desc limit 1",
                cid,
            )
        )

        now = datetime.utcnow().isoformat() + "Z"

        if not sub:
            sub_id = db.subscriptions.add(
                {
                    "company_id": cid,
                    "plan_id": plan_id,
                    "status": "pending",
                    "gateway": gateway_type,
                    "created": now,
                }
            )
            sub = db.subscriptions.get(sub_id)
        else:
            db.subscriptions.patch(sub["id"], {"plan_id": plan_id, "gateway": gateway_type})
            sub = db.subscriptions.get(sub["id"])

        # Determine amount
        amount = plan.get("price_usd", 0)
        if currency.lower() == "zwl":
            amount = plan.get("price_zwl", 0)

        # Create invoice
        invoice_id = db.invoices.add(
            {
                "company_id": cid,
                "subscription_id": sub["id"],
                "plan_id": plan_id,
                "amount": amount,
                "currency": currency.upper(),
                "status": "pending",
                "gateway": gateway_type,
                "description": "Subscription: %s" % plan.get("name", "Plan"),
                "created": now,
                "phone": phone,
            }
        )
        invoice = db.invoices.get(invoice_id)

        # Get gateway and create checkout
        gateway = get_gateway(db, gateway_type)
        if not gateway:
            raise falcon.HTTPBadRequest(
                title="Payment gateway unavailable",
                description="The %s payment gateway is not configured" % gateway_type,
            )

        result = gateway.create_checkout(sub, invoice)

        if result.get("reference"):
            db.invoices.patch(
                invoice_id,
                {"gateway_payment_id": result["reference"]},
            )

        req.context["result"] = {
            "invoice_id": invoice_id,
            "redirect_url": result.get("redirect_url"),
            "poll_url": result.get("poll_url"),
            "reference": result.get("reference", ""),
            "instructions": result.get("instructions"),
            "error": result.get("error"),
        }


# --- Webhooks ---


class PaynowWebhook(object):
    """POST /api/webhooks/paynow - Paynow payment notification"""

    def on_post(self, req: falcon.Request, resp: falcon.Response) -> None:
        body = req.bounded_stream.read()

        with open_db() as db:
            gateway = get_gateway(db, "paynow")
            if not gateway:
                log.error("Paynow webhook received but gateway not configured")
                return

            result = gateway.handle_webhook(body, dict(req.headers))

            if result.get("paid"):
                ref = result.get("reference", "")
                inv = json_obj(
                    db.row(
                        "select id, cid, data from invoices where data->>'gateway_payment_id' = %s limit 1",
                        ref,
                    )
                )
                if inv:
                    now = datetime.utcnow().isoformat() + "Z"
                    db.invoices.patch(
                        inv["id"],
                        {
                            "status": "paid",
                            "paid_at": now,
                            "gateway_reference": result.get("paynow_reference", ""),
                        },
                    )
                    # Activate subscription
                    sub_id = inv.get("subscription_id")
                    if sub_id:
                        db.subscriptions.patch(
                            sub_id,
                            {
                                "status": "active",
                                "current_period_start": now,
                                "current_period_end": (
                                    datetime.utcnow() + timedelta(days=30)
                                ).isoformat()
                                + "Z",
                            },
                        )
                        log.info("Paynow payment completed for invoice %s", inv["id"])

                        # Send payment success email
                        try:
                            sub = db.subscriptions.get(sub_id)
                            if sub:
                                plan = db.plans.get(sub.get("plan_id", ""))
                                plan_name = plan.get("name", "Unknown") if plan else "Unknown"
                                amount = str(inv.get("amount", 0))
                                currency = inv.get("currency", "USD")
                                send_payment_success_email(db, sub.get("company_id", ""), plan_name, amount, currency)
                        except Exception:
                            log.exception("Failed to send payment success email")
                else:
                    log.warning("Paynow webhook: no invoice found for reference %s", ref)


class StripeWebhook(object):
    """POST /api/webhooks/stripe - Stripe webhook handler"""

    def on_post(self, req: falcon.Request, resp: falcon.Response) -> None:
        body = req.bounded_stream.read()
        headers = {k: v for k, v in req.headers.items()}

        with open_db() as db:
            gateway = get_gateway(db, "stripe")
            if not gateway:
                log.error("Stripe webhook received but gateway not configured")
                return

            result = gateway.handle_webhook(body, headers)

            if result.get("event") == "payment_complete" and result.get("paid"):
                metadata = result.get("metadata", {})
                invoice_id = metadata.get("invoice_id")
                subscription_id = metadata.get("subscription_id")

                now = datetime.utcnow().isoformat() + "Z"

                if invoice_id:
                    db.invoices.patch(
                        invoice_id,
                        {
                            "status": "paid",
                            "paid_at": now,
                            "gateway_payment_id": result.get("reference", ""),
                        },
                    )

                if subscription_id:
                    db.subscriptions.patch(
                        subscription_id,
                        {
                            "status": "active",
                            "current_period_start": now,
                            "current_period_end": (
                                datetime.utcnow() + timedelta(days=30)
                            ).isoformat()
                            + "Z",
                        },
                    )
                    log.info("Stripe payment completed for subscription %s", subscription_id)

                    # Send payment success email
                    try:
                        sub = db.subscriptions.get(subscription_id)
                        inv = db.invoices.get(invoice_id) if invoice_id else None
                        if sub:
                            plan = db.plans.get(sub.get("plan_id", ""))
                            plan_name = plan.get("name", "Unknown") if plan else "Unknown"
                            amount = str(inv.get("amount", 0)) if inv else "0"
                            currency = inv.get("currency", "USD") if inv else "USD"
                            send_payment_success_email(db, sub.get("company_id", ""), plan_name, amount, currency)
                    except Exception:
                        log.exception("Failed to send payment success email")

            elif result.get("event") == "payment_failed":
                metadata = result.get("metadata", {})
                subscription_id = metadata.get("subscription_id")
                invoice_id = metadata.get("invoice_id")
                log.warning("Stripe payment failed: %s", result.get("reference", ""))

                # Send payment failed email
                try:
                    if subscription_id:
                        sub = db.subscriptions.get(subscription_id)
                        inv = db.invoices.get(invoice_id) if invoice_id else None
                        if sub:
                            plan = db.plans.get(sub.get("plan_id", ""))
                            plan_name = plan.get("name", "Unknown") if plan else "Unknown"
                            amount = str(inv.get("amount", 0)) if inv else "0"
                            currency = inv.get("currency", "USD") if inv else "USD"
                            send_payment_failed_email(db, sub.get("company_id", ""), plan_name, amount, currency)
                except Exception:
                    log.exception("Failed to send payment failed email")


# --- Admin: Payment Gateway Config ---


class PaymentGateways(CRUDCollection):

    def __init__(self) -> None:
        self.domain = "payment_gateways"
        self.adminonly = True
        self.userlog = "payment gateway"
        self.uniq = "name"


class PaymentGatewayConfig(CRUDSingle):

    def __init__(self) -> None:
        self.domain = "payment_gateways"
        self.adminonly = True
        self.userlog = "payment gateway"
        self.uniq = "name"


# --- Plan Upgrade ---


class PlanUpgrade(object):
    """POST /api/billing/upgrade - upgrade/change plan"""

    def on_post(self, req: falcon.Request, resp: falcon.Response) -> None:
        doc = req.context.get("doc")
        if not doc:
            raise falcon.HTTPBadRequest(
                title="Not JSON", description="A valid JSON document is required."
            )

        db = req.context["db"]
        cid = db.get_cid()

        new_plan_id = doc.get("plan_id")
        if not new_plan_id:
            raise falcon.HTTPBadRequest(title="Missing plan_id")

        new_plan = db.plans.get(new_plan_id)
        if not new_plan:
            raise falcon.HTTPBadRequest(title="Invalid plan")

        sub = json_obj(
            db.row(
                "select id, cid, data from subscriptions where data->>'company_id' = %s and data->>'status' in ('active', 'trialing') limit 1",
                cid,
            )
        )

        if not sub:
            raise falcon.HTTPBadRequest(title="No active subscription to upgrade")

        now = datetime.utcnow().isoformat() + "Z"

        db.subscriptions.patch(
            sub["id"],
            {
                "plan_id": new_plan_id,
                "modified": now,
            },
        )

        user_log(req, "arrow-up", "upgraded plan to ", "plans", new_plan_id, ".")

        req.context["result"] = db.subscriptions.get(sub["id"])


# --- Cron: Expire trials and lapsed subscriptions ---

def check_subscriptions() -> None:
    """Cron job to expire trials and lapsed subscriptions.

    - Moves 'trialing' subscriptions to 'expired' when trial_end has passed.
    - Moves 'active' subscriptions to 'expired' when current_period_end has
      passed and they have no auto-renewing gateway (i.e. free or manual).
    - Moves 'active' subscriptions with cancel_at_period_end to 'cancelled'
      when their period ends.
    """
    now = datetime.utcnow().isoformat() + "Z"
    with open_db() as db:
        try:
            # Expire ended trials
            expired_trials = db.single(
                """update subscriptions
                   set data = data || %s
                   where data->>'status' = 'trialing'
                     and data->>'trial_end' is not null
                     and data->>'trial_end' < %s
                   returning count(*)""",
                {"status": "expired"},
                now,
            ) or 0
            if expired_trials:
                log.info("Expired %s trial subscriptions", expired_trials)

            # Cancel subscriptions marked for end-of-period cancellation
            to_cancel = list(json_iter(
                db.execute(
                    """select id, cid, data from subscriptions
                       where data->>'status' = 'active'
                         and (data->>'cancel_at_period_end')::boolean
                         and data->>'current_period_end' is not null
                         and data->>'current_period_end' < %s""",
                    now,
                )
            ))
            for sub in to_cancel:
                db.subscriptions.patch(sub["id"], {"status": "cancelled"})
                try:
                    plan = db.plans.get(sub.get("plan_id", ""))
                    plan_name = plan.get("name", "Unknown") if plan else "Unknown"
                    send_subscription_cancelled_email(db, sub.get("company_id", ""), plan_name)
                except Exception:
                    log.exception("Failed to send cancellation email for subscription %s", sub.get("id"))
            if to_cancel:
                log.info("Cancelled %s end-of-period subscriptions", len(to_cancel))

            # Expire free/manual subscriptions past their period
            expired_lapsed = db.single(
                """update subscriptions
                   set data = data || %s
                   where data->>'status' = 'active'
                     and data->>'gateway' in ('free', 'admin', '')
                     and data->>'current_period_end' is not null
                     and data->>'current_period_end' < %s
                     and not (data->>'cancel_at_period_end')::boolean
                   returning count(*)""",
                {"status": "expired"},
                now,
            ) or 0
            if expired_lapsed:
                log.info("Expired %s lapsed subscriptions", expired_lapsed)

            # Send trial ending reminders (3 days before)
            three_days_from_now = (datetime.utcnow() + timedelta(days=3)).isoformat() + "Z"
            trial_reminders = list(json_iter(
                db.execute(
                    """select id, cid, data from subscriptions
                       where data->>'status' = 'trialing'
                         and data->>'trial_end' is not null
                         and data->>'trial_end' > %s
                         and data->>'trial_end' < %s
                         and (data->>'trial_reminder_sent' is null or data->>'trial_reminder_sent' = '')""",
                    now, three_days_from_now,
                )
            ))
            for sub in trial_reminders:
                try:
                    plan = db.plans.get(sub.get("plan_id", ""))
                    plan_name = plan.get("name", "Unknown") if plan else "Unknown"
                    trial_end = sub.get("trial_end", "")
                    if trial_end:
                        end_dt = datetime.fromisoformat(trial_end.replace("Z", "+00:00"))
                        days_until = max(1, (end_dt.replace(tzinfo=None) - datetime.utcnow()).days)
                        send_trial_ending_email(db, sub.get("company_id", ""), plan_name, days_until)
                        db.subscriptions.patch(sub["id"], {"trial_reminder_sent": now})
                        log.info("Sent trial ending reminder for subscription %s", sub["id"])
                except Exception:
                    log.exception("Failed to send trial reminder for subscription %s", sub.get("id"))

            # Send renewal reminders for paid subscriptions (3 days before)
            renewal_reminders = list(json_iter(
                db.execute(
                    """select id, cid, data from subscriptions
                       where data->>'status' = 'active'
                         and data->>'gateway' not in ('free', 'admin', '')
                         and data->>'current_period_end' is not null
                         and data->>'current_period_end' > %s
                         and data->>'current_period_end' < %s
                         and not (data->>'cancel_at_period_end')::boolean
                         and (data->>'renewal_reminder_sent' is null or data->>'renewal_reminder_sent' = '')""",
                    now, three_days_from_now,
                )
            ))
            for sub in renewal_reminders:
                try:
                    plan = db.plans.get(sub.get("plan_id", ""))
                    if plan:
                        plan_name = plan.get("name", "Unknown")
                        price = plan.get("price_usd", 0)
                        period_end = sub.get("current_period_end", "")
                        if period_end:
                            end_dt = datetime.fromisoformat(period_end.replace("Z", "+00:00"))
                            days_until = max(1, (end_dt.replace(tzinfo=None) - datetime.utcnow()).days)
                            send_renewal_reminder_email(db, sub.get("company_id", ""), plan_name, str(price), "USD", days_until)
                            db.subscriptions.patch(sub["id"], {"renewal_reminder_sent": now})
                            log.info("Sent renewal reminder for subscription %s", sub["id"])
                except Exception:
                    log.exception("Failed to send renewal reminder for subscription %s", sub.get("id"))

        except Exception:
            log.exception("Error in check_subscriptions cron")


# --- Public Contact Form ---

# Simple rate limiting - track submissions per IP
_contact_rate_limit: dict[str, list[float]] = {}
RATE_LIMIT_WINDOW = 3600  # 1 hour
RATE_LIMIT_MAX = 5  # Max 5 submissions per hour per IP


def _check_rate_limit(ip: str) -> bool:
    """Check if IP is within rate limit. Returns True if allowed."""
    import time
    now = time.time()

    # Clean old entries
    if ip in _contact_rate_limit:
        _contact_rate_limit[ip] = [t for t in _contact_rate_limit[ip] if now - t < RATE_LIMIT_WINDOW]

    # Check limit
    submissions = _contact_rate_limit.get(ip, [])
    if len(submissions) >= RATE_LIMIT_MAX:
        return False

    # Record this submission
    if ip not in _contact_rate_limit:
        _contact_rate_limit[ip] = []
    _contact_rate_limit[ip].append(now)
    return True


class PublicContact(object):
    """Unauthenticated endpoint: POST /api/public/contact"""

    def on_options(self, req: falcon.Request, resp: falcon.Response) -> None:
        resp.set_header("Access-Control-Allow-Origin", "*")
        resp.set_header("Access-Control-Allow-Methods", "POST, OPTIONS")
        resp.set_header(
            "Access-Control-Allow-Headers",
            req.get_header("Access-Control-Request-Headers") or "*",
        )
        resp.set_header("Access-Control-Max-Age", 86400)
        resp.set_header("Allow", "POST, OPTIONS")
        resp.content_type = "text/plain"

    def on_post(self, req: falcon.Request, resp: falcon.Response) -> None:
        resp.set_header("Access-Control-Allow-Origin", "*")
        doc = req.context.get("doc")
        if not doc:
            raise falcon.HTTPBadRequest(
                title="Not JSON", description="A valid JSON document is required."
            )

        # Rate limiting
        client_ip = req.access_route[0] if req.access_route else req.remote_addr or "unknown"
        if not _check_rate_limit(client_ip):
            raise falcon.HTTPTooManyRequests(
                title="Too many requests",
                description="Please wait before submitting another message."
            )

        # Honeypot check - if 'website_url' field is filled, it's likely a bot
        honeypot = doc.get("website_url", "")
        if honeypot:
            log.info("Contact form honeypot triggered from IP %s", client_ip)
            # Return success to not tip off the bot
            req.context["result"] = {"success": True}
            return

        # Validate required fields
        name = doc.get("name", "").strip()
        email_addr = doc.get("email", "").strip()
        phone = doc.get("phone", "").strip()
        subject = doc.get("subject", "").strip()
        message = doc.get("message", "").strip()

        if not name:
            raise falcon.HTTPBadRequest(title="Name is required")
        if not email_addr:
            raise falcon.HTTPBadRequest(title="Email is required")
        if not message:
            raise falcon.HTTPBadRequest(title="Message is required")

        # Basic email validation
        email_pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
        if not re.match(email_pattern, email_addr):
            raise falcon.HTTPBadRequest(title="Invalid email address")

        # Limit field lengths
        if len(name) > 200:
            raise falcon.HTTPBadRequest(title="Name too long")
        if len(email_addr) > 200:
            raise falcon.HTTPBadRequest(title="Email too long")
        if len(phone) > 50:
            raise falcon.HTTPBadRequest(title="Phone too long")
        if len(subject) > 500:
            raise falcon.HTTPBadRequest(title="Subject too long")
        if len(message) > 10000:
            raise falcon.HTTPBadRequest(title="Message too long")

        now = datetime.utcnow().isoformat() + "Z"
        msg_id = shortuuid.uuid()

        with open_db() as db:
            db.execute(
                "insert into contact_messages (id, data) values (%s, %s)",
                msg_id,
                json.dumps({
                    "name": name,
                    "email": email_addr,
                    "phone": phone,
                    "subject": subject or "(No subject)",
                    "message": message,
                    "ip": client_ip,
                    "status": "new",
                    "created": now,
                }),
            )
            log.info("Contact message received from %s <%s>", name, email_addr)

        req.context["result"] = {"success": True, "message": "Your message has been sent. We'll be in touch soon."}


class ContactMessages(object):
    """Admin endpoint: GET /api/admin/contact-messages"""

    def on_get(self, req: falcon.Request, resp: falcon.Response) -> None:
        if not req.context["admin"]:
            raise falcon.HTTPUnauthorized()

        db = req.context["db"]
        # Fetch all contact messages (not filtered by company)
        rows = list(
            json_iter(
                db.execute(
                    "SELECT id, cid, data FROM contact_messages ORDER BY data->>'created' DESC"
                )
            )
        )
        req.context["result"] = rows


class ContactMessage(object):
    """Admin endpoint: GET/PATCH/DELETE /api/admin/contact-messages/{id}"""

    def on_get(self, req: falcon.Request, resp: falcon.Response, id: str) -> None:
        if not req.context["admin"]:
            raise falcon.HTTPUnauthorized()

        db = req.context["db"]
        row = json_obj(
            db.row("SELECT id, cid, data FROM contact_messages WHERE id = %s", id)
        )
        if not row:
            raise falcon.HTTPNotFound()
        req.context["result"] = row

    def on_patch(self, req: falcon.Request, resp: falcon.Response, id: str) -> None:
        if not req.context["admin"]:
            raise falcon.HTTPUnauthorized()

        doc = req.context.get("doc")
        if not doc:
            raise falcon.HTTPBadRequest(
                title="Not JSON", description="A valid JSON document is required."
            )

        db = req.context["db"]
        # Only allow updating status
        allowed_fields = {"status"}
        update_data = {k: v for k, v in doc.items() if k in allowed_fields}

        if update_data:
            db.execute(
                "UPDATE contact_messages SET data = data || %s WHERE id = %s",
                json.dumps(update_data),
                id,
            )

        row = json_obj(
            db.row("SELECT id, cid, data FROM contact_messages WHERE id = %s", id)
        )
        req.context["result"] = row

    def on_delete(self, req: falcon.Request, resp: falcon.Response, id: str) -> None:
        if not req.context["admin"]:
            raise falcon.HTTPUnauthorized()

        db = req.context["db"]
        db.execute("DELETE FROM contact_messages WHERE id = %s", id)
        req.context["result"] = {"deleted": True}
