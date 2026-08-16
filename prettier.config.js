/*
 * Prettier configuration
 *
 * See: https://prettier.io/docs/en/options.html
 */
module.exports = {
  // Prettier defaults
  tabWidth: 2,
  useTabs: false,
  semi: true,
  quoteProps: 'as-needed',
  jsxSingleQuote: false,
  bracketSpacing: true,
  // Airbnb style guide defaults
  singleQuote: true /* default: "false" */,
  trailingComma: 'all' /* default: "none" */,
  endOfLine: 'lf' /* default: "auto" */,
  // Custom overrides
  printWidth: 100,
  arrowParens: 'always' /* default: "avoid" */,
};
