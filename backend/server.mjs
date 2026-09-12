import { createServer } from 'node:http';
import { randomUUID } from 'node:crypto';

const port = Number(process.env.PORT ?? 3001);
const conversations = new Map();
function respond(response, status, body) { response.writeHead(status, { 'Access-Control-Allow-Origin': 'http://localhost:5173', 'Content-Type': 'application/json; charset=utf-8' }); response.end(JSON.stringify(body)); }
function readBody(request) { return new Promise((resolve, reject) => { let body = ''; request.on('data', (chunk) => { body += chunk; }); request.on('end', () => { try { resolve(body ? JSON.parse(body) : {}); } catch { reject(new Error('JSON inválido')); } }); request.on('error', reject); }); }
createServer(async (request, response) => {
  if (request.method === 'OPTIONS') { response.writeHead(204, { 'Access-Control-Allow-Origin': 'http://localhost:5173', 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type' }); return response.end(); }
  if (request.method === 'POST' && request.url === '/api/chats') { const id = `agent_${randomUUID()}`; conversations.set(id, []); return respond(response, 201, { allowed: true, agent: { id } }); }
  const match = request.url?.match(/^\/api\/message\/([^/]+)$/);
  if (request.method === 'POST' && match) {
    const agentId = decodeURIComponent(match[1]); const payload = await readBody(request); const messages = conversations.get(agentId) ?? []; messages.push({ role: 'user', text: payload.message ?? '' }); const reply = `Hola, soy ${agentId}.`; messages.push({ role: 'agent', text: reply }); conversations.set(agentId, messages); return respond(response, 200, { agentId, reply });
  }
  return respond(response, 404, { error: 'Ruta no encontrada.' });
}).listen(port, () => console.log(`Agent Canvas backend listening on http://localhost:${port}`));
