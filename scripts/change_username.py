#!/usr/bin/env python

import sys
import os

sys.path.append(os.path.join(os.path.dirname(__file__), '..'))

import argparse

from api.shared.db import DB
from api.shared.utils import find_user

db = DB()
parser = argparse.ArgumentParser(prog='change_username', description='Change the username of an account')
parser.add_argument('email_address', help='Email address / username of the account to reset')
parser.add_argument('new_email_address', help='New email address / username of the account')
args = parser.parse_args()

u = find_user(db, args.email_address)

if u is None:
    print(f"User '{args.email_address}' not found")
    sys.exit(1)

exist = find_user(db, args.new_email_address)
if exist is not None and exist['id'] != u['id']:
    print(f"User '{args.new_email_address}' already exists")
    sys.exit(1)

db.users.patch(u['id'], {'username': args.new_email_address.lower()})

print("Username for user %s changed to %s" % (u['id'], args.new_email_address))
