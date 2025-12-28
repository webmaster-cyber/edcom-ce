def run(db):
    db.execute(
        """
        create table txnsettings (
            id text primary key,
            cid text,
            data jsonb NOT NULL
        );
        create index txnsettings_cid_idx on txnsettings using btree (cid);
    """
    )
