#!/usr/bin/env python

import os
import json
import re
import sys
from urllib.parse import urlparse
from cryptography import x509
from cryptography.hazmat.backends import default_backend
from cryptography.hazmat.primitives import serialization
from cryptography.x509.oid import ExtensionOID

sys.path.append(os.path.join(os.path.dirname(__file__), '..'))

from api.shared.db import DB

db = DB()

print("This script will convert your EmailDelivery.com installation from HTTP to HTTPS.\n\n" +
      "See https://docs.emaildelivery.com/ for more information on acquiring an SSL certificate and script usage.\n")

ssl_cert_path = "/config/certificate_chain.crt"
ssl_key_path = "/config/private.key"

use_cert = True
cert_domain_name = None

if not os.path.isfile(ssl_cert_path) and not os.path.isfile(ssl_key_path):
    print(f"*** WARNING: The files .{ssl_cert_path} and .{ssl_key_path} were not found.\n" +
                "These files should be a certificate and secret key in PEM format which allow our web server to communicate over SSL.\n" +
                "Without them, we can't configure SSL to run inside the platform.\n")
    confirm = input("Without your own certificate, you can still set up this system to work over SSL using a remote SSL proxy like Cloudflare.\n" +
        'If you wish to do this, enter Y: ').strip()
    if confirm.lower() not in ('y', 'yes'):
        print(f'You entered "{confirm}", exiting...')
        exit(0)
    use_cert = False

if use_cert:
    # Check if the certificate and key files exist and are valid PEM files
    if not os.path.isfile(ssl_cert_path):
        print(f"Error: .{ssl_cert_path} does not exist. To set up an SSL certificate, you must put a certificate file in PEM format with this filename in the config directory.")
        exit(1)
    if not os.path.isfile(ssl_key_path):
        print(f"Error: .{ssl_key_path} does not exist. To set up an SSL certificate, you must put a secret key in PEM format with this filename in the config directory.")
        exit(1)

    # If one of the files is invalid, print an error and exit
    try:
        # Load the certificate from the PEM file
        with open(ssl_cert_path, 'rb') as cert_file:
            cert_data = cert_file.read()
            cert = x509.load_pem_x509_certificate(cert_data, default_backend())
    except Exception as e:
        print(f"Error loading certificate: {e}")
        exit(1)

    try:
        # Load the private key from the PEM file
        with open(ssl_key_path, 'rb') as key_file:
            key_data = key_file.read()
            private_key = serialization.load_pem_private_key(key_data, password=None, backend=default_backend())
    except Exception as e:
        print(f"Error loading secret key: {e}")
        exit(1)

    san_extension = cert.extensions.get_extension_for_oid(ExtensionOID.SUBJECT_ALTERNATIVE_NAME)
    if san_extension:
        dns_names = san_extension.value.get_values_for_type(x509.DNSName)
        cert_domain_name = None
        if len(dns_names) and '*' not in dns_names[0]:
            cert_domain_name = dns_names[0]

    # only allow valid domains
    if cert_domain_name and not re.search(r'^([a-zA-Z0-9-]{1,63}\.?)+[a-zA-Z]{2,}$', cert_domain_name):
        cert_domain_name = None

# Parse the current domain name from the JSON config file
config_path = "/config/edcom.json"
try:
    with open(config_path, "r") as config_file:
        config_data = json.load(config_file)
        webroot_url = config_data.get("app", {}).get("webroot", "")
        if not webroot_url:
            webroot_url = config_data.get("app", {}).get("admin_url", "")
        if webroot_url:
            try:
                parsed_url = urlparse(webroot_url)
                config_file_domain = parsed_url.netloc
            except:
                pass
        else:
            config_file_domain = None
except FileNotFoundError:
    print(f"Error: Config file not found at {config_path}.")
    exit(1)

# only allow valid domains
current_domain = config_file_domain
if current_domain:
    current_domain = current_domain.split(':')[0] # Remove port
    if not re.search(r'^([a-zA-Z0-9-]{1,63}\.?)+[a-zA-Z]{2,}$', current_domain):
        current_domain = None

# Prompt the user to enter the domain name for SSL configuration
entered_domain = None
while not entered_domain:
    if not (cert_domain_name or current_domain):
        entered_domain = input(f"Enter the domain name to use for SSL configuration: ").strip()
    else:
        entered_domain = input(f"Enter the domain name to use for SSL configuration (default: {cert_domain_name or current_domain}): ").strip() or cert_domain_name or current_domain
    if not re.search(r'^([a-zA-Z0-9-]{1,63}\.?)+[a-zA-Z]{2,}$', entered_domain):
        print("Please enter a valid domain name")
        entered_domain = None

print("Updating edcom.json...")
if "app" not in config_data:
    config_data["app"] = {}
if "smtprelay" not in config_data:
    config_data["smtprelay"] = {}
if "webroot" in config_data["app"]:
    config_data["app"]["webroot"] = f"https://{entered_domain}"
else:
    config_data["app"]["admin_url"] = f"https://{entered_domain}"
config_data["smtprelay"]["smtphost"] = entered_domain
with open(config_path, "w") as config_file:
    json.dump(config_data, config_file, indent=2)

print("Updating template links...")
# Convert http://{config_file_domain}/ to https://{entered_domain}/
pat = re.compile(f'http://{re.escape(config_file_domain)}/')
for table in ['forms', 'formtemplates', 'gallerytemplates', 'campaigns', 'messages', 'beefreetemplates']:
    for id, txt in list(db.execute(f"""select id, data::text from {table} where data::text like '%%http://%%'""")):
        db.execute(f"""update {table} set data = %s::jsonb where id = %s""", pat.sub(f'https://{entered_domain}/', txt), id)

if use_cert:
    print("Writing web server configuration...")
    with open('/config/use_ssl', 'w') as fp:
        fp.write('1\n')

if not use_cert:
    print("Conversion was successful. Restart the software (./restart.sh) and configure your proxy (e.g. Cloudflare) to enable SSL.")
else:
    print("Conversion was successful. Restart the software (./restart.sh) to enable SSL.")
