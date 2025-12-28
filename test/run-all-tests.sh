#!/bin/sh

rm -rf ./logs
docker compose down && docker compose up --abort-on-container-exit && docker compose down