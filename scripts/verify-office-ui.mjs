import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { createServer } from 'vite';

// Run with Playwright installed, or set PLAYWRIGHT_MODULE to its package directory.
// All API requests are intercepted: this check does not call a model or use .env.
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const vite = await createServer({
  configFile: false,
  server: { host: '127.0.0.1', port: 0 },
});
let browser;
try {
  await vite.listen();
  browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  const profile = (name) => ({
    name, position: 'Especialista', responsibilities: 'Resolver tareas de prueba.',
    limitations: 'No inventar datos.', deliverables: 'Informe de prueba.',
    skills: ['Análisis'], operationalRole: 'researcher_intel', thinkingRole: 'analyst',
  });
  const office = {
    agents: [{ id: 'boss', profile: profile('Jefa Ada') }, { id: 'child', profile: profile('Investigador Luis') }],
    rootId: 'boss',
    connections: [{ id: 'boss-child', bossId: 'boss', subordinateId: 'child' }],
    communications: [], activeAgentIds: [],
  };
  const histories = new Map([['boss', []], ['child', []]]);
  let releaseReply;
  let pendingReply;
  await page.route('**/api/**', async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const send = (body, status = 200) => route.fulfill({ status, json: structuredClone(body) });
    if (url.pathname === '/api/office') return send(office);
    if (url.pathname === '/api/office/tree') {
      const body = request.postDataJSON();
      office.rootId = body.rootId;
      office.connections = body.connections;
      return send(office);
    }
    if (url.pathname === '/api/communications') return send({ communications: office.communications });
    if (request.method() === 'GET' && url.pathname.startsWith('/api/chats/')) {
      const id = url.pathname.split('/')[3];
      return send({ messages: (histories.get(id) || []).map((message) => ({ role: message.role === 'assistant' ? 'agent' : 'user', text: message.content })), pending: false });
    }
    if (request.method() === 'POST' && url.pathname === '/api/message/boss') {
      const message = request.postDataJSON().message;
      office.activeAgentIds = ['boss', 'child'];
      office.communications.push({
        id: 'consultation-1', runId: 'run-1', edgeId: 'boss-child', bossId: 'boss',
        subordinateId: 'child', round: 1, request: 'Investiga el dato interno de prueba.',
        response: null, status: 'pending', startedAt: new Date().toISOString(), completedAt: null,
      });
      pendingReply = new Promise((resolve) => { releaseReply = resolve; });
      await pendingReply;
      histories.get('boss').push({ role: 'user', content: message }, { role: 'assistant', content: 'Respuesta integrada para la persona.' });
      return send({ threadId: 'boss', reply: 'Respuesta integrada para la persona.' });
    }
    return send({ error: `Unexpected fixture route: ${request.method()} ${url.pathname}` }, 404);
  });
  await page.goto(vite.resolvedUrls.local[0]);
  await page.locator('[data-agent-id="boss"]').waitFor();
  await page.locator('[data-agent-id="child"]').waitFor();
  // Nodes may spawn close together: keyboard activation also checks accessibility.
  await page.locator('[data-agent-id="boss"]').focus();
  await page.keyboard.press('Enter');
  await page.locator('#message-input').fill('Consulta a tu investigador y responde.');
  await page.locator('#send-message').click();
  await page.waitForFunction(() => Boolean(document.querySelector('.connection-line.is-active')));
  await page.emulateMedia({ reducedMotion: 'reduce' });
  assert.equal(await page.locator('.connection-line.is-active').evaluate((line) => getComputedStyle(line).animationName), 'none');
  await page.locator('#close-chat').click();
  await page.locator('#toggle-connections').click();
  assert.equal(await page.locator('#toggle-connections').getAttribute('aria-pressed'), 'false');
  // Discover the audit entry point from its accessible name, independent of layout.
  await page.locator('#audit-pair').selectOption('boss-child');
  const auditButton = page.getByRole('button', { name: /auditar|ver comunicaci|ver conversaci/i }).first();
  await auditButton.click();
  await page.getByText('Investiga el dato interno de prueba.', { exact: true }).waitFor();
  office.communications[0].response = 'Dato interno confirmado.';
  office.communications[0].status = 'completed';
  office.communications[0].completedAt = new Date().toISOString();
  office.activeAgentIds = [];
  releaseReply();
  await page.getByText('Dato interno confirmado.', { exact: true }).waitFor();
  await page.waitForFunction(() => !document.querySelector('.connection-line.is-active'));
  await page.keyboard.press('Escape');
  await page.locator('[data-agent-id="boss"]').focus();
  await page.keyboard.press('Enter');
  await page.locator('#messages').getByText('Respuesta integrada para la persona.', { exact: true }).waitFor();
  assert.equal(await page.locator('#messages').getByText('Dato interno confirmado.', { exact: true }).count(), 0);
  await page.locator('#close-chat').click();
  await page.setViewportSize({ width: 390, height: 844 });
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'No horizontal mobile overflow');
  office.agents = [];
  office.rootId = null;
  office.connections = [];
  office.communications = [];
  await page.waitForFunction(() => document.querySelectorAll('.agent-node').length === 0);
  assert.deepEqual(errors, [], 'No browser runtime errors');
  console.log('Office UI verified: active arrow, hidden-arrow audit, live messages, personal-chat isolation, keyboard access, reduced motion, mobile width, and office reset.');
} finally {
  await browser?.close();
  await vite.close();
}
