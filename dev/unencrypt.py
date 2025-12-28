#!/usr/bin/env python

import base64
import re
import sys

replacements = {
    '@aol.com': '!',
    '@aim.com': '#',
    '@gmail.com': '^',
    '@googlemail.com': ':',
    '@yahoo.com': '&',
    '@yahoo.co.uk': '*',
    '@rocketmail.com': '?',
    '@hotmail.com': '(',
    '@hotmail.co.uk': ')',
    '@live.com': '~',
    '@comcast.net': '{',
    '@att.net': '}',
    '@sbcglobal.net': '[',
    '@verizon.net': ']',
    '@charter.net': ',',
    '@cox.net': '|',
    '@earthlink.net': '<',
    '@bellsouth.net': '>',
}

emailwordre = re.compile(r"\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b")

def unencrypt(s):
    if isinstance(s, bytes):
        s = s.decode('utf-8')
    padding = (4 - (len(s) % 4)) % 4
    b = base64.urlsafe_b64decode(s + ('=' * padding))
    key = b[0]
    s = ''.join(chr(a ^ key) for a in b[1:])
    for k, v in replacements.items():
        s = s.replace(v, k)
    m = emailwordre.search(s)
    if not m:
        print('regex did not match: %s' % (s,))
        return None
    return m.group(0)

print(unencrypt(sys.argv[1]))

