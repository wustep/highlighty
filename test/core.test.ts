const test = require('node:test');
const assert = require('node:assert/strict');

const {
  addUniquePhrases,
  isPhraseListEnabled,
  normalizeListEnabled,
  normalizePhrases,
  sortPhrases,
  sortStoredPhraseLists,
} = require('../src/modules/phrase-lists.ts');
const {
  buildPhraseRegExp,
  escapePhrase,
  prepareHilitorOptions,
} = require('../src/modules/matching.ts');
const {
  isAllowedURL,
  isURLAllowedForPhraseList,
  normalizeURLPhrases,
  urlMatchesAny,
  urlMatchesPattern,
} = require('../src/modules/urls.ts');
const { getDelimitedPhrases, parseBulkImport } = require('../src/modules/import-export.ts');
const { getTextColor, hexClean, rgbaStringToHex, rgbaToHex } = require('../src/modules/colors.ts');
const { normalizeOptions, normalizePhraseLists } = require('../src/modules/storage.ts');
const { validateStyleDeclarations } = require('../src/modules/styles.ts');
const { isEditableTarget } = require('../src/modules/keyboard.ts');

test('phrases are trimmed and empty or duplicate values are removed', () => {
  assert.deepEqual(normalizePhrases([' hello ', '', 'hello', 'world', 42, '  ']), [
    'hello',
    'world',
  ]);
});

test('adding phrases reports exact duplicates while preserving unique order', () => {
  assert.deepEqual(addUniquePhrases(['one'], [' two ', 'one', 'two', '', 'three']), {
    phrases: ['one', 'two', 'three'],
    added: 2,
    skipped: 2,
  });
});

test('line imports trim empty phrases but preserve duplicates for skip reporting', () => {
  assert.deepEqual(getDelimitedPhrases(' one \n\none\n two ', 'Line-Delimited'), [
    'one',
    'one',
    'two',
  ]);
});

test('Hilitor input escapes phrases instead of treating them as regular expressions', () => {
  assert.equal(escapePhrase('a+b (test)'), 'a\\+b \\(test\\)');
  const regex = buildPhraseRegExp(['a+b'], { caseSensitive: false, partialMatch: true });
  assert.equal(regex.test('A+B'), true);
  assert.equal(regex.test('aaab'), false);
});

test('Hilitor input respects case sensitivity and whole-word matching', () => {
  const insensitive = buildPhraseRegExp(['Lorem'], {
    caseSensitive: false,
    partialMatch: false,
  });
  const sensitive = buildPhraseRegExp(['Lorem'], {
    caseSensitive: true,
    partialMatch: false,
  });
  const partial = buildPhraseRegExp(['Lor'], { caseSensitive: false, partialMatch: true });
  const whole = buildPhraseRegExp(['Lor'], { caseSensitive: false, partialMatch: false });

  assert.equal(insensitive.test('lorem'), true);
  assert.equal(sensitive.test('lorem'), false);
  assert.equal(partial.test('Lorem'), true);
  assert.equal(whole.test('Lorem'), false);
  assert.equal(buildPhraseRegExp(['C++']).test('Use C++ here'), true);
  assert.equal(buildPhraseRegExp(['#tag']).test('Use #tag here'), true);
  assert.equal(buildPhraseRegExp(['cafe\u0301']).test('Try cafe\u0301 today'), true);
  assert.equal(buildPhraseRegExp(['New', 'New York']).exec('New York')[0], 'New York');
  assert.deepEqual(
    prepareHilitorOptions({ enableCaseInsensitive: true, enablePartialMatch: false }),
    { caseSensitive: false, partialMatch: false },
  );
});

test('URL patterns match exact hosts without matching hostname substrings', () => {
  assert.equal(urlMatchesPattern('https://example.com/articles/1', 'example.com'), true);
  assert.equal(urlMatchesPattern('https://www.example.com/articles/1', 'example.com'), false);
  assert.equal(urlMatchesPattern('https://www.example.com/articles/1', 'www.example.com'), true);
  assert.equal(urlMatchesPattern('https://www.example.com/articles/1', '*.example.com'), true);
  assert.equal(urlMatchesPattern('https://deep.www.example.com/', '*.example.com'), true);
  assert.equal(urlMatchesPattern('https://example.com/', '*.example.com'), false);
  assert.equal(urlMatchesPattern('https://notexample.com/', 'example.com'), false);
  assert.equal(urlMatchesPattern('https://example.com.evil/', 'example.com'), false);
  assert.equal(urlMatchesPattern('https://example.com/', 'com'), false);
});

test('URL patterns support segment-aware host and bare path prefixes', () => {
  assert.equal(urlMatchesPattern('https://example.com/blog', 'example.com/blog'), true);
  assert.equal(urlMatchesPattern('https://example.com/blog/post', 'example.com/blog'), true);
  assert.equal(urlMatchesPattern('https://example.com/blogging', 'example.com/blog'), false);
  assert.equal(urlMatchesPattern('https://other.example/foo', '/foo'), true);
  assert.equal(urlMatchesPattern('https://other.example/foo/bar', '/foo'), true);
  assert.equal(urlMatchesPattern('https://other.example/foobar', '/foo'), false);
});

test('invalid URLs and patterns fail closed', () => {
  assert.equal(urlMatchesPattern('not a URL', 'example.com'), false);
  assert.equal(urlMatchesPattern('file:///tmp/example.com', '/tmp'), false);
  assert.equal(urlMatchesPattern('https://example.com/', ''), false);
  assert.equal(urlMatchesPattern('https://example.com/', 'https://example.com'), false);
  assert.equal(urlMatchesPattern('https://example.com/', 'example'), false);
  assert.equal(urlMatchesPattern('https://example.com/', 'example.com?query'), false);
  assert.equal(urlMatchesPattern('https://example.com/', 'example.com/%zz'), false);
});

test('URL allowlist and denylist use normalized non-empty patterns', () => {
  const url = 'https://example.com/articles/1';
  assert.equal(urlMatchesAny(url, [' example.com ', '']), true);
  assert.deepEqual(normalizeURLPhrases(['', ' example.com ', 'example.com']), ['example.com']);
  assert.equal(
    isAllowedURL(url, {
      enableURLAllowlist: true,
      allowlist: ['example.com'],
      enableURLDenylist: false,
      denylist: [],
    }),
    true,
  );
  assert.equal(
    isAllowedURL(url, {
      enableURLAllowlist: true,
      allowlist: ['example.com'],
      enableURLDenylist: true,
      denylist: ['/articles/'],
    }),
    false,
  );
  assert.equal(
    isAllowedURL(url, {
      enableURLAllowlist: true,
      allowlist: [''],
      enableURLDenylist: false,
    }),
    false,
  );
});

test('global and phrase-list URL filters compose with denylist precedence', () => {
  const articleURL = 'https://example.com/articles/1';
  const globalAllow = {
    enableURLAllowlist: true,
    allowlist: ['example.com'],
    enableURLDenylist: false,
    denylist: [],
  };
  const globallyBlocked = {
    enableURLAllowlist: false,
    allowlist: [],
    enableURLDenylist: true,
    denylist: ['example.com'],
  };
  const listRuns = (url, options, list) =>
    isAllowedURL(url, options) && isURLAllowedForPhraseList(url, list);

  assert.equal(isURLAllowedForPhraseList(articleURL, {}), true);
  assert.equal(isURLAllowedForPhraseList(articleURL, { allowlist: [], denylist: [] }), true);
  assert.equal(
    isURLAllowedForPhraseList(articleURL, {
      allowlist: [' example.com '],
      denylist: [],
    }),
    true,
  );
  assert.equal(
    isURLAllowedForPhraseList(articleURL, {
      allowlist: ['other.example'],
      denylist: [],
    }),
    false,
  );
  assert.equal(listRuns(articleURL, globallyBlocked, { allowlist: ['example.com'] }), false);
  assert.equal(listRuns(articleURL, globalAllow, { denylist: ['/articles'] }), false);
  assert.equal(listRuns(articleURL, globalAllow, { allowlist: ['example.com'] }), true);
  assert.equal(listRuns(articleURL, globalAllow, { allowlist: ['other.example'] }), false);
});

test('bulk import parses and normalizes a valid export', () => {
  const lists = parseBulkImport(
    JSON.stringify([
      {
        title: ' Work ',
        color: '#ffffff',
        phrases: [' Alpha ', '', 'Alpha', 'Beta'],
        toggled: false,
        styles: 'text-decoration: underline; ',
      },
    ]),
  );
  assert.deepEqual(lists, [
    {
      title: 'Work',
      color: '#ffffff',
      textColor: '#000000',
      phrases: ['Alpha', 'Beta'],
      enabled: false,
      styles: 'text-decoration: underline;',
      allowlist: [],
      denylist: [],
    },
  ]);
});

test('bulk import validates and normalizes per-list URL filters', () => {
  const [list] = parseBulkImport(
    JSON.stringify([
      {
        title: 'Scoped',
        color: '#112233',
        phrases: ['term'],
        allowlist: [' docs.example.com ', '', 'docs.example.com'],
        denylist: [' /private '],
      },
    ]),
  );
  assert.deepEqual(list.allowlist, ['docs.example.com']);
  assert.deepEqual(list.denylist, ['/private']);
  assert.throws(
    () =>
      parseBulkImport('[{"title":"Bad","color":"#ffffff","phrases":[],"allowlist":"example.com"}]'),
    /allowlist.*array/,
  );
  assert.throws(
    () => parseBulkImport('[{"title":"Bad","color":"#ffffff","phrases":[],"denylist":["ok",42]}]'),
    /denylist.*only strings/,
  );
});

test('bulk import rejects empty JSON, bad property types, and unsafe CSS', () => {
  assert.throws(() => parseBulkImport(''), /Nothing to import/);
  assert.throws(() => parseBulkImport('not json'), /not valid JSON/);
  assert.throws(() => parseBulkImport('{}'), /non-empty array/);
  assert.throws(
    () => parseBulkImport('[{"title":"Bad","color":"#ffffff","phrases":"no"}]'),
    /phrases.*array/,
  );
  assert.throws(
    () =>
      parseBulkImport(
        '[{"title":"Bad","color":"#ffffff","phrases":[],"styles":"background:url(x)"}]',
      ),
    /unsafe CSS/,
  );
});

test('color helpers choose contrast colors and convert clean hex values', () => {
  assert.equal(getTextColor('#ffffff'), '#000000');
  assert.equal(getTextColor('#000000'), '#ffffff');
  assert.equal(hexClean('#aabbccff'), '#aabbcc');
  assert.equal(hexClean('#aabbcc80'), '#aabbcc80');
  assert.equal(rgbaToHex([187, 0, 0, 1]), '#bb0000');
  assert.equal(rgbaStringToHex('rgba(187, 0, 0, 0.5)'), '#bb000080');
  assert.equal(rgbaStringToHex('rgb(187, 0, 0)'), '#bb0000');
});

test('legacy list toggles normalize to enabled without losing false', () => {
  assert.equal(isPhraseListEnabled({}), true);
  assert.equal(isPhraseListEnabled({ toggled: false }), false);
  assert.equal(isPhraseListEnabled({ enabled: true, toggled: false }), true);
  assert.equal(normalizeListEnabled({ toggled: false }), false);
  assert.equal(normalizeListEnabled({ enabled: true, toggled: false }), true);

  const [list] = normalizePhraseLists([
    { title: 'Legacy', color: 'purple', phrases: [' one ', 'one'], toggled: false },
  ]);
  assert.equal(list.enabled, false);
  assert.equal('toggled' in list, false);
  assert.deepEqual(list.phrases, ['one']);
  assert.deepEqual(list.allowlist, []);
  assert.deepEqual(list.denylist, []);
});

test('stored options receive missing defaults and unsafe legacy styles are removed', () => {
  const options = normalizeOptions({
    highlighter: [
      {
        title: 'Existing',
        color: '#112233',
        phrases: ['phrase'],
        styles: 'color:red;} body {display:none',
        allowlist: [' docs.example.com ', '', 'docs.example.com'],
        denylist: 'invalid legacy value',
      },
    ],
  });
  assert.equal(options.enablePhraseNavigator, false);
  assert.equal(options.enableQuickSearch, false);
  assert.equal(options.sorting, 'None');
  assert.equal(options.highlighter[0].styles, '');
  assert.deepEqual(options.highlighter[0].allowlist, ['docs.example.com']);
  assert.deepEqual(options.highlighter[0].denylist, []);
  assert.equal(normalizeOptions(null).keyboardShortcut, 'F6');
  assert.equal(normalizeOptions({ enableQuickSearch: 'false' }).enableQuickSearch, false);
});

test('style declaration validation rejects rule and resource injection', () => {
  assert.equal(validateStyleDeclarations('font-weight: bold; color: red;'), true);
  for (const unsafe of [
    'color:red;} body {display:none',
    '@import "bad.css";',
    'background: url(https://example.com/x)',
    'width: expression(alert(1))',
    'color: red; /*',
    '<style>body{display:none}</style>',
  ]) {
    assert.equal(validateStyleDeclarations(unsafe), false, unsafe);
  }
});

test('page shortcuts ignore editable controls', () => {
  assert.equal(isEditableTarget({ tagName: 'INPUT', isContentEditable: false }), true);
  assert.equal(isEditableTarget({ tagName: 'TEXTAREA', isContentEditable: false }), true);
  assert.equal(isEditableTarget({ tagName: 'DIV', isContentEditable: true }), true);
  assert.equal(isEditableTarget({ tagName: 'BUTTON', isContentEditable: false }), false);
});

test('sorting supports A-Z, Z-A, and Off without mutating display inputs', () => {
  const phrases = ['Zulu', 'alpha', 'Beta'];
  assert.deepEqual(sortPhrases(phrases, 'A-Z'), ['alpha', 'Beta', 'Zulu']);
  assert.deepEqual(sortPhrases(phrases, 'Z-A'), ['Zulu', 'Beta', 'alpha']);
  assert.deepEqual(sortPhrases(phrases, 'None'), phrases);
  assert.deepEqual(phrases, ['Zulu', 'alpha', 'Beta']);

  const lists = [{ phrases: [...phrases] }];
  assert.equal(sortStoredPhraseLists(lists, 'A-Z'), lists);
  assert.deepEqual(lists[0].phrases, ['alpha', 'Beta', 'Zulu']);
});
