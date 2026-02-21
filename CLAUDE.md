# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

`@voxcape/nestjs-notifications` is a Laravel-inspired notifications library for NestJS 11. It provides a multi-channel notification system (mail, database, broadcast) with optional Redis-backed queueing and a CLI worker for background processing.

## Commands

```bash
# Build
npm run build           # Compile TypeScript to dist/
npm run clean           # Remove build artifacts

# Testing
npm test                # Run all tests
npm test -- --testPathPattern=<pattern>  # Run a single test file (e.g. notification.manager)
npm test -- --watch     # Watch mode

# Linting & Formatting
npm run lint            # Check ESLint
npm run lint:fix        # Auto-fix ESLint issues
npm run format          # Check Prettier formatting
npm run format:write    # Auto-fix formatting
```

## Architecture

### Core Data Flow

```
NotificationManager.send(notification, notifiable)
  → shouldQueue()? → RedisQueueAdapter (delayed sorted set or immediate list)
  → (or direct) resolve channels() → [MailChannel, DatabaseChannel, BroadcastChannel]
    → each channel calls its adapter (toMail/toDatabase/toBroadcast)
    → on failure: shouldRetry() + backoff() → re-queue with delay
```

### Key Layers

**Module (`notification.module.ts`)** — Dynamic NestJS module with `forRoot()`/`forRootAsync()`. Auto-discovers notification types from configured directories or accepts explicit registration. Optionally mounts the worker service.

**NotificationManager (`notification.manager.ts`)** — The injectable service consumers use. Handles direct delivery vs. queueing decision, and retry/backoff orchestration.

**BaseNotification (`base-notification.ts`)** — Abstract class all notifications extend. Override `channels()` to declare delivery targets, `toMail()`/`toDatabase()`/`toBroadcast()` for payloads, and `shouldQueue()`/`shouldRetry()`/`backoff()` for queue behavior.

**Channels (`src/channels/`)** — Thin routers: each channel calls the appropriate adapter method with the notification's payload. Three built-in channels: `MailChannel`, `DatabaseChannel`, `BroadcastChannel`.

**Adapters (`src/adapters/`)** — Pluggable implementations behind DI tokens:
- `MAIL_ADAPTER` — `NodemailerMailAdapter` (built-in)
- `BROADCAST_ADAPTER` — `RedisBroadcastAdapter` (built-in)
- `QUEUE_ADAPTER` — `RedisQueueAdapter` (built-in)
- `DATABASE_ADAPTER` — no built-in; consumers must provide one

**Worker (`notification-worker.service.ts`, `commands/notification-worker.command.ts`)** — Pulls jobs from Redis queue using `ioredis`, promotes delayed jobs from sorted set to the main list, and processes them. Run as a separate process via the `nest-commander` CLI.

**Registry & Serializer** — `NotificationRegistry` maps string type names to classes; `NotificationSerializer` handles serialize/deserialize for queue transport using `class-transformer`.

### DI Tokens (from `constants.ts`)

All adapters and channels are bound via injection tokens: `MAIL_ADAPTER`, `DATABASE_ADAPTER`, `BROADCAST_ADAPTER`, `QUEUE_ADAPTER`, `NOTIFICATION_CHANNELS`, `NOTIFICATION_MODULE_OPTIONS`. Use these tokens when providing custom adapters.

### Testing Patterns

Tests live in `src/__tests__/`. Mocks for all adapters are in `src/__tests__/mocks/`. Tests use Jest with `ts-jest`. The `ioredis` client is mocked — no real Redis required for tests.

## Environment Variables

Key env vars (see `src/utils/env.ts` and README):
- SMTP: `MAIL_HOST`, `MAIL_PORT`, `MAIL_USERNAME`, `MAIL_PASSWORD`, `MAIL_FROM`
- Redis: `REDIS_HOST`, `REDIS_PORT`, `REDIS_PASSWORD`
- Queue: `NOTIFICATION_QUEUE_KEY`, `NOTIFICATION_DELAYED_QUEUE_KEY`, `NOTIFICATION_WORKER_POLL_INTERVAL`

## Release

Published to npm on git tags matching `v*` via `.github/workflows/npm-publish.yml`. CI runs format check, lint, and tests on every PR and push to `main`.
