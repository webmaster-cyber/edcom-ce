#!/usr/bin/env python

import os
import json
import re
import sys
from urllib.parse import urlparse

sys.path.append(os.path.join(os.path.dirname(__file__), '..'))

from api.shared.db import DB

db = DB()

print("This script will change the primary domain on your EmailDelivery.com installation.")
print("Make sure you have your new domain's A record pointing at an IP address on this server.")
print("")

# Parse the current domain name and scheme from the JSON config file
config_path = "/config/edcom.json"
try:
    with open(config_path, "r") as config_file:
        config_data = json.load(config_file)
        webroot_url = config_data.get("app", {}).get("webroot", "")
        if not webroot_url:
            webroot_url = config_data.get("app", {}).get("admin_url", "")
        if webroot_url:
            parsed_url = urlparse(webroot_url)
            config_file_domain = parsed_url.netloc
            config_file_scheme = parsed_url.scheme
        else:
            raise Exception(f"admin_url or webroot setting not found in {config_path}")
except Exception as e:
    print(f"Error: {e}")
    exit(1)

# Prompt the user to enter the new domain name
entered_domain = None
while not entered_domain:
    entered_domain = input(f"Enter the new domain name to use for this installation (current is {config_file_domain}): ").strip()
    if not re.search(r'^([a-zA-Z0-9-]{1,63}\.?)+[a-zA-Z]{2,}(:\d{1,5})?$', entered_domain):
        print("Please enter a valid domain name")
        entered_domain = None

print("Updating edcom.json...")
if "app" not in config_data:
    config_data["app"] = {}
if "smtprelay" not in config_data:
    config_data["smtprelay"] = {}

if "webroot" in config_data["app"]:
    config_data["app"]["webroot"] = f"{config_file_scheme}://{entered_domain}"
else:
    config_data["app"]["admin_url"] = f"{config_file_scheme}://{entered_domain}"
config_data["smtprelay"]["smtphost"] = entered_domain.split(':')[0]
with open(config_path, "w") as config_file:
    json.dump(config_data, config_file, indent=2)

print("Updating template links...")
# Convert {config_file_scheme}://{config_file_domain}/ to {config_file_scheme}://{entered_domain}/
pat = re.compile(f'{re.escape(config_file_scheme)}://{re.escape(config_file_domain)}/')
for table in ['forms', 'formtemplates', 'gallerytemplates', 'campaigns', 'messages', 'beefreetemplates']:
    for id, txt in list(db.execute(f"""select id, data::text from {table}""")):
        db.execute(f"""update {table} set data = %s::jsonb where id = %s""", pat.sub(f'{config_file_scheme}://{entered_domain}/', txt), id)

print("Conversion was successful. Please restart the software (./restart.sh) to enable your new domain.")
