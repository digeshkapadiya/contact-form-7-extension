/**
 * Read a configuration env var, treating empty strings and unresolved
 * `${...}` placeholders (unset plugin userConfig) as "not configured".
 */
export function readEnv(name: string): string | undefined {
  const value = process.env[name]?.trim();
  if (!value || /^\$\{.*\}$/.test(value)) {
    return undefined;
  }
  return value;
}
