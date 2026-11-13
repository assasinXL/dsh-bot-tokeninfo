window.__ModuleLoader__.load({
  id: 'dsh-bot-tokeninfo',
  factory(require) {
    const React = require('react');
    const ReactDOM = require('react-dom');
    const h = React.createElement;
    const NS = 'bot-tokeninfo';
    const dictionaries = {
      en: { balance: 'Balance', credits: 'credits', loading: 'Checking balance…', unknown: 'Model not selected', unsupported: 'Balance unavailable', error: 'Balance query failed', stale: 'outdated', refresh: 'Check balance (server cache up to 60 seconds)', updated: 'Last updated', 'missing-key': 'Configure the provider API key in Models.', 'auth': 'The provider rejected the key. Check its credential in Models.', 'reason.unsupported': 'This provider has no verified balance endpoint.', 'network': 'Cannot reach the balance service. Retry later.', 'not-signed-in': 'Sign in to this provider account first.', 'invalid-response': 'The provider returned an unrecognized balance response.', 'reason.unknown': 'Pick a model to resolve this session channel.', 'rate-limit': 'Too many requests. Retry later.',
        'stats.counts': '{turns} turns {steps} steps', 'stats.speed': '{tps} tok/s', 'stats.speedRow': 'Output speed (TPS)', 'stats.title': 'Session stats', 'stats.llmTime': 'Model time', 'stats.toolTime': 'Tool time', 'stats.ttft': 'Average TTFT',
        'usage.title': 'Token usage', 'usage.tokens': '{count} tok', 'usage.cacheHit': 'Cache hit {percent}%', 'usage.cacheHitLabel': 'Cache hit', 'usage.input': 'Input', 'usage.output': 'Output', 'usage.cached': 'Cache read', 'usage.cacheWrite': 'Cache write',
        'duration.milliseconds': '{milliseconds} ms', 'duration.seconds': '{seconds}s', 'duration.minutes': '{minutes}m {seconds}s' },
      zh: { balance: '余额', credits: '积分', loading: '余额查询中…', unknown: '尚未确定模型', unsupported: '余额暂不可查', error: '余额查询失败', stale: '旧数据', refresh: '检查余额（服务端最多缓存 60 秒）', updated: '上次更新', 'missing-key': '请在模型设置中配置该渠道的 API Key。', 'auth': '渠道拒绝了密钥，请检查模型设置中的凭据。', 'reason.unsupported': '该渠道尚无已确认的余额查询接口。', 'network': '暂时无法连接余额服务，请稍后重试。', 'not-signed-in': '请先登录该渠道的官方账号。', 'invalid-response': '渠道返回了无法识别的余额数据。', 'reason.unknown': '选择一个模型后即可确定本会话的渠道。', 'rate-limit': '查询过于频繁，请稍后重试。',
        'stats.counts': '{turns} 轮 {steps} 步', 'stats.speed': '{tps} tok/s', 'stats.speedRow': '输出速度（TPS）', 'stats.title': '会话统计', 'stats.llmTime': '模型用时', 'stats.toolTime': '工具调用用时', 'stats.ttft': '首 token 平均（TTFT）',
        'usage.title': 'Token 用量', 'usage.tokens': '{count} tok', 'usage.cacheHit': '缓存命中 {percent}%', 'usage.cacheHitLabel': '缓存命中', 'usage.input': '输入', 'usage.output': '输出', 'usage.cached': '缓存读取', 'usage.cacheWrite': '缓存写入',
        'duration.milliseconds': '{milliseconds} 毫秒', 'duration.seconds': '{seconds} 秒', 'duration.minutes': '{minutes} 分 {seconds} 秒' },
    };
    const CSS = '[data-composer-dock]:has(.dshcb):not(:has(.bt-btw)){display:flex!important}'
      // Same size the shell gives its own activity/usage pills: one pixel under
      // the secondary content size, on the shared 20px dock line.
      + '.dshcb{display:inline-flex;align-items:center;gap:6px;box-sizing:border-box;max-width:100%;min-width:0;padding:1px 8px;border:none;border-radius:var(--dsw-radius-sm,6px);background:transparent;color:var(--dsw-alias-label-tertiary);font-family:inherit;font-size:calc(var(--dsh-content-font-size-secondary,13px) - 1px);line-height:calc(20px + var(--dsh-content-font-delta-secondary,0px));font-variant-numeric:tabular-nums;white-space:nowrap}'
      + '.dshcb-stats{order:-2}.dshcb-usage{order:-1}.dshcb-balance{order:99;font-size:var(--dsh-content-font-size-secondary,13px)}'
      + 'button.dshcb{cursor:pointer}'
      + '@media (hover:hover){button.dshcb:hover{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-secondary)}}'
      + 'button.dshcb:focus-visible{outline:2px solid var(--dsw-alias-brand-primary,#5686fe);outline-offset:1px}'
      + 'button.dshcb[aria-expanded="true"]{background:var(--dsw-alias-interactive-bg-hover);color:var(--dsw-alias-label-secondary)}'
      + '.dshcb-icon{flex:none;display:block;width:14px;height:14px}'
      + '.dshcb-label{min-width:0;overflow:hidden;text-overflow:ellipsis}'
      + '.dshcb-busy{flex:none;opacity:.7;animation:dshcb-spin 1s linear infinite}'
      + '@keyframes dshcb-spin{to{transform:rotate(360deg)}}'
      + '@media (prefers-reduced-motion:reduce){.dshcb-busy{animation:none}}'
      + '.dshcbd{position:fixed;z-index:1100;box-sizing:border-box;width:max-content;min-width:min(300px,calc(100vw - 24px));max-width:min(440px,calc(100vw - 24px));max-height:calc(100vh - 24px);overflow-y:auto;padding:16px;border:0;border-radius:var(--dsw-radius-lg,12px);background:var(--dsw-specific-menu,var(--dsw-alias-bg-layer-1,#242424));backdrop-filter:var(--dsw-menu-backdrop-filter);--dsw-elevation-stroke-color:var(--dsw-alias-border-l1);box-shadow:var(--dsw-elevation-prominent,0 8px 24px rgba(0,0,0,.32));font-size:12px;line-height:20px;color:var(--dsw-alias-label-secondary);cursor:default;--dsh-scrollbar-thumb:var(--dsw-alias-scrollbar-bg-l2);--dsh-scrollbar-thumb-hover:var(--dsw-alias-scrollbar-hover-l2)}'
      + '.dshcbd-title{display:flex;justify-content:space-between;gap:16px;margin-bottom:8px;color:var(--dsw-alias-label-primary);font-weight:500}'
      + '.dshcbd-titleLabel{display:inline-flex;align-items:center;gap:6px;min-width:0}'
      + '.dshcbd-titleLabel .dshcb-icon{width:14px;height:14px}'
      + '.dshcbd-titleValue{font-variant-numeric:tabular-nums}'
      + '.dshcbd-rule{margin-bottom:10px;border-top:.5px solid var(--dsw-alias-border-l2)}'
      + '.dshcbd-details{display:grid;grid-template-columns:minmax(76px,auto) minmax(0,1fr);gap:6px 16px;margin:0;color:var(--dsw-alias-label-tertiary)}'
      + '.dshcbd-details dt,.dshcbd-details dd{min-width:0;margin:0}'
      + '.dshcbd-details dd{color:var(--dsw-alias-label-secondary);font-variant-numeric:tabular-nums;text-align:right}';
    function WalletIcon() {
      return h('svg', { className: 'dshcb-icon', viewBox: '0 0 16 16', fill: 'none', 'aria-hidden': 'true' },
        h('rect', { x: '2.4', y: '4.4', width: '11.2', height: '7.2', rx: '1.8', stroke: 'currentColor', strokeWidth: '1.2' }),
        h('path', { d: 'M2.6 6.6h10.8', stroke: 'currentColor', strokeWidth: '1.2' }),
        h('circle', { cx: '11.1', cy: '8.7', r: '.95', fill: 'currentColor' }));
    }
    function GaugeIcon() {
      return h('svg', { className: 'dshcb-icon', viewBox: '0 0 16 16', fill: 'none', 'aria-hidden': 'true' },
        h('circle', { cx: '8', cy: '8', r: '5.6', stroke: 'currentColor', strokeWidth: '1.2' }),
        h('path', { d: 'M8 4.9V8l2.2 1.6', stroke: 'currentColor', strokeWidth: '1.2', strokeLinecap: 'round', strokeLinejoin: 'round' }));
    }
    function DatabaseIcon() {
      return h('svg', { className: 'dshcb-icon', viewBox: '0 0 16 16', fill: 'none', 'aria-hidden': 'true' },
        h('ellipse', { cx: '8', cy: '4.6', rx: '4.8', ry: '1.9', stroke: 'currentColor', strokeWidth: '1.2' }),
        h('path', { d: 'M3.2 4.6v6.4c0 1.05 2.15 1.9 4.8 1.9s4.8-.85 4.8-1.9V4.6', stroke: 'currentColor', strokeWidth: '1.2', strokeLinecap: 'round' }),
        h('path', { d: 'M3.2 8c0 1.05 2.15 1.9 4.8 1.9s4.8-.85 4.8-1.9', stroke: 'currentColor', strokeWidth: '1.2' }));
    }
    function validate(value) {
      const statuses = ['ok', 'stale', 'unknown', 'unsupported', 'error'];
      if (!value || !statuses.includes(value.status)) return false;
      if (['provider', 'model', 'label', 'reason'].some(key => value[key] != null && typeof value[key] !== 'string')) return false;
      if (value.balances != null && (!Array.isArray(value.balances) || value.balances.some(item => !item || typeof item.currency !== 'string' || !/^[A-Z]{3}$/.test(item.currency) || typeof item.amount !== 'number' || !Number.isFinite(item.amount)))) return false;
      if (value.credits != null && (typeof value.credits !== 'number' || !Number.isFinite(value.credits) || value.credits < 0)) return false;
      if (value.updatedAt != null && (typeof value.updatedAt !== 'number' || !Number.isFinite(value.updatedAt) || value.updatedAt <= 0 || value.updatedAt > 8640000000000000)) return false;
      return !['ok', 'stale'].includes(value.status) || Boolean(value.balances?.length || value.credits != null);
    }
    // The shell draws its own activity/usage pills. In ds-bot those two are
    // shadowed by id into Nothing, so only there does this plugin draw them —
    // otherwise a reading would appear twice in the same dock.
    const NATIVE_STATS = '[data-composer-stat="activity"],[data-composer-stat="usage"]';
    const native = { present: null, listeners: new Set(), observer: null };
    function readNative() {
      if (typeof document === 'undefined' || typeof document.querySelector !== 'function') return false;
      try { return Boolean(document.querySelector(NATIVE_STATS)); } catch { return false; }
    }
    function claimObserver() {
      if (native.observer || typeof MutationObserver === 'undefined' || typeof document === 'undefined') return;
      native.present = readNative();
      native.observer = new MutationObserver(() => {
        const next = readNative();
        if (next === native.present) return;
        native.present = next;
        for (const listener of [...native.listeners]) listener();
      });
      native.observer.observe(document.body || document.documentElement, { childList: true, subtree: true });
    }
    function releaseObserver() {
      if (!native.observer || native.listeners.size > 0) return;
      native.observer.disconnect();
      native.observer = null;
    }
    function subscribeNative(listener) {
      native.listeners.add(listener);
      claimObserver();
      return () => { native.listeners.delete(listener); releaseObserver(); };
    }
    function getNative() {
      if (native.present === null) native.present = readNative();
      return native.present;
    }
    function useNativeDrawn() {
      return React.useSyncExternalStore(subscribeNative, getNative, getNative);
    }
    function fill(template, params) {
      return String(template).replace(/\{(\w+)\}/g, (match, key) => (params[key] === undefined ? match : String(params[key])));
    }
    function formatTokens(value) {
      if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) return null;
      const scaled = candidate => (candidate >= 100 ? String(Math.round(candidate)) : String(Math.round(candidate * 10) / 10));
      if (value < 1e3) return String(Math.round(value));
      if (value < 1e6) return scaled(value / 1e3) + 'K';
      return scaled(value / 1e6) + 'M';
    }
    function formatExact(value) {
      const rounded = Math.max(0, Math.round(value));
      return String(rounded).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    }
    function formatSpeed(value) {
      if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) return null;
      return value >= 10 ? String(Math.round(value)) : String(Math.round(value * 10) / 10);
    }
    function formatDuration(ms, t) {
      if (typeof ms !== 'number' || !Number.isFinite(ms) || ms < 0) return null;
      if (ms < 1000) return fill(t('duration.milliseconds'), { milliseconds: String(Math.round(ms)) });
      const seconds = Math.round(ms / 1000);
      if (seconds < 60) return fill(t('duration.seconds'), { seconds: String(seconds) });
      return fill(t('duration.minutes'), { minutes: String(Math.floor(seconds / 60)), seconds: String(seconds % 60) });
    }
    function count(value) {
      return typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : 0;
    }
    function promptTokens(usage) {
      const read = count(usage.cacheReadTokens);
      const write = count(usage.cacheWriteTokens);
      const uncached = typeof usage.uncachedInputTokens === 'number' ? count(usage.uncachedInputTokens) : Math.max(0, count(usage.inputTokens) - read - write);
      return uncached + read + write;
    }
    function uncachedTokens(usage) {
      const read = count(usage.cacheReadTokens);
      const write = count(usage.cacheWriteTokens);
      return typeof usage.uncachedInputTokens === 'number' ? count(usage.uncachedInputTokens) : Math.max(0, count(usage.inputTokens) - read - write);
    }
    function cacheHitPercent(usage) {
      const prompt = promptTokens(usage);
      if (prompt === 0) return null;
      const read = count(usage.cacheReadTokens);
      if (read >= prompt) return '100';
      // Floor, so a partial hit never reads as a full one.
      return String(Math.floor((read * 100) / prompt));
    }
    // Floating panel placement. The plugin bundle may use react-dom (the shell
    // provides it), so the dialog is portaled out of the dock without being
    // clipped by the composer card.
    function useAnchorPosition(open, anchorRef, panelRef) {
      const [position, setPosition] = React.useState(null);
      React.useLayoutEffect(() => {
        if (!open) { setPosition(null); return undefined; }
        const place = () => {
          const anchor = anchorRef.current;
          const panel = panelRef.current;
          if (!anchor || !panel) return;
          const rect = anchor.getBoundingClientRect();
          const width = panel.offsetWidth || 300;
          const height = panel.offsetHeight || 0;
          const margin = 12;
          const gap = 8;
          let left = Math.min(Math.max(rect.left, margin), Math.max(margin, window.innerWidth - width - margin));
          let top = rect.top - gap - height;
          if (top < margin) top = Math.min(rect.bottom + gap, Math.max(margin, window.innerHeight - height - margin));
          setPosition({ left, top });
        };
        place();
        window.addEventListener('resize', place);
        window.addEventListener('scroll', place, true);
        const observer = typeof ResizeObserver === 'function' ? new ResizeObserver(place) : null;
        if (observer && panelRef.current) observer.observe(panelRef.current);
        return () => {
          window.removeEventListener('resize', place);
          window.removeEventListener('scroll', place, true);
          if (observer) observer.disconnect();
        };
      }, [open, anchorRef, panelRef]);
      return position;
    }
    function useDismiss(open, close, anchorRef, panelRef) {
      React.useEffect(() => {
        if (!open) return undefined;
        const onKey = event => { if (event.key === 'Escape') close(); };
        const onPointer = event => {
          const target = event.target;
          if (!(target instanceof Node)) return;
          if (anchorRef.current && anchorRef.current.contains(target)) return;
          if (panelRef.current && panelRef.current.contains(target)) return;
          close();
        };
        document.addEventListener('keydown', onKey);
        document.addEventListener('pointerdown', onPointer, true);
        return () => {
          document.removeEventListener('keydown', onKey);
          document.removeEventListener('pointerdown', onPointer, true);
        };
      }, [open, close, anchorRef, panelRef]);
    }
    function Pill({ stat, icon, text, label, title, titleValue, rows }) {
      const [open, setOpen] = React.useState(false);
      const close = React.useCallback(() => setOpen(false), []);
      const anchorRef = React.useRef(null);
      const panelRef = React.useRef(null);
      const position = useAnchorPosition(open, anchorRef, panelRef);
      useDismiss(open, close, anchorRef, panelRef);
      const body = [h(icon, { key: 'icon' }), h('span', { key: 'label', className: 'dshcb-label' }, label)];
      if (!rows.length) return h('span', { className: 'dshcb dshcb-' + stat, title: text }, body);
      return h(React.Fragment, null,
        h('button', { ref: anchorRef, type: 'button', className: 'dshcb dshcb-' + stat, title: open ? undefined : text, 'aria-haspopup': 'dialog', 'aria-expanded': open, 'aria-label': title + ' ' + text, onClick: () => setOpen(value => !value) }, body),
        open ? ReactDOM.createPortal(h('div', { ref: panelRef, className: 'dshcbd', role: 'dialog', 'aria-label': title, style: position ? { left: position.left + 'px', top: position.top + 'px' } : { left: '0px', top: '0px', visibility: 'hidden' } },
          h('div', { className: 'dshcbd-title' },
            h('span', { className: 'dshcbd-titleLabel' }, h(icon, null), title),
            titleValue ? h('span', { className: 'dshcbd-titleValue' }, titleValue) : null),
          h('div', { className: 'dshcbd-rule', 'aria-hidden': 'true' }),
          h('dl', { className: 'dshcbd-details' }, rows.map((row, index) => h(React.Fragment, { key: index }, h('dt', null, row.label), h('dd', null, row.value))))), document.body) : null);
    }
    function StatsCell({ useProjection, locale }) {
      React.useSyncExternalStore(locale.subscribe.bind(locale), locale.getSnapshot.bind(locale));
      const t = locale.bind(NS);
      const stats = useProjection('sessionStats');
      const nativeDrawn = useNativeDrawn();
      if (nativeDrawn) return null;
      const turns = count(stats && stats.turns);
      const steps = count(stats && stats.steps);
      if (steps === 0) return null;
      const counts = fill(t('stats.counts'), { turns, steps });
      const decodeMs = count(stats && stats.decodeMs);
      const speed = decodeMs > 0 ? formatSpeed(count(stats && stats.decodeTokens) / (decodeMs / 1e3)) : null;
      const text = speed ? counts + ' · ' + fill(t('stats.speed'), { tps: speed }) : counts;
      const rows = [];
      const llm = formatDuration(count(stats && stats.llmMs), t);
      if (llm) rows.push({ label: t('stats.llmTime'), value: llm });
      const tool = formatDuration(count(stats && stats.toolMs), t);
      if (tool) rows.push({ label: t('stats.toolTime'), value: tool });
      const ttftSteps = count(stats && stats.ttftSteps);
      const ttft = ttftSteps > 0 ? formatDuration(count(stats && stats.ttftMs) / ttftSteps, t) : null;
      if (ttft) rows.push({ label: t('stats.ttft'), value: ttft });
      if (speed) rows.push({ label: t('stats.speedRow'), value: fill(t('stats.speed'), { tps: speed }) });
      return h(Pill, { stat: 'stats', icon: GaugeIcon, text, label: text, title: t('stats.title'), titleValue: counts, rows });
    }
    function UsageCell({ useProjection, locale }) {
      React.useSyncExternalStore(locale.subscribe.bind(locale), locale.getSnapshot.bind(locale));
      const t = locale.bind(NS);
      const usage = useProjection('tokenUsage');
      const nativeDrawn = useNativeDrawn();
      if (nativeDrawn) return null;
      if (!usage) return null;
      const input = promptTokens(usage);
      const output = count(usage.outputTokens);
      if (input === 0 && output === 0) return null;
      const total = formatTokens(input + output);
      if (!total) return null;
      const percent = cacheHitPercent(usage);
      const tokensText = fill(t('usage.tokens'), { count: total });
      const text = percent === null ? tokensText : tokensText + ' · ' + fill(t('usage.cacheHit'), { percent });
      const rows = [];
      if (percent !== null) rows.push({ label: t('usage.cacheHitLabel'), value: percent + '%' });
      rows.push({ label: t('usage.input'), value: formatExact(uncachedTokens(usage)) });
      const cached = count(usage.cacheReadTokens);
      if (cached > 0) rows.push({ label: t('usage.cached'), value: formatExact(cached) });
      const written = count(usage.cacheWriteTokens);
      if (written > 0) rows.push({ label: t('usage.cacheWrite'), value: formatExact(written) });
      rows.push({ label: t('usage.output'), value: formatExact(output) });
      return h(Pill, { stat: 'usage', icon: DatabaseIcon, text, label: text, title: t('usage.title'), titleValue: formatExact(input + output), rows });
    }
    function Readout({ sessionId, useProjection, locale }) {
      React.useSyncExternalStore(locale.subscribe.bind(locale), locale.getSnapshot.bind(locale));
      const t = locale.bind(NS);
      const [data, setData] = React.useState(null);
      const [busy, setBusy] = React.useState(false);
      const [revision, setRevision] = React.useState(0);
      // Follows the model picker: switching the route re-queries immediately
      // instead of waiting 20 s for the next poll.
      const selection = typeof useProjection === 'function' ? useProjection('modelSelection') : undefined;
      const next = selection && (selection.next || selection.lastUsed);
      const routeKey = next && typeof next.provider === 'string' ? next.provider + '|' + (next.model || '') : '';
      React.useEffect(() => {
        let stopped = false;
        let active;
        let running = false;
        async function pull() {
          if (running || document.visibilityState === 'hidden') return;
          running = true;
          active = new AbortController();
          const timeout = setTimeout(() => active.abort(), 15000);
          setBusy(true);
          try {
            const response = await fetch('/plugins/dsh-bot-tokeninfo/status?sessionId=' + encodeURIComponent(sessionId), { signal: active.signal, credentials: 'same-origin', cache: 'no-store', redirect: 'error' });
            if (!response.ok) throw new Error('unavailable');
            const value = await response.json();
            if (!validate(value)) throw new Error('invalid-response');
            if (!stopped) setData(value);
          } catch (error) {
            const reason = error.message === 'invalid-response' ? 'invalid-response' : 'network';
            if (!stopped) setData(previous => previous?.updatedAt ? { ...previous, status: 'stale', reason } : { status: 'error', reason });
          } finally {
            clearTimeout(timeout);
            running = false;
            if (!stopped) setBusy(false);
          }
        }
        void pull();
        const timer = setInterval(pull, 20000);
        const visible = () => { if (document.visibilityState === 'visible') void pull(); };
        document.addEventListener('visibilitychange', visible);
        return () => { stopped = true; clearInterval(timer); active?.abort(); document.removeEventListener('visibilitychange', visible); };
      }, [sessionId, revision, routeKey]);
      const status = data?.status;
      const supportedData = status === 'ok' || status === 'stale';
      let text = t(!data ? 'loading' : status === 'unknown' ? 'unknown' : status === 'unsupported' ? 'unsupported' : 'error');
      if (supportedData) {
        const money = amount => amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        const amounts = (data.balances ?? []).map(item => `${item.currency === 'CNY' ? '¥' : item.currency === 'USD' ? '$' : item.currency + ' '}${money(item.amount)}`);
        const credits = typeof data.credits === 'number' && Number.isFinite(data.credits) ? `${data.credits.toLocaleString()} ${t('credits')}` : '';
        if (amounts.length) text = `${t('balance')} ${[amounts.join(' · '), credits].filter(Boolean).join(' · ')}`;
        else if (credits) text = credits;
      }
      const reason = data?.reason ? t(['unsupported', 'unknown'].includes(data.reason) ? 'reason.' + data.reason : data.reason) : '';
      const title = [t('refresh'), data?.label || data?.provider, data?.model, reason, data?.updatedAt ? `${t('updated')}: ${new Date(data.updatedAt).toLocaleString()}` : ''].filter(Boolean).join(String.fromCharCode(10));
      return h(React.Fragment, null,
        h('style', null, CSS),
        h('button', { type: 'button', className: 'dshcb dshcb-balance', title, 'aria-label': `${text}. ${title}`, 'aria-busy': busy, 'aria-disabled': busy, onClick: () => { if (!busy) setRevision(value => value + 1); } },
          h(WalletIcon, null),
          h('span', { className: 'dshcb-label', role: 'status', 'aria-live': 'polite', 'aria-atomic': true }, text, status === 'stale' ? ` · ${t('stale')}` : ''), busy ? h('span', { className: 'dshcb-busy', 'aria-hidden': true }, '↻') : null));
    }
    return {
      inject: ['slots', 'locale'],
      apply(ctx) {
        ctx.effect(() => ctx.locale.register(NS, 'en', dictionaries.en));
        ctx.effect(() => ctx.locale.register(NS, 'zh', dictionaries.zh));
        const locale = ctx.locale;
        ctx.slots.inject('conversation.composer.dock', () => ctx.slots.register({ name: 'conversation.composer.dock', id: 'channel-balance-stats', order: -2 }, props => props.sessionId ? h(StatsCell, { useProjection: props.useProjection, locale }) : null));
        ctx.slots.inject('conversation.composer.dock', () => ctx.slots.register({ name: 'conversation.composer.dock', id: 'channel-balance-usage', order: -1 }, props => props.sessionId ? h(UsageCell, { useProjection: props.useProjection, locale }) : null));
        ctx.slots.inject('conversation.composer.dock', () => ctx.slots.register({ name: 'conversation.composer.dock', id: 'channel-balance-readout', order: 2 }, props => props.sessionId ? h(Readout, { key: props.sessionId, sessionId: props.sessionId, useProjection: props.useProjection, locale }) : null));
      },
    };
  },
});
