const test = require('node:test');
const assert = require('node:assert/strict');

const {
  addUniquePhrases,
  isPhraseListEnabled,
  normalizeListEnabled,
  normalizePhrases,
  sortPhrases,
  sortStoredPhraseLists,
} = require('../src/modules/phrase-lists.js');
const {
  buildPhraseRegExp,
  escapePhrase,
  prepareHilitorOptions,
} = require('../src/modules/matching.js');
const { isAllowedURL, normalizeURLPhrases, urlMatchesAny } = require('../src/modules/urls.js');
const { parseBulkImport } = require('../src/modules/import-export.js');
const { getTextColor, hexClean, rgbaStringToHex, rgbaToHex } = require('../src/modules/colors.js');
const { normalizeOptions, normalizePhraseLists } = require('../src/modules/storage.js');
const { validateStyleDeclarations } = require('../src/modules/styles.js');

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
  assert.deepEqual(
    prepareHilitorOptions({ enableCaseInsensitive: true, enablePartialMatch: false }),
    { caseSensitive: false, partialMatch: false },
  );
});

test('URL allowlist and denylist use normalized non-empty substrings', () => {
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
    },
  ]);
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
  assert.equal(normalizeListEnabled({ toggled: false }), false);
  assert.equal(normalizeListEnabled({ enabled: true, toggled: false }), true);

  const [list] = normalizePhraseLists([
    { title: 'Legacy', color: 'purple', phrases: [' one ', 'one'], toggled: false },
  ]);
  assert.equal(list.enabled, false);
  assert.equal('toggled' in list, false);
  assert.deepEqual(list.phrases, ['one']);
});

test('stored options receive missing defaults and unsafe legacy styles are removed', () => {
  const options = normalizeOptions({
    highlighter: [
      {
        title: 'Existing',
        color: '#112233',
        phrases: ['phrase'],
        styles: 'color:red;} body {display:none',
      },
    ],
  });
  assert.equal(options.enablePhraseNavigator, false);
  assert.equal(options.enableQuickSearch, false);
  assert.equal(options.sorting, 'None');
  assert.equal(options.highlighter[0].styles, '');
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
    '<style>body{display:none}</style>',
  ]) {
    assert.equal(validateStyleDeclarations(unsafe), false, unsafe);
  }
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
