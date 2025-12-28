#!/usr/bin/env bash

# Backwards-compatible wrapper: run the amd64 build script.
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
exec "$SCRIPT_DIR/build_amd64.sh" "$@"
