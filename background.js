importScripts('sites.js');

// URL-shape rules for the ad networks whose domains rotate every few hours.
// Applied only to tabs showing a page from sites.js, so they can't break other websites.
// Matched case-sensitively: Chrome rejects any regex over 2KB compiled, and case-insensitive
// repeats like {20} blow past that. One rejected rule makes the whole update fail.
const PATTERNS = [
  { urlFilter: '/cuid/?f=http' },
  { regexFilter: '/gd/[0-9]{5,6}\\?md=' },
  { regexFilter: '/sbx/[fb]/' },
  { regexFilter: '^https?://[^/]+\\.(cfd|cyou|qpon)/(cx|f|lp|sbx|gd|cuid)/' },
  { regexFilter: '^https?://[a-z]{2}\\.[a-z]+\\.com/[A-Za-z0-9]{12,16}/[0-9]{6}$', resourceTypes: ['script'] },
  { regexFilter: '^https?://[a-z0-9]{12}[a-z0-9]*\\.[a-z0-9]{12}[a-z0-9]*\\.[a-z]+/', resourceTypes: ['script'] },
  { urlFilter: 'workers.dev/fetch?url=', resourceTypes: ['script'] },
  { regexFilter: '/[0-9a-f]{32}/invoke\\.js', resourceTypes: ['script'] },
  { regexFilter: '/watch\\.[0-9]+\\.js\\?key=' },
  { regexFilter: '^https?://[^/]+/(3|4|5|9|17|20)/[0-9a-f]{16}' },
  { regexFilter: '/script/(suurl5|i|iprp)\\.php\\?' },
  { regexFilter: '/jump/next\\.php\\?' },
];

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
    addRules: tabs.size ? PATTERNS.map((c, i) => ({
      id: i + 1,
      action: { type: 'block' },
      condition: { ...c, tabIds: [...tabs], domainType: 'thirdParty', isUrlFilterCaseSensitive: true },
    })) : [],
  });
}).catch(console.error));

chrome.webNavigation.onBeforeNavigate.addListener(d => { if (d.frameId === 0) setTab(d.tabId, onSite(d.url)); });
chrome.tabs.onRemoved.addListener(tabId => setTab(tabId, false));
