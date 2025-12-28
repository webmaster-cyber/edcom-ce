#!/usr/bin/env bash

docker compose down && docker compose up -d
sleep 5
docker logs edcom-velocity
