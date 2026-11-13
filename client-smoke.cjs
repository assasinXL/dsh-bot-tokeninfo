// Smoke test for the browser bundle. It evaluates client.js against stub
// React/DOM globals, so a typo or a missing helper fails here instead of
// leaving the dock blank after a page refresh. Run: node client-smoke.cjs
const fs = require('fs');
const path = require('path');

const noop = () => {};
const chain = () => noop;

function evaluate(forceOpen) {
  const React = {
    Fragment: Symbol('Fragment'),
    createElement(type, props, ...children) {
      return { type, props: { ...(props || {}), children: children.length > 1 ? children : children[0] } };
    },
    useState: initial => [forceOpen && initial === false ? true : typeof initial === 'function' ? initial() : initial, noop],
    useRef: () => ({ current: null }),
    useCallback: fn => fn,
    useMemo: fn => fn(),
    useEffect: () => undefined,
    useLayoutEffect: () => undefined,
    useSyncExternalStore: (subscribe, get) => get(),
  };
  const ReactDOM = { createPortal: node => node };
  const documentStub = {
    visibilityState: 'visible',
    body: {},
    createElement: () => ({ style: {} }),
    querySelector: () => null,
    addEventListener: chain(),
    removeEventListener: chain(),
  };
  const windowStub = {
    __ModuleLoader__: { load(def) { windowStub.def = def; } },
    addEventListener: chain(),
    removeEventListener: chain(),
    innerWidth: 1200,
    innerHeight: 800,
  };

  const source = fs.readFileSync(path.join(__dirname, 'client.js'), 'utf8');
  new Function('window', 'document', 'MutationObserver', source)(
    windowStub,
    documentStub,
    class { observe() {} disconnect() {} },
  );

  const def = windowStub.def;
  if (!def || def.id !== 'dsh-bot-tokeninfo') throw new Error('loader registration missing');
  const rendered = new Map();
  const ctx = {
    effect: fn => fn(),
    locale: {
      register: () => noop,
      subscribe: () => noop,
      getSnapshot: () => 'zh',
      bind: () => key => '<' + key + '>',
    },
    slots: {
      inject: (name, register) => { register(); return noop; },
      register: (options, component) => { rendered.set(options.id, component); return noop; },
    },
  };
  def.factory(name => {
    if (name === 'react') return React;
    if (name === 'react-dom') return ReactDOM;
    throw new Error('unexpected require: ' + name);
  }).apply(ctx);

  const projections = {
    modelSelection: { lastUsed: { provider: 'workbuddy', model: 'm1' }, next: { provider: 'deepseek-account', model: 'deepseek-flash' } },
    sessionStats: { turns: 7, steps: 367, llmMs: 512000, toolMs: 90000, ttftMs: 5000, ttftSteps: 10, decodeMs: 60000, decodeTokens: 9000 },
    tokenUsage: { inputTokens: 4000, cacheReadTokens: 3000, cacheWriteTokens: 500, outputTokens: 1200 },
  };
  const props = { sessionId: 's', useProjection: key => projections[key] };
  const resolve = (tree, depth = 0) => {
    if (!tree) return tree;
    if (typeof tree.type === 'function' && depth < 3) return resolve(tree.type(tree.props), depth + 1);
    return tree;
  };
  const out = {};
  for (const [id, component] of rendered) {
    const tree = resolve(component(props));
    if (!tree) throw new Error(id + ' rendered nothing');
    out[id] = tree;
  }
  return { React, out };
}

const closed = evaluate(false);
for (const id of ['channel-balance-stats', 'channel-balance-usage', 'channel-balance-readout']) {
  if (!(id in closed.out)) throw new Error('missing dock entry: ' + id);
}
const statsPill = closed.out['channel-balance-stats'];
if (statsPill.type !== closed.React.Fragment) throw new Error('stats pill is not a dialog pill');
const statsButton = statsPill.props.children[0];
if (statsButton.props['aria-haspopup'] !== 'dialog') throw new Error('stats trigger lacks dialog semantics');
if (statsButton.props['aria-expanded'] !== false) throw new Error('stats trigger reports expanded while closed');
const statsLabel = statsButton.props.children[1].props.children;
if (!String(statsLabel).includes('<stats.counts>')) throw new Error('stats label broken: ' + statsLabel);

const usagePill = closed.out['channel-balance-usage'];
const usageButton = usagePill.props.children[0];
if (!String(usageButton.props.children[1].props.children).includes('<usage.cacheHit>')) throw new Error('usage label broken');

const readout = closed.out['channel-balance-readout'];
const readoutChildren = readout.props.children;
const balance = readoutChildren[readoutChildren.length - 1];
if (balance.props.className !== 'dshcb dshcb-balance') throw new Error('readout class broken: ' + balance.props.className);

const open = evaluate(true);
const openStats = open.out['channel-balance-stats'];
const panel = openStats.props.children[1];
if (!panel || panel.props.role !== 'dialog') throw new Error('dialog panel missing when open');
if (panel.props['aria-label'] !== undefined && panel.props['aria-label'] !== '<stats.title>') throw new Error('dialog label broken');
const rows = panel.props.children[2].props.children;
if (!Array.isArray(rows) || rows.length < 4) throw new Error('dialog rows missing');

console.log('ok', {
  ids: Object.keys(closed.out),
  stats: String(statsLabel),
  usage: String(usageButton.props.children[1].props.children),
  dialogRows: rows.length,
});
