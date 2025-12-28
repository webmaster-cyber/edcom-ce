#!/usr/bin/env python

import sys
import os
import argparse

sys.path.append(os.path.join(os.path.dirname(__file__), '..'))

from api.shared.contacts import recalculate_hashlimit
from api.shared.db import DB

parser = argparse.ArgumentParser(prog='rehash_lists', description='Create optimal list indexes')
parser.add_argument('cid', help='Company ID')
args = parser.parse_args()

db = DB()

with db.transaction():
    recalculate_hashlimit(db, args.cid)
