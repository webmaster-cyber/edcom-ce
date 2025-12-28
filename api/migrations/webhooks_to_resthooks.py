import shortuuid


def run(db):
    webhooks = list(db.execute("select cid, data from webhooks"))
    for cid, data in webhooks:
        if not data.get("webhook"):
            continue
        for ev, enabled in data.get("events", {}).items():
            if not enabled:
                continue

            exist = db.single(
                "select id from resthooks where cid = %s and data->>'target_url' = %s and data->>'event' = %s",
                cid,
                data["webhook"],
                ev,
            )

            if not exist:
                db.execute(
                    "insert into resthooks (id, cid, data) values (%s, %s, %s)",
                    shortuuid.uuid(),
                    cid,
                    {"name": "", "target_url": data["webhook"], "event": ev},
                )
