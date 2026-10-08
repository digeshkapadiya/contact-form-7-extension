import test from 'node:test';
import assert from 'node:assert';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { WordPressClient } from '../dist/wordpress/client.js';
import { BackupManager } from '../dist/backup/manager.js';
import { TemplateManager } from '../dist/templates/manager.js';
import { CF7TagParser } from '../dist/audit/tag-parser.js';

function mockFetch(handler) {
  const calls = [];
  const original = globalThis.fetch;
  globalThis.fetch = async (url, opts) => {
    calls.push({ url, opts });
    const { status = 200, body = {} } = handler(url, opts);
    return new Response(typeof body === 'string' ? body : JSON.stringify(body), { status });
  };
  return { calls, restore: () => { globalThis.fetch = original; } };
}

test('WordPressClient: sends Basic auth and trims trailing slash', async () => {
  const m = mockFetch(() => ({ body: [{ id: 1, title: 'A' }] }));
  try {
    const c = new WordPressClient({ baseUrl: 'https://x.test///', username: 'u', applicationPassword: 'p p' });
    const forms = await c.listForms();
    assert.strictEqual(forms.length, 1);
    assert.strictEqual(m.calls[0].url, 'https://x.test/wp-json/contact-form-7/v1/contact-forms');
    assert.strictEqual(m.calls[0].opts.headers.Authorization, 'Basic ' + Buffer.from('u:p p').toString('base64'));
  } finally { m.restore(); }
});

test('WordPressClient: checkConnection detects CF7 namespace', async () => {
  const m = mockFetch(() => ({ body: { name: 'Site', namespaces: ['wp/v2', 'contact-form-7/v1'] } }));
  try {
    const r = await new WordPressClient({ baseUrl: 'https://x.test' }).checkConnection();
    assert.strictEqual(r.connected, true);
    assert.strictEqual(r.hasCf7, true);
    assert.strictEqual(r.cf7Namespace, 'contact-form-7/v1');
  } finally { m.restore(); }
});

test('WordPressClient: checkConnection reports HTTP and network failures', async () => {
  let m = mockFetch(() => ({ status: 404, body: 'nope' }));
  try {
    const r = await new WordPressClient({ baseUrl: 'https://x.test' }).checkConnection();
    assert.strictEqual(r.connected, false);
    assert.match(r.error, /404/);
  } finally { m.restore(); }
  const original = globalThis.fetch;
  globalThis.fetch = async () => { throw new Error('boom'); };
  try {
    const r = await new WordPressClient({ baseUrl: 'https://x.test' }).checkConnection();
    assert.strictEqual(r.connected, false);
    assert.match(r.error, /boom/);
  } finally { globalThis.fetch = original; }
});

test('WordPressClient: getForm/createForm/updateForm use correct endpoints and throw on error', async () => {
  const m = mockFetch((url, opts) => url.endsWith('/99') ? { status: 404, body: 'missing' } : { body: { id: 5 } });
  try {
    const c = new WordPressClient({ baseUrl: 'https://x.test' });
    assert.strictEqual((await c.getForm(5)).id, 5);
    await c.createForm({ title: 't', form: '[submit]' });
    assert.strictEqual(m.calls[1].opts.method, 'POST');
    assert.deepStrictEqual(JSON.parse(m.calls[1].opts.body), { title: 't', form: '[submit]', context: 'save' });
    await c.updateForm(5, { title: 'n' });
    assert.strictEqual(JSON.parse(m.calls[2].opts.body).context, 'save', 'CF7 only persists with context=save');
    assert.ok(m.calls[2].url.endsWith('/contact-forms/5'));
    await assert.rejects(() => c.getForm(99), /HTTP 404/);
    await assert.rejects(() => c.updateForm(99, {}), /HTTP 404/);
  } finally { m.restore(); }
});

test('BackupManager: snapshot create, list, filter, get, and corrupt-file tolerance', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cf7bk-'));
  try {
    const b = new BackupManager(dir);
    const s1 = b.createSnapshot({ id: 1, title: 'One', form: '[submit]' }, 'first');
    const s2 = b.createSnapshot({ id: 2, title: 'Two', form: '[submit]' });
    fs.writeFileSync(path.join(dir, 'corrupt.json'), '{not json');
    assert.strictEqual(b.listSnapshots().length, 2);
    assert.strictEqual(b.listSnapshots(1).length, 1);
    assert.strictEqual(b.getSnapshot(s1.id).note, 'first');
    assert.strictEqual(b.getSnapshot(s2.id).note, 'Pre-modification auto backup');
    assert.strictEqual(b.getSnapshot('missing'), null);
    assert.strictEqual(b.getSnapshot('corrupt'), null);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test('TemplateManager: all templates are listed, retrievable, and internally consistent', () => {
  const all = TemplateManager.listTemplates();
  assert.ok(all.length >= 4);
  for (const id of ['contact-us', 'job-application', 'quote-request', 'support-ticket']) {
    assert.ok(TemplateManager.getTemplate(id), `missing ${id}`);
  }
  assert.strictEqual(TemplateManager.getTemplate('nope'), null);
  for (const t of all) {
    const names = new Set(CF7TagParser.parseFormTags(t.data.form).map(x => x.name).filter(Boolean));
    const used = [...(t.data.mail.body || '').matchAll(/\[([a-z][\w-]*)\]/g)].map(m => m[1]);
    for (const u of used) assert.ok(names.has(u), `${t.id}: mail tag [${u}] has no form field`);
  }
});

test('WordPressClient: flattens CF7 `properties` into top-level fields', async () => {
  const m = mockFetch(() => ({ body: {
    id: 3, slug: 'c', title: 'T', locale: 'en_US',
    properties: { form: { content: '[submit]', fields: [] }, mail: { recipient: 'a@b.c' }, mail_2: {}, messages: {}, additional_settings: { content: 'x: y', settings: [] } }
  } }));
  try {
    const f = await new WordPressClient({ baseUrl: 'https://x.test' }).getForm(3);
    assert.strictEqual(f.id, 3);
    assert.strictEqual(f.form, '[submit]');
    assert.strictEqual(f.mail.recipient, 'a@b.c');
    assert.strictEqual(f.additional_settings, 'x: y');
    assert.strictEqual(f.properties, undefined);
  } finally { m.restore(); }
});

test('WordPressClient: with no site configured, fails with a clear message (no localhost fallback)', async () => {
  const saved = { u: process.env.WORDPRESS_URL };
  process.env.WORDPRESS_URL = '${user_config.wp_site_url}'; // unresolved plugin placeholder
  try {
    const c = new WordPressClient();
    const r = await c.checkConnection();
    assert.strictEqual(r.connected, false);
    assert.match(r.error, /No WordPress site connected/);
    await assert.rejects(() => c.listForms(), /wp_add_site/);
  } finally {
    if (saved.u === undefined) delete process.env.WORDPRESS_URL; else process.env.WORDPRESS_URL = saved.u;
  }
});

test('MultiSiteManager: env site is production unless the URL is local', async () => {
  const { MultiSiteManager } = await import('../dist/multisite/manager.js');
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cf7ms-'));
  const saved = process.env.WORDPRESS_URL;
  try {
    process.env.WORDPRESS_URL = 'https://client.example.com';
    assert.strictEqual(new MultiSiteManager(path.join(dir, 's.json')).getSite('default').environment, 'production');
    process.env.WORDPRESS_URL = 'http://localhost:8080';
    assert.strictEqual(new MultiSiteManager(path.join(dir, 's.json')).getSite('default').environment, 'local');
  } finally {
    if (saved === undefined) delete process.env.WORDPRESS_URL; else process.env.WORDPRESS_URL = saved;
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
