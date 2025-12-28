#!/usr/bin/env python

import sys
import os
import random
import shortuuid
import argparse
from datetime import datetime

sys.path.append(os.path.join(os.path.dirname(__file__), '..'))

from api.shared.db import DB
from api.shared.utils import unix_time_secs

def main():
    parser = argparse.ArgumentParser(prog='fake_opens', description='Generate fake clicks / opens / sends')
    parser.add_argument('cid', help='Company ID')
    args = parser.parse_args()

    cid = args.cid

    campids = [
        shortuuid.uuid(),
        shortuuid.uuid(),
        shortuuid.uuid(),
        shortuuid.uuid(),
        shortuuid.uuid(),
    ]

    db = DB()

    contact_ids = [contact_id for contact_id, in db.execute(f"""
                                                            select c.contact_id from contacts."contacts_{cid}" c
                                                            where exists (
                                                                select true from contacts."contact_lists_{cid}" l
                                                                where l.contact_id = c.contact_id
                                                            )
                                                            and not exists (
                                                                select true from contacts."contact_send_logs_{cid}" s
                                                                where s.contact_id = c.contact_id
                                                            )
                                                            """)]

    for x in range(0, len(contact_ids), 10000):
        with db.transaction():
            for c in range(x, x + 10000):
                contact_id = contact_ids[c]

                opens = random.randint(0, 5)
                clicks = random.randint(0, opens)
                
                for i in range(5):
                    db.execute(f"""
                        insert into contacts."contact_send_logs_{cid}" (contact_id, campid) values (%s, %s)
                    """, contact_id, campids[i])

                for i in range(opens):
                    db.execute(f"""
                        insert into contacts."contact_open_logs_{cid}" (contact_id, campid, ts) values (%s, %s, %s)
                    """, contact_id, campids[i], unix_time_secs(datetime.now()) - random.randint(0, 100000))

                for i in range(clicks):
                    db.execute(f"""
                        insert into contacts."contact_click_logs_{cid}" (contact_id, campid, ts, linkindex, updatedts) values (%s, %s, %s, %s, %s)
                    """, contact_id, campids[i], unix_time_secs(datetime.now()) - random.randint(0, 100000), 1, 0)
        print(x)

if __name__ == "__main__":
    main()