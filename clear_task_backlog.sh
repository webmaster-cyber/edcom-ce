#!/usr/bin/env bash


# Clear runaway task backlog for a clean slate.

docker compose stop tasks ; docker compose exec cache sh -lc 'redis-cli -n 0 FLUSHDB' ; docker compose start tasks
