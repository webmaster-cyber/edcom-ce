import os
import json

configfile = "/config/edcom.json"
if os.path.isfile(configfile):
    config = json.load(open((configfile)))

    appconfig = config.get("app", {})
    for key, value in appconfig.items():
        if key == "admin_url":
            os.environ["webroot"] = str(value)
        else:
            os.environ[key] = str(value)

    smtpconfig = config.get("smtprelay", {})
    os.environ["smtphost"] = smtpconfig.get("smtphost", "localhost")
