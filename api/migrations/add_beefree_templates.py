import os
import json
import shortuuid
import shutil


def template_title(name):
    return name.replace("-", " ").title()


def run(db):
    template_data = {}
    for filename in os.listdir("/setup/beefree"):
        s = os.path.splitext(filename)
        name = s[0]
        ext = s[1][1:]
        with open(f"/setup/beefree/{filename}") as f:
            if name not in template_data:
                template_data[name] = {}
            template_data[name][ext] = f.read()
            if ext == "json":
                template_data[name][ext] = json.loads(template_data[name][ext])

    templates = {}
    for name, data in template_data.items():
        image_name = f"{name}_large.jpg"

        destpath = f"/buckets/images/{image_name}"
        if not os.path.exists(destpath):
            shutil.copyfile(f"/setup/images/{image_name}", destpath)

        templates[name] = {}
        templates[name]["rawText"] = json.dumps(data)
        templates[name]["image"] = f"/i/{image_name}"
        templates[name]["show"] = True
        templates[name]["type"] = "beefree"
        templates[name]["name"] = template_title(name)

    db.execute(
        """
        create table beefreetemplates (
            id text primary key,
            cid text not null,
            data jsonb not null
        );
        create index beefreetemplates_cid_idx ON beefreetemplates (cid);
    """
    )

    admincids = [
        cid
        for cid, in db.execute(
            "select id from companies where coalesce(data->>'admin', 'false')::bool"
        )
    ]
    for cid in admincids:
        for data in templates.values():
            db.execute(
                "insert into beefreetemplates (id, cid, data) values (%s, %s, %s)",
                shortuuid.uuid(),
                cid,
                data,
            )
