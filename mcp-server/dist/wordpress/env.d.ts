/**
 * Read a configuration env var, treating empty strings and unresolved
 * `${...}` placeholders (unset plugin userConfig) as "not configured".
 */
export declare function readEnv(name: string): string | undefined;
