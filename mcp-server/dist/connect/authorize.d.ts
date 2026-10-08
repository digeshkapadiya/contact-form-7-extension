/**
 * Browser-based WordPress connection using WordPress's built-in
 * Application Authorization flow (wp-admin/authorize-application.php).
 *
 * The user approves in their own browser; WordPress then redirects to a
 * short-lived listener on 127.0.0.1 with the new Application Password, so
 * nothing has to be copied or pasted.
 */
export declare const APP_ID = "7d0d3a56-5c1e-4b0a-9f6e-cf7a551a0001";
export declare const APP_NAME = "Claude CF7 Developer Assistant";
export interface AuthResult {
    siteUrl: string;
    username: string;
    password: string;
}
export interface PendingAuth {
    authUrl: string;
    state: string;
    port: number;
    startedAt: number;
    result?: AuthResult;
    rejected?: boolean;
    closed: boolean;
    waiters: Array<() => void>;
    close: () => void;
}
export declare function normalizeSiteUrl(raw: string): string;
export declare function buildAuthorizeUrl(siteUrl: string, port: number, state: string): string;
export declare function openInBrowser(url: string): boolean;
/** Start the loopback listener and return the pending authorization. */
export declare function startAuthorization(siteUrl: string, ttlMs?: number): Promise<PendingAuth>;
/** Resolve when the callback arrives, the request is rejected/closed, or the timeout elapses. */
export declare function waitForAuthorization(pending: PendingAuth, timeoutMs: number): Promise<void>;
