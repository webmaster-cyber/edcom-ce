def run(db):
    db.execute(
        """
        create table signupsettings (
            id text primary key,
            cid text,
            data jsonb NOT NULL
        );
        create index signupsettings_cid_idx on signupsettings using btree (cid);
    """
    )
