# MiniOficina

MiniOficina is a fast hackathon dashboard for coordinating a team of AI agents. Each office is an isolated workspace with its own agents, hierarchy, chats, delegated communications, and avatars.

## Features

- Create and switch between multiple offices.
- Build agents with an avatar, operational role, thinking role, skills, responsibilities, boundaries, and deliverables.
- Connect managers and reports on the visual canvas.
- Chat with an individual agent and inspect delegated team communication.
- Autofill realistic agent profiles for quick demos.
- English interface with local avatar persistence.

## Quick start

Requirements: Node.js 20 or newer.

```bash
npm install
npm run dev:backend
npm run dev:frontend
```

The backend runs on `http://localhost:3001` by default and Vite serves the frontend on `http://localhost:5173`.

For AI responses, create a `.env` file with:

```env
OPENROUTER_API_KEY=your-key
OPENROUTER_MODEL=openrouter/auto
PORT=3001
FRONTEND_ORIGIN=http://localhost:5173
```

Without an API key, the dashboard and office management still work, but agent conversations cannot call the model provider.

## Useful commands

```bash
npm test          # backend and frontend tests
npm run typecheck # TypeScript checks
npm run build     # production build
npm run preview   # preview the frontend build
```

The Playwright smoke checks are available as `scripts/verify-dashboard-ui.mjs`, `scripts/verify-office-ui.mjs`, and `scripts/verify-office-e2e.mjs`.

## Architecture

- `backend/src`: HTTP API, in-memory office registry, agent orchestration, and model integration.
- `src`: Vite frontend, office canvas, dashboard, chat experience, communication audit, and avatar components.
- `backend/test` and `src/*.test.mjs`: automated tests.

Office data is intentionally in memory for the hackathon and resets when the backend restarts. Avatar choices are stored locally in the browser and are scoped to each office and agent.
