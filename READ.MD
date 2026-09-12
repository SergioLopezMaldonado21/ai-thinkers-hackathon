# Agent Canvas

Web app con frontend (Vite + TypeScript) y backend (Node HTTP) separados.

En dos terminales distintas ejecuta:

```bash
npm run dev:backend
npm run dev:frontend
```

Cada clic en **Nuevo agente** realiza `POST /api/chats`. El servidor permite la solicitud y genera un ID único; el círculo resultante se puede arrastrar por el canvas y muestra su ID al pasar el cursor.
