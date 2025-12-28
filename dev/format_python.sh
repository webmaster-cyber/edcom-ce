#!/bin/sh

if [ "$1" = "--check" ]; then
    cd api && find . -name 'falcon_swagger_ui' -prune -o -name '*.py' | xargs black --check
else
    cd api && find . -name 'falcon_swagger_ui' -prune -o -name '*.py' | xargs black
fi
