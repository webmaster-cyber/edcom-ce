import os
import falcon
from datetime import datetime, timedelta
import hashlib
import shortuuid
import copy
from email.utils import formataddr, parseaddr
import traceback
from io import BytesIO
import requests
import base64
import dateutil.parser
from dateutil.tz import tzutc
import json
import urllib.parse
from html import escape as html_escape
from typing import List, Dict, Any, Set, cast

from .shared import config as config_module_side_effects  # noqa: F401
from .shared.db import open_db, json_obj, json_iter, JsonObj, DB
from .shared.crud import CRUDCollection, CRUDSingle, check_noadmin, get_orig
from .shared.tasks import tasks, LOW_PRIORITY, HIGH_PRIORITY
from .shared.utils import (
    run_task,
    gen_screenshot,
    fix_tag,
    generate_html,
    MPDictWriter,
    is_true,
    GIF,
    get_webroot,
    remove_newlines,
    MPDictReader,
    funnel_published,
    emailre,
    set_onboarding,
    device_names,
    os_names,
    browser_names,
    MTA_TIMEOUT,
    fix_sink_url,
)
from .shared.segments import (
    get_segment_rows,
    segment_eval_parts,
    segment_get_segments,
    segment_get_campaignids,
    get_segment_sentrows,
    supp_rows,
    Cache,
)
from .shared.send import (
    ses_send,
    mailgun_send,
    sparkpost_send,
    easylink_send,
    smtprelay_send,
    choose_backend,
    send_backend_mail,
    sink_get_settings,
    sink_get_ips,
    fix_headers,
    check_send_limit,
    check_test_limit,
    client_domain,
    load_domain_throttles,
    take_lock,
)
from .shared import contacts
from .shared import segments
from .shared.log import get_logger
from .shared.webhooks import send_webhooks

log = get_logger()


class Funnels(CRUDCollection):

    def __init__(self) -> None:
        self.domain = "funnels"
        self.useronly = True

    def on_post(self, req: falcon.Request, resp: falcon.Response) -> None:
        ts = datetime.utcnow().isoformat() + "Z"

        if "doc" in req.context:
            req.context["doc"]["modified"] = ts
            req.context["doc"]["count"] = 0

            s = "inactive"
            if req.context["doc"].get("active"):
                s = "complete"
            set_onboarding(req.context["db"], req.context["db"].get_cid(), "funnel", s)

        return CRUDCollection.on_post(self, req, resp)


def msg_del_check_rule(p: JsonObj, id: str) -> None:
    if p["type"] == "Responses":
        if p["action"] in ("sent", "notsent"):
            c = (
                p.get("broadcast")
                or p.get("defaultbroadcast")
                or p["campaign"]
                or p["defaultcampaign"]
            )
        else:
            c = p.get("broadcast") or p.get("campaign")
        if c == id:
            raise falcon.HTTPBadRequest(
                title="Message in use",
                description="Message is in use by one or more segments",
            )
        for a in p.get("addl", ()):
            if a["action"] in ("sent", "notsent"):
                c = (
                    a.get("broadcast")
                    or a.get("defaultbroadcast")
                    or a["campaign"]
                    or a["defaultcampaign"]
                )
            else:
                c = a.get("broadcast") or a.get("campaign")
            if c == id:
                raise falcon.HTTPBadRequest(
                    title="Message in use",
                    description="Message is in use by one or more segments",
                )
    elif p["type"] == "Group":
        for r in p["parts"]:
            msg_del_check_rule(r, id)


def msg_del_check(segments: List[JsonObj], id: str) -> None:
    for segment in segments:
        for rule in segment["parts"]:
            msg_del_check_rule(rule, id)


class Funnel(CRUDSingle):

    def __init__(self) -> None:
        self.domain = "funnels"
        self.useronly = True

    def on_delete(self, req: falcon.Request, resp: falcon.Response, id: str) -> None:
        CRUDSingle.on_delete(self, req, resp, id)

        db = req.context["db"]
        db.messages.delete({"funnel": id})

        funnelstatus = db.single(
            "select data->'onboarding'->>'funnel' from companies where id = %s",
            db.get_cid(),
        )
        if funnelstatus == "inactive":
            cnt = db.single(
                "select count(id) from funnels where (data->>'inactive')::boolean and cid = %s",
                db.get_cid(),
            )
            if not cnt:
                set_onboarding(db, db.get_cid(), "funnel", "")

    def del_check(self, db: DB, id: str) -> None:
        if db.forms.find_one({"funnel": id}):
            raise falcon.HTTPBadRequest(
                title="Funnel in use",
                description="Funnel is in use by one or more forms",
            )

        segments = db.segments.get_all()

        for (msgid,) in db.execute(
            "select id from messages where data->>'funnel' = %s", id
        ):
            msg_del_check(segments, msgid)

    def on_patch(self, req: falcon.Request, resp: falcon.Response, id: str) -> None:
        ts = datetime.utcnow().isoformat() + "Z"

        if "doc" in req.context:
            doc = req.context["doc"]
            doc["modified"] = ts
            doc.pop("count", None)

            if req.context["doc"].get("active"):
                set_onboarding(
                    req.context["db"], req.context["db"].get_cid(), "funnel", "complete"
                )

        return CRUDSingle.on_patch(self, req, resp, id)


class FunnelMessages(object):

    def on_get(self, req: falcon.Request, resp: falcon.Response, id: str) -> None:
        check_noadmin(req)

        db = req.context["db"]

        req.context["result"] = [
            json_obj(row)
            for row in db.execute(
                "select id, cid, data - 'parts' - 'rawText' from messages where data->>'funnel' = %s and cid = %s",
                id,
                db.get_cid(),
            )
        ]


class FunnelDuplicate(object):

    def on_post(self, req: falcon.Request, resp: falcon.Response, id: str) -> None:
        check_noadmin(req)

        db = req.context["db"]

        funnel = db.funnels.get(id)

        if funnel is None:
            raise falcon.HTTPForbidden()

        funnel["count"] = 0
        funnel["active"] = False
        funnel["modified"] = datetime.utcnow().isoformat() + "Z"

        for m in funnel["messages"]:
            m["id"] = dupe_msg(db, m["id"])

        orig, i = get_orig(funnel["name"])
        while True:
            funnel["name"] = "%s (%s)" % (orig, i)
            if db.funnels.find_one({"name": funnel["name"]}) is None:
                break
            i += 1

        funnelid = db.funnels.add(funnel)

        db.execute(
            "update messages set data = data || jsonb_build_object('funnel', %s) where id = any(%s)",
            funnelid,
            [m["id"] for m in funnel["messages"]],
        )

        req.context["result"] = funnelid


class MessageClientStats(object):

    def on_get(self, req: falcon.Request, resp: falcon.Response, id: str) -> None:
        check_noadmin(req, True)

        db = req.context["db"]

        exist = json_obj(
            db.row(
                "select id, cid, data - 'parts' - 'rawText' from messages where cid = %s and id = %s",
                db.get_cid(),
                id,
            )
        )
        if exist is None:
            raise falcon.HTTPForbidden()

        devices = []
        for device, count in db.execute(
            "select device, count from message_devices where message_id = %s order by count desc",
            id,
        ):
            devices.append(
                {
                    "device": device_names[device],
                    "count": count,
                }
            )
        clients = []
        for osname, browser, count in db.execute(
            "select os, browser, count from message_browsers where message_id = %s order by count desc",
            id,
        ):
            clients.append(
                {
                    "os": os_names[osname],
                    "browser": browser_names[browser],
                    "count": count,
                }
            )
        geo = []
        for country, countrycode, region, count in db.execute(
            """select country, country_code, region, count
                                                                from message_locations where message_id = %s
                                                                order by count desc""",
            id,
        ):
            geo.append(
                {
                    "country": country,
                    "country_code": countrycode,
                    "region": region,
                    "count": count,
                }
            )

        req.context["result"] = {
            "devices": devices,
            "browsers": clients,
            "locations": geo,
        }


@tasks.task(priority=HIGH_PRIORITY)
def get_msg_screenshot(id: str) -> None:
    try:
        with open_db() as db:
            gen_screenshot(db, id, "messages", True)
    except:
        log.exception("error")


class Messages(CRUDCollection):

    def __init__(self) -> None:
        self.domain = "messages"
        self.large = "parts"
        self.useronly = True

    def on_post(self, req: falcon.Request, resp: falcon.Response) -> None:
        check_noadmin(req)

        doc = req.context.get("doc")
        if not doc:
            raise falcon.HTTPBadRequest(
                title="Not JSON", description="A valid JSON document is required."
            )

        db = req.context["db"]

        doc["delivered"] = 0
        doc["send"] = 0
        doc["soft"] = 0
        doc["hard"] = 0
        doc["opened"] = 0
        doc["clicked"] = 0
        doc["opened_all"] = 0
        doc["clicked_all"] = 0
        doc["unsubscribed"] = 0
        doc["complained"] = 0
        doc["bounced"] = 0
        doc["modified"] = datetime.utcnow().isoformat() + "Z"

        imagebucket = os.environ["s3_imagebucket"]
        mycid = db.get_cid()
        doc["cid"] = mycid
        db.set_cid(None)
        try:
            company = db.companies.get(mycid)
            if company is not None:
                parentcompany = db.companies.get(company["cid"])
                if parentcompany is not None:
                    imagebucket = parentcompany.get("s3_imagebucket", imagebucket)
            _, linkurls = generate_html(db, doc, "tmp", imagebucket, nolinks=True)
        finally:
            db.set_cid(mycid)

        doc["linkurls"] = linkurls
        doc["linkclicks"] = [0] * len(linkurls)

        CRUDCollection.on_post(self, req, resp)

        run_task(get_msg_screenshot, req.context["result"]["id"])


class Message(CRUDSingle):

    def __init__(self) -> None:
        self.domain = "messages"
        self.useronly = True

    def on_patch(self, req: falcon.Request, resp: falcon.Response, id: str) -> None:
        doc = None
        if "doc" in req.context:
            doc = req.context["doc"]
            doc.pop("delivered", None)
            doc.pop("send", None)
            doc.pop("hard", None)
            doc.pop("soft", None)
            doc.pop("opened", None)
            doc.pop("clicked", None)
            doc.pop("unsubscribed", None)
            doc.pop("complained", None)
            doc.pop("bounced", None)
            doc.pop("linkurls", None)

        CRUDSingle.on_patch(self, req, resp, id)

        db = req.context["db"]

        msg = db.messages.get(id)
        if msg is None:
            return

        imagebucket = os.environ["s3_imagebucket"]
        mycid = db.get_cid()
        db.set_cid(None)
        try:
            company = db.companies.get(mycid)
            if company is not None:
                parentcompany = db.companies.get(company["cid"])
                if parentcompany is not None:
                    imagebucket = parentcompany.get("s3_imagebucket", imagebucket)
            _, linkurls = generate_html(db, msg, id, imagebucket, nolinks=True)
        finally:
            db.set_cid(mycid)

        if linkurls != msg.get("linkurls", []):
            db.messages.patch(
                id,
                {
                    "linkurls": linkurls,
                    "linkclicks": [0] * len(linkurls),
                    "modified": datetime.utcnow().isoformat() + "Z",
                },
            )

        if (
            not msg.get("example")
            and doc is not None
            and "parts" in doc
            and len(doc["parts"]) > 0
            and doc["parts"][-1].get("footer", False)
        ):
            mycid = db.get_cid()
            db.set_cid(None)
            doc["parts"][-1].pop("html", None)
            db.companies.patch(mycid, {"lastFooter": doc["parts"][-1]})

        run_task(get_msg_screenshot, id)

    def del_check(self, db: DB, id: str) -> None:
        segments = db.segments.get_all()

        msg_del_check(segments, id)


def dupe_msg(db: DB, id: str) -> str:
    msg = db.messages.get(id)

    if msg is None:
        raise falcon.HTTPForbidden()

    msg["count"] = 0
    msg["opened"] = 0
    msg["clicked"] = 0
    msg["opened_all"] = 0
    msg["clicked_all"] = 0
    msg["unsubscribed"] = 0
    msg["complained"] = 0
    msg["bounced"] = 0
    msg["delivered"] = 0
    msg["send"] = 0
    msg["soft"] = 0
    msg["hard"] = 0
    msg["linkclicks"] = [0] * len(msg.get("linkurls", []))
    msg.pop("example", None)

    if "suppsegs" not in msg:
        msg["suppsegs"] = []

    return db.messages.add(msg)


class MessageDuplicate(object):

    def on_post(self, req: falcon.Request, resp: falcon.Response, id: str) -> None:
        check_noadmin(req)

        db = req.context["db"]

        req.context["result"] = dupe_msg(db, id)


class MessageTest(object):

    def on_post(self, req: falcon.Request, resp: falcon.Response, id: str) -> None:
        check_noadmin(req)

        db = req.context["db"]

        doc = req.context.get("doc")
        if not doc:
            raise falcon.HTTPBadRequest(
                title="Not JSON", description="A valid JSON document is required."
            )
        if "to" not in doc:
            raise falcon.HTTPBadRequest(
                title="Missing parameter", description="No to address specified."
            )

        msg = db.messages.get(id)

        if msg is None:
            raise falcon.HTTPForbidden()

        db.set_cid(None)

        db.users.patch(req.context["uid"], {"lasttest": {"to": doc["to"]}})

        company = db.companies.get(msg["cid"])
        if company is None:
            raise falcon.HTTPForbidden()

        check_test_limit(db, company, doc["to"].strip().lower())

        imagebucket = os.environ["s3_imagebucket"]
        parentcompany = db.companies.get(company["cid"])
        if parentcompany is not None:
            imagebucket = parentcompany.get("s3_imagebucket", imagebucket)

        html, _ = generate_html(db, msg, "test", imagebucket)

        _, addr = parseaddr(doc["to"])
        if not addr:
            addr = remove_newlines(doc["to"])

        funnel = db.funnels.get(msg["funnel"])
        if funnel is None:
            raise falcon.HTTPForbidden()

        funnelmsg = None
        for m in funnel["messages"]:
            if m["id"] == msg["id"]:
                funnelmsg = m
                break
        if funnelmsg is None:
            raise falcon.HTTPForbidden()

        routeid = funnel.get("route", "")
        if funnelmsg.get("msgroute"):
            routeid = funnelmsg["msgroute"]

        availroutes = company["routes"]
        if routeid:
            if routeid not in availroutes:
                raise falcon.HTTPForbidden()
        elif len(availroutes) == 1:
            routeid = availroutes[0]
        else:
            raise falcon.HTTPBadRequest(
                title="Missing parameter",
                description="No route specified and multiple are available.",
            )

        route = db.routes.get(routeid)
        if route is None or "published" not in route:
            raise falcon.HTTPForbidden()

        fromemail = funnelmsg.get("returnpath") or funnelmsg["fromemail"]

        fromdomain = ""
        if "@" in fromemail:
            fromdomain = fromemail.split("@")[-1].strip().lower()
        frm = formataddr(
            (
                remove_newlines(funnelmsg["fromname"]),
                remove_newlines(funnelmsg.get("fromemail") or funnelmsg["returnpath"]),
            )
        )

        if funnelmsg.get("replyto", ""):
            replyto = remove_newlines(funnelmsg["replyto"])
        else:
            replyto = remove_newlines(
                funnelmsg.get("fromemail") or funnelmsg["returnpath"]
            )

        try:
            send_backend_mail(
                db,
                funnel["cid"],
                route,
                html,
                frm,
                fromemail,
                fromdomain,
                replyto,
                remove_newlines(doc["to"]),
                addr,
                remove_newlines(msg["subject"]),
            )
        except Exception as e:
            traceback.print_exc()
            raise falcon.HTTPBadRequest(
                title="Error sending test", description="Error sending test: %s" % e
            )


CHECK_FUNNELS_LOCK = 49080983


def check_funnels() -> None:
    with open_db() as db:
        try:
            with db.transaction():
                if not db.single(
                    f"select pg_try_advisory_xact_lock({CHECK_FUNNELS_LOCK})"
                ):
                    return
                for company in list(
                    json_iter(
                        db.execute(
                            """
                    select id, cid, data from companies where data @> %s and id in (
                        select distinct cid from funnelqueue where not sent
                    )
                """,
                            {"admin": False},
                        )
                    )
                ):
                    try:
                        cid = company["id"]

                        domainthrottles = load_domain_throttles(db, company)

                        db.set_cid(cid)
                        alllists = [
                            l
                            for l in db.lists.get_all()
                            if not l.get("unapproved", False)
                        ]
                        ts = datetime.utcnow()

                        hashlimit = segments.get_hashlimit(db, cid)

                        for hashval, messageid, route, domain, cnt in list(
                            db.execute(
                                """select mod(rawhash, %s) h, messageid,
                                case coalesce(a->>'msgroute', '')
                                when '' then f.data->>'route'
                                else a->>'msgroute' end r,
                                domain, count(email)
                                from funnelqueue q
                                inner join messages m on q.messageid = m.id and q.cid = m.cid
                                inner join funnels f on f.id = m.data->>'funnel' and m.cid = f.cid
                                left join jsonb_array_elements(f.data->'messages') a on a->>'id' = m.id
                                where ts <= %s and q.cid = %s and (not sent)
                                group by h, messageid, r, domain""",
                                hashlimit,
                                ts,
                                cid,
                            )
                        ):
                            if cnt > 0:
                                requesting = cnt
                                cnt = check_send_limit(
                                    company, route, domain, domainthrottles, cnt
                                )
                                if cnt > 0:
                                    log.debug(
                                        "%s clear to send %s for message %s, route %s, domain %s, (requested %s)",
                                        cid,
                                        cnt,
                                        messageid,
                                        route,
                                        domain,
                                        requesting,
                                    )
                                    run_task(
                                        send_message,
                                        cid,
                                        hashval,
                                        messageid,
                                        domain,
                                        hashlimit,
                                        alllists,
                                        ts.isoformat() + "Z",
                                        cnt,
                                    )
                    except:
                        log.exception("error")
        except:
            log.exception("error")


@tasks.task(priority=LOW_PRIORITY)
def send_message(
    cid: str,
    hashval: int,
    messageid: str,
    domain: str,
    hashlimit: int,
    alllists: List[JsonObj],
    tsstr: str,
    limit: int,
) -> None:
    with open_db() as db:
        try:
            with db.transaction():
                lockname = "message-%s-%s-%s" % (messageid, domain, hashlimit)
                taken = take_lock(db, lockname)
                if not taken:
                    log.debug("lock %s already in use", lockname)
                    return
                else:
                    log.debug("lock %s taken", lockname)

                ts = dateutil.parser.parse(tsstr).replace(tzinfo=None)

                msg = db.messages.get(messageid)
                funnel = None
                funnelmsg = None
                if msg is not None:
                    funnel = db.funnels.get(msg["funnel"])
                    if funnel is None or not funnel.get("active", ""):
                        msg = None
                    else:
                        funnel_published(funnel)
                        for m in funnel["messages"]:
                            if m["id"] == msg["id"]:
                                funnelmsg = m
                                break
                        if funnelmsg is None:
                            msg = None

                route = None
                company = None
                if msg is not None and funnel is not None and funnelmsg is not None:
                    company = db.companies.get(msg["cid"])
                    if company is None:
                        log.error("Missing company")
                        msg = None
                    else:
                        availroutes = company["routes"]
                        routeid = funnel["route"]
                        if funnelmsg.get("msgroute", ""):
                            routeid = funnelmsg["msgroute"]
                        if routeid not in availroutes:
                            log.error("Postal route no longer available")
                            msg = None
                        else:
                            route = db.routes.get(routeid)
                            if route is None or "published" not in route:
                                log.error("Missing postal route")
                                msg = None

                reverse_order = (company is not None) and company.get(
                    "reverse_funnel_order", False
                )

                emails = set()
                lastid: None | int = None
                if reverse_order:
                    for rowid, email in db.execute(
                        """select id, email from funnelqueue
                                                where ts <= %s and cid = %s and (%s = 1 or mod(rawhash, %s) = %s) and messageid = %s and domain = %s and (not sent)
                                                order by id desc limit %s""",
                        ts,
                        cid,
                        hashlimit,
                        hashlimit,
                        hashval,
                        messageid,
                        domain,
                        min(limit, 50000),
                    ):
                        emails.add(email)
                        if lastid is None or rowid < lastid:
                            lastid = rowid
                else:
                    for rowid, email in db.execute(
                        """select id, email from funnelqueue
                                                where ts <= %s and cid = %s and (%s = 1 or mod(rawhash, %s) = %s) and messageid = %s and domain = %s and (not sent)
                                                order by id asc limit %s""",
                        ts,
                        cid,
                        hashlimit,
                        hashlimit,
                        hashval,
                        messageid,
                        domain,
                        min(limit, 50000),
                    ):
                        emails.add(email)
                        if lastid is None or rowid > lastid:
                            lastid = rowid

                if lastid is None:
                    return

                if (
                    msg is not None
                    and funnel is not None
                    and route is not None
                    and funnelmsg is not None
                ):
                    allowedset = None
                    if msg["who"] in ("openany", "clickany"):
                        allowedmsgs = []
                        for m in funnel["messages"]:
                            if m["id"] != msg["id"]:
                                allowedmsgs.append(m["id"])
                            else:
                                break
                        allowedset = set(allowedmsgs)

                    supplists = [
                        db.supplists.get(suppid) for suppid in msg["supplists"]
                    ]
                    suppfactors = [
                        supplist["id"] for supplist in supplists if supplist is not None
                    ]
                    supprows = supp_rows(
                        db, msg["cid"], hashval, hashlimit, suppfactors
                    )

                    listfactors = [l["id"] for l in alllists]

                    if len(msg["suppsegs"]):
                        segparts = []
                        for suppseg in msg["suppsegs"]:
                            segparts.append(
                                {
                                    "type": "Lists",
                                    "operator": "insegment",
                                    "segment": suppseg,
                                }
                            )
                        fakesegment = {
                            "id": shortuuid.uuid(),
                            "operator": "nor",
                            "parts": segparts,
                            "cid": msg["cid"],
                            "subset": False,
                        }
                        segments: Dict[str, JsonObj | None] = {}
                        segment_get_segments(db, fakesegment["parts"], segments)

                        campaignids = segment_get_campaignids(
                            fakesegment, list(segments.values())
                        )

                        sentrows = get_segment_sentrows(
                            db, msg["cid"], campaignids, hashval, hashlimit
                        )

                    rows = get_segment_rows(
                        db, msg["cid"], hashval, listfactors, hashlimit, emails
                    )

                    allrows = []
                    allprops = set()

                    def fix_row(r: JsonObj) -> JsonObj:
                        fixedrow = {}
                        for prop in r.keys():
                            if not prop.startswith("!"):
                                allprops.add(prop)
                                fixedrow[prop] = r.get(prop, ("",))[0]
                        return fixedrow

                    cache = Cache()

                    segcounts: Dict[str, int] = {}
                    numrows = len(rows)
                    for vals in rows:
                        email = vals["Email"][0]

                        # remove suppressed segments
                        if len(msg["suppsegs"]):
                            if not segment_eval_parts(
                                fakesegment["parts"],
                                fakesegment["operator"],
                                vals,
                                segcounts,
                                numrows,
                                segments,
                                sentrows,
                                fakesegment,
                                hashlimit,
                                cache,
                            ):
                                continue

                        # remove any suppressed users
                        ok = True
                        for prop in ("Unsubscribed", "Bounced", "Complained"):
                            for val in vals.get(prop, ()):
                                if is_true(val):
                                    ok = False
                                    break
                            if not ok:
                                break
                        if not ok:
                            continue

                        # remove any users with exit tags or suppress tags
                        tags = vals.get("!!tags", ())
                        ok = True
                        for supptag in msg["supptags"]:
                            if supptag in tags:
                                ok = False
                                break
                        if not ok:
                            continue
                        if funnel["type"] == "tags":
                            for exittag in funnel["exittags"]:
                                if exittag in tags:
                                    ok = False
                                    break
                            if not ok:
                                continue

                        # remove any users who don't meet open/click requirements
                        if allowedset is not None:
                            cols: Any
                            if msg["who"] == "openany":
                                cols = (
                                    vals.get("!!open-logs", ()),
                                    vals.get("!!click-logs", ()),
                                )
                            else:
                                cols = (vals.get("!!click-logs", ()),)
                            found = False
                            for col in cols:
                                for _, campid in col:
                                    if isinstance(campid, (tuple, list)):
                                        campid = campid[0]
                                    if campid in allowedset:
                                        found = True
                                        break
                                if found:
                                    break
                            if not found:
                                continue

                        # remove for suppression lists
                        if len(supprows):
                            md5 = hashlib.md5(email.encode("utf-8")).hexdigest()
                            if md5 in supprows:
                                continue

                        allrows.append(fix_row(vals))

                    domaingroups = {}
                    policies = {}
                    sinks = {}
                    mailgun = {}
                    ses = {}
                    sparkpost = {}
                    easylink = {}
                    smtprelays = {}
                    db.set_cid(route["cid"])
                    try:
                        for dg in db.domaingroups.find():
                            domaingroups[dg["id"]] = dg
                        for p in db.policies.find():
                            policies[p["id"]] = p
                        for s in db.sinks.find():
                            sinks[s["id"]] = s
                        for m in db.mailgun.find():
                            mailgun[m["id"]] = m
                        for s in db.ses.find():
                            ses[s["id"]] = s
                        for s in db.sparkpost.find():
                            sparkpost[s["id"]] = s
                        for s in db.easylink.find():
                            easylink[s["id"]] = s
                        for s in db.smtprelays.find():
                            smtprelays[s["id"]] = s
                    finally:
                        db.set_cid(None)

                    sinkobjs: List[JsonObj] = []
                    listdata = []
                    domaincounts = []
                    for row in allrows:
                        email = row["Email"]
                        domain = email.split("@")[1]

                        db.execute(
                            """insert into message_domains (message_id, domain, count) values (%s, %s, 1)
                                    on conflict (message_id, domain) do update set
                                    count = message_domains.count + 1""",
                            messageid,
                            domain,
                        )

                        sinkobj, settingsid = choose_backend(
                            route,
                            email,
                            domaingroups,
                            policies,
                            sinks,
                            mailgun,
                            ses,
                            sparkpost,
                            easylink,
                            smtprelays,
                        )

                        # postal route drops all mail to this domain
                        if sinkobj is None:
                            continue

                        sinkobj = copy.copy(sinkobj)
                        sinkobj["send_settingsid"] = settingsid

                        ind = None
                        try:
                            ind = sinkobjs.index(sinkobj)
                        except ValueError:
                            sinkobjs.append(sinkobj)
                            outfile = BytesIO()
                            writer = MPDictWriter(outfile, list(allprops))
                            writer.writeheader()
                            listdata.append((outfile, writer))
                            writer.writerow(row)
                            domaincounts.append({domain: 1})
                        if ind is not None:
                            listdata[ind][1].writerow(row)
                            dcnts = domaincounts[ind]
                            dcnts[domain] = dcnts.get(domain, 0) + 1

                    if len(sinkobjs):
                        demo = False
                        imagebucket = os.environ["s3_imagebucket"]
                        bodydomain = ""
                        headers = ""
                        fromencoding = "none"
                        subjectencoding = "none"
                        usedkim = True
                        company = db.companies.get(funnel["cid"])
                        if company is not None:
                            frontend = json_obj(
                                db.row(
                                    "select id, cid, data - 'image' from frontends where id = %s",
                                    company["frontend"],
                                )
                            )
                            if frontend is not None:
                                bodydomain = frontend.get("bodydomain", "")
                                headers = fix_headers(frontend.get("headers", ""))
                                fromencoding = frontend.get("fromencoding", "")
                                subjectencoding = frontend.get("subjectencoding", "")
                                usedkim = frontend.get("usedkim", True)
                            parentcompany = db.companies.get(company["cid"])
                            if parentcompany is not None:
                                demo = company.get("demo", False)
                                imagebucket = parentcompany.get(
                                    "s3_imagebucket", imagebucket
                                )

                        html, _ = generate_html(db, msg, messageid, imagebucket)

                        fromemail = (
                            funnelmsg.get("returnpath") or funnelmsg["fromemail"]
                        )

                        fromdomain = ""
                        if "@" in fromemail:
                            fromdomain = fromemail.split("@")[-1].strip().lower()
                        frm = formataddr(
                            (
                                remove_newlines(funnelmsg["fromname"]),
                                remove_newlines(
                                    funnelmsg.get("fromemail")
                                    or funnelmsg["returnpath"]
                                ),
                            )
                        )

                        if funnelmsg.get("replyto", ""):
                            replyto = remove_newlines(funnelmsg["replyto"])
                        else:
                            replyto = remove_newlines(
                                funnelmsg.get("fromemail") or funnelmsg["returnpath"]
                            )

                        subject = remove_newlines(msg["subject"])

                        for taglist in (
                            msg.get("openaddtags", ()),
                            msg.get("clickaddtags", ()),
                            msg.get("sendaddtags", ()),
                        ):
                            for tag in taglist:
                                t = fix_tag(tag)
                                if t:
                                    db.execute(
                                        """insert into alltags (cid, tag, added, count) values (%s, %s, now(), 0)
                                                on conflict (cid, tag) do nothing""",
                                        msg["cid"],
                                        t,
                                    )

                        failed = False
                        for so in sinkobjs:
                            if so.get("failed_update", False):
                                failed = True
                                break
                        if not demo:
                            if failed:
                                mtasettings = {}
                                allips: Set[str] = set()
                                allsinks = set()
                                dkim = {}
                                db.set_cid(sinkobjs[0]["cid"])
                                try:
                                    for policy in db.policies.find():
                                        if policy.get("published", None) is not None:
                                            mtasettings[policy["id"]] = policy[
                                                "published"
                                            ]
                                    pauses: Dict[str, List[JsonObj]] = {}
                                    for pause in db.ippauses.find():
                                        if pause["sinkid"] not in pauses:
                                            pauses[pause["sinkid"]] = []
                                        pauses[pause["sinkid"]].append(pause)
                                    warmups: Dict[str, Dict[str, JsonObj]] = {}
                                    for warmup in db.warmups.find():
                                        if warmup.get("published", None) is not None:
                                            if warmup["sink"] not in warmups:
                                                warmups[warmup["sink"]] = {}
                                            warmups[warmup["sink"]][warmup["id"]] = (
                                                warmup["published"]
                                            )
                                            warmups[warmup["sink"]][warmup["id"]][
                                                "disabled"
                                            ] = warmup.get("disabled", False)
                                    for sink in db.sinks.find():
                                        allips.update(d["ip"] for d in sink["ipdata"])
                                        allsinks.add(sink["id"])
                                    dkim = db.dkimentries.get_singleton()
                                finally:
                                    db.set_cid(None)

                            for obj, data, domaincount in zip(
                                sinkobjs, listdata, domaincounts
                            ):
                                if obj["send_settingsid"] == "mailgun":
                                    data[0].seek(0)
                                    mailgun_send(
                                        obj,
                                        client_domain(
                                            db, fromdomain, funnel["cid"], obj["id"]
                                        ),
                                        frm,
                                        replyto,
                                        subject,
                                        html,
                                        messageid,
                                        funnel["cid"],
                                        False,
                                        recips=MPDictReader(data[0]),
                                        sync=True,
                                    )
                                elif obj["send_settingsid"] == "ses":
                                    data[0].seek(0)
                                    ses_send(
                                        obj,
                                        frm,
                                        replyto,
                                        subject,
                                        html,
                                        messageid,
                                        cid,
                                        False,
                                        recips=MPDictReader(data[0]),
                                        sync=True,
                                    )
                                elif obj["send_settingsid"] == "sparkpost":
                                    data[0].seek(0)
                                    sparkpost_send(
                                        obj,
                                        frm,
                                        replyto,
                                        subject,
                                        html,
                                        messageid,
                                        cid,
                                        False,
                                        recips=MPDictReader(data[0]),
                                        sync=True,
                                    )
                                elif obj["send_settingsid"] == "easylink":
                                    data[0].seek(0)
                                    easylink_send(
                                        obj,
                                        frm,
                                        replyto,
                                        subject,
                                        html,
                                        messageid,
                                        cid,
                                        False,
                                        recips=MPDictReader(data[0]),
                                        sync=True,
                                    )
                                elif obj["send_settingsid"] == "smtprelay":
                                    data[0].seek(0)
                                    smtprelay_send(
                                        obj,
                                        frm,
                                        replyto,
                                        subject,
                                        html,
                                        messageid,
                                        cid,
                                        False,
                                        recips=MPDictReader(data[0]),
                                        sync=True,
                                    )
                                else:
                                    url = fix_sink_url(obj["url"])

                                    if failed:
                                        s = {}
                                        for sid, policy in mtasettings.items():
                                            s[sid] = sink_get_settings(
                                                policy, obj["id"]
                                            )

                                        r = requests.post(
                                            url + "/settings",
                                            json={
                                                "accesskey": obj["accesskey"],
                                                "sinkid": obj["id"],
                                                "mtasettings": s,
                                                "ippauses": pauses.get(obj["id"], []),
                                                "warmups": warmups.get(obj["id"], {}),
                                                "allips": list(allips),
                                                "allsinks": list(allsinks),
                                                "ipdomains": sink_get_ips(obj),
                                                "dkim": dkim,
                                            },
                                            timeout=MTA_TIMEOUT,
                                        )
                                        r.raise_for_status()

                                        db.sinks.patch(
                                            obj["id"], {"failed_update": False}
                                        )

                                    r = requests.post(
                                        url + "/send-lists",
                                        json={
                                            "id": messageid,
                                            "sendid": shortuuid.uuid(),
                                            "domaincounts": domaincount,
                                            "from": frm,
                                            "returnpath": fromemail,
                                            "replyto": replyto,
                                            "subject": subject,
                                            "accesskey": obj["accesskey"],
                                            "template": html,
                                            "listdata": base64.b64encode(
                                                data[0].getvalue()
                                            ).decode("ascii"),
                                            "settingsid": obj["send_settingsid"],
                                            "bodydomain": bodydomain,
                                            "headers": headers,
                                            "fromencoding": fromencoding,
                                            "subjectencoding": subjectencoding,
                                            "usedkim": usedkim,
                                        },
                                        timeout=MTA_TIMEOUT,
                                    )
                                    r.raise_for_status()

                if reverse_order:
                    db.execute(
                        """update funnelqueue set sent = true
                                where ts <= %s and cid = %s and (%s = 1 or mod(rawhash, %s) = %s) and (not sent) and
                                messageid = %s and domain = %s and id >= %s""",
                        ts,
                        cid,
                        hashlimit,
                        hashlimit,
                        hashval,
                        messageid,
                        domain,
                        lastid,
                    )
                else:
                    db.execute(
                        """update funnelqueue set sent = true
                                where ts <= %s and cid = %s and (%s = 1 or mod(rawhash, %s) = %s) and (not sent) and
                                messageid = %s and domain = %s and id <= %s""",
                        ts,
                        cid,
                        hashlimit,
                        hashlimit,
                        hashval,
                        messageid,
                        domain,
                        lastid,
                    )
        except:
            log.exception("error")


class Forms(CRUDCollection):

    def __init__(self) -> None:
        self.domain = "forms"
        self.useronly = True

    def on_get(self, req: falcon.Request, resp: falcon.Response) -> None:
        db = req.context["db"]

        req.context["result"] = list(
            json_iter(
                db.execute(
                    "select id, cid, data - 'parts' - 'rawText' from forms where cid = %s",
                    db.get_cid(),
                )
            )
        )

    def on_post(self, req: falcon.Request, resp: falcon.Response) -> None:
        doc = req.context.get("doc")
        if not doc:
            raise falcon.HTTPBadRequest(
                title="Not JSON", description="A valid JSON document is required."
            )

        db = req.context["db"]

        if not doc.get("list"):
            listname = doc["name"]

            if db.lists.find_one({"name": listname}):
                orig, i = get_orig(listname)
                while True:
                    listname = "%s (%s)" % (orig, i)
                    if db.lists.find_one({"name": listname}) is None:
                        break
                    i += 1

            doc["list"] = db.lists.add(
                {"name": listname, "count": 0, "used_properties": []}
            )

        doc.pop("views", None)
        doc.pop("views_uniq", None)
        doc.pop("submits", None)
        doc.pop("submits_uniq", None)

        return CRUDCollection.on_post(self, req, resp)


class Form(CRUDSingle):

    def __init__(self) -> None:
        self.domain = "forms"
        self.useronly = True

    def on_patch(self, req: falcon.Request, resp: falcon.Response, id: str) -> None:
        doc = req.context.get("doc")
        if not doc:
            raise falcon.HTTPBadRequest(
                title="Not JSON", description="A valid JSON document is required."
            )

        doc.pop("views", None)
        doc.pop("views_uniq", None)
        doc.pop("submits", None)
        doc.pop("submits_uniq", None)

        return CRUDSingle.on_patch(self, req, resp, id)


class FormDuplicate(object):

    def on_post(self, req: falcon.Request, resp: falcon.Response, id: str) -> None:
        check_noadmin(req)

        db = req.context["db"]

        t = db.forms.get(id)

        if t is None:
            raise falcon.HTTPForbidden()

        t.pop("example", None)

        orig, i = get_orig(t["name"])
        while True:
            t["name"] = "%s (%s)" % (orig, i)
            if db.forms.find_one({"name": t["name"]}) is None:
                break
            i += 1

        req.context["result"] = db.forms.add(t)


NOFORM = """<html><head><title>Unsubscribe Successful</title><link href="https://maxcdn.bootstrapcdn.com/bootstrap/3.3.7/css/bootstrap.min.css" rel="stylesheet" integrity="sha384-BVYiiSIFeK1dGmJRAkycuHAHRg32OmUcww7on3RYdg4Va+PmSTsz/K68vbdEjh4u" crossorigin="anonymous"></head><body><div class="container"><div class="row" style="margin-top:25px"><div class="col-xs-4 col-xs-offset-4 text-center"><div class="panel panel-default"><div class="panel-body">Sorry, we couldn't find the form you're looking for!</div></div></div></div></div></body></html>"""
FORMMSG = """<html><head><title>Form Submitted</title><link href="https://maxcdn.bootstrapcdn.com/bootstrap/3.3.7/css/bootstrap.min.css" rel="stylesheet" integrity="sha384-BVYiiSIFeK1dGmJRAkycuHAHRg32OmUcww7on3RYdg4Va+PmSTsz/K68vbdEjh4u" crossorigin="anonymous"></head><body><div class="container"><div class="row" style="margin-top:25px"><div class="col-xs-4 col-xs-offset-4 text-center"><div class="panel panel-default"><div class="panel-body">%s</div></div></div></div></div></body></html>"""


def esc_js(s: str) -> str:
    return (
        s.replace("\\", "\\\\")
        .replace("'", "\\'")
        .replace("\n", "\\n")
        .replace("\r", "\\r")
    )


def esc_html(s: str) -> str:
    return html_escape(s, quote=True)


class ShowFormEmbed(object):

    def on_get(self, req: falcon.Request, resp: falcon.Response, id: str) -> None:
        with open_db() as db:
            form = db.forms.get(id)

            if form is None or form.get("disabled"):
                raise falcon.HTTPForbidden()

            set_onboarding(db, form["cid"], "form", "complete")

            now = datetime.utcnow().replace(tzinfo=tzutc())

            lastview = None
            lastsubmit = None
            formuid = req.cookies.get("edfu")
            if formuid:
                r = db.row(
                    "select viewed_at, submitted_at from formcookies where formid = %s and uid = %s",
                    id,
                    formuid,
                )
                if r is not None:
                    lastview, lastsubmit = r

            if "mobile" in req.get_header("User-Agent", default="").lower():
                m = form["mobile"]
                form["parts"] = m["parts"]
                form["bodyStyle"] = m["bodyStyle"]
                form["display"] = m["display"]
                form["slidelocation"] = m["slidelocation"]
                form["hellolocation"] = m["hellolocation"]
                form["modaldismiss"] = m.get("modaldismiss")

            hide = False
            if (
                form["hideaftersubmit"]
                and lastsubmit is not None
                and (
                    (not form["returnaftersubmit"])
                    or (
                        lastsubmit
                        + timedelta(days=(form["returnaftersubmitdays"] or 0))
                    )
                    > now
                )
            ):
                hide = True
            elif (
                form["hideaftershow"]
                and lastview is not None
                and (
                    (not form["returnaftershow"])
                    or (lastview + timedelta(days=(form["returnaftershowdays"] or 0)))
                    > now
                )
            ):
                hide = True
            if hide:
                resp.content_type = falcon.MEDIA_JS
                resp.text = ""
                return

            bs = form.get("bodyStyle", {})
            bt = bs.get("bodyType", "fixed")
            if bt == "fixed":
                width = "%spx" % bs.get("bodyWidth", 580)
            else:
                width = "100%"

            closebutton = ""
            if bs.get("formCloseEnable", True):
                size = bs.get("formCloseSize", 26)
                if size is None:
                    size = 26
                elif size < 10:
                    size = 10
                elif size > 100:
                    size = 100
                if bt == "fixed":
                    top = int(-size / 2.0) + (bs.get("formCloseTop", 0) or 0)
                    right = int(-size / 2.0) + (bs.get("formCloseRight", 0) or 0)
                else:
                    top = 1 + (bs.get("formCloseTop", 0) or 0)
                    right = 1 + (bs.get("formCloseRight", 0) or 0)
                bgcolor = "#fff"
                color = "#333"
                if bs.get("formCloseStyle", "") == "dark":
                    bgcolor = "#333"
                    color = "#fff"
                bordercolor = color
                if not bs.get("formCloseBorder", True):
                    bordercolor = bgcolor
                closebutton = """var cb = document.createElement('div');
    cb.style = "text-align: center; font-family: Helvetica; box-sizing: border-box; position: absolute; top: %spx; right: %spx; background-color: %s; color: %s; font-size: %spx; width: %spx; height: %spx; line-height: %spx; border-radius: %spx; cursor: pointer; border: 1px solid %s";
    cb.innerText = "\\u00d7";
    cb.onclick = function() { p.style.display="none" };
    d.appendChild(cb);
    """ % (
                    top,
                    right,
                    bgcolor,
                    color,
                    int(size * 0.7),
                    size,
                    size,
                    int(size * 0.85),
                    size,
                    bordercolor,
                )

            divstyle = ""
            parentstyle = "display: none"
            parentscript = ""
            transition = "p.style.opacity = '0'; p.style.transition = 'opacity .3s';"
            transitionscript = "p.style.opacity = '1';"
            setheight = ""
            if form["display"] == "hello":
                if form["hellolocation"] == "top":
                    divstyle = "position: fixed; z-index: 2147483647; left: 0; top: 0; right: 0"
                else:
                    divstyle = "position: fixed; z-index: 2147483647; left: 0; bottom: 0; right: 0"
            elif form["display"] == "modal":
                if bt == "fixed":
                    w = bs.get("bodyWidth", 580) / 2
                    divstyle = (
                        "position: fixed; left: calc(50%% - %spx); right: calc(50%% - %spx); top: 120px"
                        % (w, w)
                    )
                else:
                    divstyle = "position: fixed; left: 0; right: 0; top: 120px"
                parentstyle = "display: none; position: fixed; z-index: 2147483647; left: 0; right: 0; top: 0; bottom: 0; background-color: rgba(0, 0, 0, .5)"
                if form.get("modaldismiss"):
                    parentstyle = "%s; cursor: pointer" % parentstyle
                    parentscript = 'p.onclick = function() { p.style.display="none" };'
                setheight = 'd.style.top = "calc(50% - " + data.height/2 + "px)";'
            elif form["display"] == "slide":
                if bt == "fixed":
                    w = bs.get("bodyWidth", 580) / 2
                    if form["slidelocation"] in (
                        "bottom-right",
                        "bottom",
                        "bottom-left",
                    ):
                        divstyle = "position: fixed; z-index: 2147483647; bottom: 0"
                    elif form["slidelocation"] in ("left", "right"):
                        divstyle = "position: fixed; z-index: 2147483647; top: 120px"
                    elif form["slidelocation"] in ("top-left", "top", "top-right"):
                        divstyle = "position: fixed; z-index: 2147483647; top: 0"

                    if form["slidelocation"] in ("bottom-right", "right", "top-right"):
                        transition = (
                            "d.style.right = '-%spx'; d.style.transition = 'right .5s';"
                            % (w * 2,)
                        )
                        transitionscript = "d.style.right = '0';"
                    elif form["slidelocation"] in ("bottom-left", "left", "top-left"):
                        transition = (
                            "d.style.left = '-%spx'; d.style.transition = 'left .5s';"
                            % (w * 2,)
                        )
                        transitionscript = "d.style.left = '0';"
                    elif form["slidelocation"] in ("top", "bottom"):
                        transition = (
                            "d.style.left = '100%'; d.style.transition = 'left .5s';"
                        )
                        transitionscript = "d.style.left = 'calc(50%% - %spx)';" % (w,)
                else:
                    if form["slidelocation"] in (
                        "bottom-right",
                        "bottom",
                        "bottom-left",
                    ):
                        divstyle = "position: fixed; z-index: 2147483647; bottom: 0; right: 0; left: 0"
                    elif form["slidelocation"] in "left":
                        divstyle = "position: fixed; z-index: 2147483647; left: 0; top: 120px; right: 0"
                    elif form["slidelocation"] in ("top-left", "top", "top-right"):
                        divstyle = "position: fixed; z-index: 2147483647; top: 0; right: 0; left: 0"
                    elif form["slidelocation"] == "right":
                        divstyle = "position: fixed; z-index: 2147483647; left: 0; top: 120px; right: 0"

                    if form["slidelocation"] in ("bottom-right", "right", "top-right"):
                        transition = "d.style.right = '-100%'; d.style.left = '100%'; d.style.transition = 'right .5s, left .5s';"
                        transitionscript = "d.style.right = '0'; d.style.left = '0';"
                    elif form["slidelocation"] in (
                        "bottom-left",
                        "left",
                        "top-left",
                        "bottom",
                        "top",
                    ):
                        transition = "d.style.left = '-100%'; d.style.right = '100%'; d.style.transition = 'left .5s, right .5s';"
                        transitionscript = "d.style.left = '0'; d.style.right = '0';"

            if form.get("showwhen") == "exitintent":
                transitionscript = (
                    """
                function showModal() {
                p.style.display = 'block';
                setTimeout(function() {
                    f.contentWindow.postMessage('getHeight', "*");
                    setTimeout(function() {
                    %s
                    }, 100);
                });
                }
                if (isMobile()) {
                var h = document.documentElement.offsetHeight -
                    (window.innerHeight || document.documentElement.clientHeight);
                if (h > 0) {
                    var bt = false;
                    var inter = setInterval(function() {
                        var a = (document.scrollingElement || document.documentElement).scrollTop;
                        var pct = parseFloat(a) / parseFloat(h);
                        if (bt) {
                        if (pct < 0.05) {
                            showModal();
                            clearInterval(inter);
                        }
                        } else {
                        if (pct > .3) {
                            bt = true;
                        }
                        }
                    }, 100);
                }
                } else {
                var mousecb;
                mousecb = function(e) {
                    if (e.target.tagName.toLowerCase() === 'input') {
                    return;
                    }
                    if (e.clientY >= 50) {
                    return;
                    }
                    if (!(e.relatedTarget || e.toElement)) {
                    showModal();
                    document.removeEventListener('mouseout', mousecb);
                    }
                }
                }
                document.addEventListener('mouseout', mousecb, false);
                """
                    % transitionscript
                )
            else:
                transitionscript = (
                    """
                p.style.display = 'block';
                setTimeout(function() {
                f.contentWindow.postMessage('getHeight', "*");
                setTimeout(function() {
                    %s
                }, 100);
                });
                """
                    % transitionscript
                )

            html = (
                '<iframe id="iframe-%s" style="display: block; border: none; width: %s" src="%s/api/showform/%s"></iframe>'
                % (id, width, get_webroot(), id)
            )

            js = """
        (function() {
            function isMobile() {
            var ua = navigator.userAgent;
            return (ua.match(/Android/i) ||
                ua.match(/webOS/i) ||
                ua.match(/iPhone/i) ||
                ua.match(/Mobile/i) ||
                ua.match(/iPad/i) ||
                ua.match(/iPod/i) ||
                ua.match(/BlackBerry/i) ||
                ua.match(/Phone/i));
            }
            var p, f;
            var html = '%(html)s';
            var sn = document.getElementById('script-%(id)s');
            p = document.createElement('div');
            p.setAttribute('style', '%(parentstyle)s');
            var d = document.createElement('div');
            p.appendChild(d);
            %(parentscript)s
            d.setAttribute('style', '%(divstyle)s');
            d.innerHTML = html;
            %(transition)s
            %(closebutton)s
            sn.parentNode.replaceChild(p, sn);
            f = document.getElementById('iframe-%(id)s');
            var t = (new Date()).getTime();
            f.onload = function() {
            setTimeout(function() {
                %(transitionscript)s
            }, Math.max(0, %(delay)s - ((new Date()).getTime() - t)));
            }
            window.addEventListener("message", function(e) {
            if (e.origin !== '%(webroot)s') {
                return;
            }
            var data = JSON.parse(e.data.toString());
            if (data.id !== '%(id)s') {
                return;
            }
            if (data.cmd === 'setHeight') {
                f.height = data.height;
                f.style.height = data.height + 'px';
                %(setheight)s
            } else if (data.cmd === 'setLocation') {
                window.location.assign(data.url);
            } else if (data.cmd === 'closeForm') {
                p.style.display = 'none';
            }
            }, false);
        })();
            """ % {
                "html": esc_js(html),
                "id": id,
                "parentstyle": parentstyle,
                "parentscript": parentscript,
                "divstyle": divstyle,
                "transition": transition,
                "closebutton": closebutton,
                "transitionscript": transitionscript,
                "delay": form["showdelaysecs"] * 1000,
                "webroot": get_webroot(),
                "setheight": setheight,
            }
            resp.content_type = falcon.MEDIA_JS
            resp.text = js


class TrackForm(object):

    def on_get(self, req: falcon.Request, resp: falcon.Response, id: str) -> None:
        resp.content_type = falcon.MEDIA_GIF
        resp.data = GIF

        with open_db() as db:
            form = db.forms.get(id)

            if form is None or form.get("disabled"):
                return

            uniq = 1
            formuid = req.cookies.get("edfu")
            if formuid:
                if db.single(
                    "select formid from formcookies where formid = %s and uid = %s",
                    id,
                    formuid,
                ):
                    uniq = 0
            else:
                formuid = shortuuid.uuid()
                resp.set_cookie("edfu", formuid, path="/", same_site="None")

            db.execute(
                """insert into formcookies (formid, uid, viewed_at) values (%s, %s, now())
                        on conflict (formid, uid) do update set viewed_at = now()""",
                id,
                formuid,
            )

            db.execute(
                "update forms set data = data || jsonb_build_object('views', coalesce((data->>'views')::integer, 0) + 1, 'views_uniq', coalesce((data->>'views_uniq')::integer, 0) + %s) where id = %s",
                uniq,
                id,
            )


class ShowForm(object):

    def on_get(self, req: falcon.Request, resp: falcon.Response, id: str) -> None:
        with open_db() as db:
            form = db.forms.get(id)

            if form is None or form.get("disabled"):
                resp.content_type = falcon.MEDIA_HTML
                resp.text = NOFORM
                return

            mycid = form["cid"]

            uniq = 1
            formuid = req.cookies.get("edfu")
            if formuid:
                if db.single(
                    "select formid from formcookies where formid = %s and uid = %s",
                    id,
                    formuid,
                ):
                    uniq = 0
            else:
                formuid = shortuuid.uuid()
                resp.set_cookie("edfu", formuid, path="/", same_site="None")

            db.execute(
                """insert into formcookies (formid, uid, viewed_at) values (%s, %s, now())
                        on conflict (formid, uid) do update set viewed_at = now()""",
                id,
                formuid,
            )

            db.execute(
                "update forms set data = data || jsonb_build_object('views', coalesce((data->>'views')::integer, 0) + 1, 'views_uniq', coalesce((data->>'views_uniq')::integer, 0) + %s) where id = %s",
                uniq,
                id,
            )

            company = db.companies.get(form["cid"])
            if company is None:
                raise falcon.HTTPForbidden()

            imagebucket = os.environ["s3_imagebucket"]
            parentcompany = db.companies.get(company["cid"])
            if parentcompany is not None:
                imagebucket = parentcompany.get("s3_imagebucket", imagebucket)

            if "mobile" in req.get_header("User-Agent").lower():
                form = cast(JsonObj, form["mobile"])

            formclose = True
            if form["display"] == "inline" and not form.get("inlinedismiss", False):
                formclose = False

            form["cid"] = mycid

            html, _ = generate_html(
                db, form, id, imagebucket, True, True, True, formclose
            )
            resp.content_type = falcon.MEDIA_HTML
            resp.text = html


FORM_CONTENT_TYPE = "application/x-www-form-urlencoded"
FORM_MULTIPART_TYPE = "multipart/form-data"


class PostForm(object):

    def on_options(self, req: falcon.Request, resp: falcon.Response, id: str) -> None:
        resp.set_header("Access-Control-Allow-Origin", "*")
        resp.set_header("Access-Control-Allow-Methods", "POST, OPTIONS")
        resp.set_header(
            "Access-Control-Allow-Headers",
            req.get_header("Access-Control-Request-Headers") or "*",
        )
        resp.set_header("Access-Control-Max-Age", 86400)

        resp.set_header("Allow", "POST, OPTIONS")
        resp.content_type = "text/plain"

    def on_post(self, req: falcon.Request, resp: falcon.Response, id: str) -> None:
        resp.set_header("Access-Control-Allow-Origin", "*")
        resp.set_header("Access-Control-Allow-Methods", "POST, OPTIONS")
        resp.set_header(
            "Access-Control-Allow-Headers",
            req.get_header("Access-Control-Request-Headers") or "*",
        )
        resp.set_header("Access-Control-Max-Age", 86400)

        with open_db() as db:
            form = db.forms.get(id)

            if form is None or form.get("disabled"):
                raise falcon.HTTPBadRequest(
                    title="Form not found", description="This form does not exist"
                )

            content_type = req.content_type or FORM_CONTENT_TYPE
            if content_type != FORM_CONTENT_TYPE and not content_type.startswith(
                FORM_MULTIPART_TYPE
            ):
                raise falcon.HTTPBadRequest(
                    title="Invalid content type",
                    description="Content type of request should be application/x-www-form-urlencoded or multipart/form-data",
                )

            if content_type == FORM_CONTENT_TYPE:
                body = req.bounded_stream.read()
                try:
                    body_str = body.decode("ascii")
                except:
                    raise falcon.HTTPBadRequest(
                        title="Invalid form data",
                        description="Form data must be ASCII text",
                    )

                try:
                    postdata = urllib.parse.parse_qs(body_str)
                except:
                    raise falcon.HTTPBadRequest(
                        title="Invalid form data",
                        description=f"Could not parse input data of type {FORM_CONTENT_TYPE}",
                    )
            else:
                media = req.get_media()
                postdata = {}
                for part in media:
                    postdata[part.name] = [part.text]

            if not postdata.get("Email", [""])[0]:
                raise falcon.HTTPBadRequest(
                    title="No email address found",
                    description="This form requires an email address",
                )

            doc = {
                "data": {},
                "funnel": form["funnel"],
            }
            for k in postdata.keys():
                if "!" not in k and "," not in k:
                    doc["data"][k] = postdata[k][0].strip()

            doc["data"]["Email"] = doc["data"]["Email"].lower()
            m = emailre.search(doc["data"]["Email"])
            if not m:
                raise falcon.HTTPBadRequest(
                    title="Invalid email", description="That email address is invalid"
                )
            email = m.group(0)
            doc["data"]["Email"] = email

            taglist = list(
                set([fix_tag(tag) for tag in form.get("tags", []) if fix_tag(tag)])
            )
            doc["tags"] = taglist

            tagstr = ",".join(doc["tags"])
            if len(tagstr) > 16 * 1024:
                raise falcon.HTTPBadRequest(
                    title="Too much tag data",
                    description="Too much tag data; please enter shorter/fewer tags.",
                )

            data = json.dumps(doc)

            if len(data) > 256 * 1024:
                raise falcon.HTTPBadRequest(
                    title="Data too large", description="Maximum data size is 64KB"
                )

            l = db.lists.get(form["list"])
            if l is None:
                raise falcon.HTTPBadRequest(
                    title="Missing contact list", description="Contact list not found"
                )

            for tag in taglist:
                db.execute(
                    """insert into alltags (cid, tag, added, count) values (%s, %s, now(), 0)
                            on conflict (cid, tag) do nothing""",
                    form["cid"],
                    tag,
                )

            contacts.feed(db, l["id"], doc["data"], doc["tags"], doc["funnel"])

            formuid = req.cookies.get("edfu")
            uniq = 0
            if formuid:
                lastsubmit = db.single(
                    "select submitted_at from formcookies where formid = %s and uid = %s",
                    id,
                    formuid,
                )
                if lastsubmit is None:
                    uniq = 1
                db.execute(
                    "update formcookies set submitted_at = now(), viewed_at = null where formid = %s and uid = %s",
                    id,
                    formuid,
                )
            else:
                uniq = 1

            db.execute(
                "update forms set data = data || jsonb_build_object('submits', coalesce((data->>'submits')::integer, 0) + 1, 'submits_uniq', coalesce((data->>'submits_uniq')::integer, 0) + %s) where id = %s",
                uniq,
                id,
            )

            doc["data"].pop("Email")
            send_webhooks(
                db,
                form["cid"],
                [
                    {
                        "type": "form_submit",
                        "form": id,
                        "email": email,
                        "data": doc["data"],
                        "timestamp": datetime.utcnow().isoformat() + "Z",
                    }
                ],
            )

            if req.path.endswith(".json"):
                if form["submitaction"] == "msg":
                    req.context["result"] = {
                        "action": "msg",
                        "data": form["submitmsg"],
                    }
                else:
                    req.context["result"] = {
                        "action": "url",
                        "data": form["submiturl"],
                    }
            else:
                if form["submitaction"] == "msg":
                    resp.content_type = falcon.MEDIA_HTML
                    resp.text = FORMMSG % (esc_html(form["submitmsg"]),)
                else:
                    resp.status = falcon.HTTP_302
                    resp.location = form["submiturl"]
