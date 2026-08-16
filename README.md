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
4. Open Highlighty's options page to configure phrase lists, then visit an HTTP or HTTPS page
   and use the extension button or configured shortcut.

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
- [jQuery](https://jquery.com/)
  - JavaScript extension library
- [Hilitor.js](https://www.the-art-of-web.com/javascript/search-highlight/)
  - Keyword highlighting library
- [TypeScript](https://www.typescriptlang.org/) and
  [esbuild](https://esbuild.github.io/)
  - Typed extension source and the unpacked-extension build

## Contributing

Contribution guidelines tbd! Check out the Issues log and message Stephen if you have any questions.
