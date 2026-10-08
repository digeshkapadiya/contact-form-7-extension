/**
 * Browser-based WordPress connection using WordPress's built-in
 * Application Authorization flow (wp-admin/authorize-application.php).
 *
 * The user approves in their own browser; WordPress then redirects to a
 * short-lived listener on 127.0.0.1 with the new Application Password, so
 * nothing has to be copied or pasted.
 */
import * as http from 'http';
import * as crypto from 'crypto';
import { spawn } from 'child_process';
// Stable id so WordPress shows one "Claude CF7 Developer Assistant" entry per user.
export const APP_ID = '7d0d3a56-5c1e-4b0a-9f6e-cf7a551a0001';
export const APP_NAME = 'Claude CF7 Developer Assistant';
const SUCCESS_PAGE = `<!doctype html><meta charset="utf-8"><title>Connected</title>
<body style="font-family:system-ui;max-width:32rem;margin:15vh auto;padding:0 1rem;text-align:center">
<h1>Connected</h1><p>Your WordPress site is linked. You can close this tab and return to Claude Code.</p></body>`;
const REJECT_PAGE = `<!doctype html><meta charset="utf-8"><title>Not connected</title>
<body style="font-family:system-ui;max-width:32rem;margin:15vh auto;padding:0 1rem;text-align:center">
<h1>Not connected</h1><p>You declined the request. Return to Claude Code to try again.</p></body>`;
export function normalizeSiteUrl(raw) {
    let u = raw.trim();
    if (!/^https?:\/\//i.test(u))
        u = `https://${u}`;
    const parsed = new URL(u);
    return parsed.origin + parsed.pathname.replace(/\/+$/, '');
}
export function buildAuthorizeUrl(siteUrl, port, state) {
    const base = `http://127.0.0.1:${port}`;
    const params = new URLSearchParams({
        app_name: APP_NAME,
        app_id: APP_ID,
        success_url: `${base}/callback?state=${state}`,
        reject_url: `${base}/rejected?state=${state}`
    });
    return `${siteUrl}/wp-admin/authorize-application.php?${params.toString()}`;
}
export function openInBrowser(url) {
    try {
        let cmd;
        let args;
        if (process.platform === 'darwin') {
            cmd = 'open';
            args = [url];
        }
        else if (process.platform === 'win32') {
            cmd = 'rundll32';
            args = ['url.dll,FileProtocolHandler', url];
        }
        else {
            cmd = 'xdg-open';
            args = [url];
        }
        const child = spawn(cmd, args, { stdio: 'ignore', detached: true });
        child.on('error', () => { });
        child.unref();
        return true;
    }
    catch {
        return false;
    }
}
/** Start the loopback listener and return the pending authorization. */
export async function startAuthorization(siteUrl, ttlMs = 10 * 60 * 1000) {
    const state = crypto.randomBytes(16).toString('hex');
    const pending = {
        state,
        startedAt: Date.now(),
        closed: false,
        waiters: []
    };
    const notify = () => { const w = pending.waiters.splice(0); w.forEach(fn => fn()); };
    const server = http.createServer((req, res) => {
        const url = new URL(req.url || '/', 'http://127.0.0.1');
        const okState = url.searchParams.get('state') === state;
        const page = (code, body) => {
            res.writeHead(code, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' });
            res.end(body);
        };
        if (!okState)
            return page(400, 'Invalid or expired request.');
        if (url.pathname === '/callback') {
            const username = url.searchParams.get('user_login');
            const password = url.searchParams.get('password');
            if (!username || !password)
                return page(400, 'Missing credentials.');
            pending.result = { siteUrl: url.searchParams.get('site_url') || siteUrl, username, password };
            page(200, SUCCESS_PAGE);
            notify();
            setTimeout(pending.close, 500);
            return;
        }
        if (url.pathname === '/rejected') {
            pending.rejected = true;
            page(200, REJECT_PAGE);
            notify();
            setTimeout(pending.close, 500);
            return;
        }
        page(404, 'Not found');
    });
    await new Promise((resolve, reject) => {
        server.once('error', reject);
        server.listen(0, '127.0.0.1', () => resolve());
    });
    server.unref(); // never keep the MCP process alive on its own
    const port = server.address().port;
    const timer = setTimeout(() => pending.close(), ttlMs);
    timer.unref();
    pending.port = port;
    pending.authUrl = buildAuthorizeUrl(siteUrl, port, state);
    pending.close = () => {
        if (pending.closed)
            return;
        pending.closed = true;
        clearTimeout(timer);
        server.close();
        server.closeAllConnections?.();
        notify();
    };
    return pending;
}
/** Resolve when the callback arrives, the request is rejected/closed, or the timeout elapses. */
export function waitForAuthorization(pending, timeoutMs) {
    if (pending.result || pending.rejected || pending.closed)
        return Promise.resolve();
    return new Promise(resolve => {
        const t = setTimeout(() => {
            const i = pending.waiters.indexOf(done);
            if (i >= 0)
                pending.waiters.splice(i, 1);
            resolve();
        }, timeoutMs);
        const done = () => { clearTimeout(t); resolve(); };
        pending.waiters.push(done);
    });
}
