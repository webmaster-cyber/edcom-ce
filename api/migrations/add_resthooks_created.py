from datetime import datetime


def run(db):
    now = datetime.utcnow().isoformat() + "Z"
    db.execute(
        """
        update resthooks set data = data || jsonb_build_object('created', %s, 'updated', %s) where data->>'created' is null
    """,
        now,
        now,
    )
