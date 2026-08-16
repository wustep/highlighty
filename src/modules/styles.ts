export function validateStyleDeclarations(styles: unknown): styles is string {
  return (
    typeof styles === 'string' && !/[{}<>]|\/\*|\*\/|@import|url\s*\(|expression\s*\(/i.test(styles)
  );
}

export function normalizeStyleDeclarations(styles: unknown): string {
  return validateStyleDeclarations(styles) ? styles.trim() : '';
}
