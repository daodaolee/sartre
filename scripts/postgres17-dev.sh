#!/usr/bin/env bash
set -euo pipefail

PG_BIN="${SARTRE_PG_BIN:-/Library/PostgreSQL/17/bin}"
PG_DATA="${SARTRE_PG_DATA:-/tmp/sartre-hub-pg17}"
PG_PORT="${SARTRE_PG_PORT:-55432}"
PG_DB="${SARTRE_PG_DB:-sartre_hub}"
PG_LOG="${SARTRE_PG_LOG:-/tmp/sartre-hub-pg17.log}"

case "${1:-}" in
  start)
    if [ ! -x "$PG_BIN/psql" ]; then
      echo "PostgreSQL 17 tools not found at $PG_BIN" >&2
      exit 1
    fi

    if [ ! -d "$PG_DATA" ]; then
      "$PG_BIN/initdb" -D "$PG_DATA" --auth=trust --no-locale --encoding=UTF8
    fi

    if "$PG_BIN/pg_isready" -h localhost -p "$PG_PORT" >/dev/null 2>&1; then
      echo "PostgreSQL dev server already accepting connections on port $PG_PORT"
    else
      "$PG_BIN/pg_ctl" -D "$PG_DATA" -l "$PG_LOG" -o "-p $PG_PORT" -w start
    fi

    "$PG_BIN/createdb" -h localhost -p "$PG_PORT" "$PG_DB" >/dev/null 2>&1 || true
    "$PG_BIN/psql" -h localhost -p "$PG_PORT" -d "$PG_DB" -c "select current_database(), current_user, version();"
    ;;
  stop)
    if [ -d "$PG_DATA" ]; then
      "$PG_BIN/pg_ctl" -D "$PG_DATA" -m fast -w stop || true
    else
      echo "No PostgreSQL dev data directory at $PG_DATA"
    fi
    ;;
  status)
    "$PG_BIN/pg_isready" -h localhost -p "$PG_PORT"
    ;;
  *)
    echo "Usage: $0 {start|stop|status}" >&2
    exit 2
    ;;
esac
