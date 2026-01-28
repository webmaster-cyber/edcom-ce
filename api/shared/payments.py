import os
import json
import hmac
import hashlib
from abc import ABC, abstractmethod
from typing import Any, Dict, Optional
from datetime import datetime

from .db import open_db, JsonObj
from .log import get_logger

log = get_logger()


class PaymentGateway(ABC):
    """Abstract base class for payment gateway integrations."""

    @abstractmethod
    def create_checkout(self, subscription: JsonObj, invoice: JsonObj) -> Dict[str, Any]:
        """Create a checkout session/payment request.

        Returns dict with at least:
            - redirect_url (str|None): URL to redirect user to for payment
            - poll_url (str|None): URL to poll for payment status
            - reference (str): gateway-specific reference ID
        """
        ...

    @abstractmethod
    def verify_payment(self, reference: str) -> Dict[str, Any]:
        """Verify a payment by reference.

        Returns dict with:
            - paid (bool): whether payment was successful
            - reference (str): gateway reference
            - amount (float): amount paid
            - currency (str): currency code
        """
        ...

    @abstractmethod
    def handle_webhook(self, payload: bytes, headers: Dict[str, str]) -> Dict[str, Any]:
        """Handle an incoming webhook/notification from the gateway.

        Returns dict with:
            - event (str): event type (payment_complete, payment_failed, etc.)
            - reference (str): gateway reference
            - paid (bool): whether payment succeeded
        """
        ...

    @abstractmethod
    def cancel_subscription(self, gateway_subscription_id: str) -> None:
        """Cancel a subscription on the gateway side."""
        ...


class PaynowGateway(PaymentGateway):
    """Paynow payment gateway for EcoCash/mobile money (Zimbabwe)."""

    def __init__(self, integration_id: str, integration_key: str, return_url: str, result_url: str) -> None:
        self.integration_id = integration_id
        self.integration_key = integration_key
        self.return_url = return_url
        self.result_url = result_url

    @classmethod
    def from_config(cls, config: JsonObj) -> "PaynowGateway":
        return cls(
            integration_id=config["integration_id"],
            integration_key=config["integration_key"],
            return_url=config.get("return_url", ""),
            result_url=config.get("result_url", ""),
        )

    def _build_hash(self, values: str) -> str:
        return (
            hmac.new(
                self.integration_key.encode("utf-8"),
                values.encode("utf-8"),
                hashlib.sha512,
            )
            .hexdigest()
            .upper()
        )

    def create_checkout(self, subscription: JsonObj, invoice: JsonObj) -> Dict[str, Any]:
        try:
            from paynow import Paynow  # type: ignore
        except ImportError:
            log.error("paynow SDK not installed")
            return {"redirect_url": None, "poll_url": None, "reference": ""}

        paynow = Paynow(
            self.integration_id,
            self.integration_key,
            self.return_url,
            self.result_url,
        )

        payment = paynow.create_payment(
            invoice.get("description", "Subscription Payment"),
            invoice.get("email", ""),
        )
        payment.add("Subscription", float(invoice.get("amount", 0)))

        # For mobile money (EcoCash)
        phone = invoice.get("phone")
        if phone:
            response = paynow.send_mobile(payment, phone, "ecocash")
        else:
            response = paynow.send(payment)

        if response.success:
            return {
                "redirect_url": getattr(response, "redirect_url", None),
                "poll_url": getattr(response, "poll_url", None),
                "reference": getattr(response, "poll_url", ""),
                "instructions": response.instruction if hasattr(response, "instruction") else None,
            }

        log.error("Paynow checkout failed: %s", getattr(response, "error", "unknown"))
        return {"redirect_url": None, "poll_url": None, "reference": "", "error": getattr(response, "error", "Payment initiation failed")}

    def verify_payment(self, reference: str) -> Dict[str, Any]:
        try:
            from paynow import Paynow  # type: ignore
        except ImportError:
            return {"paid": False, "reference": reference, "amount": 0, "currency": "USD"}

        paynow = Paynow(
            self.integration_id,
            self.integration_key,
            self.return_url,
            self.result_url,
        )

        status = paynow.check_transaction_status(reference)
        paid = getattr(status, "paid", False)

        return {
            "paid": paid,
            "reference": reference,
            "amount": getattr(status, "amount", 0),
            "currency": "USD",
            "status": getattr(status, "status", "unknown"),
        }

    def handle_webhook(self, payload: bytes, headers: Dict[str, str]) -> Dict[str, Any]:
        try:
            data = dict(x.split("=", 1) for x in payload.decode("utf-8").split("&"))
        except Exception:
            log.exception("Failed to parse Paynow webhook")
            return {"event": "error", "reference": "", "paid": False}

        reference = data.get("pollurl", data.get("reference", ""))
        status = data.get("status", "").lower()
        paid = status in ("paid", "awaiting delivery", "delivered")

        return {
            "event": "payment_complete" if paid else "payment_failed",
            "reference": reference,
            "paid": paid,
            "paynow_reference": data.get("paynowreference", ""),
            "amount": float(data.get("amount", 0)),
        }

    def cancel_subscription(self, gateway_subscription_id: str) -> None:
        # Paynow doesn't have recurring subscriptions; cancellation is a no-op
        pass


class StripeGateway(PaymentGateway):
    """Stripe payment gateway for card payments."""

    def __init__(self, secret_key: str, webhook_secret: str, success_url: str, cancel_url: str) -> None:
        self.secret_key = secret_key
        self.webhook_secret = webhook_secret
        self.success_url = success_url
        self.cancel_url = cancel_url

    @classmethod
    def from_config(cls, config: JsonObj) -> "StripeGateway":
        return cls(
            secret_key=config["secret_key"],
            webhook_secret=config.get("webhook_secret", ""),
            success_url=config.get("success_url", ""),
            cancel_url=config.get("cancel_url", ""),
        )

    def _get_stripe(self) -> Any:
        try:
            import stripe  # type: ignore

            stripe.api_key = self.secret_key
            return stripe
        except ImportError:
            log.error("stripe SDK not installed")
            return None

    def create_checkout(self, subscription: JsonObj, invoice: JsonObj) -> Dict[str, Any]:
        stripe = self._get_stripe()
        if stripe is None:
            return {"redirect_url": None, "poll_url": None, "reference": "", "error": "Stripe not available"}

        try:
            session = stripe.checkout.Session.create(
                payment_method_types=["card"],
                line_items=[
                    {
                        "price_data": {
                            "currency": invoice.get("currency", "usd").lower(),
                            "product_data": {
                                "name": invoice.get("description", "Subscription"),
                            },
                            "unit_amount": int(float(invoice.get("amount", 0)) * 100),
                        },
                        "quantity": 1,
                    }
                ],
                mode="payment",
                success_url=self.success_url + "?session_id={CHECKOUT_SESSION_ID}",
                cancel_url=self.cancel_url,
                metadata={
                    "subscription_id": subscription.get("id", ""),
                    "invoice_id": invoice.get("id", ""),
                },
            )
            return {
                "redirect_url": session.url,
                "poll_url": None,
                "reference": session.id,
                "session_id": session.id,
            }
        except Exception as e:
            log.exception("Stripe checkout creation failed")
            return {"redirect_url": None, "poll_url": None, "reference": "", "error": str(e)}

    def verify_payment(self, reference: str) -> Dict[str, Any]:
        stripe = self._get_stripe()
        if stripe is None:
            return {"paid": False, "reference": reference, "amount": 0, "currency": "usd"}

        try:
            session = stripe.checkout.Session.retrieve(reference)
            return {
                "paid": session.payment_status == "paid",
                "reference": reference,
                "amount": (session.amount_total or 0) / 100,
                "currency": session.currency or "usd",
            }
        except Exception:
            log.exception("Stripe verify failed")
            return {"paid": False, "reference": reference, "amount": 0, "currency": "usd"}

    def handle_webhook(self, payload: bytes, headers: Dict[str, str]) -> Dict[str, Any]:
        stripe = self._get_stripe()
        if stripe is None:
            return {"event": "error", "reference": "", "paid": False}

        sig = headers.get("stripe-signature", "")
        try:
            event = stripe.Webhook.construct_event(payload, sig, self.webhook_secret)
        except Exception:
            log.exception("Stripe webhook signature verification failed")
            return {"event": "error", "reference": "", "paid": False}

        if event["type"] == "checkout.session.completed":
            session = event["data"]["object"]
            return {
                "event": "payment_complete",
                "reference": session["id"],
                "paid": session.get("payment_status") == "paid",
                "metadata": session.get("metadata", {}),
            }
        elif event["type"] in ("invoice.payment_failed", "payment_intent.payment_failed"):
            obj = event["data"]["object"]
            return {
                "event": "payment_failed",
                "reference": obj.get("id", ""),
                "paid": False,
            }

        return {"event": event["type"], "reference": "", "paid": False}

    def cancel_subscription(self, gateway_subscription_id: str) -> None:
        stripe = self._get_stripe()
        if stripe is None:
            return

        try:
            stripe.Subscription.delete(gateway_subscription_id)
        except Exception:
            log.exception("Stripe cancel subscription failed for %s", gateway_subscription_id)


def get_gateway(db: Any, gateway_type: str) -> Optional[PaymentGateway]:
    """Load a payment gateway by type from the database config."""
    from .db import json_obj

    row = db.row(
        "select id, cid, data from payment_gateways where data->>'type' = %s and (data->>'enabled')::boolean limit 1",
        gateway_type,
    )
    config = json_obj(row)
    if config is None:
        return None

    if gateway_type == "paynow":
        return PaynowGateway.from_config(config)
    elif gateway_type == "stripe":
        return StripeGateway.from_config(config)

    return None
