import re
import copy
import falcon
from typing import Tuple
from jsonschema import validate

from .db import json_iter, JsonObj, DB
from .utils import user_log
from .log import get_logger

log = get_logger()

origre = re.compile(r" \((\d+)\)$")


def get_orig(name: str) -> Tuple[str, int]:
    m = origre.search(name)
    if not m:
        return name, 2
    return name[: -len(m.group(0))], int(m.group(1)) + 1


def compare_patch(doc: JsonObj, old: JsonObj) -> bool:
    for k in doc.keys():
        if k == "modified":
            continue
        if k not in old or doc[k] != old[k]:
            return True
    return False


def check_noadmin(req: falcon.Request, api: bool = False, export: bool = False) -> None:
    if req.context["admin"]:
        raise falcon.HTTPUnauthorized(title="Impersonation Mismatch")
    if not api and req.context["api"]:
        log.info("bad request: this endpoint cannot be called with an api key")
        raise falcon.HTTPBadRequest(title="Method not allowed")
    if export and req.context["db"].single(
        "select (data->>'nodataexport')::boolean from users where id = %s",
        req.context["uid"],
    ):
        raise falcon.HTTPBadRequest(title="Method not allowed")


def patch_schema(schema: JsonObj) -> JsonObj:
    s = copy.deepcopy(schema)
    s.pop("required", None)
    for k in list(s["properties"].keys()):
        if not len(s["properties"][k]):
            s["properties"].pop(k, None)
    return s


def json_validate(obj: JsonObj, schema: JsonObj) -> None:
    for k in list(obj.keys()):
        if k not in schema["properties"]:
            obj.pop(k, None)
    try:
        validate(obj, schema)
    except Exception as e:
        raise falcon.HTTPBadRequest(title="Input validation error", description=str(e))


class CRUDCollection(object):
    @property
    def domain(self) -> str:
        if self._domain is None:
            raise AttributeError(
                "The 'domain' attribute must be set by the child class."
            )
        return self._domain

    @domain.setter
    def domain(self, value: str) -> None:
        self._domain = value

    def on_get(self, req: falcon.Request, resp: falcon.Response) -> None:
        if getattr(self, "adminonly", False) and not req.context["admin"]:
            log.info("unauthorized: this api endpoint is only callable by admins")
            raise falcon.HTTPUnauthorized()
        if getattr(self, "useronly", False):
            check_noadmin(
                req, getattr(self, "api", False), getattr(self, "checkexports", False)
            )

        db = req.context["db"]

        large = getattr(self, "large", None)

        if large is not None:
            req.context["result"] = list(
                json_iter(
                    db.execute(
                        "select id, cid, data - %%s from %s where cid = %%s"
                        % self.domain,
                        large,
                        db.get_cid(),
                    )
                )
            )
        else:
            req.context["result"] = db[self.domain].get_all()

        hide = getattr(self, "hide", None)
        if hide:
            for r in req.context["result"]:
                r.pop(hide, None)

    def on_post(self, req: falcon.Request, resp: falcon.Response) -> None:
        if getattr(self, "adminonly", False) and not req.context["admin"]:
            raise falcon.HTTPUnauthorized()
        if getattr(self, "useronly", False):
            check_noadmin(
                req, getattr(self, "api", False), getattr(self, "checkexports", False)
            )

        doc = req.context.get("doc")
        if not doc:
            raise falcon.HTTPBadRequest(
                title="Not JSON", description="A valid JSON document is required."
            )

        schema = getattr(self, "schema", None)
        if schema:
            json_validate(doc, schema)

        db = req.context["db"]

        uniq = getattr(self, "uniq", "name")
        if uniq and uniq in doc:
            if db[self.domain].find_one({uniq: doc[uniq]}):
                orig, i = get_orig(doc[uniq])
                while True:
                    doc[uniq] = "%s (%s)" % (orig, i)
                    if db[self.domain].find_one({uniq: doc[uniq]}) is None:
                        break
                    i += 1

        id = db[self.domain].add(doc)

        logname = getattr(self, "userlog", None)
        if logname:
            user_log(req, "plus-circle", "created %s " % logname, self.domain, id, ".")

        resp.status = falcon.HTTP_201
        req.context["result"] = db[self.domain].get(id)


class CRUDSingle(object):
    @property
    def domain(self) -> str:
        if self._domain is None:
            raise AttributeError(
                "The 'domain' attribute must be set by the child class."
            )
        return self._domain

    @domain.setter
    def domain(self, value: str) -> None:
        self._domain = value

    def on_patch(self, req: falcon.Request, resp: falcon.Response, id: str) -> None:
        if getattr(self, "adminonly", False) and not req.context["admin"]:
            raise falcon.HTTPUnauthorized()
        if getattr(self, "useronly", False):
            check_noadmin(
                req, getattr(self, "api", False), getattr(self, "checkexports", False)
            )

        doc = req.context.get("doc")
        if not doc:
            raise falcon.HTTPBadRequest(
                title="Not JSON", description="A valid JSON document is required."
            )

        schema = getattr(self, "schema", None)
        if schema:
            json_validate(doc, schema)

        db = req.context["db"]

        uniq = getattr(self, "uniq", "name")
        if uniq and uniq in doc:
            old = db[self.domain].find_one({uniq: doc[uniq]})
            if old is not None and old["id"] != id:
                orig, i = get_orig(doc[uniq])
                while True:
                    doc[uniq] = "%s (%s)" % (orig, i)
                    old = db[self.domain].find_one({uniq: doc[uniq]})
                    if old is None:
                        break
                    i += 1

        old = db[self.domain].get(id)

        db[self.domain].patch(id, doc)

        if old is not None:
            logname = getattr(self, "userlog", None)
            if logname and compare_patch(doc, old):
                user_log(req, "pencil", "edited %s " % logname, self.domain, id, ".")

        req.context["result"] = doc

    def del_check(self, db: DB, id: str) -> None:
        pass

    def on_delete(self, req: falcon.Request, resp: falcon.Response, id: str) -> None:
        if getattr(self, "adminonly", False) and not req.context["admin"]:
            raise falcon.HTTPUnauthorized()
        if getattr(self, "useronly", False):
            check_noadmin(
                req, getattr(self, "api", False), getattr(self, "checkexports", False)
            )

        db = req.context["db"]

        self.del_check(db, id)

        logname = getattr(self, "userlog", None)
        if logname:
            existing = db[self.domain].get(id)
            if existing is not None:
                user_log(
                    req,
                    "remove",
                    "deleted %s %s." % (logname, existing.get("name", "")),
                )

        db[self.domain].remove(id)

    def on_get(self, req: falcon.Request, resp: falcon.Response, id: str) -> None:
        if getattr(self, "adminonly", False) and not req.context["admin"]:
            raise falcon.HTTPUnauthorized()
        if getattr(self, "useronly", False):
            check_noadmin(
                req, getattr(self, "api", False), getattr(self, "checkexports", False)
            )

        db = req.context["db"]
        res = db[self.domain].get(id)
        if not res:
            raise falcon.HTTPForbidden()

        req.context["result"] = res

        hide = getattr(self, "hide", None)
        if hide:
            req.context["result"].pop(hide, None)
