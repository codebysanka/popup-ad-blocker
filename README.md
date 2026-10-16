# Popup & Ad Blocker

A small Chrome / Brave extension (Manifest V3) that stops pop-up and pop-under tabs and blocks ad
scripts on the websites you choose, including ads that run inside video players embedded in those
sites.

Tested in **Brave** and **Chrome**. Other Chromium browsers such as Edge, Opera and Vivaldi should
work too, but haven't been tested.

## What it does

| | Where it applies |
|---|---|
| **Stops pop-up and pop-under tabs.** Pages can no longer open new windows with `window.open()`. | Sites in `sites.js`, plus every frame inside them |
| **Stops "ad link" buttons.** A click on a link that would open a *different* site in a new tab is cancelled. The site's own click handling still runs, so a play button that is secretly an ad link still starts the video. Cmd/Ctrl/Shift-click still open links on purpose. | Sites in `sites.js` |
| **Blocks ad scripts by URL pattern.** Catches ad networks that change their domain names every few hours. | Tabs showing a site from `sites.js` |
| **Blocks known ad, pop-under and tracker domains.** | Every website |
| **Hides banner slots, fake player buttons and invisible full-page click traps.** | Sites in `sites.js` |

Sites that are not in `sites.js` are left alone, apart from the known-ad-domain list.

## Install

1. **Get the files.** Either:
   - click **Code → Download ZIP** on this page and unzip it, or
   - clone it:
     ```bash
     git clone https://github.com/codebysanka/popup-ad-blocker.git
     ```
   Keep the folder somewhere permanent. The browser loads the extension from it every time it starts.
2. **Add your sites.** Open `sites.js` in any text editor and list the domains to protect:
   ```js
   self.BLOCK_SITES = ['example.com', 'another-site.net'];
   ```
   Use just the domain: no `https://`, no paths. Subdomains are included automatically.
3. **Open the extensions page:**
   - Brave: `brave://extensions`
   - Chrome: `chrome://extensions`
4. Turn on **Developer mode** (top-right switch).
5. Click **Load unpacked** and select the `popup-ad-blocker` folder, the one that contains
   `manifest.json`. On macOS, press **Cmd + Shift + G** in the file picker to paste a path.
6. A **Popup & Ad Blocker** card appears with its switch on. Done.

The browser will warn that the extension can *"read and change all your data on all websites"*.
It needs that access because embedded video players come from many different domains. On sites
that are not in `sites.js` its scripts exit immediately and do nothing.

## Everyday use

- **Add or remove a site:** edit `sites.js`, then click the **reload arrow** on the extension's card.
- **Update after a `git pull`:** click the reload arrow on the card.
- **Pause it:** use the switch on the card. **Remove** uninstalls it; your folder stays.
- Keep Brave Shields on. They work alongside this extension.

## Troubleshooting

| Problem | What to do |
|---|---|
| A pop-up still opens | Check the site is in `sites.js` and that you reloaded the extension. Then note the URL the new tab opens: if it's a new ad domain, add it to `rules.json` (see below). |
| The card shows a red **Errors** button | Click it. A typo in `sites.js` (missing quote or comma) is the usual cause. |
| A site broke | Remove it from `sites.js` and reload the extension to confirm the extension caused it. |
| A link you wanted won't open | Cmd-click (Mac) or Ctrl-click (Windows) it to open it in a new tab on purpose. |

## Updating the block lists

Ad networks rotate their domains, so the lists need occasional refreshing.

- **Known ad domains:** in `rules.json`, the `requestDomains` array of rule 1. Add bare domains;
  subdomains are blocked too.
- **URL patterns:** the `PATTERNS` array in `background.js`.
  - Chrome rejects any regular expression bigger than 2 KB once compiled. One rejected rule stops
    *all* of the pattern rules from installing.
  - Keep repeats short (`{16}`, not `{32}`) and test new patterns in the extension's service-worker
    console:
    ```js
    chrome.declarativeNetRequest.isRegexSupported({ regex: '...', isCaseSensitive: true })
    ```
- After any change, click the reload arrow on the extension's card.

## Files

| File | Purpose |
|---|---|
| `manifest.json` | Extension definition |
| `sites.js` | **Your** list of protected sites, the only file most people edit |
| `nopopup.js` | Runs inside the protected pages: blocks `window.open`, cancels ad links, hides ad elements |
| `background.js` | Turns the URL-pattern rules on for tabs showing a protected site |
| `rules.json` | Known ad / pop-under / tracker domains, blocked everywhere |

## Limitations

- On the very first page opened in a new tab, a few ad scripts may load before the pattern rules
  switch on. Pop-ups are still blocked.
- Ads served from the site's own domain or from inside the video stream itself can't be removed
  without breaking the site.
- Not published on the Chrome Web Store. Load it unpacked as described above.
