#!/usr/bin/env python

import sys
import os
import time
import random
import signal
from datetime import datetime

sys.path.append(os.path.join(os.path.dirname(__file__), '..'))

os.environ['SYNC_TASKS'] = '1'

import api.events as events
from api.shared.log import get_logger

log = get_logger()

cancelflag = False

def signal_handler(signum, frame):
    global cancelflag
    cancelflag = True

signal.signal(signal.SIGINT, signal_handler)
signal.signal(signal.SIGTERM, signal_handler)

def checkcancel():
    return cancelflag

def run():
    log.info("Starting")
    while True:
        events.process_webhooks(checkcancel)
        if cancelflag:
            break
        time.sleep(random.randint(1, 3))
        if cancelflag:
            break

run()