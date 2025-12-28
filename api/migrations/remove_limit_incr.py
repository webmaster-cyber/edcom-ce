def run(db):
    for id, data in list(
        db.execute(
            "select id, data from companies where not coalesce(data->>'admin', 'false')::bool"
        )
    ):
        initial = data.get("initiallimit")
        daylimit = data.get("daylimit")
        if initial is not None and (daylimit is None or initial < daylimit):
            db.execute(
                "update companies set data = data || %s where id = %s",
                {"daylimit": initial},
                id,
            )

        if data.get("minlimit") is None:
            db.execute(
                "update companies set data = data || %s where id = %s",
                {"minlimit": 999999999},
                id,
            )
        if data.get("defaultminlimit") is None:
            db.execute(
                "update companies set data = data || %s where id = %s",
                {"defaultminlimit": 999999999},
                id,
            )

    db.execute(
        """
        update frontends set data = data - 'initiallimit' - 'limitincr' - 'limitincrmins';
        update companies set data = data - 'initiallimit' - 'limitincr' - 'limitincrmins' -
               'limitincrpostupgrade' - 'initiallimitpostupgrade' - 'limitincrminspostupgrade' - 'currentlimit';
    """
    )
