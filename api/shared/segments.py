import hashlib
import dateutil.parser
import shortuuid
import os
from typing import TypeAlias, Tuple, Dict, Any, List, Set, cast, Sequence
from fnmatch import fnmatch
from datetime import datetime, timedelta
from dateutil.tz import tzutc
from .utils import djb2, md5re, unix_time_secs
from .log import get_logger
from .db import DB, JsonObj

log = get_logger()

# Cap hashlimit to prevent runaway task fan-out; locally defined to avoid circular imports.
HASHLIMIT_CAP = int(os.environ.get("hashlimit_max", "128"))

class Cache:

    def __init__(self) -> None:
        self.relative: Dict[int, datetime] = {}
        self.fixed: Dict[str | int, datetime] = {}
        self.offset: Dict[str, datetime] = {}
        self.trace: bool = bool(os.environ.get("segment_trace"))


SentRows: TypeAlias = Dict[str, Set[str]]


def trace(cache: Cache, msg: str, *args: Any) -> None:
    if cache.trace:
        log.info(msg, *args, stacklevel=2)


def get_hashlimit(db: DB, cid: str, lists: List[JsonObj] | None = None) -> int:
    if lists is not None:
        count = sum(lst.get("count", 0) for lst in lists)

        if count <= 10000:
            return 1

    hashlimit = db.single(
        "select hashlimit from contacts.contacts_hashlimit where cid = %s", cid
    )

    if hashlimit is None:
        hashlimit = HASHLIMIT_CAP

    return cast(int, min(hashlimit, HASHLIMIT_CAP))


def segment_get_segmentids(parts: List[JsonObj], newids: Set[str]) -> None:
    for p in parts:
        if p["type"] == "Lists" and p["operator"] in ("insegment", "notinsegment"):
            newids.add(p["segment"])
            for a in p.get("addl", ()):
                if a["operator"] in ("insegment", "notinsegment"):
                    newids.add(a["segment"])
        elif p["type"] == "Group":
            segment_get_segmentids(p["parts"], newids)


def segment_get_segments(
    db: DB, parts: List[JsonObj], ret: Dict[str, JsonObj | None]
) -> None:
    segids: Set[str] = set()
    segment_get_segmentids(parts, segids)

    for segid in segids:
        if segid not in ret:
            ret[segid] = db.segments.get(segid)
            seg = ret[segid]
            if seg is not None:
                segment_get_segments(db, seg["parts"], ret)


def segment_lists(alllists: Sequence[JsonObj | None]) -> List[JsonObj]:
    return [l for l in alllists if l]


def segment_get_params(
    db: DB,
    cid: str,
    segment: JsonObj,
    lists: List[JsonObj] | None = None,
    approvedonly: bool = False,
) -> Tuple[int, List[str]]:
    if len(segment["parts"]) == 0:
        raise Exception("No rules in segment")

    if lists is None:
        db.set_cid(cid)
        alllists = db.lists.get_all()
        db.set_cid(None)
        lists = segment_lists(alllists)

    if approvedonly:
        lists = [l for l in lists if not l.get("unapproved")]

    hashlimit = get_hashlimit(db, cid, lists)

    return hashlimit, [l["id"] for l in lists]


def get_campaignsent_ids(parts: List[JsonObj], ret: Set[str]) -> None:
    for p in parts:
        if p["type"] == "Responses" and p["action"] in ("sent", "notsent"):
            c = (
                p.get("broadcast")
                or p.get("defaultbroadcast")
                or p["campaign"]
                or p["defaultcampaign"]
            )
            if c:
                ret.add(c)
            for a in p.get("addl", ()):
                if a["action"] in ("sent", "notsent"):
                    c = (
                        a.get("broadcast")
                        or a.get("defaultbroadcast")
                        or a["campaign"]
                        or a["defaultcampaign"]
                    )
                    if c:
                        ret.add(c)
        elif p["type"] == "Group":
            get_campaignsent_ids(p["parts"], ret)


def segment_get_campaignids(
    segment: JsonObj, segments: List[JsonObj | None]
) -> List[str]:
    campaignids: Set[str] = set()

    get_campaignsent_ids(segment["parts"], campaignids)
    for s in segments:
        if s is not None:
            get_campaignsent_ids(s["parts"], campaignids)

    return list(campaignids)


def get_segment_sentrows(
    db: DB, cid: str, campaignids: List[str], hashval: int, hashlimit: int
) -> SentRows:
    ret: SentRows = {}
    for campid, email in db.execute(
        f"""
        select s.campid, c.email
        from contacts."contacts_{cid}" c
        join contacts."contact_send_logs_{cid}" s on s.contact_id = c.contact_id
        where s.campid = any(%s)
        and ({hashlimit} = 1 or mod(c.contact_id, {hashlimit}) = %s)
        and ({hashlimit} = 1 or mod(s.contact_id, {hashlimit}) = %s)
    """,
        campaignids,
        hashval,
        hashval,
    ):
        if campid not in ret:
            ret[campid] = r = set()
        else:
            r = ret[campid]
        r.add(email)

    return ret


def supp_rows(
    db: DB, cid: str, hashval: int, hashlimit: int, suppfactors: List[str]
) -> Set[str]:
    supprows = set()

    for (email,) in db.execute(
        f"""
        select c.email
        from contacts."contacts_{cid}" c
        join contacts."contact_supplists_{cid}" s on s.contact_id = c.contact_id
        where s.supplist_id = any(%s)
        and ({hashlimit} = 1 or mod(c.contact_id, {hashlimit}) = %s)
        and ({hashlimit} = 1 or mod(s.contact_id, {hashlimit}) = %s)
    """,
        suppfactors,
        hashval,
        hashval,
    ):
        if md5re.search(email):
            supprows.add(email)
        else:
            supprows.add(hashlib.md5(email.encode("utf-8")).hexdigest())
    return supprows


def tag_set(row: JsonObj) -> JsonObj:
    if "!!tags" in row:
        row["!!tags"] = set(row["!!tags"])
    return row


def get_segment_rows(
    db: DB,
    cid: str,
    hashval: int,
    listfactors: List[str],
    hashlimit: int,
    rowset: Set[str] | None = None,
) -> List[JsonObj]:
    ret = []

    rowsetexpr = ""
    rowsetargs = []
    if rowset is not None:
        rowsetexpr = "and c.email = any(%s)"
        rowsetargs = [list(rowset)]

    alternate_plan = os.environ.get("alternate_contact_plan")

    ret = [
        tag_set(row)
        for row, in db.execute(
            f"""
        with values as (
            select
                c.contact_id,
                array_agg(distinct value) filter (where type = 'tag') as tags,
                array_agg(distinct value::int) filter (where type = 'device') as device,
                array_agg(distinct value::int) filter (where type = 'os') as os,
                array_agg(distinct value::int) filter (where type = 'browser') as browser,
                array_agg(distinct value) filter (where type = 'country') as country,
                array_agg(distinct value) filter (where type = 'region') as region,
                array_agg(distinct value) filter (where type = 'zip') as zip
            from contacts."contact_values_{cid}" c
            join contacts."contact_lists_{cid}" l on l.contact_id = c.contact_id
            where l.list_id = any(%s)
            and ({hashlimit} = 1 or mod(c.contact_id, {hashlimit}) = %s)
            {f'and %s >= 0' if alternate_plan else f'and ({hashlimit} = 1 or mod(l.contact_id, {hashlimit}) = %s)'}
            group by c.contact_id
        ),
        open_logs as (
            select c.contact_id, array_agg(jsonb_build_array(ts, campid) order by ts) filter (where campid is not null) as open_logs
            from contacts."contact_open_logs_{cid}" c
            join contacts."contact_lists_{cid}" l on l.contact_id = c.contact_id
            where l.list_id = any(%s)
            and ({hashlimit} = 1 or mod(c.contact_id, {hashlimit}) = %s)
            {f'and %s >= 0' if alternate_plan else f'and ({hashlimit} = 1 or mod(l.contact_id, {hashlimit}) = %s)'}
            group by c.contact_id
        ),
        click_logs as (
            select c.contact_id, array_agg(jsonb_build_array(ts, jsonb_build_array(campid, linkindex, case when updatedts = 0 then null else updatedts end)) order by ts) filter (where campid is not null) as click_logs
            from contacts."contact_click_logs_{cid}" c
            join contacts."contact_lists_{cid}" l on l.contact_id = c.contact_id
            where l.list_id = any(%s)
            and ({hashlimit} = 1 or mod(c.contact_id, {hashlimit}) = %s)
            {f'and %s >= 0' if alternate_plan else f'and ({hashlimit} = 1 or mod(l.contact_id, {hashlimit}) = %s)'}
            group by c.contact_id
        )
        select c.props ||
            jsonb_build_object(
                'Email', jsonb_build_array(c.email),
                '!!added', jsonb_build_array(c.added),
                '!!added_index', jsonb_build_array(row_number() over (order by c.added, c.email) - 1),
                '!!list', array_agg(distinct l.list_id),
                '!!open-logs', coalesce(op.open_logs, '{{}}'),
                '!!click-logs', coalesce(cl.click_logs, '{{}}'),
                '!!tags', coalesce(v.tags, '{{}}'),
                '!!device', coalesce(v.device, '{{}}'),
                '!!os', coalesce(v.os, '{{}}'),
                '!!browser', coalesce(v.browser, '{{}}'),
                '!!country', coalesce(v.country, '{{}}'),
                '!!region', coalesce(v.region, '{{}}'),
                '!!zip', coalesce(v.zip,  '{{}}')
            )
        from contacts."contacts_{cid}" c
        join contacts."contact_lists_{cid}" l on l.contact_id = c.contact_id
        left join values v on v.contact_id = c.contact_id
        left join open_logs op on op.contact_id = c.contact_id
        left join click_logs cl on cl.contact_id = c.contact_id
        where l.list_id = any(%s)
        and ({hashlimit} = 1 or mod(c.contact_id, {hashlimit}) = %s)
        {f'and %s >= 0' if alternate_plan else f'and ({hashlimit} = 1 or mod(l.contact_id, {hashlimit}) = %s)'}
        {rowsetexpr}
        group by c.email, c.added, c.props, op.open_logs, cl.click_logs, v.tags, v.device, v.os, v.browser, v.country, v.region, v.zip
    """,
            listfactors,
            hashval,
            hashval,
            listfactors,
            hashval,
            hashval,
            listfactors,
            hashval,
            hashval,
            listfactors,
            hashval,
            hashval,
            *rowsetargs,
        )
    ]

    # sort in random but reproducible order so that the counts of subsets
    # remain consistent
    ret.sort(key=lambda r: djb2(r["Email"][0]))

    return ret


def segment_eval_part_all(
    part: JsonObj,
    row: JsonObj,
    segcounts: Dict[str, int],
    numrows: int,
    segments: Dict[str, JsonObj | None],
    sentrows: SentRows,
    hashlimit: int,
    cache: Cache,
) -> List[bool]:
    results = [
        segment_eval_part(
            part, row, segcounts, numrows, segments, sentrows, hashlimit, cache
        )
    ]

    if "addl" in part and len(part["addl"]) > 0:
        for addl in part["addl"]:
            results.append(
                segment_eval_part(
                    addl, row, segcounts, numrows, segments, sentrows, hashlimit, cache
                )
            )

    return results


def segment_eval_part(
    part: JsonObj,
    row: JsonObj,
    segcounts: Dict[str, int],
    numrows: int,
    segments: Dict[str, JsonObj | None],
    sentrows: SentRows,
    hashlimit: int,
    cache: Cache,
) -> bool:
    left: Tuple[Any, ...] | List[Any]
    t = part["type"]
    trace(cache, "type = %s", t)
    if t == "Group":
        return segment_eval_parts(
            part["parts"],
            part["operator"],
            row,
            segcounts,
            numrows,
            segments,
            sentrows,
            None,
            hashlimit,
            cache,
        )
    elif t == "Info":
        if not part.get("test"):
            prop = part["prop"]
            op = part["operator"]
            rightval = part["value"].strip().lower()

            if prop == "!!*":
                left = [
                    val[0]
                    for key, val in row.items()
                    if not key.startswith("!") and len(val)
                ]
                left.extend(row.get("!!tags", ()))
            elif prop.startswith("!"):
                return False
            elif prop == "Domain":
                left = (cast(List[str], row.get("Email"))[0].split("@")[1],)
            else:
                left = row.get(prop, ("",))

            for leftval in left:
                leftval = leftval.strip().lower()

                if op == "equals":
                    r = leftval == rightval
                elif op == "notequals":
                    r = leftval != rightval
                elif op == "contains":
                    r = rightval in leftval
                elif op == "notcontains":
                    r = rightval not in leftval
                elif op == "startswith":
                    r = leftval.startswith(rightval)
                elif op == "endswith":
                    r = leftval.endswith(rightval)
                else:
                    continue

                if r:
                    trace(cache, "returning true for %s %s %s", prop, op, rightval)
                    return True
            trace(cache, "returning false for %s %s %s", prop, op, rightval)
            return False
        elif part["test"] == "added":
            left = cast(List[int], row.get("!!added"))
            addedtype = part["addedtype"]  # inpast, between
            addednum = part["addednum"]  # days
            addedstart = part["addedstart"]  # iso format
            addedend = part["addedend"]
            trace(
                cache,
                "added test for %s %s %s %s",
                addedtype,
                addednum,
                addedstart,
                addedend,
            )
            if left:
                relative, fixed, offset = cache.relative, cache.fixed, cache.offset
                for leftval in left:
                    if leftval in fixed:
                        dt = fixed[leftval]
                    else:
                        dt = datetime.utcfromtimestamp(leftval)
                        fixed[leftval] = dt
                    if addedtype == "inpast":
                        if addednum in relative:
                            compare = relative[addednum]
                        else:
                            compare = datetime.utcnow() - timedelta(days=addednum)
                            relative[addednum] = compare
                        if dt > compare:
                            trace(cache, "%s > %s, returning true", dt, compare)
                            return True
                    else:
                        if addedstart in fixed:
                            st = fixed[addedstart]
                        else:
                            st = (
                                dateutil.parser.parse(addedstart)
                                .astimezone(tzutc())
                                .replace(tzinfo=None)
                            )
                            fixed[addedstart] = st
                        if addedend in offset:
                            ed = offset[addedend]
                        else:
                            ed = (
                                dateutil.parser.parse(addedend)
                                .astimezone(tzutc())
                                .replace(tzinfo=None)
                                + timedelta(days=1)
                                - timedelta(seconds=1)
                            )
                            offset[addedend] = ed
                        if dt >= st and dt <= ed:
                            trace(
                                cache,
                                "%s >= %s and %s <= %s, returning true",
                                dt,
                                st,
                                dt,
                                ed,
                            )
                            return True
            trace(cache, "returning false")
            return False
        else:
            rightval = part["tag"].strip().lower()
            left = row.get("!!tags", ())
            tags = set()
            for leftval in left:
                if leftval:
                    for l in leftval.split(","):
                        tags.add(l)
            trace(cache, "testing %s for %s in %s", part["test"], rightval, tags)
            return (
                part["test"] == "tag"
                and rightval in tags
                or part["test"] == "notag"
                and rightval not in tags
            )
    elif t == "Lists":
        op = part["operator"]
        if op == "in":
            trace(cache, "test list membership for %s", part["list"])
            return part["list"] in row["!!list"]
        elif op == "notin":
            trace(cache, "test list non-membership for %s", part["list"])
            return part["list"] not in row["!!list"]
        elif op == "insegment":
            segment = segments.get(part["segment"], None)
            if segment is None:
                trace(cache, "subsegment not found, returning false")
                return False
            return segment_eval_parts(
                segment["parts"],
                segment["operator"],
                row,
                segcounts,
                numrows,
                segments,
                sentrows,
                segment,
                hashlimit,
                cache,
            )
        else:
            segment = segments.get(part["segment"], None)
            if segment is None:
                trace(cache, "subsegment not found, returning true")
                return True
            return not segment_eval_parts(
                segment["parts"],
                segment["operator"],
                row,
                segcounts,
                numrows,
                segments,
                sentrows,
                segment,
                hashlimit,
                cache,
            )
    elif t == "Responses":
        action: str = part["action"]
        trace(cache, "action = %s", action)
        if action == "from":
            fromtype = part["fromtype"]
            if fromtype == "device":
                trace(cache, "testing %s in !!device", part["fromdevice"])
                if not row.get("!!device"):
                    return False
                return int(part["fromdevice"]) in row["!!device"]
            elif fromtype == "os":
                trace(cache, "testing %s in !!os", part["fromos"])
                if not row.get("!!os"):
                    return False
                return int(part["fromos"]) in row["!!os"]
            elif fromtype == "browser":
                trace(cache, "testing %s in !!browser", part["frombrowser"])
                if not row.get("!!browser"):
                    return False
                return int(part["frombrowser"]) in row["!!browser"]
            elif fromtype == "country":
                trace(cache, "testing %s in !!country", part["fromcountry"])
                if not row.get("!!country"):
                    return False
                return part["fromcountry"] in row["!!country"]
            elif fromtype == "region":
                trace(cache, "testing %s in !!region", part["fromregion"])
                if not row.get("!!region"):
                    return False
                return part["fromregion"] in row["!!region"]
            else:  # zip
                trace(cache, "testing %s in !!zip", part["fromzip"])
                if part["fromzip"] and row.get("!!zip"):
                    for z in row["!!zip"]:
                        if fnmatch(z, part["fromzip"]):
                            return True
                return False
        elif action in ("sent", "notsent"):
            campaign = (
                part.get("broadcast")
                or part.get("defaultbroadcast")
                or part["campaign"]
                or part["defaultcampaign"]
            )
            trace(cache, "campaign = %s, sentrows = %s", campaign, sentrows)
            if not campaign:
                return action != "sent"
            i = row["Email"][0] in sentrows.get(campaign, ())
            return (i and action == "sent") or (not i and action == "notsent")
        else:
            if "openclick" in action:
                props: Tuple[str, ...] = ("!!open-logs", "!!click-logs")
            elif "open" in action:
                props = ("!!open-logs",)
            else:
                props = ("!!click-logs",)
            checklinks = action in ("clicked", "openclicked")
            camps = set()
            for prop in props:
                trace(cache, "prop = %s, checklinks = %s", prop, checklinks)
                if prop in row:
                    trace(cache, "list = %s", row[prop])
                    timetype = part["timetype"]  # anytime, inpast, between
                    timenum = part["timenum"]  # days
                    timestart = part["timestart"]  # iso format
                    timeend = part["timeend"]
                    campaign = part.get("broadcast") or part.get(
                        "campaign", ""
                    )  # '' == any
                    linkindex = part.get("linkindex", -1)
                    updatedts = part.get("updatedts", None)
                    trace(
                        cache,
                        "timetype = %s, timenum = %s, timestart = %s, timeend = %s, campaign = %s, linkindex = %s, updatedts = %s",
                        timetype,
                        timenum,
                        timestart,
                        timeend,
                        campaign,
                        linkindex,
                        updatedts,
                    )
                    if updatedts is not None:
                        updatedts = unix_time_secs(
                            dateutil.parser.parse(updatedts, ignoretz=True)
                        )
                    for ts, campid in row[prop]:
                        rowlinkindex, rowupdatedts = None, None
                        if isinstance(campid, (tuple, list)):
                            campid, rowlinkindex, rowupdatedts = campid
                        if (
                            campaign
                            and not action.endswith("cnt")
                            and campaign != campid
                        ):
                            continue
                        if (
                            checklinks
                            and linkindex >= 0
                            and campaign
                            and "click" in prop
                            and (linkindex != rowlinkindex or updatedts != rowupdatedts)
                        ):
                            continue

                        if timetype != "anytime":
                            relative, fixed, offset = (
                                cache.relative,
                                cache.fixed,
                                cache.offset,
                            )
                            if ts in fixed:
                                dt = fixed[ts]
                            else:
                                dt = datetime.utcfromtimestamp(ts)
                                fixed[ts] = dt

                            if timetype == "inpast":
                                if timenum in relative:
                                    compare = relative[timenum]
                                else:
                                    compare = datetime.utcnow() - timedelta(
                                        days=timenum
                                    )
                                    relative[timenum] = compare
                                if dt < compare:
                                    continue
                            else:
                                if timestart in fixed:
                                    st = fixed[timestart]
                                else:
                                    st = (
                                        dateutil.parser.parse(timestart)
                                        .astimezone(tzutc())
                                        .replace(tzinfo=None)
                                    )
                                    fixed[timestart] = st
                                if timeend in offset:
                                    ed = offset[timeend]
                                else:
                                    ed = (
                                        dateutil.parser.parse(timeend)
                                        .astimezone(tzutc())
                                        .replace(tzinfo=None)
                                        + timedelta(days=1)
                                        - timedelta(seconds=1)
                                    )
                                    offset[timeend] = ed

                                if dt < st or dt > ed:
                                    continue
                        camps.add(campid)
            trace(cache, "camps = %s", camps)
            cnt = len(camps)
            if action.endswith("cnt"):
                cntop: str = part["cntoperator"]
                cntval: int = part["cntvalue"]
                trace(cache, "op = %s, cnt = %s, val = %s", cntop, cnt, cntval)
                if cntop == "more":
                    return cnt > cntval
                elif cntop == "equal":
                    return cnt == cntval
                else:
                    return cnt < cntval
            elif action.startswith("not"):
                trace(cache, "returning cnt == 0 (%s)", cnt == 0)
                return cnt == 0
            else:
                trace(cache, "returning cnt > 0 (%s)", cnt > 0)
                return cnt > 0
    else:
        return False


def segment_eval_parts(
    parts: List[JsonObj],
    operator: str,
    row: JsonObj,
    segcounts: Dict[str, int],
    numrows: int,
    segments: Dict[str, JsonObj | None],
    sentrows: SentRows,
    sub: JsonObj | None,
    hashlimit: int,
    cache: Cache,
) -> bool:
    trace(cache, "running for %s", row)

    results = []
    partindex = 0
    for part in parts:
        r = segment_eval_part_all(
            part, row, segcounts, numrows, segments, sentrows, hashlimit, cache
        )
        trace(cache, "results for part %s is %s", partindex, r)
        results.extend(r)
        partindex += 1

    if operator == "or":
        res = any(results)
    elif operator == "and":
        res = all(results)
    else:
        res = not any(results)

    ret = bool(res)

    trace(cache, "combined result is %s for operator %s", ret, operator)

    if not ret or sub is None or not sub.get("subset", False):
        trace(cache, "no subset, returning result")
        return ret

    if "id" not in sub:
        sub["id"] = shortuuid.uuid()

    index = segcounts.get(sub["id"], 0)

    trace(cache, "index = %s", index)

    if sub.get("subsetsort") in ("oldest", "newest"):
        index = row["!!added_index"][0]
        if sub.get("subsetsort") == "newest":
            index = (numrows - 1) - index
        trace(cache, "using %s sort, new index = %s", sub.get("subsetsort"), index)

    if sub["subsettype"] == "count" and sub.get("subsetsort") not in (
        "oldest",
        "newest",
    ):
        blockindex = round(sub["subsetnum"] / hashlimit)
        retval: bool = index < blockindex
        if retval:
            segcounts[sub["id"]] = segcounts.get(sub["id"], 0) + 1
        trace(cache, "block index = %s, returning %s", blockindex, retval)
        return retval
    else:
        if sub["subsettype"] == "count":
            pct = (sub["subsetnum"] / hashlimit) / numrows
        else:
            pct = sub["subsetpct"] / 100.0

        trace(cache, "pct = %s, subsettype = %s", pct, sub["subsettype"])

        if sub.get("subsetsort") in ("oldest", "newest"):
            retval = index / numrows <= pct
            if retval:
                segcounts[sub["id"]] = segcounts.get(sub["id"], 0) + 1
            trace(cache, "numrows = %s, returning %s", numrows, retval)
            return retval
        else:
            hashval = djb2(row["Email"][0])
            retval = hashval <= 0xFFFFFFFF * pct
            if retval:
                segcounts[sub["id"]] = segcounts.get(sub["id"], 0) + 1
            trace(cache, "hashval = %s, returning %s", hashval, retval)
            return retval
