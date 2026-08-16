# Highlighty

Web extension to highlight phrases from given lists.

## Extension

- [Chrome Web Store](https://chrome.google.com/webstore/detail/highlighty/nfpmjbgochfndeckobojgdbihjdbhnhl)
- Firefox and other versions coming later!

## Development

The extension source is TypeScript. Build it into the unpacked `dist/` directory before loading it
in Chrome:

```sh
npm install
npm run build
```

1. Open `chrome://extensions`.
2. Enable **Developer mode**.
3. Choose **Load unpacked** and select this repository's `dist` directory.
4. Open Highlighty's options page to configure phrase lists, then visit an HTTP, HTTPS, or local
   file page and use the extension button or configured shortcut. Local files also require
   **Allow access to file URLs** in Highlighty's details on `chrome://extensions`.

Chrome blocks extension injection on browser-owned pages such as `chrome://` URLs and the Chrome
Web Store. The built-in PDF viewer can also reject injection; Highlighty reports these cases with a
red action icon and `!` badge instead of silently doing nothing.

When the same phrase belongs to multiple enabled lists, Highlighty creates one mark with a stable
diagonal stripe for each list (in list order) and a tooltip naming every matching list. For
different phrases that overlap, the longest phrase wins.

Run the automated tests, formatting check, and TypeScript check with:

```sh
npm test
npm run check
```

The tests run against the TypeScript helpers in `src/modules`.

## Tech

- [WebExtensions](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions)
  - Cross-platform specification for browser extensions for Chrome, Firefox, Opera, etc.
- [Bulma.css](https://bulma.io/)
  - Modern CSS framework based on flexbox
- [DOM APIs](https://developer.mozilla.org/en-US/docs/Web/API/Document_Object_Model)
  - Native browser APIs for options-page interactions
- [Hilitor.js](https://www.the-art-of-web.com/javascript/search-highlight/)
  - Keyword highlighting library
- [TypeScript](https://www.typescriptlang.org/) and
  [esbuild](https://esbuild.github.io/)
  - Typed extension source and the unpacked-extension build

## Contributing

Contribution guidelines tbd! Check out the Issues log and message Stephen if you have any questions.
