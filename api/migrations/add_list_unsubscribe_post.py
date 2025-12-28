import re


def run(db):
    for id, headers in list(db.execute("select id, data->>'headers' from frontends")):
        if "List-Unsubscribe-Post:" not in headers:
            headers = re.sub(
                r"(\nList-Unsubscribe:[^\n]+)",
                r"\1\nList-Unsubscribe-Post: List-Unsubscribe=One-Click",
                headers,
            )
            db.execute(
                "update frontends set data = data || jsonb_build_object('headers', %s) where id = %s",
                headers,
                id,
            )
