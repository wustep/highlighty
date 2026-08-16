export type SortOrder = 'None' | 'A-Z' | 'Z-A';

export interface PhraseList {
  phrases: string[];
  title: string;
  color: string;
  textColor: string;
  enabled: boolean;
  styles: string;
  allowlist: string[];
  denylist: string[];
  toggled?: boolean;
  [key: string]: unknown;
}

export interface HighlightyOptions {
  highlighter: PhraseList[];
  allowlist: string[];
  denylist: string[];
  baseStyles: string;
  autoHighlighter: boolean;
  enableAutoHighlight: boolean;
  enableAutoHighlightUpdates: boolean;
  enableTitleMouseover: boolean;
  enablePartialMatch: boolean;
  enableCaseInsensitive: boolean;
  enablePhraseNavigator: boolean;
  enableQuickSearch: boolean;
  enableURLDenylist: boolean;
  enableURLAllowlist: boolean;
  keyboardShortcut: string;
  sorting: SortOrder;
  [key: string]: unknown;
}

export type StoredOptions = Partial<HighlightyOptions> & {
  whitelist?: unknown;
  blacklist?: unknown;
  enableURLWhitelist?: unknown;
  enableURLBlacklist?: unknown;
};
