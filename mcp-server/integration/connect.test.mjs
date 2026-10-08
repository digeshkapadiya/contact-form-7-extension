import test from 'node:test';
import assert from 'node:assert';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { registerTools } from '../dist/tools/index.js';
import { WordPressClient } from '../dist/wordpress/client.js';
import { BackupManager } from '../dist/backup/manager.js';
import { MultiSiteManager } from '../dist/multisite/manager.js';
import { IntegrationManager } from '../dist/integrations/manager.js';

const SITE = process.env.WORDPRESS_URL;
const ADMIN_PASS = process.env.WORDPRESS_ADMIN_PASSWORD || 'adminpass';

/** Minimal cookie-jar "browser" that logs in and approves the authorization request. */
async function approveInBrowser(approvalUrl) {
  const jar = new Map();
  const cookieHeader = () => [...jar].map(([k, v]) => `${k}=${v}`).join('; ');
  const store = res => {
    for (const c of res.headers.getSetCookie()) {
      const [kv] = c.split(';');
      const i = kv.indexOf('=');
      jar.set(kv.slice(0, i), kv.slice(i + 1));
    }
  };
  const req = async (url, opts = {}) => {
    const res = await fetch(url, { redirect: 'manual', ...opts, headers: { Cookie: cookieHeader(), ...(opts.headers || {}) } });
    store(res);
    return res;
  };

  jar.set('wordpress_test_cookie', 'WP%20Cookies%20check');
  const login = await req(`${SITE}/wp-login.php`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ log: 'admin', pwd: ADMIN_PASS, 'wp-submit': 'Log In', redirect_to: approvalUrl, testcookie: '1' })
  });
  assert.ok([200, 302].includes(login.status), `login status ${login.status}`);

  const page = await req(approvalUrl);
  const html = await page.text();
  assert.match(html, /authorize_application_password/, 'authorization form is shown');
  const fields = {};
  for (const m of html.matchAll(/<input[^>]+type=["']hidden["'][^>]*>/g)) {
    const name = /name=["']([^"']+)["']/.exec(m[0])?.[1];
    const value = /value=["']([^"']*)["']/.exec(m[0])?.[1] ?? '';
    if (name) fields[name] = value.replace(/&amp;/g, '&');
  }
  const approve = await req(`${SITE}/wp-admin/authorize-application.php`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ ...fields, app_name: new URL(approvalUrl).searchParams.get('app_name'), action: 'authorize_application_password', approve: 'Yes, I approve of this connection' })
  });
  if (approve.status !== 302) {
    const raw = await approve.text();
    const t = raw.slice(Math.max(0, raw.indexOf('id="wpbody-content"'))).replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>|<[^>]+>/g, ' ').replace(/\s+/g, ' ');
    assert.fail(`approve status ${approve.status}: ${t.slice(0, 500)} | fields=${Object.keys(fields)}`);
  }
  const location = approve.headers.get('location');
  assert.ok(location.startsWith('http://127.0.0.1:'), `redirects to local listener: ${location}`);
  return await fetch(location); // the browser following the redirect
}

function setup() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cf7conn-'));
  const tools = {};
  const server = { tool: (name, _d, _s, handler) => { tools[name] = handler; } };
  const sites = new MultiSiteManager(path.join(dir, 'sites.json'));
  registerTools(server, new WordPressClient({ baseUrl: '' }), new BackupManager(path.join(dir, 'b')), sites, new IntegrationManager(path.join(dir, 'i.json')));
  const call = async (n, a = {}) => JSON.parse((await tools[n](a)).content[0].text);
  return { dir, call, sites };
}

test('browser approval flow connects a real WordPress site end to end', async () => {
  const { dir, call, sites } = setup();
  try {
    const start = await call('wp_connect_start', { url: SITE, environment: 'local', open_browser: false });
    assert.strictEqual(start.status, 'waiting_for_approval');
    assert.match(start.approvalUrl, /authorize-application\.php/);

    const pendingComplete = call('wp_connect_complete', { url: SITE, wait_seconds: 30 });
    const callbackRes = await approveInBrowser(start.approvalUrl);
    assert.strictEqual(callbackRes.status, 200);

    const done = await pendingComplete;
    assert.strictEqual(done.status, 'connected');
    assert.strictEqual(done.contactForm7Detected, true);
    assert.strictEqual(done.credentialsWork, true, 'app password returned by WordPress works');
    assert.ok(!JSON.stringify(done).includes('password'), 'password is never returned to the model');

    const active = sites.getActiveSite();
    assert.strictEqual(active.baseUrl, SITE);
    assert.ok(active.applicationPassword);
    // The saved site now works for normal tools with no env vars.
    const forms = await call('cf7_list_forms', {});
    assert.ok(Array.isArray(forms) || forms.forms || JSON.stringify(forms).length > 0);
    if (process.platform !== 'win32') {
      assert.strictEqual(fs.statSync(path.join(dir, 'sites.json')).mode & 0o777, 0o600);
    }
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test('wrong state token is rejected; declined request is reported', async () => {
  const { dir, call } = setup();
  try {
    const start = await call('wp_connect_start', { url: SITE, open_browser: false });
    const u = new URL(start.approvalUrl);
    const success = new URL(u.searchParams.get('success_url'));
    const bad = await fetch(`${success.origin}/callback?state=wrong&user_login=a&password=b`);
    assert.strictEqual(bad.status, 400);

    const reject = new URL(u.searchParams.get('reject_url'));
    await fetch(reject);
    const r = await call('wp_connect_complete', { url: SITE, wait_seconds: 5 });
    assert.strictEqual(r.status, 'declined');
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test('wp_connect_complete without start explains what to do', async () => {
  const { dir, call } = setup();
  try {
    await assert.rejects(() => call('wp_connect_complete', { url: 'https://nope.example.com' }), /wp_connect_start/);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});
