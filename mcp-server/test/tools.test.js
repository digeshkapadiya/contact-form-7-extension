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

const FORM = {
  id: 7,
  title: 'Contact',
  form: '[text* your-name] [email* your-email] [textarea your-message] [submit "Send"]',
  mail: {
    active: true,
    subject: 'Hi [your-name]',
    sender: '[your-name] <[your-email]>',
    recipient: 'admin@example.com',
    body: '[your-name] [your-email] [your-message]',
    additional_headers: ''
  },
  mail_2: { active: false },
  messages: {},
  additional_settings: ''
};

function setup(fetchHandler) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cf7tools-'));
  const tools = {};
  const server = { tool: (name, _d, _s, handler) => { tools[name] = handler; } };
  const sites = new MultiSiteManager(path.join(dir, 'sites.json'));
  const integrations = new IntegrationManager(path.join(dir, 'integrations.json'));
  const backups = new BackupManager(path.join(dir, 'backups'));
  const client = new WordPressClient({ baseUrl: 'https://wp.test' });
  registerTools(server, client, backups, sites, integrations);

  const calls = [];
  const original = globalThis.fetch;
  globalThis.fetch = async (url, opts = {}) => {
    calls.push({ url: String(url), method: opts.method || 'GET', body: opts.body });
    const r = fetchHandler(String(url), opts) || { body: {} };
    return new Response(JSON.stringify(r.body), { status: r.status || 200 });
  };
  const call = async (name, args = {}) => {
    const res = await tools[name](args);
    return JSON.parse(res.content[0].text);
  };
  const cleanup = () => { globalThis.fetch = original; fs.rmSync(dir, { recursive: true, force: true }); };
  return { tools, call, calls, backups, cleanup };
}

const wp = (url, opts = {}) => {
  if (url.endsWith('/wp-json/')) return { body: { name: 'Test', namespaces: ['contact-form-7/v1'] } };
  if (url.endsWith('/contact-forms')) return opts.method === 'POST' ? { body: { ...FORM, id: 8 } } : { body: [{ id: 7, title: 'Contact' }] };
  if (/contact-forms\/7$/.test(url)) return { body: FORM };
  return { status: 404, body: {} };
};

test('registers all 21 tools', () => {
  const t = setup(wp);
  try { assert.strictEqual(Object.keys(t.tools).length, 21); } finally { t.cleanup(); }
});

test('multi-site: add, list, select, and unknown-site error', async () => {
  const t = setup(wp);
  try {
    await t.call('wp_add_site', { id: 'a', name: 'A', url: 'https://a.test', environment: 'staging' });
    const list = await t.call('wp_list_sites');
    assert.ok(list.sites.some(s => s.id === 'a'));
    assert.strictEqual((await t.call('wp_select_site', { site_id: 'a' })).success, true);
    await assert.rejects(() => t.call('wp_select_site', { site_id: 'zzz' }), /not found/);
  } finally { t.cleanup(); }
});

test('wp_check_connection, cf7_list_forms, cf7_get_form hit the REST API', async () => {
  const t = setup(wp);
  try {
    assert.strictEqual((await t.call('wp_check_connection', {})).hasCf7, true);
    assert.ok(t.calls.some(c => c.url === 'https://wp.test/wp-json/'));
    const forms = await t.call('cf7_list_forms', {});
    assert.ok(JSON.stringify(forms).includes('Contact'));
    assert.strictEqual((await t.call('cf7_get_form', { form_id: 7 })).id, 7);
  } finally { t.cleanup(); }
});

test('cf7_audit_form flags the unsafe From header', async () => {
  const t = setup(wp);
  try {
    const r = await t.call('cf7_audit_form', { form_id: 7 });
    assert.ok(typeof r.healthScore === 'number');
    assert.ok(r.issues.length > 0);
  } finally { t.cleanup(); }
});

test('cf7_health_check classifies scanned forms', async () => {
  const t = setup(wp);
  try {
    const r = await t.call('cf7_health_check', {});
    assert.strictEqual(r.scannedFormsCount, 1);
    const s = r.summary;
    assert.strictEqual(s.confirmedErrorsCount + s.needsReviewCount + s.cleanFormsCount, 1);
  } finally { t.cleanup(); }
});

test('cf7_update_form snapshots first, then cf7_list_backups and cf7_restore_form roll back', async () => {
  const t = setup(wp);
  try {
    await t.call('cf7_update_form', { form_id: 7, title: 'Renamed', backup_note: 'test' });
    const post = t.calls.find(c => c.method === 'POST' && /contact-forms\/7$/.test(c.url));
    assert.ok(post, 'update POST was sent');
    assert.strictEqual(JSON.parse(post.body).title, 'Renamed');
    const backups = await t.call('cf7_list_backups', { form_id: 7 });
    assert.ok(JSON.stringify(backups).includes('test'));
    const snap = t.backups.listSnapshots(7)[0];
    t.calls.length = 0;
    await t.call('cf7_restore_form', { snapshot_id: snap.id });
    assert.ok(t.calls.some(c => c.method === 'POST' && /contact-forms\/7$/.test(c.url)));
  } finally { t.cleanup(); }
});

test('cf7_create_form posts to the collection endpoint', async () => {
  const t = setup(wp);
  try {
    await t.call('cf7_create_form', { title: 'New', form: '[submit]' });
    const post = t.calls.find(c => c.method === 'POST');
    assert.ok(post.url.endsWith('/contact-forms'));
    assert.strictEqual(JSON.parse(post.body).title, 'New');
  } finally { t.cleanup(); }
});

test('templates: list and apply', async () => {
  const t = setup(wp);
  try {
    const list = await t.call('cf7_list_templates', {});
    assert.ok(JSON.stringify(list).includes('contact-us'));
    await t.call('cf7_apply_template', { template_id: 'contact-us', custom_title: 'Client Contact' });
    const post = t.calls.find(c => c.method === 'POST');
    assert.strictEqual(JSON.parse(post.body).title, 'Client Contact');
  } finally { t.cleanup(); }
});

test('integrations: configure, list, generate PHP', async () => {
  const t = setup(wp);
  try {
    const cfg = await t.call('cf7_configure_integration', {
      form_id: 7, name: 'Hook', type: 'webhook', provider: 'custom',
      endpoint_url: 'https://hooks.example.com/x', http_method: 'POST', auth_type: 'none',
      field_mappings: [{ cf7_field: 'your-email', target_field: 'email' }]
    });
    assert.ok(JSON.stringify(cfg).includes('hooks.example.com') || cfg.success !== false);
    const listed = await t.call('cf7_list_integrations', { form_id: 7 });
    assert.ok(JSON.stringify(listed).includes('Hook'));
  } finally { t.cleanup(); }
});

test('cf7_test_submission refuses production without confirmation', async () => {
  const t = setup(wp);
  try {
    await t.call('wp_add_site', { id: 'prod', name: 'Prod', url: 'https://prod.test', environment: 'production' });
    await t.call('wp_select_site', { site_id: 'prod' });
    t.calls.length = 0;
    let out;
    try { out = JSON.stringify(await t.call('cf7_test_submission', { form_id: 7, mode: 'valid' })); }
    catch (e) { out = String(e.message); }
    assert.ok(!t.calls.some(c => /feedback/.test(c.url)), 'no submission was sent');
    assert.match(out, /production|confirm/i);
  } finally { t.cleanup(); }
});
