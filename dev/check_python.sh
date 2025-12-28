#!/bin/sh

cd api && flake8 . && mypy .
