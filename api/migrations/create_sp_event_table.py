def run(db):
    db.execute(
        """
        create table sparkpost_events (
            id text primary key,
            ts timestamptz not null default now()
        );
        create index sparkpost_events_ts_idx on sparkpost_events (ts);
    """
    )
