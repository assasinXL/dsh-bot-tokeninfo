import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DEEPSEEK_BALANCE_URL, classifyProvider, createBalanceService, isDeepSeekEndpoint,
  isSafeRequest, parseDeepSeekBalance,
} from './balance.js';
import { apply, fetchWorkBuddy, inject } from './index.js';

function response(body, status = 200) {
  return { ok: status >= 200 && status < 300, status, json: async () => body };
}

test('parses balances without treating zero as missing', () => {
  assert.deepEqual(parseDeepSeekBalance({ balance_infos: [
    { currency: 'CNY', total_balance: '0' }, { currency: 'USD', total_balance: 1.25 },
    { currency: 'BAD', total_balance: 'NaN' },
  ] }), [{ currency: 'CNY', amount: 0 }, { currency: 'USD', amount: 1.25 }]);
});

test('rejects forged endpoints and redirects; only fixed endpoint is fetched', async () => {
  assert.equal(isDeepSeekEndpoint('https://api.deepseek.com/v1'), true);
  assert.equal(isDeepSeekEndpoint('https://api.deepseek.com.attacker.invalid'), false);
  assert.equal(isDeepSeekEndpoint('http://api.deepseek.com'), false);
  assert.equal(isDeepSeekEndpoint('https://custom.example'), false);
  let called;
  const service = createBalanceService({ fetch: async (url, opts) => { called = { url, opts }; return response({ balance_infos: [] }); }, hash: async () => 'fixed' });
  await service.get({ kind: 'deepseek', provider: 'deepseek', label: 'DeepSeek', credentialRef: 'KEY_REF', credential: 'secret', endpoint: DEEPSEEK_BALANCE_URL });
  assert.equal(called.url, DEEPSEEK_BALANCE_URL);
  assert.equal(called.opts.redirect, 'error');
  assert.equal(called.opts.headers.Authorization, 'Bearer secret');
  assert.equal((await service.get({ kind: 'deepseek', endpoint: 'https://attacker.invalid', provider: 'fake' })).status, 'unsupported');
});

test('cache is credential-isolated, expires, and returns explicit stale on errors', async () => {
  let now = 1_000;
  let calls = 0;
  let fail = false;
  const service = createBalanceService({ now: () => now, hash: async value => value, fetch: async () => {
    calls++;
    if (fail) return response({}, 401);
    return response({ balance_infos: [{ currency: 'CNY', total_balance: '3' }] });
  } });
  const target = { kind: 'deepseek', provider: 'p', label: 'P', credentialRef: 'r', credential: 'a', endpoint: DEEPSEEK_BALANCE_URL };
  assert.equal((await service.get(target)).balances[0].amount, 3);
  assert.equal((await service.get(target)).status, 'ok');
  assert.equal(calls, 1);
  assert.equal((await service.get({ ...target, credential: 'b' })).balances[0].amount, 3);
  assert.equal(calls, 2);
  now += 60_001;
  fail = true;
  const stale = await service.get(target);
  assert.equal(stale.status, 'stale');
  assert.equal(stale.reason, 'auth');
  assert.equal(stale.balances[0].amount, 3);
  const authFail = await service.get({ ...target, credential: 'new' });
  assert.equal(authFail.status, 'error');
  assert.deepEqual(authFail.balances, []);
  assert.equal(authFail.reason, 'auth');
});

test('route must point at canonical DeepSeek endpoint before resolving its credential', async () => {
  let resolutions = 0;
  const ctx = {
    sessions: { get: () => ({ requestContext: () => ({ provider: 'deepseek', model: 'chat' }) }) },
    llm: { listConfigurableProviders: () => [{ provider: 'deepseek', displayName: 'DeepSeek', settingsNs: 'llm', settingsPath: ['route'], defaultBaseURL: 'https://api.deepseek.com', nativeAuth: { env: ['DS_KEY'] } }] },
    settings: { describe: () => [{ ns: 'llm', value: { route: { baseURL: 'https://evil.example' } } }] },
    credentials: { resolve: async () => { resolutions++; return { value: 'secret' }; } },
  };
  assert.equal((await classifyProvider(ctx, 's')).kind, 'unsupported');
  assert.equal(resolutions, 0);
  ctx.settings.describe = () => [{ ns: 'llm', value: { route: { baseURL: 'https://api.deepseek.com' } } }];
  const result = await classifyProvider(ctx, 's');
  assert.equal(result.kind, 'deepseek');
  assert.equal(result.credential, 'secret');
  assert.equal(result.credentialRef, 'DS_KEY');
  assert.equal(result.endpoint, DEEPSEEK_BALANCE_URL);
  assert.equal(resolutions, 1);
});

test('same-origin loopback gate rejects remote, bad Host, Origin, and fetch metadata', () => {
  const base = { socket: { remoteAddress: '127.0.0.1' }, headers: { host: '127.0.0.1:62422' } };
  assert.equal(isSafeRequest(base, 'http://127.0.0.1:62422'), true);
  assert.equal(isSafeRequest({ ...base, socket: { remoteAddress: '10.0.0.5' } }, 'http://127.0.0.1:62422'), false);
  assert.equal(isSafeRequest({ ...base, headers: { ...base.headers, host: 'attacker.invalid' } }, 'http://127.0.0.1:62422'), false);
  assert.equal(isSafeRequest({ ...base, headers: { ...base.headers, origin: 'https://attacker.invalid' } }, 'http://127.0.0.1:62422'), false);
  assert.equal(isSafeRequest({ ...base, headers: { ...base.headers, 'sec-fetch-site': 'cross-site' } }, 'http://127.0.0.1:62422'), false);
});

test('WorkBuddy reads full usage and exposes only credits.total', async () => {
  let requested;
  const fetchImpl = async (url, opts) => { requested = { url: String(url), opts }; return response({ credits: { total: 0, private: 'omit' }, account: { email: 'omit' } }); };
  const usage = await fetchWorkBuddy('global', 'http://127.0.0.1:62422', fetchImpl);
  assert.equal(new URL(requested.url).searchParams.get('region'), 'global');
  assert.equal(new URL(requested.url).searchParams.get('detail'), 'full');
  const service = createBalanceService({ now: () => 1 });
  const result = await service.get({ kind: 'workbuddy', provider: 'workbuddy-global', label: 'WorkBuddy', region: 'global' }, { workbuddyFetch: async () => usage });
  assert.equal(result.credits, 0);
  assert.equal('account' in result, false);
  assert.equal('balances' in result, false);
});

test('WorkBuddy caches and merges requests, preserves stale credits', async () => {
  let time = 1; let calls = 0; let fail = false;
  const service = createBalanceService({ now: () => time });
  const target = { kind: 'workbuddy', provider: 'workbuddy', label: 'WorkBuddy', region: 'cn' };
  const deps = { workbuddyFetch: async () => { calls++; if (fail) throw { code: 'UPSTREAM_ERROR' }; return { credits: { total: 9 } }; } };
  await Promise.all([service.get(target, deps), service.get(target, deps)]);
  assert.equal(calls, 1);
  assert.equal((await service.get(target, deps)).credits, 9);
  time += 60001; fail = true;
  const result = await service.get(target, deps);
  assert.equal(result.status, 'stale'); assert.equal(result.credits, 9);
  assert.equal(result.reason, 'network');
});

test('official DeepSeek account route reads wallet balances', async () => {
  const ctx = {
    sessions: { get: () => ({ requestContext: () => ({ provider: 'deepseek-account', model: 'deepseek-flash' }) }) },
    llm: { listConfigurableProviders: () => [{ provider: 'deepseek-account', displayName: 'DeepSeek Account', settingsNs: 'llm-deepseek-account', settingsPath: [], nativeAuth: { env: [], oauth: true } }] },
    settings: { describe: () => [{ ns: 'llm-deepseek-account', value: {} }] },
    credentials: { resolve: async () => undefined },
  };
  const target = await classifyProvider(ctx, 's');
  assert.equal(target.kind, 'deepseek-account');
  const bare = { ...ctx, llm: { listConfigurableProviders: () => [{ provider: 'deepseek-account', displayName: 'DeepSeek Account', settingsNs: 'llm-deepseek-account', settingsPath: [] }] } };
  assert.equal((await classifyProvider(bare, 's')).kind, 'deepseek-account');
  const service = createBalanceService({ now: () => 1 });
  const result = await service.get(target, { accountBalance: async () => ({ status: 'ready', value: [{ currency: 'CNY', balance: '12.50' }], bonusWallets: [{ currency: 'CNY', balance: '1.00' }] }) });
  assert.equal(result.status, 'ok');
  assert.deepEqual(result.balances, [{ currency: 'CNY', amount: 13.5 }]);
});

test('plugin effect registers until cleanup and handler awaits classification', async () => {
  let handler; let disposed = false; let cleanup;
  apply({
    webServer: { getOrigin: () => 'http://127.0.0.1:62422', register: route => { handler = route.handler; return () => { disposed = true; }; } },
    effect: fn => { cleanup = fn(); },
    sessions: { get: () => ({ requestContext: () => ({ provider: 'hctopup', model: 'm' }) }) },
    llm: { listConfigurableProviders: () => [] }, settings: { describe: () => [] }, credentials: {},
  });
  assert.equal(disposed, false);
  let output;
  await handler({ method: 'GET', url: '/plugins/dsh-bot-tokeninfo/status?sessionId=s', socket: { remoteAddress: '127.0.0.1' }, headers: { host: '127.0.0.1:62422' } }, { setHeader() {}, end: value => { output = JSON.parse(value); } });
  assert.equal(output.provider, 'hctopup'); assert.equal(output.status, 'unsupported');
  cleanup(); assert.equal(disposed, true);
});

test('pending model selection overrides the last request route', async () => {
  const session = { requestContext: () => ({ provider: 'deepseek', model: 'chat' }) };
  const ctx = {
    sessions: { get: () => session },
    get: name => name === 'sessionProjections' ? {
      snapshot: () => ({ values: { modelSelection: { lastUsed: { provider: 'deepseek', model: 'chat' }, pending: { provider: 'workbuddy', model: 'deepseek-v4-flash' } } } }),
    } : undefined,
    llm: { listConfigurableProviders: () => [{ provider: 'workbuddy', displayName: 'WorkBuddy', settingsNs: 'llm-wb', settingsPath: [], defaultBaseURL: 'https://workbuddy.ai/v1' }] },
    settings: { describe: () => [] },
    credentials: { resolve: async () => undefined },
  };
  const selected = await classifyProvider(ctx, 's');
  assert.equal(selected.kind, 'workbuddy');
  assert.equal(selected.model, 'deepseek-v4-flash');
  delete ctx.get;
  assert.equal((await classifyProvider(ctx, 's')).kind, 'unsupported');
});

test('plugin exports exact Host injections', () => {
  assert.deepEqual(inject, ['webServer', 'llm', 'settings', 'credentials', 'sessions']);
});

test('unknown session context does not fall back to the default provider', async () => {
  const service = createBalanceService();
  assert.deepEqual(await service.get({ kind: 'unknown' }), { provider: null, model: null, label: 'Unknown', status: 'unknown', balances: [], reason: 'unknown' });
});
