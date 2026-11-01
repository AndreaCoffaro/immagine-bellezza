const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

async function run() {
  const root = path.resolve(__dirname, '..');
  const code = fs.readFileSync(path.join(root, 'api/analytics.js'), 'utf8');
  let calls = [], permission = true, githubStatus = 200, redisError = false;
  let rows = [];
  const env = { UPSTASH_REDIS_REST_URL: 'https://redis.example', UPSTASH_REDIS_REST_TOKEN: 'test' };
  const context = {
    module: { exports: {} }, require: p => require(path.resolve(root, 'api', p)),
    process: { env }, URL, Intl, Date, Buffer, AbortSignal,
    fetch: async (url, options) => {
      calls.push({ url, options });
      if (url.startsWith('https://api.github.com/')) return {
        status: githubStatus, ok: githubStatus === 200,
        json: async () => ({ permissions: { push: permission } }),
      };
      const commands = JSON.parse(options.body);
      return { ok: true, json: async () => commands.map((cmd, i) => redisError
        ? { error: 'ERR' } : { result: cmd[0] === 'HGETALL' ? rows[i] || [] : 1 }) };
    },
  };
  vm.runInNewContext(code, context);
  const handler = context.module.exports;
  async function request(method, body, headers = {}, url = '/api/analytics') {
    calls = [];
    const result = { headers: {}, setHeader(k, v) { this.headers[k] = v; }, end(v) { this.body = v ? JSON.parse(v) : null; } };
    await handler({ method, body, url, headers }, result);
    return result;
  }
  const visitor = { origin: 'https://www.immaginebellezzamantio.it', 'content-type': 'application/json', 'user-agent': 'iPhone Mobile' };
  const admin = { authorization: 'Bearer test_token' };
  let res = await request('GET');
  assert.equal(res.statusCode, 401); assert.equal(calls.length, 0);
  permission = false;
  res = await request('GET', null, admin);
  assert.equal(res.statusCode, 401); assert.equal(calls.length, 1);
  permission = true; githubStatus = 401;
  assert.equal((await request('GET', null, admin)).statusCode, 401);
  githubStatus = 200;
  assert.equal((await request('GET', null, admin, '/api/analytics?days=999')).statusCode, 400);
  for (const days of [7, 30, 90]) {
    rows = [['view', '3', 'page:/', '3', 'source:Google', '3', 'device:Computer', '3', 'whatsapp', '1']];
    res = await request('GET', null, admin, `/api/analytics?days=${days}`);
    assert.equal(res.statusCode, 200); assert.equal(res.body.daily.length, days);
    assert.equal(res.body.totals.view, 3); assert.equal(res.body.totals.whatsapp, 1);
    assert.equal(res.body.pages['/'], 3); assert.equal(res.body.sources.Google, 3);
    assert.equal(new Set(res.body.daily.map(d => d.date)).size, days);
    assert.equal(res.headers['Cache-Control'], 'no-store');
  }
  rows = [];
  res = await request('GET', null, admin);
  assert.equal(res.body.totals.view, 0);
  const event = { path: '/', event: 'view', referrer: 'https://www.google.com/search?q=private' };
  assert.equal((await request('POST', event, {})).statusCode, 403);
  assert.equal((await request('POST', event, { ...visitor, origin: 'https://evil.example' })).statusCode, 403);
  for (const body of [null, 'invalid', { path: '/admin/', event: 'view' }, { path: '/', event: 'bad' }]) {
    assert.equal((await request('POST', body, visitor)).statusCode, 400);
  }
  assert.equal((await request('POST', event, { ...visitor, 'content-type': 'text/plain' })).statusCode, 415);
  assert.equal((await request('POST', { ...event, referrer: 'a'.repeat(3000) }, visitor)).statusCode, 413);
  for (const header of [{ dnt: '1' }, { 'sec-gpc': '1' }, { 'user-agent': 'Googlebot' }]) {
    assert.equal((await request('POST', event, { ...visitor, ...header })).statusCode, 204);
    assert.equal(calls.length, 0);
  }
  for (const type of ['view', 'phone', 'whatsapp', 'email']) {
    assert.equal((await request('POST', { ...event, event: type }, visitor)).statusCode, 204);
    const command = JSON.parse(calls[0].options.body)[0];
    assert.equal(command[0], 'EVAL'); assert.equal(command[3].startsWith('analytics:'), true);
    assert.equal(command[4], 8640000);
    assert.equal(command.includes(type), true);
    assert.equal(calls[0].options.body.includes('private'), false);
    if (type === 'view') { assert.equal(command.includes('source:Google'), true); assert.equal(command.includes('device:Cellulare'), true); }
  }
  delete env.UPSTASH_REDIS_REST_TOKEN;
  assert.equal((await request('GET', null, admin)).statusCode, 503);
  env.UPSTASH_REDIS_REST_TOKEN = 'test'; redisError = true;
  assert.equal((await request('GET', null, admin)).statusCode, 502);
  assert.equal((await request('DELETE')).statusCode, 405);
  for (const file of ['admin/statistiche.js', 'js/analytics.js']) new vm.Script(fs.readFileSync(path.join(root, file), 'utf8'));
  const tracker = fs.readFileSync(path.join(root, 'js/analytics.js'), 'utf8');
  function browser(overrides = {}) {
    const sent = [], listeners = {};
    const document = { visibilityState: 'visible', referrer: 'https://google.com/search?q=private', addEventListener: (name, fn) => { listeners[name] = fn; } };
    const globals = {
      location: { hostname: 'www.immaginebellezzamantio.it', pathname: '/blog/index.html' },
      navigator: {}, localStorage: { getItem: () => null }, URL, document,
      fetch: async (url, options) => { sent.push({ url, body: JSON.parse(options.body) }); },
      ...overrides,
    };
    vm.runInNewContext(tracker, globals);
    return { sent, listeners, document };
  }
  let b = browser();
  assert.equal(b.sent.length, 1); assert.equal(b.sent[0].body.path, '/blog/');
  assert.equal(b.sent[0].body.referrer, 'https://google.com');
  b.listeners.visibilitychange(); assert.equal(b.sent.length, 1);
  b.listeners.click({ target: { closest: () => ({ href: 'https://wa.me/123?text=private' }) } });
  assert.equal(b.sent[1].body.event, 'whatsapp');
  assert.equal(JSON.stringify(b.sent).includes('private'), false);
  for (const overrides of [
    { location: { hostname: 'localhost' } }, { navigator: { doNotTrack: '1' } },
    { navigator: { globalPrivacyControl: true } }, { navigator: { webdriver: true } },
    { localStorage: { getItem: () => JSON.stringify({ token: 'admin' }) } },
  ]) assert.equal(browser(overrides).sent.length, 0);
  const hiddenDoc = { visibilityState: 'hidden', referrer: '', addEventListener: (name, fn) => { hiddenDoc[name] = fn; } };
  b = browser({ document: hiddenDoc });
  assert.equal(b.sent.length, 0);
  hiddenDoc.visibilityState = 'visible'; hiddenDoc.visibilitychange();
  assert.equal(b.sent.length, 1);
  return 'OK: autorizzazione, periodi e aggregazione, validazione eventi, privacy, errori database, tracker e sintassi JavaScript.';
}
module.exports = run;
if (require.main === module) run().then(console.log).catch(error => { console.error(error); process.exitCode = 1; });
