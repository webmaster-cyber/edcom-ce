#!/usr/bin/env bash

if ! docker info > /dev/null 2>&1; then
    echo "Docker daemon is not running. Start Docker and the EmailDelivery.com software before running this script."
    exit 1
fi

MAX_WAIT_TIME=30
CHECK_INTERVAL=1
elapsed_time=0

tty_arg="-it"
# check if the first argument to the script is '--no-tty', and if so set a variable and remove it
# from the argument list
if [ "$1" = "--no-tty" ]; then
    tty_arg="-i"
    shift
fi

while [ $elapsed_time -lt $MAX_WAIT_TIME ]; do
    if docker ps -q --filter "name=edcom-api" | grep -q .; then
        docker exec $tty_arg edcom-api python /scripts/create_admin.py "$@"
        exit
    else
        if [ $((elapsed_time % 5)) -eq 0 ]; then
            if [ $((elapsed_time)) -lt 5 ]; then
                echo "Waiting for EmailDelivery.com to start..."
            else
                echo "Still waiting..."
            fi
        fi
        sleep $CHECK_INTERVAL
        elapsed_time=$((elapsed_time + CHECK_INTERVAL))
    fi
done

echo 'Timed out waiting for the "edcom-api" container to start. Start the EmailDelivery.com software with "./restart.sh" before running this script. If you started the software and still see this message, check data/logs/app.log for possible error messages or contact support.'
exit 1
