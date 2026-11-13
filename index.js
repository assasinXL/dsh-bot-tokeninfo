import { createBalanceService, classifyProvider, isSafeRequest } from './balance.js';

const PLUGIN_ID = 'dsh-bot-tokeninfo';
const TIMEOUT_MS = 12_000;
const inject = ['webServer', 'llm', 'settings', 'credentials', 'sessions'];

function send(res, status, body) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.end(JSON.stringify(body));
}

async function fetchWorkBuddy(region, origin, fetchImpl = globalThis.fetch) {
  const url = new URL('/plugins/dsh-connect-workbuddy/usage', origin);
  url.searchParams.set('region', region);
  url.searchParams.set('detail', 'full');
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  let response;
  try {
    response = await fetchImpl(url, { method: 'GET', redirect: 'error', signal: controller.signal, headers: { Accept: 'application/json' } });
    if (!response || !response.ok) throw Object.assign(new Error(), { code: response?.status === 401 ? 'NOT_SIGNED_IN' : response?.status === 429 ? 'RATE_LIMIT' : 'UPSTREAM_ERROR' });
    return await response.json();
  } catch (error) {
    throw Object.assign(new Error(), { code: error?.name === 'AbortError' ? 'TIMEOUT' : ['NOT_SIGNED_IN', 'RATE_LIMIT'].includes(error?.code) ? error.code : 'UPSTREAM_ERROR' });
  } finally { clearTimeout(timer); }
}

function apply(ctx) {
  const service = createBalanceService();
  const origin = ctx.webServer.getOrigin();
  ctx.effect(() => {
    const dispose = ctx.webServer.register({
    kind: 'exact',
    path: `/plugins/${PLUGIN_ID}/status`,
    async handler(req, res) {
      if (!isSafeRequest(req, origin)) return send(res, 403, { status: 'error', reason: 'FORBIDDEN' });
      if (req.method !== 'GET') return send(res, 405, { status: 'error', reason: 'METHOD_NOT_ALLOWED' });
      let parsed;
      try { parsed = new URL(req.url, origin); } catch { return send(res, 400, { status: 'error', reason: 'INVALID_REQUEST' }); }
      const sessionId = parsed.searchParams.get('sessionId');
      if (!sessionId || sessionId.length > 512) return send(res, 400, { status: 'error', reason: 'INVALID_REQUEST' });
      try {
        const target = await classifyProvider(ctx, sessionId);
        if (target.kind === 'not-found') return send(res, 404, { status: 'error', reason: 'SESSION_NOT_FOUND' });
        const result = await service.get(target, {
          workbuddyFetch: region => fetchWorkBuddy(region, origin),
          accountBalance: () => {
            const account = typeof ctx.get === 'function' ? ctx.get('deepseekAccount') : undefined;
            if (!account) return null;
            return account.getBalance({ version: '1.0.0', locale: 'zh', timezoneOffsetSeconds: -new Date().getTimezoneOffset() * 60 });
          },
        });
        return send(res, 200, result);
      } catch {
        return send(res, 200, { provider: null, model: null, label: 'Unknown', status: 'error', reason: 'INTERNAL_ERROR' });
      }
    },
    });
    return () => { service.clear(); if (typeof dispose === 'function') dispose(); };
  });
}

export { apply, fetchWorkBuddy, inject };
