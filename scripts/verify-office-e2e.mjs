import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { createServer } from 'vite';
import { ConversationService } from '../backend/src/application/conversation-service.ts';
import { OfficeCoordinationService } from '../backend/src/application/office-coordination-service.ts';
import { createApiServer } from '../backend/src/http/api-server.ts';

// node --import tsx scripts/verify-office-e2e.mjs
// Real application/API; deterministic gateway instead of any external model.
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
let sequence = 0;
const createId = () => String(++sequence);
let releaseChild;
const childGate = new Promise((resolve) => { releaseChild = resolve; });
const conversations = new ConversationService({
  async complete(messages) {
    const context = JSON.parse(messages.at(-1).content);
    if (context.availableSubordinates.length && !context.results.length) {
      return JSON.stringify({ action: 'delegate', answer: '', requests: [{ subordinateId: context.availableSubordinates[0].id, task: 'Revisa evidencia para el informe.' }] });
    }
    if (!context.results.length) await childGate;
    return JSON.stringify({
      action: 'finalize', answer: context.results.length ? 'Informe final con evidencia del subordinado.' : 'Evidencia verificada por el subordinado.',
      requests: [], memory: { summary: 'La evidencia fue contrastada.', facts: ['Fuente de prueba validada.'], decisions: [], openQuestions: [] },
    });
  },
}, createId);
const office = new OfficeCoordinationService(conversations, createId);
const api = createApiServer({ conversations, office, allowedOrigin: 'http://localhost', maxBodyBytes: 65536, logger: { error() {} } });
let vite;
let browser;
try {
  await new Promise((resolve) => api.listen(0, '127.0.0.1', resolve));
  const backendUrl = `http://127.0.0.1:${api.address().port}`;
  vite = await createServer({ configFile: false, server: { host: '127.0.0.1', port: 0, proxy: { '/api': backendUrl } } });
  await vite.listen();
  browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto(vite.resolvedUrls.local[0]);
  for (const name of ['Jefa de prueba', 'Analista de prueba']) {
    await page.locator('#create-agent').click();
    await page.locator('#fill-random-agent').click();
    await page.locator('#agent-name').fill(name);
    await page.locator('#submit-agent').click();
    await page.locator('#agent-dialog').waitFor({ state: 'hidden' });
  }
  const [boss, child] = office.getSnapshot().agents;
  assert.equal(office.getSnapshot().agents.length, 2);
  await page.locator('#toggle-connect').click();
  for (const agent of [boss, child]) {
    await page.locator(`[data-agent-id="${agent.id}"]`).focus();
    await page.keyboard.press('Enter');
  }
  await page.locator('.connection-line').waitFor({ state: 'attached' });
  assert.equal(office.getSnapshot().connections.length, 1);
  await page.locator('#toggle-connect').click();
  // Horizontal SVG lines have a zero-height layout box despite a clickable stroke.
  const arrowPoint = await page.locator('.connection-hit-area').evaluate((line) => {
    const bounds = line.getBoundingClientRect();
    return { x: bounds.left + bounds.width / 2, y: bounds.top + bounds.height / 2 };
  });
  await page.mouse.click(arrowPoint.x, arrowPoint.y);
  await page.getByText('Todavía no hay mensajes entre estos dos agentes. Aparecerán aquí cuando se consulten.', { exact: true }).waitFor();
  await page.keyboard.press('Escape');
  await page.locator(`[data-agent-id="${boss.id}"]`).focus();
  await page.keyboard.press('Enter');
  await page.locator('#message-input').fill('Prepara un informe con ayuda de tu analista.');
  await page.locator('#send-message').click();
  await page.locator('.connection-line.is-active').waitFor({ state: 'attached' });
  await page.locator('#close-chat').click();
  await page.locator('#audit-pair').selectOption({ index: 1 });
  await page.locator('#audit-pair-open').click();
  await page.getByText('Revisa evidencia para el informe.', { exact: true }).waitFor();
  releaseChild();
  await page.getByText('Evidencia verificada por el subordinado.', { exact: true }).waitFor();
  await page.waitForFunction(() => !document.querySelector('.connection-line.is-active'));
  await page.keyboard.press('Escape');
  await page.locator(`[data-agent-id="${boss.id}"]`).focus();
  await page.keyboard.press('Enter');
  await page.locator('#messages').getByText('Informe final con evidencia del subordinado.', { exact: true }).waitFor();
  const snapshot = office.getSnapshot();
  assert.equal(snapshot.communications[0].status, 'completed');
  assert.deepEqual(snapshot.activeAgentIds, []);
  assert.equal(conversations.getConversation(child.id).messages.length, 0);
  assert.equal(office.getMemory(child.id, 'office').summary, 'La evidencia fue contrastada.');
  assert.equal(office.getMemory(boss.id, 'personal').summary, 'La evidencia fue contrastada.');
  await page.reload();
  await page.locator(`[data-agent-id="${boss.id}"]`).waitFor();
  await page.locator(`[data-agent-id="${boss.id}"]`).focus();
  await page.keyboard.press('Enter');
  await page.locator('#messages').getByText('Informe final con evidencia del subordinado.', { exact: true }).waitFor();
  assert.deepEqual(errors, []);
  console.log('Office E2E verified: UI creation/autofill, saved tree, real delegation API, active arrow, live audit, final personal reply, separate memories, and reload history.');
} finally {
  releaseChild();
  await browser?.close();
  await vite?.close();
  api.closeAllConnections();
  await new Promise((resolve) => api.close(resolve));
}
