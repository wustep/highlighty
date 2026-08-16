# Highlighty

Web extension to highlight phrases from given lists.

## Extension

- [Chrome Web Store](https://chrome.google.com/webstore/detail/highlighty/nfpmjbgochfndeckobojgdbihjdbhnhl)
- Firefox and other versions coming later!

## Development

The extension runs directly from `src/`; no build step or bundler is required.

1. Open `chrome://extensions`.
2. Enable **Developer mode**.
3. Choose **Load unpacked** and select this repository's `src` directory.
4. Open Highlighty's options page to configure phrase lists, then visit an HTTP or HTTPS page
   and use the extension button or configured shortcut.

Install the development dependency and run the automated checks with:

```sh
npm install
npm test
npm run check
```

The tests use Node's built-in test runner and exercise the pure helpers in `src/modules`.

## Tech

- [WebExtensions](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions)
  - Cross-platform specification for browser extensions for Chrome, Firefox, Opera, etc.
- [Bulma.css](https://bulma.io/)
  - Modern CSS framework based on flexbox
- [jQuery](https://jquery.com/)
  - JavaScript extension library
- [Hilitor.js](https://www.the-art-of-web.com/javascript/search-highlight/)
  - Keyword highlighting library

## Contributing

Contribution guidelines tbd! Check out the Issues log and message Stephen if you have any questions.
