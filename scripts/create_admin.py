#!/usr/bin/env python

import sys
import os
import csv
import json
import shutil
import shortuuid
from zipfile import ZipFile, Path

sys.path.append(os.path.join(os.path.dirname(__file__), '..'))

from getpass import getpass
import bcrypt
from datetime import datetime
import argparse

from api.shared import config
from api.shared.db import DB
from api.shared.contacts import initialize_cid
from api.shared.utils import get_webroot, find_user

def template_title(name):
    return name.replace('-', ' ').title()

csv.field_size_limit(1024*1024*1024)

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
    "useforlogin": True,
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
    "name": "Acme Co",
    "admin": False,
    "price": None,
    "period": "monthly",
    "routes": [routeid],
    "created": now,
    "credits": None,
    "minlimit": 999999999,
    "hourlimit": 999999999,
    "daylimit": 999999999,
    "monthlimit": 999999999,
    "frontend": frontendid,
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

customerid = shortuuid.uuid()

defdomaingroups = [{
    'name': 'Gmail',
    'domains': 'gmail.com'
}, {
    'name': 'Yahoo',
    'domains': 'yahoo.*\naol.*\nverizon.net\nymail.com\nrocketmail.com'
}, {
    'name': 'Outlook',
    'domains': 'outlook.*\nhotmail.*\nmsn.*\nlive.*'
}]

def import_template_table(fp, cid, tablename):
    for c in csv.DictReader(fp):
        data = c['data'].replace("{{!WEBROOT}}", get_webroot())
    
        db.execute(f"insert into {tablename} (id, cid, data) values (%s, %s, %s)",
                shortuuid.uuid(), cid, data)

def import_templates(cid):
    templzip = ZipFile('/setup/templates.zip')
    for info in templzip.infolist():
        if info.filename.endswith("formtemplates.csv"):
            pathobj = Path(templzip, info.filename)
            import_template_table(pathobj.open(newline=''), cid, 'formtemplates')
        elif info.filename.endswith("gallerytemplates.csv"):
            pathobj = Path(templzip, info.filename)
            import_template_table(pathobj.open(newline=''), cid, 'gallerytemplates')
    for imagename in os.listdir('/setup/images'):
        destpath = f"/buckets/images/{imagename}"
        if not os.path.exists(destpath):
            shutil.copyfile(f"/setup/images/{imagename}", destpath)

    template_data = {}
    for filename in os.listdir("/setup/beefree"):
        s = os.path.splitext(filename)
        name = s[0]
        ext = s[1][1:]
        with open(f"/setup/beefree/{filename}") as f:
            if name not in template_data:
                template_data[name] = {}
            template_data[name][ext] = f.read()
            if ext == "json":
                template_data[name][ext] = json.loads(template_data[name][ext])

    templates = {}
    for name, data in template_data.items():
        image_name = f'{name}_large.jpg'
        templates[name] = {}
        templates[name]['image'] = f'/i/{image_name}'
        templates[name]['show'] = True
        templates[name]['rawText'] = json.dumps(data)
        templates[name]['type'] = 'beefree'
        templates[name]['name'] = template_title(name)

    for data in templates.values():
        db.execute("insert into beefreetemplates (id, cid, data) values (%s, %s, %s)", shortuuid.uuid(), cid, data)

def gen_ip_data():
    print("Importing IP Location database, please wait...")
    db.execute("""drop table if exists new_iplocations""")
    db.execute("""drop table if exists new_countries""")
    db.execute("""drop table if exists new_regions""")

    db.execute("""create table new_iplocations(
                iprange int8range not null,
                country_code text not null,
                country text not null,
                region text not null,
                zip text not null
                )""")
    db.execute("create index new_iplocations_idx on new_iplocations using gist (iprange)")
    db.execute("""create table new_countries(
                country text primary key
                )""")
    db.execute("""create table new_regions(
                country text not null,
                region text not null,
                primary key (country, region)
                )""")

    loczip = ZipFile('/setup/ip2location.zip')
    for info in loczip.infolist():
        if info.filename.endswith("IP2LOCATION-LITE-DB9.CSV"):
            pathobj = Path(loczip, info.filename)
            fp = pathobj.open(newline='')
            outp = None
            cnt = 0
            for c in csv.reader(fp):
                if outp is None:
                    outp = open("/tmp/ip2location.csv", "w")
                
                outp.write("[%s,%s]\t%s\t%s\t%s\t%s\n" % (c[0], c[1], c[2], c[3], c[4], c[8]))
                
                cnt += 1

                if (cnt % 10000) == 0:
                    outp.close()
                    inp = open("/tmp/ip2location.csv", "r")
                    db.cur.copy_from(inp, 'new_iplocations', columns=('iprange', 'country_code', 'country', 'region', 'zip'))
                    inp.close()
                    outp = None

                if (cnt % 100000) == 0:
                    print(f"{cnt} locations written")

            if outp is not None:
                outp.close()
                inp = open("/tmp/ip2location.csv", "r")
                db.cur.copy_from(inp, 'new_iplocations', columns=('iprange', 'country_code', 'country', 'region', 'zip'))
                inp.close()

    print("Deriving countries")
    db.execute("insert into new_countries (country) select distinct country from new_iplocations")
    print("Deriving regions")
    db.execute("insert into new_regions (country, region) select distinct country, region from new_iplocations")
    db.execute("drop table if exists iplocations")
    db.execute("drop table if exists countries")
    db.execute("drop table if exists regions")
    db.execute("alter table new_iplocations rename to iplocations")
    db.execute("alter index new_iplocations_idx rename to iplocations_idx")
    db.execute("alter table new_countries rename to countries")
    db.execute("alter table new_regions rename to regions")
    print("Complete")

parser = argparse.ArgumentParser(prog='create_admin', description='Create a new administrator account')
parser.add_argument('email_address', help='Your email address (used as username)')
parser.add_argument('your_name', help='Your full name (enclose "in quotes" to include space between first and last name)')
parser.add_argument('company_name', help="Name of your company; two users can be added to the same company by specifying the same company name for both")
parser.add_argument('--password', help="New account password (optional, you will be prompted to enter a password by default)")
parser.add_argument('--locations', action='store_true', help="Only import IP location data, ignore other arguments")
args = parser.parse_args()

if not args.locations:
    u = find_user(db, args.email_address)

    if u is not None:
        print("ERROR: User already exists")
        sys.exit(1)

    password = args.password
    if not password:
        while True:
            password = getpass(f"Create new password for user '{args.email_address}': ")
            password2 = getpass("Re-enter password: ")
            if password != password2:
                print("Passwords don't match")
                continue
            if not password:
                print("Password cannot be blank")
                continue
            break

    with db.transaction():
        c = db.companies.find_one({'name': args.company_name})

        if c is None:
            c = db.companies.get(db.companies.add({'name': args.company_name, 'admin': True}))
            print("Added company %s" % c['id'])

            print("Importing default templates")
            import_templates(c['id'])

            print("Creating default frontend, postal route, contact list domains and customer")
            db.execute("""
                insert into frontends (id, cid, data) values (%s, %s, %s)
            """, frontendid, c['id'], deffrontend)
            db.execute("""
                insert into routes (id, cid, data) values (%s, %s, %s)
            """, routeid, c['id'], defroute)
            for dg in defdomaingroups:
                db.execute("""
                    insert into domaingroups (id, cid, data) values (%s, %s, %s)
                """, shortuuid.uuid(), c['id'], dg)
            db.execute("""
                insert into companies (id, cid, data) values (%s, %s, %s)
            """, customerid, c['id'], defcustomer)

            initialize_cid(db, customerid)
        elif not c.get('admin'):
            print("ERROR: Company already exists and is not an admin company")
            sys.exit(1)

        h = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('ascii')

        db.set_cid(c['id'])
        id = db.users.add({
            'username': args.email_address,
            'hash': h,
            'fullname': args.your_name,
            'companyname': args.company_name,
            'admin': True,
            'created': datetime.utcnow().isoformat() + 'Z'
        })
        print("Added user %s" % id)

if args.locations or not db.single("select country from iplocations limit 1"):
    gen_ip_data()