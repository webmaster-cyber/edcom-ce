def run(db):
    db.execute(
        """
        drop index funnelqueue_uniq_idx;
        create index funnelqueue_email_messageid_idx on funnelqueue (email, messageid);
        create index funnelqueue_cid_idx on funnelqueue (cid);
    """
    )
