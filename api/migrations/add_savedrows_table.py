def run(db):
    db.execute(
        """
        create table savedrows (
            id text primary key,
            cid text,
            data jsonb NOT NULL
        );
        create index savedrows_cid_idx on savedrows using btree (cid);
    """
    )
