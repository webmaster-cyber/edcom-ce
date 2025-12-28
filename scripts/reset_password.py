#!/usr/bin/env python

import sys
import os

sys.path.append(os.path.join(os.path.dirname(__file__), '..'))

from getpass import getpass
import bcrypt
import argparse

from api.shared.db import DB
from api.shared.utils import find_user

db = DB()
parser = argparse.ArgumentParser(prog='reset_password', description='Reset a user password')
parser.add_argument('email_address', help='Email address / username of the account to reset')
args = parser.parse_args()

u = find_user(db, args.email_address)

if u is None:
    print(f"User '{args.email_address}' not found")
    sys.exit(1)

while True:
    password = getpass(f"New password for user '{args.email_address}': ")
    password2 = getpass("Re-enter password: ")
    if password != password2:
        print("Passwords don't match")
        continue
    if not password:
        print("Password cannot be blank")
        continue
    break

h = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('ascii')

db.users.patch(u['id'], {'hash': h})

print("Password reset for user %s" % u['id'])
