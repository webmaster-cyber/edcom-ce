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

if [[ ! -f "renew_link_certificate.sh" ]]; then
    echo ""
    echo "This script must be run from the velocity-install directory."
    echo "Exiting the setup. Please cd into the velocity-install directory and run this script again."
    echo ""
    exit 1
fi

CWD=$(pwd)

set -x

export DEBIAN_FRONTEND=noninteractive

apt-get update

apt-get install --only-upgrade certbot

certbot -v renew --force-renewal --cert-name $1 --webroot -w $CWD/data/letsencrypt-challenge \
        --deploy-hook "cp /etc/letsencrypt/live/$1/fullchain.pem $CWD/conf/linkcerts/$1.certificate_chain.crt; \
                       cp /etc/letsencrypt/live/$1/privkey.pem $CWD/conf/linkcerts/$1.private.key; \
                       $CWD/restart.sh"
