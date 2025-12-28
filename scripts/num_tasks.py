#!/usr/bin/env python

import subprocess
import sys

if len(sys.argv) != 2 or sys.argv[1] not in ('celery', 'gunicorn'):
    sys.stderr.write('usage: num_tasks.py celery|gunicorn')
    sys.exit(-1)

num_cpus = int(subprocess.check_output('grep processor /proc/cpuinfo | wc -l', shell=True))

if sys.argv[1] == 'celery':
    print(max(min(64, num_cpus * 4), 4))
else:
    print(max(min(32, num_cpus), 4))
