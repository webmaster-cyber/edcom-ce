#!/bin/bash

if [ "$#" -ne 1 ]; then
  echo "Usage: $0 subdomain.domain.com"
  exit 1
fi

if [[ $UID -ne 0 ]]; then
    echo ""
    echo "This script must be run as root"
    echo "Exiting the setup. Become root by running 'sudo su' and then run this script again."
    echo ""
    exit 1
fi

if [[ ! -f "generate_link_certificate.sh" ]]; then
    echo ""
    echo "This script must be run from the edcom-install directory."
    echo "Exiting the setup. Please cd into the edcom-install directory and run this script again."
    echo ""
    exit 1
fi

CWD=$(pwd)

set -x

export DEBIAN_FRONTEND=noninteractive

apt-get update

apt-get install -y certbot

# lowercase $1
domain=$(echo "$1" | tr '[:upper:]' '[:lower:]')

certbot -v certonly --agree-tos --register-unsafely-without-email --webroot -w $CWD/data/letsencrypt-challenge -d $domain \
  --deploy-hook "cp /etc/letsencrypt/live/$domain/fullchain.pem $CWD/config/linkcerts/$domain.certificate_chain.crt; \
                 cp /etc/letsencrypt/live/$domain/privkey.pem $CWD/config/linkcerts/$domain.private.key; \
                 sed \"s|server_name _|server_name $domain|g; s|/config/certificate_chain.crt|/config/linkcerts/$domain.certificate_chain.crt|g; s|/config/private.key|/config/linkcerts/$domain.private.key|g\" $CWD/config/nginx.ssl.server.conf > $CWD/config/linkcerts/$domain.nginx.conf; \
                 $CWD/restart.sh"
set +x
echo ""
echo ""
echo ""
echo "Add the following line to crontab -e for automatic 30 day renewal:"
echo ""
echo "* * */30 * * cd /root/edcom-install && ./renew_link_certificate.sh $domain > data/logs/certbot.log 2>&1"
echo ""
echo ""
