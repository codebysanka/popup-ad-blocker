// Runs in the page's own JS world, in every frame, before any page script.
// Only acts when the tab's top-level site is listed in sites.js. Then it:
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

  Object.defineProperty(window, 'open', { value: () => null, writable: false, configurable: false });

  const ours = h => h === site || h.endsWith('.' + site) || h === location.hostname;
  addEventListener('click', e => {
    if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return; // deliberate new-tab clicks
    const link = e.target.closest?.('a[href]');
    if (!link || !link.target || /^_(self|top|parent)$/i.test(link.target)) return;
    let h; try { h = new URL(link.href, location.href).hostname; } catch { return; }
    if (!ours(h)) e.preventDefault();
  }, true);

  const css = new CSSStyleSheet();
  css.replaceSync(`
    .banner_wrapper, .banner-sidebar, #mobile-banner, [data-ad-slot],
    [data-nume="fake"], .display-fake, #fakeplayer, #playernotice,
    body > div[style*="z-index: 2147483647"],
    body > a[target="_blank"][style*="position: fixed"] { display: none !important; }`);
  document.adoptedStyleSheets = [...document.adoptedStyleSheets, css];
})();
