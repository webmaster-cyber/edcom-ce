delete from list_domains where list_id in (select id from lists where cid = '{cid}');

insert into list_domains (list_id, domain, count)
select l.list_id, split_part(c.email, '@', 2) as domain, count(c.contact_id) as count
from contacts."contacts_{cid}" c
join contacts."contact_lists_{cid}" l on c.contact_id = l.contact_id
join lists on lists.id = l.list_id
group by l.list_id, split_part(c.email, '@', 2);

with stats as (
    select l.list_id,
    count(c.contact_id) filter(where coalesce((nullif(props->'Bounced'->>0, ''))::bool, false)) as bounced,
    count(c.contact_id) filter(where coalesce((nullif(props->'Unsubscribed'->>0, ''))::bool, false)) as unsubscribed,
    count(c.contact_id) filter(where coalesce((nullif(props->'Complained'->>0, ''))::bool, false)) as complained,
    count(c.contact_id) filter(where coalesce((nullif(props->'Soft Bounced'->>0, ''))::bool, false)) as soft_bounced
    from contacts."contact_lists_{cid}" l
    join contacts."contacts_{cid}" c on l.contact_id = c.contact_id
    group by l.list_id
), domains as (
    select count(*) as count, list_id from list_domains group by list_id
)
update lists set data = data || jsonb_build_object(
    'domaincount', (select count from domains where list_id = lists.id),
    'bounced', (select bounced from stats where list_id = lists.id),
    'unsubscribed', (select unsubscribed from stats where list_id = lists.id),
    'complained', (select complained from stats where list_id = lists.id),
    'soft_bounced', (select soft_bounced from stats where list_id = lists.id));
