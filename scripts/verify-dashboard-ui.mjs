import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { mkdir } from 'node:fs/promises';
import { createServer } from 'vite';

// All API calls use fixtures; no credentials, real office state, or model calls.
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const vite = await createServer({ configFile: false, server: { host: '127.0.0.1', port: 0 } });
let browser;
let releaseHistory;
let releaseMessage;
try {
  await vite.listen();
  browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  await mkdir('artifacts', { recursive: true });
  page.setDefaultTimeout(12000);
  const errors = [];
  const unexpectedRequests = [];
  page.on('pageerror', (error) => errors.push(error.message));
  const profile = (name, position = 'Investigadora') => ({
    name, position, responsibilities: 'Investigar y resolver tareas.', limitations: 'No inventar datos.',
    deliverables: 'Informe verificable.', skills: ['Análisis', 'Síntesis'],
    operationalRole: 'researcher_intel', thinkingRole: 'analyst',
  });
  const office = {
    agents: [{ id: 'ada', profile: profile('Ada Álvarez', 'Coordinadora') }, { id: 'luis', profile: profile('Luis Soto') }],
    rootId: 'ada', connections: [{ id: 'ada-luis', bossId: 'ada', subordinateId: 'luis' }],
    communications: [], activeAgentIds: [],
  };
  const histories = new Map([['ada', []], ['luis', []]]);
  let delayedHistory = true;
  let historyError = false;
  let denyCreation = true;
  let lastProfile;
  await page.route('**/api/**', async (route) => {
    const request = route.request();
    const rawPath = new URL(request.url()).pathname;
    const path = rawPath.replace(/^\/api\/offices\/default/, '/api');
    const send = (body, status = 200) => route.fulfill({ status, json: structuredClone(body) });
    if (rawPath === '/api/offices' && request.method() === 'GET') return send({
      offices: [{ id: 'default', name: 'Mi oficina', emoji: '🏢', description: 'Principal', createdAt: '2026-01-01T00:00:00.000Z' }],
      defaultOfficeId: 'default',
    });
    if (rawPath === '/api/offices' && request.method() === 'POST') return send({
      office: { id: 'office_demo', ...request.postDataJSON(), createdAt: '2026-01-02T00:00:00.000Z' },
    }, 201);
    if (rawPath === '/api/offices/office_demo/office') return send({
      agents: [], rootId: null, connections: [], communications: [], activeAgentIds: [],
    });
    if (path === '/api/office') return send(office);
    if (path === '/api/communications') return send({ communications: [] });
    if (path === '/api/chats' && request.method() === 'POST') {
      if (denyCreation) return send({ error: 'No autorizado en esta prueba.' }, 403);
      lastProfile = request.postDataJSON();
      const agent = { id: 'new-agent', profile: lastProfile };
      office.agents.push(agent);
      histories.set(agent.id, []);
      return send({ allowed: true, agent });
    }
    if (path.startsWith('/api/chats/') && request.method() === 'GET') {
      const id = decodeURIComponent(path.split('/')[3]);
      if (id === 'ada' && delayedHistory) {
        delayedHistory = false;
        await new Promise((resolve) => { releaseHistory = resolve; });
      }
      if (id === 'luis' && historyError) return send({ error: 'Historial temporalmente no disponible.' }, 503);
      return send({ messages: histories.get(id) || [], pending: false });
    }
    if (path.startsWith('/api/message/')) {
      const id = decodeURIComponent(path.split('/')[3]);
      if (id === 'luis') return send({ error: 'Mensaje rechazado por permisos.' }, 403);
      const text = request.postDataJSON().message;
      office.activeAgentIds = [id];
      await new Promise((resolve) => { releaseMessage = resolve; });
      const reply = 'Primera línea de respuesta.\nSegunda línea con <b>texto seguro</b>.';
      histories.get(id).push({ role: 'user', text }, { role: 'agent', text: reply });
      office.activeAgentIds = [];
      return send({ threadId: id, reply });
    }
    unexpectedRequests.push(`${request.method()} ${path}`);
    return send({ error: 'Unexpected fixture route' }, 404);
  });
  await page.goto(vite.resolvedUrls.local[0]);
  await page.locator('.agent-node[data-agent-id="ada"] svg').waitFor();
  assert.equal(await page.locator('[data-agent-id="ada"]').count(), 1, 'Agent IDs remain unique to canvas nodes');
  assert.equal(await page.locator('#chat-panel').evaluate((node) => node.inert), true, 'Closed chat is inert');

  // Offices are created and selected without leaking the default office catalog.
  await page.locator('#create-office').click();
  await page.locator('#office-form [name="name"]').fill('Oficina Demo');
  await page.locator('#office-form [name="emoji"]').fill('🚀');
  await page.locator('#submit-office').click();
  await page.getByRole('heading', { name: '🚀 Oficina Demo' }).waitFor();
  await page.locator('[data-view="dashboard"]').click();
  await page.getByText('Tu equipo empieza aquí', { exact: true }).waitFor();
  assert.equal(await page.locator('.agent-node').count(), 0, 'New office starts isolated');
  await page.locator('#office-select').selectOption('default');
  await page.locator('[data-dashboard-agent-id="ada"]').waitFor();
  assert.equal(await page.locator('.agent-node').count(), 2, 'Switching back restores only the default office');

  await page.locator('[data-view="dashboard"]').click();
  await page.locator('[data-dashboard-agent-id="ada"]').waitFor();
  await page.getByRole('searchbox', { name: 'Buscar agentes por nombre, puesto o habilidad' }).fill('alvarez');
  assert.equal(await page.locator('.ad-agent-card').count(), 1, 'Dashboard search handles accents');
  await page.locator('[data-dashboard-agent-id="ada"]').click();
  await page.getByText('Cargando conversación…', { exact: true }).waitFor();
  releaseHistory();
  await page.locator('.chat-history-status').waitFor({ state: 'hidden' });
  await page.getByRole('button', { name: '¿En qué puedes ayudarme?', exact: true }).click();
  assert.equal(await page.locator('#message-input').inputValue(), '¿En qué puedes ayudarme?', 'Suggestions fill without sending');
  assert.equal(await page.locator('.message.user').count(), 0);
  await page.locator('#message-input').fill('Borrador de Ada');
  await page.getByRole('button', { name: 'Elegir o iniciar una conversación' }).click();
  await page.getByRole('searchbox', { name: 'Buscar agente', exact: true }).fill('Luis');
  await page.locator('[data-chat-agent-id="luis"]').click();
  await page.locator('.chat-history-status').waitFor({ state: 'hidden' });
  assert.equal(await page.locator('#message-input').inputValue(), '', 'Drafts are isolated');
  await page.locator('#message-input').fill('Borrador de Luis');
  await page.getByRole('button', { name: 'Elegir o iniciar una conversación' }).click();
  await page.locator('[data-chat-agent-id="ada"]').click();
  assert.equal(await page.locator('#message-input').inputValue(), 'Borrador de Ada', 'Draft survives switching chats');
  await page.locator('#message-input').press('Enter');
  await page.locator('.chat-thinking').waitFor();
  assert.equal(await page.locator('#send-message').isDisabled(), true);
  await page.getByRole('button', { name: 'Elegir o iniciar una conversación' }).click();
  await page.locator('[data-chat-agent-id="luis"]').click();
  assert.equal(await page.locator('#message-input').inputValue(), 'Borrador de Luis');
  assert.equal(await page.locator('#message-input').isEnabled(), true, 'Other chat stays usable during a request');
  await page.locator('#send-message').click();
  await page.locator('.message.error').getByText('Mensaje rechazado por permisos.', { exact: true }).waitFor();
  assert.equal(await page.locator('#send-message').isEnabled(), true, 'Error restores composer');
  releaseMessage();
  await page.getByRole('button', { name: 'Elegir o iniciar una conversación' }).click();
  await page.locator('[data-chat-agent-id="ada"]').click();
  await page.locator('.message.agent .chat-message-text').getByText('Primera línea de respuesta.', { exact: false }).waitFor();
  assert.equal(await page.locator('.chat-message-text b').count(), 0, 'Agent content is rendered as text, never HTML');
  await page.waitForFunction(() => Array.from(document.querySelectorAll('.message.agent .chat-message-text'))
    .some((node) => getComputedStyle(node).whiteSpace === 'pre-wrap'));
  await page.keyboard.press('Escape');
  assert.equal(await page.locator('#chat-panel').evaluate((node) => node.inert), true);

  // A failed history is surfaced in the selected personal conversation.
  historyError = true;
  await page.locator('#new-chat').click();
  await page.locator('[data-chat-agent-id="luis"]').click();
  await page.locator('.chat-history-error').waitFor();
  assert.match(await page.locator('.chat-history-error').innerText(), /Historial temporalmente/);
  await page.keyboard.press('Escape');

  // New-chat creation uses the existing profile form and POST contract.
  await page.locator('#new-chat').click();
  await page.locator('.chat-picker-create').click();
  await page.locator('#agent-dialog').waitFor();
  await page.locator('#fill-random-agent').click();
  await page.locator('#agent-name').fill('Nueva compañera');
  await page.getByRole('group', { name: 'Cuerpo', exact: true }).getByRole('button').first().click();
  await page.getByRole('button', { name: 'Color #4D96FF', exact: true }).click();
  await page.locator('#agent-dialog').evaluate((node) => { node.scrollTop = 0; });
  await page.screenshot({ path: 'artifacts/avatar-picker-desktop.png', fullPage: true });
  await page.locator('#submit-agent').click();
  await page.locator('#agent-form-error').getByText('No autorizado en esta prueba.', { exact: true }).waitFor();
  assert.equal(await page.locator('#agent-name').inputValue(), 'Nueva compañera', 'Creation errors preserve entered data');
  denyCreation = false;
  await page.locator('#submit-agent').click();
  await page.locator('#agent-dialog').waitFor({ state: 'hidden' });
  assert.equal('avatar' in lastProfile, false, 'Visual preferences do not change the API contract');
  const avatarKey = `mini-oficina:avatar:v1:${encodeURIComponent('default:new-agent')}`;
  const chosenAvatar = await page.evaluate((key) => JSON.parse(localStorage.getItem(key)), avatarKey);
  assert.equal(chosenAvatar.color, '#4D96FF');
  await page.reload();
  await page.locator('[data-view="dashboard"]').click();
  await page.locator('[data-dashboard-agent-id="new-agent"]').waitFor();
  assert.deepEqual(await page.evaluate((key) => JSON.parse(localStorage.getItem(key)), avatarKey), chosenAvatar, 'Avatar survives reload');
  assert.ok(await page.locator('[data-dashboard-agent-id="new-agent"] svg').count(), 'Dashboard renders chosen avatar');
  await page.screenshot({ path: 'artifacts/dashboard-desktop.png', fullPage: true });

  for (const width of [390, 320]) {
    await page.setViewportSize({ width, height: 844 });
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `Dashboard fits ${width}px`);
    if (width === 390) await page.screenshot({ path: 'artifacts/dashboard-mobile-390.png', fullPage: true });
    await page.locator('#new-chat').click();
    assert.ok(await page.locator('.chat-picker').evaluate((node) => node.getBoundingClientRect().right <= innerWidth), `Picker fits ${width}px`);
    await page.locator('[data-chat-agent-id="new-agent"]').click();
    await page.locator('.chat-history-status').waitFor({ state: 'hidden' });
    await page.waitForFunction(() => Math.abs(document.querySelector('#chat-panel').getBoundingClientRect().right - innerWidth) < 1);
    assert.ok(await page.locator('#chat-panel').evaluate((node) => node.getBoundingClientRect().width <= innerWidth), `Chat fits ${width}px`);
    assert.equal(await page.locator('#send-message').isVisible(), true);
    await page.screenshot({ path: `artifacts/chat-mobile-${width}.png` });
    await page.keyboard.press('Escape');
  }
  await page.setViewportSize({ width: 1440, height: 1000 });
  office.agents = [];
  office.rootId = null;
  office.connections = [];
  await page.getByText('Tu equipo empieza aquí', { exact: true }).waitFor();
  await page.locator('#new-chat').click();
  await page.getByText('Tu próxima idea empieza aquí', { exact: true }).waitFor();
  await page.keyboard.press('Escape');
  assert.equal(await page.locator('.chat-picker').evaluate((node) => node.open), false, 'Native dialog closes with Escape');
  assert.deepEqual(errors, [], 'No browser runtime errors');
  assert.deepEqual(unexpectedRequests, [], 'No new or accidental API calls');
  console.log('Dashboard UI verified: office creation/isolation/switching, real-agent search/cards, avatar selection/reload, preserved creation contracts, loading/history and permission errors, draft isolation, pending-chat switching, safe multiline messages, empty states, keyboard/Escape, and 390/320px layouts.');
} finally {
  releaseHistory?.();
  releaseMessage?.();
  await browser?.close();
  await vite.close();
}
