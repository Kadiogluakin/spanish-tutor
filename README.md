# Spanish Teacher (Personal)

Personal, voice-first Spanish teacher with a whiteboard, homework & grading.
Built for one user, simple and durable.

## Quick start

1) Clone or unzip this project.
2) Copy `.env.example` to `.env.local` and set `OPENAI_API_KEY`.
3) `npm install`
4) (Optional) Initialize the local DB file: it will be created on demand as `local.db`.
5) `npm run dev` and open http://localhost:3000

## Notes

- Voice uses an ephemeral token from `/api/realtime/token`. The client code logs the token; you need to complete the WebRTC wiring to stream audio both ways.
- Homework grading is wired to OpenAI chat with a strict JSON response.
- Board uses `@tldraw/tldraw`; snapshots can be exported later.
- DB is local SQLite via `better-sqlite3` and `drizzle-orm`.
- Everything is deliberately minimal so you can extend in Cursor.
