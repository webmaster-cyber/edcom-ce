#!/usr/bin/env python

import sys
import os
import importlib
from time import sleep

sys.path.append(os.path.join(os.path.dirname(__file__), '..'))

from api.shared.log import get_logger

log = get_logger()

# reduce errors when multiple scripts try to compile the same .pyc file at the same time
sleep(int(sys.argv[3]))

def run():
    log.info("Running %s.%s...", sys.argv[1], sys.argv[2])

    mod = importlib.import_module(sys.argv[1])
    getattr(mod, sys.argv[2])()

    log.info("...finished %s.%s", sys.argv[1], sys.argv[2])

run()