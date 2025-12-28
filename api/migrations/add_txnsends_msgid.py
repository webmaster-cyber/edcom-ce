def run(db):
    db.execute(
        """
        alter table txnsends add column msgid text;
        create index txnsends_msgid_idx on txnsends (msgid);
    """
    )
