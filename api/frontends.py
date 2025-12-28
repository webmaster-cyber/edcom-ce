import falcon
import json
from .shared import config as _  # noqa: F401
from .shared.crud import CRUDCollection, CRUDSingle, check_noadmin, get_orig
from .shared.db import json_iter, json_obj, open_db, DB
from .shared.utils import run_task, gen_screenshot, get_webroot
from .shared.tasks import tasks, HIGH_PRIORITY
from .shared.log import get_logger

log = get_logger()


class LoginFrontend(object):

    def on_get(self, req: falcon.Request, resp: falcon.Response) -> None:
        with open_db() as db:
            row = db.row(
                "select data->>'image', data->>'favicon', data->>'customcss' from frontends where (data->'useforlogin')::boolean limit 1"
            )

            if row is not None:
                image, favicon, customcss = row
                req.context["result"] = {
                    "image": image,
                    "favicon": favicon,
                    "customcss": customcss,
                }
            else:
                req.context["result"] = {}


class Frontends(CRUDCollection):

    def __init__(self) -> None:
        self.domain = "frontends"
        self.adminonly = True
        self.large = "image"
        self.userlog = "frontend"

    def on_post(self, req: falcon.Request, resp: falcon.Response) -> None:
        doc = req.context["doc"]
        if not doc:
            raise falcon.HTTPBadRequest(
                title="Not JSON", description="A valid JSON document is required."
            )

        if doc.get("useforlogin"):
            req.context["db"].execute(
                "update frontends set data = data || %s", {"useforlogin": False}
            )

        return CRUDCollection.on_post(self, req, resp)


class Frontend(CRUDSingle):

    def __init__(self) -> None:
        self.domain = "frontends"
        self.adminonly = True
        self.userlog = "frontend"

    def on_patch(self, req: falcon.Request, resp: falcon.Response, id: str) -> None:
        doc = req.context["doc"]
        if not doc:
            raise falcon.HTTPBadRequest(
                title="Not JSON", description="A valid JSON document is required."
            )

        if doc.get("useforlogin"):
            req.context["db"].execute(
                "update frontends set data = data || %s where id != %s",
                {"useforlogin": False},
                id,
            )

        return CRUDSingle.on_patch(self, req, resp, id)

    def del_check(self, db: DB, id: str) -> None:
        if db.companies.find_one({"frontend": id}) is not None:
            raise falcon.HTTPBadRequest(
                title="Frontend in use",
                description="This frontend is assigned to one or more customers",
            )


@tasks.task(priority=HIGH_PRIORITY)
def get_screenshot(id: str) -> None:
    try:
        with open_db() as db:
            gen_screenshot(db, id, "gallerytemplates")
    except:
        log.exception("error")


@tasks.task(priority=HIGH_PRIORITY)
def get_beefree_screenshot(id: str) -> None:
    try:
        with open_db() as db:
            gen_screenshot(db, id, "beefreetemplates")
    except:
        log.exception("error")


@tasks.task(priority=HIGH_PRIORITY)
def get_form_screenshot(id: str) -> None:
    try:
        with open_db() as db:
            gen_screenshot(db, id, "formtemplates")
    except:
        log.exception("error")


class BeefreeTemplates(CRUDCollection):

    def __init__(self) -> None:
        self.domain = "beefreetemplates"
        self.adminonly = True
        self.userlog = "beefree template"

    def on_get(self, req: falcon.Request, resp: falcon.Response) -> None:
        db = req.context["db"]

        req.context["result"] = list(
            json_iter(
                db.execute(
                    "select id, cid, data - 'parts' - 'rawText' from beefreetemplates where cid = %s",
                    db.get_cid(),
                )
            )
        )

    def on_post(self, req: falcon.Request, resp: falcon.Response) -> None:
        if "doc" in req.context:
            req.context["doc"]["image"] = None

        CRUDCollection.on_post(self, req, resp)

        run_task(get_beefree_screenshot, req.context["result"]["id"])


class BeefreeTemplate(CRUDSingle):

    def __init__(self) -> None:
        self.domain = "beefreetemplates"
        self.adminonly = True
        self.userlog = "beefree template"

    def on_patch(self, req: falcon.Request, resp: falcon.Response, id: str) -> None:
        if "doc" in req.context:
            req.context["doc"]["image"] = None

        CRUDSingle.on_patch(self, req, resp, id)

        run_task(get_beefree_screenshot, id)


class BeefreeTemplateDuplicate(object):

    def on_post(self, req: falcon.Request, resp: falcon.Response, id: str) -> None:
        if not req.context["admin"]:
            raise falcon.HTTPUnauthorized()

        db = req.context["db"]

        t = db.beefreetemplates.get(id)

        if t is None:
            raise falcon.HTTPForbidden()

        t["show"] = False

        orig, i = get_orig(t["name"])
        while True:
            t["name"] = "%s (%s)" % (orig, i)
            if db.beefreetemplates.find_one({"name": t["name"]}) is None:
                break
            i += 1

        req.context["result"] = db.beefreetemplates.add(t)


class AllBeefreeTemplatesSingle(object):

    def on_get(self, req: falcon.Request, resp: falcon.Response, id: str) -> None:
        check_noadmin(req)

        db = req.context["db"]

        parentcid = db.single("select cid from companies where id = %s", db.get_cid())
        if parentcid is None:
            raise falcon.HTTPForbidden()

        req.context["result"] = json_obj(
            db.row(
                "select id, cid, data from beefreetemplates where cid = %s and id = %s and (data->>'show')::boolean",
                parentcid,
                id,
            )
        )
        if req.context["result"] is None:
            raise falcon.HTTPForbidden()


class AllBeefreeTemplates(object):

    def on_get(self, req: falcon.Request, resp: falcon.Response) -> None:
        check_noadmin(req)

        db = req.context["db"]

        parentcid = db.single("select cid from companies where id = %s", db.get_cid())
        if parentcid is None:
            raise falcon.HTTPForbidden()

        broadcasts = list(
            json_iter(
                db.execute(
                    "select id, cid, data - 'parts' - 'rawText' from campaigns where data->>'image' is not null and data->>'sent_at' is not null and coalesce(data->>'type', '') = 'beefree' and cid = %s order by data->>'sent_at' desc limit 20",
                    db.get_cid(),
                )
            )
        )
        transactional = list(
            json_iter(
                db.execute(
                    "select id, cid, data - 'parts' - 'rawText' from txntemplates where data->>'image' is not null and coalesce(data->>'type', '') = 'beefree' and cid = %s order by lower(data->>'name')",
                    db.get_cid(),
                )
            )
        )
        messages = list(
            json_iter(
                db.execute(
                    "select id, cid, data - 'parts' - 'rawText' from messages where data->>'image' is not null and coalesce(data->>'type', '') = 'beefree' and cid = %s order by data->>'modified' desc",
                    db.get_cid(),
                )
            )
        )

        for b in broadcasts:
            b["templatetype"] = "broadcast"
        for t in transactional:
            t["templatetype"] = "transactional"
        for m in messages:
            m["templatetype"] = "message"
            m["name"] = m["subject"]

        req.context["result"] = {
            "featured": list(
                json_iter(
                    db.execute(
                        "select id, cid, data - 'parts' - 'rawText' from beefreetemplates where (data->>'show')::boolean and cid = %s",
                        parentcid,
                    )
                )
            ),
            "recent": broadcasts + transactional + messages,
        }

        req.context["result"]["featured"] = sorted(
            req.context["result"]["featured"],
            key=lambda c: (c.get("order") or 0, c["name"].lower()),
        )

        for n in list(req.context["result"].keys()):
            for i in range(len(req.context["result"][n])):
                c = req.context["result"][n][i]
                req.context["result"][n][i] = {
                    "id": c["id"],
                    "name": c["name"],
                    "image": c["image"],
                    "templatetype": c.get("templatetype"),
                }


class AllTemplatesSingle(object):

    def on_get(self, req: falcon.Request, resp: falcon.Response, id: str) -> None:
        check_noadmin(req)

        db = req.context["db"]

        parentcid = db.single("select cid from companies where id = %s", db.get_cid())
        if parentcid is None:
            raise falcon.HTTPForbidden()

        req.context["result"] = json_obj(
            db.row(
                "select id, cid, data from gallerytemplates where cid = %s and id = %s and (data->>'show')::boolean",
                parentcid,
                id,
            )
        )
        if req.context["result"] is None:
            raise falcon.HTTPForbidden()


class AllTemplates(object):

    def on_get(self, req: falcon.Request, resp: falcon.Response) -> None:
        check_noadmin(req)

        db = req.context["db"]

        parentcid = db.single("select cid from companies where id = %s", db.get_cid())
        if parentcid is None:
            raise falcon.HTTPForbidden()

        req.context["result"] = {
            "featured": list(
                json_iter(
                    db.execute(
                        "select id, cid, data - 'parts' - 'rawText' from gallerytemplates where (data->>'show')::boolean and cid = %s",
                        parentcid,
                    )
                )
            ),
            "recent": list(
                json_iter(
                    db.execute(
                        "select id, cid, data - 'parts' - 'rawText' from campaigns where data->>'image' is not null and data->>'sent_at' is not null and coalesce(data->>'type', '') != 'beefree' and cid = %s order by data->>'sent_at' desc limit 20",
                        db.get_cid(),
                    )
                )
            ),
        }

        req.context["result"]["featured"] = sorted(
            req.context["result"]["featured"],
            key=lambda c: (c.get("order") or 0, c["name"].lower()),
        )

        for n in list(req.context["result"].keys()):
            for i in range(len(req.context["result"][n])):
                c = req.context["result"][n][i]
                req.context["result"][n][i] = {
                    "id": c["id"],
                    "name": c["name"],
                    "image": c["image"],
                }


class FormTemplates(CRUDCollection):

    def __init__(self) -> None:
        self.domain = "formtemplates"
        self.adminonly = True
        self.userlog = "form template"

    def on_get(self, req: falcon.Request, resp: falcon.Response) -> None:
        db = req.context["db"]

        req.context["result"] = list(
            json_iter(
                db.execute(
                    "select id, cid, data - 'parts' - 'rawText' from formtemplates where cid = %s",
                    db.get_cid(),
                )
            )
        )

    def on_post(self, req: falcon.Request, resp: falcon.Response) -> None:
        if "doc" in req.context:
            req.context["doc"]["image"] = None

        CRUDCollection.on_post(self, req, resp)

        run_task(get_form_screenshot, req.context["result"]["id"])


class FormTemplate(CRUDSingle):

    def __init__(self) -> None:
        self.domain = "formtemplates"
        self.adminonly = True
        self.userlog = "form template"

    def on_patch(self, req: falcon.Request, resp: falcon.Response, id: str) -> None:
        if "doc" in req.context:
            req.context["doc"]["image"] = None

        CRUDSingle.on_patch(self, req, resp, id)

        run_task(get_form_screenshot, id)


class FormTemplateDuplicate(object):

    def on_post(self, req: falcon.Request, resp: falcon.Response, id: str) -> None:
        if not req.context["admin"]:
            raise falcon.HTTPUnauthorized()

        db = req.context["db"]

        t = db.formtemplates.get(id)

        if t is None:
            raise falcon.HTTPForbidden()

        t["show"] = False

        orig, i = get_orig(t["name"])
        while True:
            t["name"] = "%s (%s)" % (orig, i)
            if db.formtemplates.find_one({"name": t["name"]}) is None:
                break
            i += 1

        req.context["result"] = db.formtemplates.add(t)


class AllFormTemplatesSingle(object):

    def on_get(self, req: falcon.Request, resp: falcon.Response, id: str) -> None:
        check_noadmin(req)

        db = req.context["db"]

        parentcid = db.single("select cid from companies where id = %s", db.get_cid())
        if parentcid is None:
            raise falcon.HTTPForbidden()

        req.context["result"] = json_obj(
            db.row(
                "select id, cid, data from formtemplates where cid = %s and id = %s and (data->>'show')::boolean",
                parentcid,
                id,
            )
        )
        if req.context["result"] is None:
            raise falcon.HTTPForbidden()


class AllFormTemplates(object):

    def on_get(self, req: falcon.Request, resp: falcon.Response) -> None:
        check_noadmin(req)

        db = req.context["db"]

        parentcid = db.single("select cid from companies where id = %s", db.get_cid())
        if parentcid is None:
            raise falcon.HTTPForbidden()

        req.context["result"] = {
            "featured": list(
                json_iter(
                    db.execute(
                        "select id, cid, data - 'parts' - 'rawText' from formtemplates where (data->>'show')::boolean and cid = %s",
                        parentcid,
                    )
                )
            ),
        }

        req.context["result"]["featured"] = sorted(
            req.context["result"]["featured"],
            key=lambda c: (c.get("order") or 0, c["name"].lower()),
        )

        for n in list(req.context["result"].keys()):
            for i in range(len(req.context["result"][n])):
                c = req.context["result"][n][i]
                req.context["result"][n][i] = {
                    "id": c["id"],
                    "name": c["name"],
                    "image": c["image"],
                }


class GalleryTemplates(CRUDCollection):

    def __init__(self) -> None:
        self.domain = "gallerytemplates"
        self.adminonly = True
        self.userlog = "gallery template"

    def on_get(self, req: falcon.Request, resp: falcon.Response) -> None:
        db = req.context["db"]

        req.context["result"] = list(
            json_iter(
                db.execute(
                    "select id, cid, data - 'parts' - 'rawText' from gallerytemplates where cid = %s",
                    db.get_cid(),
                )
            )
        )

    def on_post(self, req: falcon.Request, resp: falcon.Response) -> None:
        if "doc" in req.context:
            req.context["doc"]["image"] = None

        CRUDCollection.on_post(self, req, resp)

        run_task(get_screenshot, req.context["result"]["id"])


class GalleryTemplate(CRUDSingle):

    def __init__(self) -> None:
        self.domain = "gallerytemplates"
        self.adminonly = True
        self.userlog = "gallery template"

    def on_patch(self, req: falcon.Request, resp: falcon.Response, id: str) -> None:
        if "doc" in req.context:
            req.context["doc"]["image"] = None

        CRUDSingle.on_patch(self, req, resp, id)

        run_task(get_screenshot, id)


class GalleryTemplateDuplicate(object):

    def on_post(self, req: falcon.Request, resp: falcon.Response, id: str) -> None:
        if not req.context["admin"]:
            raise falcon.HTTPUnauthorized()

        db = req.context["db"]

        t = db.gallerytemplates.get(id)

        if t is None:
            raise falcon.HTTPForbidden()

        t["show"] = False

        orig, i = get_orig(t["name"])
        while True:
            t["name"] = "%s (%s)" % (orig, i)
            if db.gallerytemplates.find_one({"name": t["name"]}) is None:
                break
            i += 1

        req.context["result"] = db.gallerytemplates.add(t)


class SignupSettings(CRUDCollection):

    def on_get(self, req: falcon.Request, resp: falcon.Response) -> None:
        if not req.context["admin"]:
            raise falcon.HTTPUnauthorized()

        db = req.context["db"]

        obj = db.signupsettings.get_singleton()

        if "initialize" not in obj:
            obj["rawText"] = ""
            obj["frontend"] = ""
            obj["initialize"] = True
            obj["subject"] = "Confirm Sign-up"
            obj["requireconfirm"] = False
        req.context["result"] = obj

    def on_patch(self, req: falcon.Request, resp: falcon.Response) -> None:
        if not req.context["admin"]:
            raise falcon.HTTPUnauthorized()

        db = req.context["db"]

        doc = req.context.get("doc")
        if not doc:
            raise falcon.HTTPBadRequest(
                title="Not JSON", description="A valid JSON document is required."
            )

        db.signupsettings.patch_singleton(doc)


class Signup:

    def on_get(self, req: falcon.Request, resp: falcon.Response, id: str) -> None:
        with open_db() as db:
            obj = db.signupsettings.get(id)

            if obj is None:
                raise falcon.HTTPNotFound()

            resp.body = obj["rawText"].replace("{{ID}}", id)
            resp.content_type = "text/html"
            resp.status = falcon.HTTP_200


class SignupAction:
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

    def on_get(self, req: falcon.Request, resp: falcon.Response, id: str) -> None:
        resp.set_header("Access-Control-Allow-Origin", "*")
        resp.set_header("Access-Control-Allow-Methods", "POST, OPTIONS")
        resp.set_header(
            "Access-Control-Allow-Headers",
            req.get_header("Access-Control-Request-Headers") or "*",
        )
        resp.set_header("Access-Control-Max-Age", 86400)

        with open_db() as db:
            obj = db.signupsettings.get(id)

            if obj is None:
                raise falcon.HTTPNotFound()

            resp.body = """
window.addEventListener('load', function() {
    var settings = %s;
    var form = document.getElementById('signupform');

    form.addEventListener('submit', function(e) {
        var email = '';

        e.preventDefault();

        var data = {
          signup: settings.signup,
          params: {}
        };
        for (var i = 0; i < form.elements.length; i++) {
            var el = form.elements[i];
            if (el.name) {
                if (el.name === 'email' ||
                    el.name === 'firstname' ||
                    el.name === 'lastname' ||
                    el.name === 'companyname') {
                    if (el.name === 'email') {
                        email = el.value;
                    }
                    data[el.name] = el.value;
                } else {
                    data.params[el.name] = el.value;
                }
            }
        }
        let xhr = new XMLHttpRequest();
        xhr.open('POST', '%s/api/invite', true);
        xhr.setRequestHeader('Content-Type', 'application/json');
        xhr.onload = function() {
            if (xhr.status >= 200 && xhr.status < 300) {
                window.location.href = '%s/activate?username=' + encodeURIComponent(email) + '&confirm=' + settings.confirm;
            } else {
                var result = document.getElementById('signuperror');
                if (result) {
                    result.classList.add('error');
                    try {
                        var response = JSON.parse(xhr.responseText);
                        result.innerText = response.title + ': ' + response.description;
                    } catch (e) {
                        result.innerText = 'An error occurred. Please try again later.';
                    }
                }
            }
        };
        xhr.send(JSON.stringify(data));
    });
});
""" % (
                json.dumps({"signup": id, "confirm": obj["requireconfirm"]}),
                get_webroot(),
                get_webroot(),
            )
            resp.content_type = "text/javascript"
            resp.status = falcon.HTTP_200
