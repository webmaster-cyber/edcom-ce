#!/usr/bin/env python

import sys
import os
import shortuuid
import bcrypt
from datetime import datetime

sys.path.append(os.path.join(os.path.dirname(__file__), '..'))

from api.shared.db import DB
from api.shared.contacts import initialize_cid

def main():
    db = DB()

    defheaders = "From: {{!!from}}\nReply-To: {{!!replyto}}\nTo: {{!!to}}\nSubject: {{!!subject}}\nDate: {{!!date}}\nMIME-Version: 1.0\nContent-Type: text/html; charset=\"utf-8\"\nContent-Transfer-Encoding: quoted-printable\nMessage-ID: <{{!!msgid}}>\nList-Unsubscribe: <{{!!unsubheaderlink}}>\nList-Unsubscribe-Post: List-Unsubscribe=One-Click\n"

    deffrontend = {
        "name": 'Default',
        "welcometext": 'Welcome',
        "bodydomain": '',
        "usedkim": True,
        "bouncerate": 3.0,
        "complaintrate": 0.2,
        "domainrates": [{
        "domain": '',
        "bouncerate": 3.0,
        "complaintrate": 0.2
        }],
        "bouncethreshold": 99,
        "unsubthreshold": 99,
        "complaintthreshold": 99,
        "fromencoding": 'none',
        "subjectencoding": 'none',
        "headers": defheaders,
        "invitename": 'Welcome',
        "inviteemail": 'invite@domain.com',
        "useapprove": False,
        "usetrial": False,
        "trialdays": 10,
        "minlimit": 999999999,
        "hourlimit": 999999999,
        "daylimit": 999999999,
        "monthlimit": 999999999,
        "txnaccount": '',
    }

    frontendid = shortuuid.uuid()

    now = datetime.utcnow().isoformat() + 'Z'

    defroute = {
        "name": "Drop All Mail",
        "dirty": False,
        "rules": [
            {
                "splits": [{"pct": 100, "policy": ""}], "default": True, "domaingroup": ""
            }
        ],
        "modified": now,
        "published": {"rules": [{"splits": [{"pct": 100, "policy": ""}], "default": True, "domaingroup": ""}],
                    "usedefault": False},
        "usedefault": False
    }

    routeid = shortuuid.uuid()

    defcustomer = {
        "name": "Test Frontend Company",
        "admin": False,
        "price": None,
        "period": "monthly",
        "routes": [routeid],
        "created": now,
        "credits": None,
        "frontend": frontendid,
        "minlimit": 999999999,
        "hourlimit": 999999999,
        "daylimit": 999999999,
        "monthlimit": 999999999,
        "approved_at": None,
        "overageprice": None,
        "overagecredits": None,
        "exampletemplate": False,
        "minlimitpostupgrade": 999999999,
        "hourlimitpostupgrade": 999999999,
        "daylimitpostupgrade": 999999999,
        "monthlimitpostupgrade": 999999999,
        "skip_list_validation": True,
    }

    fcid = shortuuid.uuid()

    c = db.companies.get(db.companies.add({'name': 'Test Backend Company', 'admin': True}))
    db.execute("""
        insert into frontends (id, cid, data) values (%s, %s, %s)
    """, frontendid, c['id'], deffrontend)
    db.execute("""
        insert into routes (id, cid, data) values (%s, %s, %s)
    """, routeid, c['id'], defroute)
    db.execute("""
        insert into companies (id, cid, data) values (%s, %s, %s)
    """, fcid, c['id'], defcustomer)

    with db.transaction():
        initialize_cid(db, fcid)

    db.set_cid(c['id'])
    adminuid = db.users.add({
        'username': 'admin@edtest.ok',
        'hash': bcrypt.hashpw('test'.encode('utf-8'), bcrypt.gensalt()).decode('ascii'),
        'fullname': 'Test Admin User',
        'companyname': 'Test Backend Company',
        'admin': True,
        'created': datetime.utcnow().isoformat() + 'Z',
    })

    db.set_cid(fcid)
    uid = db.users.add({
        'username': 'user@edtest.ok',
        'hash': bcrypt.hashpw('test'.encode('utf-8'), bcrypt.gensalt()).decode('ascii'),
        'fullname': 'Test Frontend User',
        'companyname': 'Test Frontend Company',
        'admin': False,
        'created': datetime.utcnow().isoformat() + 'Z',
        'apikey': shortuuid.uuid(),
    })

    if not os.path.isdir('/buckets/blocks'):
        os.mkdir('/buckets/blocks')
        os.mkdir('/buckets/data')
        os.mkdir('/buckets/images')
        os.mkdir('/buckets/transfer')

    db.cookies.add({'lastused': datetime.utcnow().isoformat() + 'Z', 'uid': adminuid, 'admin': True})
    db.cookies.add({'lastused': datetime.utcnow().isoformat() + 'Z', 'uid': uid, 'admin': False})

if __name__ == "__main__":
    main()