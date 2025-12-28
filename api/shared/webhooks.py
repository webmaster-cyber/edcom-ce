import json
from typing import List, Dict
import requests
from .utils import run_task, run_task_delay, redis_connect, get_webhost
from .tasks import tasks, NORMAL_PRIORITY
from .db import DB, JsonObj
from .log import get_logger

log = get_logger()


def send_webhooks(db: DB, cid: str, events: List[JsonObj]) -> None:
    rh: Dict[str, List[JsonObj]] = {}
    oldcid = db.get_cid()
    try:
        db.set_cid(cid)

        for hook in db.resthooks.get_all():
            ev = hook["event"]
            if ev not in rh:
                rh[ev] = []
            rh[ev].append(hook)
    finally:
        db.set_cid(oldcid)

    rdb = redis_connect()

    msgs_by_url: Dict[str, List[JsonObj]] = {}

    multieventtypes = {
        "open": ["open", "open_click"],
        "click": ["click", "open_click"],
        "unsub": ["unsub", "unsub_complaint"],
        "complaint": ["complaint", "unsub_complaint"],
    }

    for event in events:
        t = event["type"]
        if t == "bounce":
            if event["bouncetype"] == "hard":
                resteventtypes = ["bounce", "hard_bounce"]
            else:
                resteventtypes = ["bounce", "soft_bounce"]
        else:
            resteventtypes = multieventtypes.get(t, [t])

        for resteventtype in resteventtypes:
            rdb.set("lastevent-%s-%s" % (cid, resteventtype), json.dumps(event))

            if resteventtype not in rh:
                continue
            for h in rh[resteventtype]:
                url = h["target_url"]
                if url not in msgs_by_url:
                    msgs_by_url[url] = []
                msgs_by_url[url].append(
                    {
                        "event": event,
                        "remove_id": h["id"],
                    }
                )

    for url, msgs in msgs_by_url.items():
        run_task(send_webhooks_task, url, 0, msgs)


@tasks.task(priority=NORMAL_PRIORITY)
def send_webhooks_task(url: str, retries: int, msgs: List[JsonObj]) -> None:
    db = None

    to_retry = []

    try:
        with requests.Session() as session:
            session.max_redirects = 2
            for msg in msgs:
                event = msg["event"]
                remove_id = msg["remove_id"]
                log.info("Webhook sending %s to %s", event["type"], url)
                try:
                    r = session.post(
                        url,
                        json=event,
                        headers={"User-Agent": f"{get_webhost()} webhook"},
                        timeout=10,
                    )

                    if r.status_code == 410 and "remove_id" in event:
                        if db is None:
                            db = DB()
                        db.resthooks.remove(remove_id)
                        log.info("Webhook returned status 410, removed %s", remove_id)
                    else:
                        r.raise_for_status()

                        log.info("Webhook Success")
                except Exception as e:
                    log.error("Error: %s", e)
                    if retries < 2:
                        to_retry.append(msg)

        if len(to_retry) > 0:
            run_task_delay(send_webhooks_task, 20, url, retries + 1, to_retry)
    finally:
        if db is not None:
            db.close()
