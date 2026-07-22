#!/bin/sh
set -eu

exec node /app/scripts/postgres/runner.cjs
