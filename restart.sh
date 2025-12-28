#!/usr/bin/env bash

# create .env file if it doesn't exist
if [ ! -f ./config/edcom.env ]; then
    echo 'PLATFORM_IP=0.0.0.0' > ./config/edcom.env
fi

# Tasks specifies the number of Celery worker containers. 
#
# WARNING: Setting tasks too high will cause instability. 
#
# See https://docs.emaildelivery.com for details. 
#

docker compose down && docker compose up -d --scale tasks=1
