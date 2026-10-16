importScripts('sites.js');

// URL-shape rules for the ad networks whose domains rotate every few hours.
// Applied only to tabs showing a page from sites.js, so they can't break other websites.
// The regexes avoid {n} repeats and a|b alternatives (Safari rejects both) and stay small
// (Chrome rejects any regex over 2KB compiled). One rejected rule makes the whole update fail.
const HOST12 = '[a-z0-9]'.repeat(12) + '[a-z0-9]*';
const HEX16 = '[0-9a-f]'.repeat(16);
const PATTERNS = [
  { urlFilter: '/cuid/?f=http' },
  { regexFilter: '/gd/[0-9]+\\?md=' },
  { regexFilter: '/sbx/[fb]/' },
  { regexFilter: '^https?://[a-z0-9.-]+\\.cfd/[a-z][a-z]?/' },
  { regexFilter: '^https?://[a-z0-9.-]+\\.cyou/[a-z][a-z]?/' },
  { regexFilter: '^https?://[a-z0-9.-]+\\.qpon/[a-z][a-z]?/' },
  { regexFilter: '^https?://[a-z][a-z]\\.[a-z]+\\.com/[A-Za-z0-9]+/[0-9][0-9][0-9][0-9][0-9][0-9]$', resourceTypes: ['script'] },
  { regexFilter: `^https?://${HOST12}\\.${HOST12}\\.[a-z]+/`, resourceTypes: ['script'] },
  { urlFilter: 'workers.dev/fetch?url=', resourceTypes: ['script'] },
  { regexFilter: `/${HEX16}[0-9a-f]*/invoke\\.js`, resourceTypes: ['script'] },
  { regexFilter: '/watch\\.[0-9]+\\.js\\?key=' },
  { regexFilter: `^https?://[^/]+/[0-9][0-9]?/${HEX16}` },
  { urlFilter: '/script/suurl5.php?' },
  { urlFilter: '/script/i.php?' },
  { urlFilter: '/script/iprp.php?' },
  { urlFilter: '/jump/next.php?' },
];
const rule = (c, i, scope) => ({
  id: i + 1,
  action: { type: 'block' },
  condition: { ...c, ...scope, domainType: 'thirdParty', isUrlFilterCaseSensitive: true },
});

if (location.protocol === 'safari-web-extension:') {
  // Safari has no per-tab rules, but its `domains` condition means "the page in the address
  // bar is one of these sites" (WebKit's if-domain), which covers embedded players too.
  // Dynamic rules survive restarts; re-synced whenever the extension (re)loads.
  chrome.declarativeNetRequest.getDynamicRules().then(old => chrome.declarativeNetRequest.updateDynamicRules({
    removeRuleIds: old.map(r => r.id),
    addRules: BLOCK_SITES.length ? PATTERNS.map((c, i) => rule(c, i, { domains: BLOCK_SITES })) : [],
  })).catch(console.error);
} else {
  const onSite = url => {
    try {
      const h = new URL(url).hostname;
      return BLOCK_SITES.some(s => h === s || h.endsWith('.' + s));
    } catch { return false; }
  };

  // The set of covered tabs lives in the session rules themselves, so it survives the
  // service worker being shut down. Updates are queued so two tabs can't race.
  let queue = Promise.resolve();
  const setTab = (tabId, on) => (queue = queue.then(async () => {
    const rules = await chrome.declarativeNetRequest.getSessionRules();
    const tabs = new Set(rules[0]?.condition.tabIds || []);
    if (tabs.has(tabId) === on) return;
    on ? tabs.add(tabId) : tabs.delete(tabId);
    await chrome.declarativeNetRequest.updateSessionRules({
      removeRuleIds: rules.map(r => r.id),
      addRules: tabs.size ? PATTERNS.map((c, i) => rule(c, i, { tabIds: [...tabs] })) : [],
    });
  }).catch(console.error));

  chrome.webNavigation.onBeforeNavigate.addListener(d => { if (d.frameId === 0) setTab(d.tabId, onSite(d.url)); });
  chrome.tabs.onRemoved.addListener(tabId => setTab(tabId, false));
}
