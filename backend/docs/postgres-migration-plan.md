# PostgreSQL Runtime Notes

## Status

The Go backend now runs on PostgreSQL as its only durable database.

## What Changed

- the active server startup path uses `backend/internal/pgapi`
- PostgreSQL schema creation and baseline seeding run at startup
- Redis remains optional for cache and rate limiting
- the legacy Mongo-oriented handlers, models, routes, middleware, and websocket code have been removed

## Current API Direction

The runtime API now exposes PostgreSQL-backed resources for:

- auth
- courses, modules, and tasks
- rooms and labs
- lab sessions
- flags and progress
- leaderboard

## Notes

- The repository still contains historical planning documents like `new.md` and `compare.md`, but the server runtime is PostgreSQL-first.
- Response payloads are being normalized toward `id`, camelCase field names, and the current Postgres schema terminology.
