
const DEEPSEEK_BALANCE_URL = 'https://api.deepseek.com/user/balance';
const TTL_MS = 60_000;
const FAILURE_COOLDOWN_MS = 10_000;
const CACHE_LIMIT = 64;
const TIMEOUT_MS = 12_000;

function safeCode(error) {
  const code = error && typeof error.code === 'string' ? error.code : '';
  if (code === 'MISSING_CREDENTIAL') return 'missing-key';
  if (code === 'AUTH_FAILED') return 'auth';
  if (code === 'INVALID_RESPONSE') return 'invalid-response';
  if (code === 'UNSUPPORTED_PROVIDER') return 'unsupported';
  if (code === 'RATE_LIMIT') return 'rate-limit';
  if (code === 'NOT_SIGNED_IN') return 'not-signed-in';
  if (code === 'TIMEOUT' || code === 'UPSTREAM_ERROR') return 'network';
  return 'unknown';
}

function hostOnly(value) {
  if (typeof value !== 'string' || !value || [...value].some(char => char.charCodeAt(0) <= 32 || [47, 64, 92].includes(char.charCodeAt(0)))) return null;
  try {
    const url = new URL(`http://${value}`);
    if (url.username || url.password || url.pathname !== '/' || url.search || url.hash) return null;
    return url.host.toLowerCase();
  } catch { return null; }
}

function isSafeRequest(req, origin) {
  const expected = hostOnly(new URL(origin).host);
  if (!expected || hostOnly(req.headers && req.headers.host) !== expected) return false;
  const remote = req.socket && req.socket.remoteAddress;
  if (typeof remote !== 'string' || !(remote === '::1' || remote.startsWith('127.') || remote.startsWith('::ffff:127.'))) return false;
  const requestOrigin = req.headers && req.headers.origin;
  if (requestOrigin !== undefined) {
    try { if (new URL(requestOrigin).origin !== new URL(origin).origin) return false; }
    catch { return false; }
  }
  const fetchSite = req.headers && req.headers['sec-fetch-site'];
  if (fetchSite !== undefined && fetchSite !== 'same-origin' && fetchSite !== 'none') return false;
  return true;
}

function parseDeepSeekBalance(payload) {
  if (!payload || !Array.isArray(payload.balance_infos) || payload.balance_infos.length === 0) throw Object.assign(new Error(), { code: 'INVALID_RESPONSE' });
  const balances = [];
  for (const entry of payload.balance_infos) {
    if (!entry || typeof entry.currency !== 'string' || typeof entry.total_balance !== 'string' && typeof entry.total_balance !== 'number') continue;
    const amount = Number(entry.total_balance);
    if (!Number.isFinite(amount) || amount < 0) continue;
    balances.push({ currency: entry.currency, amount });
  }
  if (!balances.length) throw Object.assign(new Error(), { code: 'INVALID_RESPONSE' });
  return balances;
}

function isDeepSeekEndpoint(raw) {
  if (typeof raw !== 'string' || !raw.trim()) return false;
  try {
    const url = new URL(raw);
    return url.protocol === 'https:' && url.hostname.toLowerCase() === 'api.deepseek.com' && (!url.port || url.port === '443') && (url.pathname === '/' || url.pathname === '/v1');
  } catch { return false; }
}

// The model picker writes a pending selection before any request is sent, so
// the balance follows the dropdown instead of the last request on the wire.
// Accepts the raw state ({lastUsed, pending}) and the client wire view
// ({lastUsed, next}) because either may be served depending on the caller.
function selectedRoute(ctx, session) {
  try {
    const projections = typeof ctx.get === 'function' ? ctx.get('sessionProjections') : ctx.sessionProjections;
    if (!projections || typeof projections.snapshot !== 'function') return null;
    const values = projections.snapshot(session, ['modelSelection']).values;
    const state = values && values.modelSelection;
    if (!state || typeof state !== 'object') return null;
    for (const candidate of [state.pending, state.next, state.lastUsed]) {
      if (candidate && typeof candidate.provider === 'string' && candidate.provider) return candidate;
    }
  } catch {}
  return null;
}

async function classifyProvider(ctx, sessionId) {
  const session = ctx.sessions.get(sessionId);
  if (!session) return { kind: 'not-found' };
  let requestContext;
  try { requestContext = session.requestContext && session.requestContext(); } catch {}
  const selected = selectedRoute(ctx, session);
  const chosen = selected && selected.provider ? selected : requestContext;
  let provider = chosen && chosen.provider;
  let model = chosen && chosen.model;
  if (!provider) {
    try {
      const header = session.requestHeader && session.requestHeader();
      const config = header && header.config;
      provider = config && config.provider;
      model = model || config && config.model;
    } catch {}
  }
  if (!provider) return { kind: 'unknown' };
  const configs = ctx.llm.listConfigurableProviders();
  const config = Array.isArray(configs) && configs.find(item => item.provider === provider);
  const label = config && config.displayName || String(provider);
  const settingsRows = ctx.settings.describe({ redactSecrets: true });
  const row = Array.isArray(settingsRows) && settingsRows.find(item => item.ns === (config && config.settingsNs));
  const route = Array.isArray(config && config.settingsPath) ? config.settingsPath.reduce((obj, key) => obj && obj[key], row && row.value) : undefined;
  const endpoint = route && (route.baseURL || route.baseUrl || route.base_url) || config && config.defaultBaseURL || '';
  const host = (() => { try { return new URL(endpoint).hostname.toLowerCase(); } catch { return ''; } })();
  if (host === 'ai.hctopup.com' || /hctopup/i.test(String(provider))) return { kind: 'unsupported', provider, model, label, reason: 'UNSUPPORTED_PROVIDER' };
  if (host === 'workbuddy.ai' || /workbuddy/i.test(String(provider))) return { kind: 'workbuddy', provider, model, label, region: /global/i.test(String(provider)) ? 'global' : 'cn' };
  const nativeAccount = Boolean(config && config.nativeAuth && config.nativeAuth.oauth === true);
  if (nativeAccount && /deepseek/i.test(String(provider))) return { kind: 'deepseek-account', provider, model, label };
  if (/^deepseek-account/i.test(String(provider))) return { kind: 'deepseek-account', provider, model, label };
  if (host !== 'api.deepseek.com' || !isDeepSeekEndpoint(endpoint)) return { kind: 'unsupported', provider, model, label, reason: 'UNSUPPORTED_PROVIDER' };
  const refs = route && route.apiKeyEnv ? [route.apiKeyEnv] : config && config.nativeAuth && config.nativeAuth.env;
  if (!Array.isArray(refs) || !refs.length || refs.some(ref => typeof ref !== 'string')) return { kind: 'missing-credential', provider, model, label };
  for (const envRef of refs) {
    const credential = await ctx.credentials.resolve(envRef);
    if (credential && typeof credential.value === 'string' && credential.value) {
      return { kind: 'deepseek', provider, model, label, credentialRef: envRef, credential: credential.value, endpoint: DEEPSEEK_BALANCE_URL };
    }
  }
  return { kind: 'missing-credential', provider, model, label };
}

function createBalanceService(options = {}) {
  const fetchImpl = options.fetch || globalThis.fetch;
  const now = options.now || Date.now;
  const hash = options.hash || (async value => {
    const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
    return Array.from(new Uint8Array(bytes), byte => byte.toString(16).padStart(2, '0')).join('');
  });
  const cache = new Map();
  const inflight = new Map();
  const workbuddyCache = new Map();
  const workbuddyInflight = new Map();

  function remember(key, entry) {
    cache.delete(key);
    cache.set(key, entry);
    while (cache.size > CACHE_LIMIT) cache.delete(cache.keys().next().value);
  }

  async function readDeepSeek(target) {
    const key = await hash(`${target.provider}\0${target.endpoint}\0${target.credentialRef}\0${target.credential}`);
    const time = now();
    const current = cache.get(key);
    if (current && current.value && time - current.updatedAt < TTL_MS) {
      remember(key, current);
      return { status: 'ok', balances: current.value, updatedAt: current.updatedAt };
    }
    if (current && current.failedUntil > time) {
      if (current.value) return { status: 'stale', balances: current.value, updatedAt: current.updatedAt, reason: current.reason };
      return { status: 'error', balances: [], reason: current.reason || 'UPSTREAM_ERROR' };
    }
    if (inflight.has(key)) return inflight.get(key);
    const request = (async () => {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
      try {
        const response = await fetchImpl(DEEPSEEK_BALANCE_URL, {
          method: 'GET', redirect: 'error', signal: controller.signal,
          headers: { Authorization: `Bearer ${target.credential}`, Accept: 'application/json' },
        });
        if (!response || !response.ok) {
          const status = response && response.status;
          throw Object.assign(new Error(), { code: status === 401 || status === 403 ? 'AUTH_FAILED' : status === 429 ? 'RATE_LIMIT' : 'UPSTREAM_ERROR' });
        }
        const balances = parseDeepSeekBalance(await response.json());
        const updatedAt = now();
        remember(key, { value: balances, updatedAt, failedUntil: 0 });
        return { status: 'ok', balances, updatedAt };
      } catch (error) {
        const reason = safeCode(error.name === 'AbortError' ? { code: 'TIMEOUT' } : error);
        const prior = cache.get(key);
        const updatedAt = prior && prior.updatedAt;
        remember(key, { value: prior && prior.value, updatedAt, failedUntil: now() + FAILURE_COOLDOWN_MS, reason });
        if (prior && prior.value) return { status: 'stale', balances: prior.value, updatedAt, reason };
        return { status: 'error', balances: [], reason };
      } finally { clearTimeout(timer); inflight.delete(key); }
    })();
    inflight.set(key, request);
    return request;
  }

  async function readWorkBuddy(target, deps) {
    const key = `${target.provider}\0${target.region === 'global' ? 'global' : 'cn'}`;
    const time = now();
    const current = workbuddyCache.get(key);
    if (current && current.value !== undefined && time - current.updatedAt < TTL_MS) {
      workbuddyCache.delete(key);
      workbuddyCache.set(key, current);
      return { status: 'ok', credits: current.value, updatedAt: current.updatedAt };
    }
    if (current && current.failedUntil > time) {
      return current.value !== undefined
        ? { status: 'stale', credits: current.value, updatedAt: current.updatedAt, reason: current.reason }
        : { status: 'error', reason: current.reason };
    }
    if (workbuddyInflight.has(key)) return workbuddyInflight.get(key);
    const request = (async () => {
      try {
        if (typeof deps.workbuddyFetch !== 'function') throw Object.assign(new Error(), { code: 'UPSTREAM_ERROR' });
        const result = await deps.workbuddyFetch(target.region === 'global' ? 'global' : 'cn');
        const amount = result && result.credits && result.credits.total;
        if (typeof amount !== 'number' || !Number.isFinite(amount) || amount < 0) throw Object.assign(new Error(), { code: 'INVALID_RESPONSE' });
        const updatedAt = now();
        workbuddyCache.set(key, { value: amount, updatedAt, failedUntil: 0 });
        while (workbuddyCache.size > CACHE_LIMIT) workbuddyCache.delete(workbuddyCache.keys().next().value);
        return { status: 'ok', credits: amount, updatedAt };
      } catch (error) {
        const reason = safeCode(error);
        workbuddyCache.set(key, { value: current && current.value, updatedAt: current && current.updatedAt, failedUntil: now() + FAILURE_COOLDOWN_MS, reason });
        return current && current.value !== undefined
          ? { status: 'stale', credits: current.value, updatedAt: current.updatedAt, reason }
          : { status: 'error', reason };
      } finally { workbuddyInflight.delete(key); }
    })();
    workbuddyInflight.set(key, request);
    return request;
  }

  async function readDeepSeekAccount(target, deps) {
    const key = 'account-route';
    const time = now();
    const current = cache.get(key);
    if (current && current.value && time - current.updatedAt < TTL_MS) {
      remember(key, current);
      return { status: 'ok', balances: current.value, updatedAt: current.updatedAt };
    }
    if (current && current.failedUntil > time) {
      if (current.value) return { status: 'stale', balances: current.value, updatedAt: current.updatedAt, reason: current.reason };
      return { status: 'error', balances: [], reason: current.reason || 'network' };
    }
    if (inflight.has(key)) return inflight.get(key);
    const request = (async () => {
      try {
        if (typeof deps.accountBalance !== 'function') throw Object.assign(new Error(), { code: 'UPSTREAM_ERROR' });
        const details = await deps.accountBalance();
        if (!details) throw Object.assign(new Error(), { code: 'NOT_SIGNED_IN' });
        if (details.status !== 'ready') throw Object.assign(new Error(), { code: 'UPSTREAM_ERROR' });
        const totals = new Map();
        for (const wallet of [...(details.value || []), ...(details.bonusWallets || [])]) {
          if (!wallet || typeof wallet.currency !== 'string' || !/^[A-Z]{3}$/.test(wallet.currency)) continue;
          const amount = Number(wallet.balance);
          if (!Number.isFinite(amount) || amount < 0) continue;
          totals.set(wallet.currency, (totals.get(wallet.currency) || 0) + amount);
        }
        const balances = [...totals].map(([currency, amount]) => ({ currency, amount }));
        if (!balances.length) throw Object.assign(new Error(), { code: 'INVALID_RESPONSE' });
        const updatedAt = now();
        remember(key, { value: balances, updatedAt, failedUntil: 0 });
        return { status: 'ok', balances, updatedAt };
      } catch (error) {
        const reason = safeCode(error);
        const prior = cache.get(key);
        const updatedAt = prior && prior.updatedAt;
        remember(key, { value: prior && prior.value, updatedAt, failedUntil: now() + FAILURE_COOLDOWN_MS, reason });
        if (prior && prior.value) return { status: 'stale', balances: prior.value, updatedAt, reason };
        return { status: 'error', balances: [], reason };
      } finally { inflight.delete(key); }
    })();
    inflight.set(key, request);
    return request;
  }

  return {
    async get(target, deps = {}) {
      if (target.kind === 'unknown') return { provider: null, model: null, label: 'Unknown', status: 'unknown', balances: [], reason: safeCode({ code: 'NO_REQUEST_CONTEXT' }) };
      if (target.kind === 'not-found') return null;
      if (target.kind === 'unsupported') return { provider: target.provider, model: target.model || null, label: target.label, status: 'unsupported', balances: [], reason: safeCode({ code: target.reason || 'UNSUPPORTED_PROVIDER' }) };
      if (target.kind === 'workbuddy') return { provider: target.provider, model: target.model || null, label: target.label, ...await readWorkBuddy(target, deps) };
      if (target.kind === 'deepseek-account') return { provider: target.provider, model: target.model || null, label: target.label, ...await readDeepSeekAccount(target, deps) };
      if (target.kind === 'missing-credential') return { provider: target.provider, model: target.model || null, label: target.label, status: 'error', balances: [], reason: safeCode({ code: 'MISSING_CREDENTIAL' }) };
      if (target.kind !== 'deepseek' || target.endpoint !== DEEPSEEK_BALANCE_URL) return { provider: target.provider || null, model: target.model || null, label: target.label || 'Unknown', status: 'unsupported', balances: [], reason: 'UNSUPPORTED_PROVIDER' };
      const result = await readDeepSeek(target);
      return { provider: target.provider, model: target.model || null, label: target.label, ...result };
    },
    clear() { cache.clear(); inflight.clear(); workbuddyCache.clear(); workbuddyInflight.clear(); },
  };
}

export { CACHE_LIMIT, DEEPSEEK_BALANCE_URL, FAILURE_COOLDOWN_MS, TTL_MS, TIMEOUT_MS, classifyProvider, createBalanceService, hostOnly, isDeepSeekEndpoint, isSafeRequest, parseDeepSeekBalance, safeCode };
