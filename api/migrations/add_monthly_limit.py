def run(db):
    db.execute(
        """
        update frontends set data = data || '{"monthlimit": 999999999}' where data->>'monthlimit' is null;
        update companies set data = data || '{"monthlimit": 999999999, "monthlimitpostupgrade": 999999999}' where data->>'monthlimit' is null and not coalesce(data->>'admin', 'false')::bool;
    """
    )
