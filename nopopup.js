// Runs in every frame, before any page script. Only acts when the tab's top-level site is
// listed in sites.js. Then it:
//   1. makes window.open() do nothing - how pop-up / pop-under ads open their tabs,
//      both from the page and from embedded players inside it
//   2. cancels plain links to another site that would open in a new tab (target="_blank") -
//      some sites make their own play button such a link to an ad page. Only the new tab is
//      cancelled; the site's click handlers still run.
//   3. hides banner slots, fake player buttons and invisible full-page click-catchers
(() => {
  const sites = self.BLOCK_SITES;
  delete self.BLOCK_SITES;
  const a = location.ancestorOrigins;
  let site;
  try { site = new URL(a && a.length ? a[a.length - 1] : location.origin).hostname; } catch { return; }
  if (!sites.some(s => site === s || site.endsWith('.' + s))) return;

  // Self-contained: it may be turned into text and run inside the page (see below).
  const protect = site => {
    const noOpen = () => null;
    Object.defineProperty(window, 'open', { value: noOpen, writable: false, configurable: false });
    // Ad scripts grab a clean window.open from a blank helper iframe. Chrome also runs this
    // file in such frames, Safari doesn't - so patch them as soon as they're touched.
    const cw = Object.getOwnPropertyDescriptor(HTMLIFrameElement.prototype, 'contentWindow');
    Object.defineProperty(HTMLIFrameElement.prototype, 'contentWindow', {
      ...cw,
      get() {
        const w = cw.get.call(this);
        try { if (w && w.open !== noOpen) Object.defineProperty(w, 'open', { value: noOpen }); } catch {} // other-site frame
        return w;
      },
    });

    const ours = h => h === site || h.endsWith('.' + site) || h === location.hostname;
    const adLink = a => {
      if (!a || !a.href || !a.target || /^_(self|top|parent)$/i.test(a.target)) return false;
      try { return !ours(new URL(a.href, location.href).hostname); } catch { return false; }
    };
    addEventListener('click', e => {
      if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return; // deliberate new-tab clicks
      if (adLink(e.target.closest?.('a[href]'))) e.preventDefault();
    }, true);
    // Ad scripts also click links that were never added to the page (a.click() or a synthetic
    // click event), so the click above never reaches window. Cancel those at the link itself.
    const guard = a => { if (adLink(a)) a.addEventListener('click', e => e.preventDefault(), { once: true, capture: true }); };
    const click = HTMLAnchorElement.prototype.click;
    HTMLAnchorElement.prototype.click = function () { guard(this); return click.call(this); };
    const dispatch = EventTarget.prototype.dispatchEvent;
    EventTarget.prototype.dispatchEvent = function (e) {
      if (this instanceof HTMLAnchorElement && e.type === 'click') guard(this);
      return dispatch.call(this, e);
    };

    const css = new CSSStyleSheet();
    css.replaceSync(`
      .banner_wrapper, .banner-sidebar, #mobile-banner, [data-ad-slot],
      [data-nume="fake"], .display-fake, #fakeplayer, #playernotice,
      body > div[style*="z-index: 2147483647"],
      body > a[target="_blank"][style*="position: fixed"] { display: none !important; }`);
    document.adoptedStyleSheets = [...document.adoptedStyleSheets, css];
  };

  // Chrome and Brave run this file in the page's own JS world (manifest "world": "MAIN").
  // A browser that runs it in the extension's isolated world instead (Safari may) has a
  // separate window.open there, so hand protect() to the page as a <script>.
  if (globalThis.browser?.runtime?.id || globalThis.chrome?.runtime?.id) {
    const s = document.createElement('script');
    s.textContent = `(${protect})(${JSON.stringify(site)})`;
    document.documentElement.append(s);
    s.remove();
  } else {
    protect(site);
  }
})();
