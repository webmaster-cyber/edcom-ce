def run(db):
    cids = [cid for cid, in db.execute("select cid from contacts.contacts_hashlimit")]
    for cid in cids:
        db.execute(
            f"""
            with stats as (
                select list_id,
                   count(l.contact_id) filter (where coalesce((nullif(props->'Bounced'->>0, ''))::bool, false)) as bounced,
                   count(l.contact_id) filter (where coalesce((nullif(props->'Unsubscribed'->>0, ''))::bool, false)) as unsubscribed,
                   count(l.contact_id) filter (where coalesce((nullif(props->'Complained'->>0, ''))::bool, false)) as complained
                from contacts."contacts_{cid}" c
                join contacts."contact_lists_{cid}" l on l.contact_id = c.contact_id
                group by list_id
            )
            update lists set data = data || jsonb_build_object('bounced', stats.bounced, 'unsubscribed', stats.unsubscribed, 'complained', stats.complained, 'soft_bounced', 0)
            from stats
            where stats.list_id = lists.id
        """
        )
