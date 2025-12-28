#!/usr/bin/env python

import sys
import os
import time
import random

sys.path.append(os.path.join(os.path.dirname(__file__), '..'))

os.environ['SYNC_TASKS'] = '1'

import api.lists as lists

procnum = int(os.environ.get('PROCNUM', '0'))
total   = int(os.environ.get('TOTALPROCS', '1'))

def run():
    cnt = 0
    while True:
        force = False
        if cnt == 29:
            force = True
            cnt = 0
        lists.refresh_all_segments(procnum, total, force)
        time.sleep(random.randint(1, 60))
        cnt += 1

run()