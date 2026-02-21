# Playground

A local end-to-end playground for `@voxcape/nestjs-notifications`. Each file
in `src/examples/` is a standalone runnable script that demonstrates a
different delivery channel or feature.

## Quick Start

1. Build the library (from the repo root):
   ```sh
   npm run build
   ```

2. Install playground dependencies:
   ```sh
   cd playground && npm install
   ```

3. Run an example:
   ```sh
   npm run example:database
   npm run example:mail
   ```

## Examples

| Script | Command | Description |
|---|---|---|
| `database-channel.ts` | `npm run example:database` | Stores a notification via the in-memory database adapter. No external services needed. |
| `mail-channel.ts` | `npm run example:mail` | Sends a notification via SMTP using `NodemailerMailAdapter`. Requires SMTP env vars. |

## Adding a New Example

1. Create `src/examples/<your-example>.ts` — copy the comment block from an
   existing example and update the description and run commands.
2. Add a script to `package.json`:
   ```json
   "example:<your-example>": "ts-node src/examples/<your-example>.ts"
   ```

## Mail Example Setup

Copy `.env.example` to `.env` and fill in your SMTP credentials:
```sh
cp .env.example .env
```

Required vars: `MAIL_HOST`, `MAIL_PORT`, `MAIL_USERNAME`, `MAIL_PASSWORD`, `MAIL_FROM`
